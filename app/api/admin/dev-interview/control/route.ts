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

        const { session_id, action, duration_seconds } = await req.json()

        if (!session_id || !action) {
            return NextResponse.json({ error: 'session_id and action are required' }, { status: 400 })
        }

        // 2. Handle actions
        if (action === 'pause' || action === 'resume') {
            // Pause/Resume are client-side only (timer state)
            // No DB updates needed
            console.log(`ℹ️ Dev interview ${action}: ${session_id}`)
            return NextResponse.json({ success: true, action })
        }

        if (action === 'mark_answered') {
            // MARK ANSWERED = TRUE (No generation)
            // Use service role to update turns
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            const adminClient = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey
            )

            // Find latest turn
            const { data: latestTurns } = await adminClient
                .from('interview_turns')
                .select('id, turn_index')
                .eq('session_id', session_id)
                .order('turn_index', { ascending: false })
                .limit(1)

            if (latestTurns && latestTurns.length > 0) {
                const latestTurn = latestTurns[0]

                // ATOMIC PERSISTENCE: Mark turn as answered
                const { error: updateError } = await adminClient
                    .from('interview_turns')
                    .update({ answered: true })
                    .eq('id', latestTurn.id)

                if (updateError) {
                    console.error('❌ [PERSISTENCE_FAILURE] Failed to mark turn answered:', updateError)
                    return NextResponse.json({
                        success: false,
                        error: 'Answer persistence failed',
                        details: updateError.message
                    }, { status: 500 })
                }

                console.log(`✅ [ANSWER_PERSISTED] Turn #${latestTurn.turn_index} marked as answered (id: ${latestTurn.id})`)
                return NextResponse.json({ success: true, action: 'mark_answered', turn_index: latestTurn.turn_index })
            }

            return NextResponse.json({ success: false, reason: 'no_turns' })
        }

        if (action === 'end') {
            if (typeof duration_seconds !== 'number') {
                return NextResponse.json({ error: 'duration_seconds required for end action' }, { status: 400 })
            }

            // Use service role to update session
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            const adminClient = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey
            )

            const { error: updateError } = await adminClient
                .from('sessions')
                .update({
                    status: 'completed',
                    duration_seconds
                } as any)
                .eq('id', session_id)

            if (updateError) {
                console.error('Session end error:', updateError)
                return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
            }

            console.log(`✅ Dev interview ended: ${session_id}, duration: ${duration_seconds}s`)
            return NextResponse.json({ success: true, action: 'end' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('Dev interview control error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
