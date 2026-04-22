import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { session_id, content, turn_authority, is_first_question, turn_id } = body

        // CONTRACT: Authority validation
        const hasTurnAuthority = is_first_question === true || turn_authority === true

        if (!session_id || !hasTurnAuthority) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields or insufficient authority'
            }, { status: 400 })
        }

        // AUTH CHECK
        const cookieStore = await cookies()
        const authClient = createServerClient(
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
        const { data: { user }, error: authError } = await authClient.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // OWNERSHIP CHECK — verify the session belongs to the authenticated user
        const { data: session } = await supabase
            .from('sessions')
            .select('user_id')
            .eq('id', session_id)
            .single()

        if (!session || session.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // =========================================================
        // TRANSACTIONAL TURN SYSTEM: Idempotent turn reuse
        // =========================================================

        // Helper: Get latest unfilled interviewer turn with invariant check
        async function getLatestUnfilledTurn(sessionId: string): Promise<string | null> {
            const { data: unfilledTurns, error } = await supabase
                .from('interview_turns')
                .select('id, turn_index, content, answered')
                .eq('session_id', sessionId)
                .is('content', null)
                .eq('answered', false)
                .order('turn_index', { ascending: false })

            if (error) {
                console.error('❌ [UNFILLED_TURN_QUERY_ERROR]', error)
                return null
            }

            // INVARIANT ENFORCEMENT: At most one unfilled turn
            if (unfilledTurns && unfilledTurns.length > 1) {
                console.error('❌ [INVARIANT_VIOLATION] Multiple unfilled interviewer turns detected', {
                    session_id: sessionId,
                    count: unfilledTurns.length,
                    turn_ids: unfilledTurns.map((t: any) => t.id),
                    turn_indices: unfilledTurns.map((t: any) => t.turn_index)
                })
                // Log but continue with most recent (defensive recovery)
            }

            return unfilledTurns && unfilledTurns.length > 0 ? unfilledTurns[0].id : null
        }

        let turnId: string | null = turn_id || null
        let turnStatus: 'pending' | 'completed' | 'failed' = 'pending'
        let turnIndex: number

        // STEP 1: IDEMPOTENT TURN CREATION - Reuse or create
        const existingUnfilledTurnId = await getLatestUnfilledTurn(session_id)

        if (existingUnfilledTurnId) {
            // REUSE existing unfilled turn (retry scenario)
            turnId = existingUnfilledTurnId
            console.log(`♻️ [TURN_REUSE] Reusing unfilled turn (id: ${turnId})`)

            // Get turn index for response
            const { data: existingTurn } = await supabase
                .from('interview_turns')
                .select('turn_index')
                .eq('id', turnId)
                .single()

            turnIndex = (existingTurn as any)?.turn_index || 0
        } else {
            // CREATE new empty turn (first attempt)
            const { data: maxTurn } = await supabase
                .from('interview_turns')
                .select('turn_index')
                .eq('session_id', session_id)
                .order('turn_index', { ascending: false })
                .limit(1)
                .single()

            // =========================================================
            // HARD INVARIANT: TMAY (Turn 0) MUST EXIST
            // =========================================================
            if (!maxTurn) {
                console.error('❌ [FATAL] No Turn 0 found for session', { session_id })
                throw new Error("FATAL: Interview invoked before TMAY creation. Turn 0 must exist.")
            }

            turnIndex = (maxTurn as any).turn_index + 1

            // Create empty turn shell
            const { data: newTurn, error: insertError } = await supabase
                .from('interview_turns')
                .insert({
                    session_id,
                    turn_index: turnIndex,
                    turn_type: is_first_question ? 'question' : 'followup',
                    content: null, // NULL for unfilled detection
                    answered: false
                })
                .select('id')
                .single()

            if (insertError) {
                console.error('⚠️ Failed to create interview_turn:', insertError)
                return NextResponse.json({
                    success: false,
                    error: insertError.message,
                    turn_status: 'failed',
                    retryable: true
                }, { status: 500 })
            }

            turnId = (newTurn as any)?.id
            console.log(`✅ [TURN_CREATED] Empty turn #${turnIndex} created (id: ${turnId})`)
        }

        // STEP 2: POPULATE turn with content (if provided)
        if (content && content.trim()) {
            const { error: updateError } = await supabase
                .from('interview_turns')
                .update({ content: content.trim() })
                .eq('id', turnId)

            if (updateError) {
                console.error('⚠️ Failed to update turn content:', updateError)
                turnStatus = 'failed'
                return NextResponse.json({
                    success: false,
                    error: updateError.message,
                    turn_status: 'failed',
                    turn_id: turnId,
                    retryable: true
                }, { status: 500 })
            }

            console.log(`✅ [TURN_POPULATED] Turn ${turnId} populated with content`)
            turnStatus = 'completed'
        }

        return NextResponse.json({
            success: true,
            turn_index: turnIndex,
            turn_status: turnStatus,
            turn_id: turnId
        })

    } catch (error: any) {
        console.error('Turn creation error:', error)

        // Error classification
        const isRetryable =
            error?.code === 'PGRST' || // Postgres errors
            error?.message?.includes('timeout') ||
            error?.message?.includes('connection')

        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error',
            turn_status: 'failed',
            retryable: isRetryable
        }, { status: 500 })
    }
}
