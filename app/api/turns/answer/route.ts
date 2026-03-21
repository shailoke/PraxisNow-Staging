import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/turns/answer
 *
 * Persists the canonical user_answer to the most recent open (answered=false) turn
 * for the given session. Called by useRealtimeVoice.ts inside the
 * conversation.item.input_audio_transcription.completed handler, which fires
 * BEFORE the turn is marked answered=true.
 *
 * This is the single write path for user_answer. The evaluate/route.ts reads
 * from this field exclusively — no heuristic field guessing.
 */
export async function POST(request: NextRequest) {
    try {
        const { session_id, answer_text } = await request.json()

        if (!session_id || !answer_text?.trim()) {
            return NextResponse.json({ success: false, reason: 'missing_fields' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Find the most recent answered=false turn for this session.
        // This targets the turn that was just answered — ordering by turn_index DESC
        // ensures we match the correct turn when multiple open turns exist.
        const { data: latestTurn, error: fetchError } = await supabase
            .from('interview_turns')
            .select('id, turn_index')
            .eq('session_id', session_id)
            .eq('answered', false)
            .order('turn_index', { ascending: false })
            .limit(1)
            .single()

        if (fetchError || !latestTurn) {
            console.warn('[ANSWER_PERSIST] No open turn found for session:', session_id)
            return NextResponse.json({ success: false, reason: 'no_open_turn' })
        }

        const wordCount = answer_text.trim().split(/\s+/).length

        const { error: updateError } = await supabase
            .from('interview_turns')
            .update({
                user_answer: answer_text.trim(),
                user_answer_word_count: wordCount,
                user_answer_captured_at: new Date().toISOString(),
            })
            .eq('id', latestTurn.id)

        if (updateError) {
            console.error('[ANSWER_PERSIST] Update failed:', updateError)
            return NextResponse.json({ success: false, reason: 'update_failed' }, { status: 500 })
        }

        console.log(`[ANSWER_PERSIST] Written ${wordCount} words to turn #${latestTurn.turn_index} for session ${session_id}`)
        return NextResponse.json({ success: true, turn_index: latestTurn.turn_index, word_count: wordCount })

    } catch (error: any) {
        console.error('[ANSWER_PERSIST] Unexpected error:', error)
        return NextResponse.json({ success: false, reason: 'unexpected_error' }, { status: 500 })
    }
}
