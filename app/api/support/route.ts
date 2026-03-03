
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, session_id, issue_type, description, browser_info } = body;

        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
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

        // Insert into table
        const { error } = await supabase
            .from('support_issues' as any)
            // @ts-ignore
            .insert({
                user_id,
                session_id: session_id || null,
                issue_type,
                description,
                browser_info
            });

        if (error) {
            console.error('Support Insert Error:', error);
            throw new Error(error.message);
        }

        // TODO: Integrate real email service (Resend/SendGrid) here
        // For now, checking the database is the primary method.
        console.log(`[SUPPORT NOTIFICATION] New Issue: ${issue_type} from User ${user_id}`);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
