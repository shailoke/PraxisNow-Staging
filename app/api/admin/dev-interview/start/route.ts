import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdmin } from '@/lib/admin-server'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
    try {
        // 1. Verify admin authentication
        const isAdmin = await checkAdmin()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { scenario_id, custom_scenario_id } = await req.json()

        if (!scenario_id) {
            return NextResponse.json({ error: 'scenario_id is required' }, { status: 400 })
        }

        // 2. Get admin user ID
        const { createServerClient } = await import('@supabase/ssr')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()

        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: any) {
                        try { cookieStore.set({ name, value, ...options }) } catch { }
                    },
                    remove(name: string, options: any) {
                        try { cookieStore.set({ name, value: '', ...options }) } catch { }
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        // 3. Resolve role, level, dimension and select Entry Family
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        )

        // Get scenario role, level, and dimensions
        let roleForEntry = 'Generic'
        let levelForEntry = 'Mid' // Default fallback
        let dimensionForEntry = 'metrics' // Default dimension
        const { INTERVIEW_SCENARIOS } = await import('@/lib/runtime-scenario')

        if (INTERVIEW_SCENARIOS[scenario_id as string]) {
            const scenario = INTERVIEW_SCENARIOS[scenario_id as string]
            roleForEntry = scenario.role || 'Generic'
            levelForEntry = scenario.level || 'Mid'
            // Use first dimension from scenario (most important)
            const dims = scenario.evaluation_dimensions
            dimensionForEntry = (Array.isArray(dims) && dims.length > 0) ? dims[0] : 'metrics'
            console.log(`[DEV_SESSION] Resolved hardcoded scenario:`, { roleForEntry, levelForEntry, dimensionForEntry })
        } else if (typeof scenario_id === 'number' || !isNaN(Number(scenario_id))) {
            const { data: s } = await adminClient
                .from('scenarios')
                .select('role, level, evaluation_dimensions')
                .eq('id', scenario_id)
                .single()

            if (s) {
                roleForEntry = (s as any).role || 'Generic'
                levelForEntry = (s as any).level || 'Mid'
                const dims = (s as any).evaluation_dimensions
                dimensionForEntry = (Array.isArray(dims) && dims.length > 0) ? dims[0] : 'metrics'
                console.log(`[DEV_SESSION] Resolved DB scenario:`, { roleForEntry, levelForEntry, dimensionForEntry })
            }
        }

        // DIAGNOSTIC: Log exactly what we're passing to selectEntryFamily
        console.log('[DEV_ENTRY_INPUT]', {
            roleForEntry,
            levelForEntry,
            dimensionForEntry,
            scenario_id
        })

        // GUARD: Ensure only canonical dimensions reach Entry Family resolution
        const { VALID_EVALUATION_DIMENSIONS } = await import('@/lib/runtime-scenario')
        if (!VALID_EVALUATION_DIMENSIONS.includes(dimensionForEntry as any)) {
            throw new Error(
                `[DEV_HARNESS_DIMENSION_LEAK] "${dimensionForEntry}" is not a canonical dimension. ` +
                `Use scenario.evaluation_dimensions only. Valid: ${VALID_EVALUATION_DIMENSIONS.join(', ')}`
            )
        }

        // Import and call selectEntryFamily with CORRECT arguments
        const { selectEntryFamily } = await import('@/lib/runtime-scenario')
        const entryFamilyId = await selectEntryFamily(
            roleForEntry,
            levelForEntry,      // ✅ FIXED: was user.id
            dimensionForEntry   // ✅ FIXED: was package_tier
        )

        // HARD REQUIREMENT: Entry Family MUST exist
        if (!entryFamilyId) {
            console.error(`❌ [DEV_SESSION_ERROR] No Entry Family for role: ${roleForEntry}, level: ${levelForEntry}, dimension: ${dimensionForEntry}`, {
                scenario_id,
                user_id: user.id
            })
            return NextResponse.json({
                error: `SESSION_START_ERROR: No Entry Family available for role "${roleForEntry}", level "${levelForEntry}", dimension "${dimensionForEntry}"`
            }, { status: 500 })
        }

        const familySelections: Record<string, string> = {
            'Entry': entryFamilyId
        }
        console.log(`✅ [DEV_ENTRY_GUARANTEED] Entry Family: ${entryFamilyId} for role: ${roleForEntry}`)

        // 4. Create session record
        const sessionPayload: any = {
            user_id: user.id,
            scenario_id,
            status: 'created',
            session_type: 'interview',
            transcript: '',
            duration_seconds: 0,
            family_selections: familySelections
        }

        if (custom_scenario_id) {
            sessionPayload.custom_scenario_id = custom_scenario_id
        }

        const { data: session, error: sessionError } = await adminClient
            .from('sessions')
            .insert(sessionPayload)
            .select()
            .single()

        if (sessionError) {
            console.error('Session creation error:', sessionError)
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
        }

        console.log(`✅ Dev interview session created: ${session.id}`)

        // =========================================================
        // AUTO-CREATE TURN 0 (TMAY) - MANDATORY
        // =========================================================
        console.log(`[TMAY_TRIGGER] Auto-creating Turn 0 for session ${session.id}`)

        const { error: tmayError } = await adminClient
            .from('interview_turns')
            .insert({
                session_id: session.id,
                turn_index: 0,
                turn_type: 'question',
                content: 'Tell me about yourself.',
                answered: false
            } as any)

        if (tmayError) {
            console.error('❌ [TMAY_FAILURE] Failed to create Turn 0:', tmayError)
            throw new Error("TMAY Turn 0 creation failed at session start")
        }

        console.log(`✅ [TMAY_SUCCESS] Turn 0 created for session ${session.id}`)

        return NextResponse.json({
            session_id: session.id,
            initial_turn: {
                turn_index: 0,
                content: 'Tell me about yourself.',
                role: 'assistant'
            }
        })

    } catch (error: any) {
        console.error('Dev interview start error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
