import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
    const { session_id } = await req.json()
    console.log('[opening] session_id received:', session_id, typeof session_id)

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

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await adminClient
        .from('interview_turns')
        .select('content')
        .eq('session_id', session_id)
        .eq('turn_index', 0)
        .single()

    if (error || !data?.content) {
        return NextResponse.json(
            { error: 'Turn 0 not found' },
            { status: 404 }
        )
    }

    return NextResponse.json({ content: data.content })
}
