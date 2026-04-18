import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function trackEvent(
    eventName: string,
    userId: string | null,
    properties?: Record<string, unknown>
): Promise<void> {
    try {
        await adminClient
            .from('analytics_events')
            .insert({
                event_name: eventName,
                user_id: userId,
                properties: properties ?? {}
            })
    } catch (err) {
        console.error('[ANALYTICS] Failed to track event:', eventName, err)
    }
}
