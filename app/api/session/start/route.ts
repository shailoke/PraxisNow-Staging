import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
    try {
        console.log("DEBUG: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        const { scenario_id, custom_scenario_id, duration_seconds, session_type, replay_session_id } = await req.json()
        const cookieStore = await cookies()

        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options)
                            })
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

        // 2. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Service Role Client
        // 3. Service Role Client (Use clean supabase-js client to avoid SSR cookie validation errors)
        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // 4. Parallel Session Check
        // 4. Parallel Session Check & Resume Logic
        const { data: activeSessionsData } = await adminClient
            .from('sessions')
            .select('*') // Fetch full object to allow return/resume
            .eq('user_id', user.id)
            .in('status', ['created', 'active'])
            .returns<Database['public']['Tables']['sessions']['Row'][]>()

        const activeSessions = activeSessionsData as any[] | null

        if (activeSessions && activeSessions.length > 0) {
            const existing = activeSessions[0]

            // 1. Exact Resume Match: Same Type
            // For Negotiations:
            if (session_type === 'negotiation_simulation' && existing.session_type === 'negotiation_simulation') {
                return NextResponse.json(existing)
            }
            // For Interviews: (If scenario matches)
            if (session_type === 'interview' && existing.session_type === 'interview' && existing.scenario_id === scenario_id) {
                return NextResponse.json(existing)
            }

            // 2. Mismatch / Blocking Session Found -> Auto-Fail it to unblock user
            console.log(`Auto-failing stuck session ${existing.id} to allow new session ${session_type}`)
            await adminClient
                .from('sessions')
                // @ts-ignore
                .update({ status: 'failed' })
                .eq('id', existing.id)

            // Proceed to create new session...
        }

        // New Logic: Negotiation Simulation Verification
        if (session_type === 'negotiation_simulation') {
            const { data: profile } = await adminClient
                .from('users')
                .select('package_tier')
                .eq('id', user.id)
                .single<Database['public']['Tables']['users']['Row']>()

            if (!profile || profile.package_tier !== 'Pro+') {
                return NextResponse.json({ error: 'Salary Negotiation is exclusive to Pro+ members.' }, { status: 403 })
            }

            // Check if already used (One-time only - COMPLETED)
            const { count } = await adminClient
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('session_type', 'negotiation_simulation')
                .eq('status', 'completed')

            if (count && count > 0) {
                return NextResponse.json({ error: 'You have already used your free Negotiation Simulation session.' }, { status: 403 })
            }



            // Create Session WITHOUT credit deduction
            const sessionPayload: any = {
                user_id: user.id,
                scenario_id: null, // Schema update required: ALTER COLUMN scenario_id DROP NOT NULL
                custom_scenario_id: null,
                duration_seconds: duration_seconds || 1800, // 30 mins default
                status: 'created',
                transcript: '',
                session_type: 'negotiation_simulation'
            }

            const { data: session, error: insertError } = await adminClient
                .from('sessions')
                .insert(sessionPayload)
                .select()
                .single()

            if (insertError) throw new Error(`Failed to create negotiation session: ${insertError.message}`)

            return NextResponse.json(session)
        }

        // --- REPLAY LOGIC ---
        if (replay_session_id) {
            // 5a. Balance Check (Replay costs 1 credit)
            const { data: profile } = await adminClient
                .from('users')
                .select('available_sessions, total_sessions_used, package_tier')
                .eq('id', user.id)
                .single<Database['public']['Tables']['users']['Row']>()

            if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

            // Enforce Tier: Pro or Pro+ only
            if (profile.package_tier === 'Free' || profile.package_tier === 'Starter') {
                return NextResponse.json({ error: 'Interview Replay is available on Pro and Pro+ plans.' }, { status: 403 })
            }

            if (!profile.available_sessions || profile.available_sessions < 1) {
                return NextResponse.json({ error: 'Insufficient session credits' }, { status: 403 })
            }

            // 5b. Verify Original Session Ownership & Fetch Questions from interview_turns
            const { data: originalSession } = await adminClient
                .from('sessions')
                .select(`
                    id, 
                    user_id, 
                    scenario_id, 
                    custom_scenario_id,
                    family_selections
                `)
                .eq('id', replay_session_id)
                .single() as any


            if (!originalSession) {
                return NextResponse.json({ error: 'Original session not found' }, { status: 404 })
            }
            if ((originalSession as any).user_id !== user.id) {
                return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 })
            }

            // CONTRACT: Fetch questions from interview_turns (canonical source)
            // NO transcript parsing allowed
            const { data: turns } = await adminClient
                .from('interview_turns')
                .select('content')
                .eq('session_id', replay_session_id)
                .order('turn_index', { ascending: true })

            const questions = turns?.map((t: any) => t.content) || []

            if (questions.length === 0) {
                return NextResponse.json({ error: 'No questions found in original session to replay. Replay is unavailable for this session.' }, { status: 400 })
            }

            // 5c. Deduct Credit
            const { error: updateError } = await adminClient
                .from('users')
                // @ts-ignore
                .update({
                    available_sessions: profile.available_sessions - 1,
                    total_sessions_used: (profile.total_sessions_used || 0) + 1
                })
                .eq('id', user.id)

            if (updateError) throw new Error(`Failed to deduct credit: ${updateError.message}`)

            // 5d. Create Replay Session
            const sessionPayload: any = {
                user_id: user.id,
                scenario_id: (originalSession as any).scenario_id,
                custom_scenario_id: (originalSession as any).custom_scenario_id,
                duration_seconds: duration_seconds,
                status: 'created',
                transcript: '',
                session_type: 'interview',
                replay_of_session_id: replay_session_id,
                questions_to_ask: questions,
                family_selections: originalSession.family_selections, // Critical for Entry determinism
                probe_selections: originalSession.probe_selections || {}  // Critical for probe determinism
            }

            // PHASE 5 DIAGNOSTIC: Confirm Entry family + probe reuse for replay
            console.log(`🔁 [REPLAY_FAMILY_REUSE]`, {
                replay_session_id,
                original_entry_family: originalSession.family_selections?.['Entry'],
                reusing_families: originalSession.family_selections,
                will_skip_selection: true
            })

            console.log(`🔁 [REPLAY_PROBE_REUSE]`, {
                replay_session_id,
                original_entry_probe: originalSession.probe_selections?.['Entry'],
                reusing_probes: originalSession.probe_selections,
                will_skip_probe_selection: true
            })

            const { data: session, error: insertError } = await adminClient
                .from('sessions')
                .insert(sessionPayload)
                .select()
                .single<Database['public']['Tables']['sessions']['Row']>()

            if (insertError) {
                // COMPENSATION
                await adminClient.from('users').update({
                    available_sessions: profile.available_sessions,
                    total_sessions_used: profile.total_sessions_used
                } as any).eq('id', user.id)
                throw new Error(`Failed to create replay session: ${insertError.message}`)
            }

            return NextResponse.json(session)
        }

        // --- STANDARD INTERVIEW LOGIC ---

        // 5. Balance Check
        const { data: profile } = await adminClient
            .from('users')
            .select('available_sessions, total_sessions_used, package_tier')
            .eq('id', user.id)
            .single<Database['public']['Tables']['users']['Row']>()

        if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

        // ===================================
        // 6. Fetch Scenario Dimensions (Needed for Tier Enforcement)
        // ===================================
        let dimensionNames: string[] = []

        if (scenario_id) {
            const { data: scenario } = await adminClient
                .from('scenarios')
                .select('evaluation_dimensions')
                .eq('id', scenario_id)
                .single()

            if (scenario && scenario.evaluation_dimensions) {
                dimensionNames = (scenario.evaluation_dimensions as any).map((d: any) => d.name || d)
            }
        } else if (custom_scenario_id) {
            const { data: customScenario } = await adminClient
                .from('custom_scenarios')
                .select('focus_dimensions')
                .eq('id', custom_scenario_id)
                .single()

            if (customScenario && customScenario.focus_dimensions) {
                dimensionNames = customScenario.focus_dimensions as string[]
            }
        }

        // Import Hardcoded Scenarios early to check dimension resolution fallback
        const { INTERVIEW_SCENARIOS } = await import('@/lib/runtime-scenario')

        // Dimension Resolution Fallback for Hardcoded Scenarios
        if (dimensionNames.length === 0 && scenario_id && INTERVIEW_SCENARIOS[scenario_id as string]) {
            dimensionNames = (INTERVIEW_SCENARIOS[scenario_id as string].evaluation_dimensions || []) as string[]
        }

        // ===================================
        // Explicit AI-Only Round Detection & Tier Enforcement
        // ===================================
        const isAIOnlyRound = dimensionNames.length === 1 && dimensionNames[0] === 'ai_fluency'

        if (isAIOnlyRound && profile.package_tier !== 'Pro' && profile.package_tier !== 'Pro+') {
            return NextResponse.json({ error: 'AI Fluency Round requires Pro tier' }, { status: 403 })
        }

        if (!profile.available_sessions || profile.available_sessions < 1) {
            return NextResponse.json({ error: 'Insufficient session credits' }, { status: 403 })
        }

        // 7. Deduct Credit
        const { error: updateError } = await adminClient
            .from('users')
            // @ts-ignore
            .update({
                available_sessions: profile.available_sessions - 1,
                total_sessions_used: (profile.total_sessions_used || 0) + 1
            })
            .eq('id', user.id)

        if (updateError) {
            throw new Error(`Failed to deduct credit: ${updateError.message}`)
        }

        // ===================================
        // 7b. ROLE RESOLUTION (Must happen BEFORE AI injection and family selection)
        // ===================================
        const { selectQuestionFamilies, selectEntryFamily, normalizeRole, AI_MANDATORY_ROLE_KEYS } = await import('@/lib/runtime-scenario')

        let roleForEntry = 'Generic'
        let levelForEntry = 'Senior'  // Default level

        if (scenario_id) {
            // CHECK HARDCODED FIRST
            if (INTERVIEW_SCENARIOS[scenario_id as string]) {
                roleForEntry = INTERVIEW_SCENARIOS[scenario_id as string].role
                levelForEntry = INTERVIEW_SCENARIOS[scenario_id as string].level
                console.log(`[SESSION_START] Resolved hardcoded role: ${roleForEntry}, level: ${levelForEntry} for ${scenario_id}`)
            }
            // CHECK DATABASE (Only if ID is likely a number/integer)
            else if (typeof scenario_id === 'number' || !isNaN(Number(scenario_id))) {
                const { data: s } = await adminClient
                    .from('scenarios')
                    .select('role, level')
                    .eq('id', scenario_id)
                    .single()

                if (s) {
                    roleForEntry = s.role
                    levelForEntry = s.level
                }
            }
        } else if (custom_scenario_id) {
            // Allow Custom scenarios to use base scenario role
            const { data: c } = await adminClient
                .from('custom_scenarios')
                .select('base_scenario_id')
                .eq('id', custom_scenario_id)
                .single()

            if (c) {
                const { data: b } = await adminClient
                    .from('scenarios')
                    .select('role, level')
                    .eq('id', c.base_scenario_id)
                    .single()

                if (b) {
                    roleForEntry = b.role
                    levelForEntry = b.level
                }
            }
        }

        // ===================================
        // 7c. AI FLUENCY — Deterministic Injection (Pro Tier Only)
        // ORDERING: After role resolution, BEFORE family selection and shuffle
        // ===================================
        const normalizedRoleForAI = normalizeRole(roleForEntry)

        if (
            (profile.package_tier === 'Pro' || profile.package_tier === 'Pro+') &&
            AI_MANDATORY_ROLE_KEYS.includes(normalizedRoleForAI as any) &&
            !dimensionNames.includes('ai_fluency')
        ) {
            dimensionNames.push('ai_fluency')
            console.log(`✅ [AI_INJECTION] ai_fluency injected for role: ${normalizedRoleForAI} (${profile.package_tier})`)
        }

        console.log('[AI_DIMENSIONS_FINAL]', {
            role: normalizedRoleForAI,
            tier: profile.package_tier,
            finalDimensions: dimensionNames
        })

        // ===================================
        // 7d. Select Question Families (Tier-Based Randomization)
        // ORDERING: AFTER AI injection so ai_fluency gets a family selected
        // ===================================
        const familySelections = await selectQuestionFamilies(
            dimensionNames,
            user.id,
            profile.package_tier as any
        )

        // ===================================
        // 7e. Entry Family (The "First Question" Randomizer)
        // ===================================
        // Map first evaluation dimension to Entry family probe type
        // Entry dimension determines the evaluation bar for Turn 1
        const dimensionToEntryProbe: Record<string, string> = {
            'Strategic Thinking': 'metrics',
            'Execution': 'discovery',
            'Communication': 'risks',
            'Technical Depth': 'write_path',
            'Problem Solving': 'read_path',
            'Collaboration': ' discovery',
            'Impact': 'metrics'
        }

        const firstDimension = dimensionNames[0] || 'Strategic Thinking'
        const entryProbe = dimensionToEntryProbe[firstDimension] || 'metrics'

        console.log(`[ENTRY_DIMENSION_MAPPING]`, {
            first_eval_dimension: firstDimension,
            mapped_entry_probe: entryProbe,
            all_dimensions: dimensionNames
        })

        const entryFamilyId = await selectEntryFamily(
            roleForEntry,
            levelForEntry,
            entryProbe  // Pass explicit dimension
        )

        // HARD REQUIREMENT: Entry Family MUST exist
        if (!entryFamilyId) {
            console.error(`❌ [SESSION_START_ERROR] No Entry Family found`, {
                scenario_id,
                custom_scenario_id,
                role: roleForEntry,
                level: levelForEntry,
                dimension: entryProbe,
                first_eval_dimension: firstDimension
            })
            throw new Error(`SESSION_START_ERROR: No Entry Family available for role "${roleForEntry}" at level "${levelForEntry}" with dimension "${entryProbe}". Cannot start session.`)
        }

        familySelections['Entry'] = entryFamilyId
        console.log(`✅ [ENTRY_GUARANTEED] Entry Family selected: ${entryFamilyId} (role: ${roleForEntry}, level: ${levelForEntry}, dimension: ${entryProbe})`)

        // ===================================
        // 7f. PROBE SELECTION (Freshness Source)
        // ===================================
        const { selectProbe } = await import('@/lib/probes')

        // Select probe for Entry dimension (Turn 1)
        const probeSelections: Record<string, string | null> = {}
        const entryProbeObj = selectProbe(entryFamilyId, entryProbe)

        if (entryProbeObj) {
            probeSelections['Entry'] = entryProbeObj.id
            console.log(`✅ [PROBE_FOR_ENTRY]`, {
                entry_family: entryFamilyId,
                dimension: entryProbe,
                probe_id: entryProbeObj.id,
                intent_preview: entryProbeObj.intent.substring(0, 80) + '...'
            })
        } else {
            probeSelections['Entry'] = null
            console.warn(`⚠️ [PROBE_MISSING_FOR_ENTRY] No probe available for entry_family: ${entryFamilyId}, dimension: ${entryProbe}`)
        }

        console.log(`[SESSION_START] Selected families for user ${user.id} (${profile.package_tier}):`, familySelections)
        console.log(`[SESSION_START] Selected probes for session:`, probeSelections)

        // ===================================
        // 7g. DIMENSION ORDER RANDOMIZATION
        // ORDERING: AFTER AI injection so ai_fluency participates in shuffle
        // ===================================
        const { fisherYatesShuffle } = await import('@/lib/shuffle')

        // Shuffle dimensions once per session for unpredictable question order
        const dimensionOrder = fisherYatesShuffle(dimensionNames)

        console.log(`✅ [DIMENSION_SHUFFLE] Fresh session dimension order: ${dimensionOrder.join(' → ')}`)

        // 7c. Create Session with Family Selections, Dimension Order, AND Probe Selections
        const sessionPayload: any = {
            user_id: user.id,
            scenario_id: scenario_id,
            custom_scenario_id: custom_scenario_id || null,
            duration_seconds: duration_seconds,
            status: 'created',
            transcript: '',
            session_type: 'interview',
            family_selections: familySelections,  // Store selected families
            dimension_order: dimensionOrder,      // Store shuffled dimension sequence
            probe_selections: probeSelections     // Store selected probes (FRESHNESS SOURCE)
        }

        // DIAGNOSTIC A: Session Start - Log payload before insert
        console.log(`🔍 [SESSION_CREATE_PAYLOAD]`, {
            user_id: user.id,
            scenario_id,
            family_selections_payload: sessionPayload.family_selections,
            has_entry: !!sessionPayload.family_selections['Entry'],
            entry_value: sessionPayload.family_selections['Entry'],
            dimension_order_payload: sessionPayload.dimension_order
        })

        const { data: session, error: insertError } = await adminClient
            .from('sessions')
            .insert(sessionPayload)
            .select()
            .single<Database['public']['Tables']['sessions']['Row']>()

        // DIAGNOSTIC A2: Session Start - Verify what was actually inserted
        if (session) {
            console.log(`🔍 [SESSION_CREATED]`, {
                session_id: session.id,
                family_selections_returned: (session as any).family_selections,
                has_entry_returned: !!((session as any).family_selections?.['Entry'])
            })
        }

        if (insertError) {
            // COMPENSATION: Refund credit
            await adminClient
                .from('users')
                // @ts-ignore
                .update({
                    available_sessions: profile.available_sessions, // Reset
                    total_sessions_used: profile.total_sessions_used
                })
                .eq('id', user.id)

            throw new Error(`Failed to create session: ${insertError.message}`)
        }

        // 7d. Track Family Usage (Pro/Pro+ Only)
        if (profile.package_tier === 'Pro' || profile.package_tier === 'Pro+') {
            const usageRecords = Object.entries(familySelections).map(([dimension, familyId]) => ({
                user_id: user.id,
                dimension,
                family_id: familyId
            }))

            if (usageRecords.length > 0) {
                const { error: usageError } = await adminClient
                    .from('user_family_usage')
                    .insert(usageRecords as any)
                    .select() // Must select to avoid error on upsert

                if (usageError) {
                    console.error('[SESSION_START] Failed to track family usage:', usageError)
                    // Non-blocking - session creation succeeded
                }
            }
        }

        // =========================================================
        // AUTO-ASK TMAY (MANDATORY TURN 0)
        // =========================================================
        // We manually insert Turn 0 so the user is immediately prompted.
        // This removes the need for a client-side "Start" click/trigger.
        if (session.session_type === 'interview' && !session.replay_of_session_id) {
            console.log(`[TMAY_TRIGGER] Auto-creating Turn 0 for session ${session.id}`)

            const { error: tmayError } = await adminClient
                .from('interview_turns')
                .insert({
                    session_id: session.id,
                    turn_index: 0,
                    turn_type: 'question',
                    content: 'Tell me about yourself.', // Mandatory opening
                    answered: false
                } as any)

            if (tmayError) {
                console.error('❌ [TMAY_FAILURE] Failed to create opening turn:', tmayError)
                throw new Error("Invariant violation: TMAY must be auto-asked on session start. Turn creation failed.")
            }

            console.log(`✅ [TMAY_SUCCESS] Turn 0 created.`)
        }

        // Include Turn 0 in response for interview sessions
        if (session.session_type === 'interview' && !session.replay_of_session_id) {
            return NextResponse.json({
                ...session,
                initial_turn: {
                    turn_index: 0,
                    content: 'Tell me about yourself.',
                    role: 'assistant'
                }
            })
        }

        return NextResponse.json(session)

    } catch (error: any) {
        console.error('Session Start Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
