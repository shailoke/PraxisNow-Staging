import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

// Called via navigator.sendBeacon when the user closes/navigates away mid-session.
// sendBeacon always ignores the response, so this route MUST return 200 in all cases.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { session_id } = body ?? {}

        if (!session_id) return new NextResponse(null, { status: 200 })

        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Only abandon sessions that are still live — never touch completed/failed rows.
        await adminClient
            .from('sessions')
            .update({ status: 'abandoned' } as any)
            .eq('id', session_id)
            .in('status', ['created', 'active', 'evaluating'])

        return new NextResponse(null, { status: 200 })
    } catch {
        // Always 200 — sendBeacon ignores responses and we don't want noise in logs
        // from malformed payloads reaching this route.
        return new NextResponse(null, { status: 200 })
    }
}
