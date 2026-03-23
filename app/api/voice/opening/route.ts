import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { session_id } = await req.json()
    console.log('[opening] session_id received:', session_id, typeof session_id)

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
