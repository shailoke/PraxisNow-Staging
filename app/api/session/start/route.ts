import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { normalizeRole } from '@/lib/runtime-scenario'
import { trackEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
    try {
        const { scenario_id, duration_seconds, session_type = 'interview' } = await req.json()

        // STEP 1 — AUTH CHECK
        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value, ...options }) } catch { }
                    },
                    remove(name: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value: '', ...options }) } catch { }
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // STEP 2 — ADMIN CLIENT
        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // STEP 3 — PARALLEL SESSION CHECK
        const { data: existingSessions } = await adminClient
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['created', 'active'])

        if (existingSessions && existingSessions.length > 0) {
            const existing = existingSessions[0]
            if (existing.session_type === session_type && existing.scenario_id === scenario_id) {
                return NextResponse.json({
                    ...existing,
                    initial_turn: {
                        turn_index: 0,
                        content: 'Tell me about yourself.',
                        role: 'assistant'
                    }
                })
            }
            // Auto-fail stale session
            await adminClient
                .from('sessions')
                .update({ status: 'failed' })
                .eq('id', existing.id)
        }

        // FREE SESSION ELIGIBILITY
        const { data: userRecord } = await adminClient
            .from('users')
            .select('free_session_used, available_sessions, package_tier')
            .eq('id', user.id)
            .single()

        const AI_ROUND_SCENARIO_IDS = [4, 8, 12]
        const isAIRound = AI_ROUND_SCENARIO_IDS.includes(Number(scenario_id))
        const canUseFreeSession =
            !userRecord?.free_session_used &&
            !isAIRound &&
            (userRecord?.available_sessions ?? 0) === 0

        // If AI round and no sessions remaining — block immediately
        if (isAIRound && (userRecord?.available_sessions ?? 0) === 0) {
            trackEvent('ai_round_paywall_hit', user.id, { scenario_id })
            return NextResponse.json(
                { error: 'AI_ROUND_REQUIRES_PURCHASE' },
                { status: 403 }
            )
        }

        // STEP 4 — NEGOTIATION SIMULATION PATH
        if (session_type === 'negotiation_simulation') {
            const { data: profile } = await adminClient
                .from('users')
                .select('package_tier')
                .eq('id', user.id)
                .single()

            if (profile?.package_tier !== 'Pro' && profile?.package_tier !== 'Pro+') {
                return NextResponse.json(
                    { error: 'Salary Negotiation is available on Pro and above.' },
                    { status: 403 }
                )
            }

            const { data: priorNeg } = await adminClient
                .from('sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('session_type', 'negotiation_simulation')
                .eq('status', 'completed')
                .limit(1)
                .maybeSingle()

            if (priorNeg) {
                return NextResponse.json(
                    { error: 'You have already used your free Negotiation Simulation session.' },
                    { status: 403 }
                )
            }

            const { data: negSession, error: negError } = await adminClient
                .from('sessions')
                .insert({
                    user_id: user.id,
                    scenario_id: null,
                    duration_seconds: duration_seconds || 1800,
                    status: 'created',
                    transcript: '',
                    session_type: 'negotiation_simulation',
                } as any)
                .select()
                .single()

            if (negError || !negSession) {
                throw new Error(negError?.message || '[SESSION_START] Negotiation session insert returned null')
            }

            return NextResponse.json(negSession)
        }

        // STEP 5 — CREDIT CHECK
        const { data: profile } = await adminClient
            .from('users')
            .select('available_sessions, total_sessions_used, package_tier')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })

        if (!canUseFreeSession) {
            if (!profile.package_tier || profile.package_tier === 'Free') {
                return NextResponse.json(
                    { error: 'No active plan. Please purchase a plan to start an interview.' },
                    { status: 403 }
                )
            }

            if ((profile.available_sessions ?? 0) < 1) {
                return NextResponse.json({ error: 'Insufficient session credits.' }, { status: 403 })
            }
        }

        // STEP 6 — FETCH SCENARIO
        const { data: scenario } = await adminClient
            .from('scenarios')
            .select('id, role, round, duration_minutes')
            .eq('id', scenario_id)
            .single()

        if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 })

        // STEP 7 — AI ROUND REQUIRES PAID SESSIONS (not tier-gated)
        if (isAIRound && !canUseFreeSession && (userRecord?.available_sessions ?? 0) === 0) {
            return NextResponse.json(
                { error: 'AI_ROUND_REQUIRES_PURCHASE' },
                { status: 403 }
            )
        }

        // STEP 8 — DEDUCT CREDIT ATOMICALLY (skipped for free sessions)
        if (!canUseFreeSession) {
            const { data: deducted, error: deductError } = await adminClient
                .from('users')
                .update({
                    available_sessions: (profile.available_sessions ?? 1) - 1,
                    total_sessions_used: (profile.total_sessions_used ?? 0) + 1,
                })
                .eq('id', user.id)
                .gt('available_sessions', 0)
                .select('id')

            if (deductError || !deducted || deducted.length === 0) {
                return NextResponse.json({ error: 'Insufficient session credits.' }, { status: 403 })
            }
        }

        // STEP 9 — INSERT SESSION
        const sessionPayload = {
            user_id: user.id,
            scenario_id,
            round: (scenario as any).round ?? null,
            duration_seconds: duration_seconds || ((scenario as any).duration_minutes * 60) || 1800,
            status: 'created',
            transcript: '',
            session_type: 'interview',
            is_free_session: canUseFreeSession,
        }

        const { data: session, error: insertError } = await adminClient
            .from('sessions')
            .insert(sessionPayload as any)
            .select()
            .single()

        if (insertError || !session) {
            await adminClient
                .from('users')
                .update({ available_sessions: (profile.available_sessions ?? 1) })
                .eq('id', user.id)

            if (insertError) {
                console.error('[SESSION_START] Insert failed:', insertError)
                throw new Error(insertError.message)
            }
            console.error('[SESSION_START] Insert returned null data with no error')
            throw new Error('[SESSION_START] Insert returned null data with no error')
        }

        // STEP 10 — INSERT TMAY (TURN 0)
        const { error: tmayError } = await adminClient
            .from('interview_turns')
            .insert({
                session_id: session.id,
                turn_index: 0,
                turn_type: 'question',
                content: 'Tell me about yourself.',
                answered: false,
            } as any)

        if (tmayError) {
            throw new Error('Invariant violation: TMAY must be auto-asked on session start. Turn creation failed.')
        }

        // STEP 11 — MARK FREE SESSION USED (after confirmed session creation)
        if (canUseFreeSession) {
            await adminClient
                .from('users')
                .update({ free_session_used: true })
                .eq('id', user.id)
        }

        // Fire-and-forget analytics
        trackEvent('session_started', user.id, {
            scenario_id,
            role: scenario.role,
            round: (session as any).round,
            is_free_session: canUseFreeSession,
            is_ai_round: isAIRound,
        })

        // STEP 12 — RETURN
        return NextResponse.json({
            ...session,
            is_free_session: canUseFreeSession,
            initial_turn: {
                turn_index: 0,
                content: 'Tell me about yourself.',
                role: 'assistant'
            }
        })

    } catch (error: any) {
        console.error('[SESSION_START] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
