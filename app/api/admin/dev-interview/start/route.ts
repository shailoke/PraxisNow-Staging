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

        // 3. Create session record
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        )

        const sessionPayload: any = {
            user_id: user.id,
            scenario_id,
            status: 'created',
            session_type: 'interview',
            transcript: '',
            duration_seconds: 0,
            family_selections: {}
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
