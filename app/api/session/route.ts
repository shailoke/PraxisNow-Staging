import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { resolveRuntimeScenario, DbScenario, DbCustomScenario } from '@/lib/runtime-scenario'
import { generateInterviewerPrompt } from '@/app/config/interview-prompts'

import { NEGOTIATION_COACH_PROMPT } from '@/lib/negotiation-coach'

/**
 * POST /api/session
 *
 * Repurposed from Realtime token creation to session activation.
 * The batch voice hook (useBatchVoice) calls this once on startSession()
 * to update session status from 'created' → 'active' and optionally
 * returns the system instruction for debugging.
 *
 * Previously this route also created an OpenAI Realtime ephemeral token
 * (now removed — no Realtime API calls anywhere in the batch flow).
 *
 * Rollback note: to revert to Realtime, swap the import in the page files
 * from useBatchVoice back to useRealtimeVoice — this route is not called
 * by useRealtimeVoice (it used /api/session directly for the token).
 */
export async function POST(req: NextRequest) {
    try {
        const { session_id } = await req.json()

        if (!session_id) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
        }

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
                            // Ignore: called from Server Component
                        }
                    },
                },
            }
        )

        // 1. Fetch Session & Scenario Details
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('*, scenarios:scenario_id(*), custom_scenarios:custom_scenario_id(*)')
            .eq('id', session_id)
            .single()

        if (sessionError || !sessionData) {
            return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
        }

        const session = sessionData as any

        // 2. State Check
        if (session.status !== 'created' && session.status !== 'active') {
            return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
        }

        // 3. Update Status to Active (if created) — Service Role for safety
        if (session.status === 'created') {
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            const adminClient = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey
            )

            await adminClient
                .from('sessions')
                // @ts-ignore
                .update({ status: 'active' })
                .eq('id', session.id)
        }

        // 4. Build system instruction (for debugging / future use)
        let systemInstruction: string

        if (session.session_type === 'negotiation_simulation') {
            systemInstruction = NEGOTIATION_COACH_PROMPT
        } else {
            const { data: userData } = await supabase
                .from('users')
                .select('package_tier')
                .eq('id', session.user_id)
                .single()
            const userTier = ((userData as any)?.package_tier) || 'Starter'

            const baseScenario = session.scenarios as DbScenario
            const customScenario = session.custom_scenarios as DbCustomScenario | null

            const runtime = resolveRuntimeScenario(baseScenario, customScenario, userTier)

            systemInstruction = generateInterviewerPrompt({
                role: runtime.role,
                level: runtime.level,
                interview_type: runtime.interview_type,
                interviewer_persona: runtime.interviewer_persona,
                scenario_title: runtime.scenario_title,
                base_system_prompt: runtime.base_system_prompt,
                evaluation_dimensions: runtime.evaluation_dimensions.map(d => d.name),
                seeded_questions: runtime.seeded_questions,
                session_history: '',
                selected_families: (session as any).family_selections || {},
            })
        }

        // Replay injection (preserved for completeness)
        if (
            (session as any).questions_to_ask &&
            Array.isArray((session as any).questions_to_ask) &&
            (session as any).questions_to_ask.length > 0
        ) {
            const forcedQuestions = (session as any).questions_to_ask.join('\n- ')
            systemInstruction += `\n\n––––––––––––\nREPLAY MODE ACTIVE\n––––––––––––\nYou are conducting a REPLAY of a previous session. You MUST ASK these exact questions in this order:\n\n- ${forcedQuestions}\n\nINSTRUCTIONS:\n1. Ask the first question immediately after your introduction.\n2. Once the user answers, acknowledge briefly and ask the NEXT question in the list.\n3. Do NOT skip questions.\n4. Do NOT add new core questions unless they are simple clarifications.\n5. When the list is exhausted, end the interview.`
        }

        return NextResponse.json({
            status: 'activated',
            // systemInstruction returned for debugging only — not used by the batch hook
            systemInstruction,
        })

    } catch (error: any) {
        console.error('Session activation error:', error)
        return NextResponse.json({ error: 'Failed to activate session' }, { status: 500 })
    }
}
