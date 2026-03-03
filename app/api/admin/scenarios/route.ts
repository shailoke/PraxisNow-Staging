import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdmin } from '@/lib/admin-server'
import { Database } from '@/lib/database.types'

export async function GET(req: NextRequest) {
    try {
        // Verify admin authentication
        const isAdmin = await checkAdmin()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Use service role to bypass RLS
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const adminClient = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        )

        // Fetch all scenarios (global, not user-specific)
        const { data: scenarios, error: scenariosError } = await adminClient
            .from('scenarios')
            .select('id, role, level, persona, prompt, evaluation_dimensions')
            .order('role', { ascending: true })
            .order('level', { ascending: true })

        if (scenariosError) {
            console.error('Scenarios fetch error:', scenariosError)
            return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 })
        }

        return NextResponse.json({ scenarios: scenarios || [] })

    } catch (error: any) {
        console.error('Admin scenarios endpoint error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
