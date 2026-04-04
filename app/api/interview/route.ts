import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
    try {
        const {
            session_id,
            userMessage,
            messages,
            is_first_question,
            turn_authority,
            sessionStartTime,
            targetDuration = 30,
        } = await req.json()

        // STEP 1 — INVARIANT CHECKS
        if (messages.length === 0) {
            console.error('[INVARIANT_VIOLATION] Attempt to generate Turn 0 (TMAY) via API.')
            throw new Error('Invariant violation: TMAY must be auto-created at session start.')
        }

        if (!userMessage || !userMessage.trim()) {
            console.error('[INVARIANT_VIOLATION] Attempt to advance turn without user answer.')
            throw new Error('Invariant violation: Turn advancement requires explicit user input.')
        }

        // STEP 2 — SETUP
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        // STEP 3 — FETCH SESSION
        const { data: session } = await supabase
            .from('sessions')
            .select('scenario_id, user_id, round')
            .eq('id', session_id)
            .single()

        const userId = session?.user_id ?? ''
        const round = (session as any)?.round ?? null

        // STEP 4 — FETCH SCENARIO
        const { data: scenario } = await supabase
            .from('scenarios')
            .select('system_prompt, role, duration_minutes')
            .eq('id', session?.scenario_id ?? 0)
            .single()

        if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 })

        // STEP 5 — TURN AUTHORITY GATE
        const hasSpeechAuthority = is_first_question === true || turn_authority === true
        if (!hasSpeechAuthority) {
            return NextResponse.json({
                message: null,
                suppressed: true,
                reason: 'No turn authority granted'
            })
        }

        // STEP 6 — FETCH ANTI-CONVERGENCE BLOCKLIST
        let recentQuestions: string[] = []
        try {
            const { data: history } = await supabase
                .from('user_question_history')
                .select('question_text')
                .eq('user_id', userId)
                .eq('role', (scenario as any).role)
                .eq('round', round)
                .order('created_at', { ascending: false })
                .limit(50)

            recentQuestions = history?.map(h => h.question_text).filter(Boolean) as string[] ?? []
        } catch (err) {
            console.warn('[INTERVIEW] Failed to fetch anti-convergence blocklist:', err)
        }

        // STEP 7 — BUILD CONVERSATION HISTORY
        const sessionHistory = messages
            .map((m: { role: string; content: string }) =>
                `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
            )
            .join('\n')

        // STEP 8 — BUILD SYSTEM PROMPT
        const blocklist = recentQuestions.length > 0
            ? recentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
            : 'None yet.'

        const systemPrompt = (scenario.system_prompt ?? '')
            .replace('{{BLOCKLIST}}', blocklist)
            .replace('{{TRANSCRIPT}}', sessionHistory || '(Session just started.)')

        // STEP 9 — BUILD OPENAI MESSAGES
        const openaiMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages,
            { role: 'user' as const, content: userMessage }
        ]

        // STEP 10 — CALL GPT-4o
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: openaiMessages,
            temperature: 0.7,
            max_tokens: 500,
        })

        const assistantMessage = (completion.choices[0].message.content ?? '').trim()

        // STEP 11 — VALIDATE RESPONSE
        if (assistantMessage.includes('Candidate:') || assistantMessage.includes('Interviewer said:')) {
            throw new Error('GPT response failed validation — candidate speech detected.')
        }

        // STEP 12 — ATOMIC DB WRITES
        let nextIndex = 1
        try {
            // WRITE A — Mark previous turn answered
            if (turn_authority === true) {
                const { data: latestTurn } = await supabase
                    .from('interview_turns')
                    .select('id, turn_index')
                    .eq('session_id', session_id)
                    .order('turn_index', { ascending: false })
                    .limit(1)
                    .single()

                if (latestTurn) {
                    const { error: markError } = await supabase
                        .from('interview_turns')
                        .update({ answered: true })
                        .eq('id', latestTurn.id)

                    if (markError) throw new Error(`Failed to mark turn answered: ${markError.message}`)
                }
            }

            // WRITE B — Insert new turn
            const { data: maxTurn } = await supabase
                .from('interview_turns')
                .select('turn_index')
                .eq('session_id', session_id)
                .order('turn_index', { ascending: false })
                .limit(1)
                .single()

            nextIndex = (maxTurn?.turn_index ?? 0) + 1

            const { error: insertError } = await supabase
                .from('interview_turns')
                .insert({
                    session_id,
                    turn_index: nextIndex,
                    turn_type: 'question',
                    content: assistantMessage,
                    answered: false,
                } as any)

            if (insertError) throw new Error(`Failed to insert turn: ${insertError.message}`)

        } catch (dbErr: any) {
            throw new Error(dbErr.message)
        }

        // STEP 13 — WRITE TO user_question_history (fire-and-forget)
        ;(async () => {
            try {
                await supabase
                    .from('user_question_history')
                    .insert({
                        user_id: userId,
                        role: (scenario as any).role,
                        round,
                        session_id,
                        turn_index: nextIndex,
                        question_text: assistantMessage,
                    } as any)
            } catch (err) {
                console.warn('[INTERVIEW] Failed to write user_question_history:', err)
            }
        })()

        // STEP 14 — RETURN
        return NextResponse.json({ message: assistantMessage })

    } catch (error: any) {
        console.error('[INTERVIEW] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
