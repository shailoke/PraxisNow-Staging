import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase Config Missing:', { supabaseUrl, supabaseKey })
        throw new Error('Supabase URL and Key must be defined in .env.local')
    }

    return createBrowserClient(supabaseUrl, supabaseKey)
}
