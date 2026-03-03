import { createClient } from './supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // Check DB
    const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    return !!data?.is_admin
}

export async function getAdminSupabase() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required')
    }

    // Return service role client
    // Note: Assuming SUPABASE_SERVICE_ROLE_KEY is available in env
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function logAdminAction(action: string, targetResource: string, targetId: string | null, details: any = null) {
    // We use the admin client to log to ensure we can write to admin_logs even if RLS is strict
    // But getting the admin client re-verifies auth
    const adminClient = await getAdminSupabase()

    // Get current user ID for the log
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await adminClient.from('admin_logs').insert({
        admin_id: user.id,
        action,
        target_resource: targetResource,
        target_id: targetId,
        details
    })
}
