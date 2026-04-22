import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Only protect /simulator routes
    if (request.nextUrl.pathname.startsWith('/simulator')) {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(new URL('/auth', request.url))
        }

        // Check active pack from database
        const { data: profile } = await supabase
            .from('users')
            .select('package_tier, available_sessions, free_session_used')
            .eq('id', user.id)
            .single()

        const hasActiveSessions = (profile?.available_sessions ?? 0) > 0
        const freeSessionAvailable = profile?.free_session_used === false

        if (!hasActiveSessions && !freeSessionAvailable) {
            return NextResponse.redirect(new URL('/pricing', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/simulator/:path*',
    ],
}
