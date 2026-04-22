import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

// Edge runtime required — prevents Vercel's 30-second serverless timeout
// from killing audio mid-stream on long interviewer responses.
// @supabase/ssr is Edge-compatible: it uses Web Fetch/Crypto APIs with no Node.js dependencies.
export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/voice/tts
 *
 * Accepts: { text: string, voice?: string }
 * Returns: ReadableStream<audio/mpeg>
 *
 * Voice defaults to 'onyx' — deep, authoritative; closest TTS-1 match to
 * the Realtime API 'verse' voice. Configurable per call for future persona mapping.
 *
 * Called by useBatchVoice.ts inside askNextQuestion() after the /api/interview
 * response is received, to synthesise the interviewer's spoken question.
 */
export async function POST(request: NextRequest) {
    const TTS_T0 = Date.now() // TTS_T0: route handler entered
    try {
        // AUTH CHECK — createServerClient + cookies() is supported in Edge runtime
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

        const { text, voice = 'onyx' } = await request.json()

        if (!text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json(
                { success: false, error: 'text field required' },
                { status: 400 }
            )
        }

        const TTS_T1 = Date.now() // TTS_T1: before openai.audio.speech.create()
        const response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: text.trim(),
            response_format: 'mp3',
        })
        const TTS_T2 = Date.now() // TTS_T2: after await (stream available)

        // response.body is a ReadableStream<Uint8Array> — pipe it directly
        const stream = response.body as ReadableStream<Uint8Array>

        const TTS_T3 = Date.now() // TTS_T3: before return new Response(stream, ...)
        console.log(`[TTS_LATENCY] T0→T1: ${TTS_T1 - TTS_T0}ms | T1→T2: ${TTS_T2 - TTS_T1}ms | T2→T3: ${TTS_T3 - TTS_T2}ms | TOTAL: ${TTS_T3 - TTS_T0}ms | chars: ${text.trim().length}`)
        return new Response(stream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store',
                // Allow client to read response headers from JS (CORS safety)
                'Access-Control-Expose-Headers': 'Content-Type',
            },
        })

    } catch (error: any) {
        console.error('[TTS] OpenAI error:', error)
        return NextResponse.json(
            { success: false, error: error.message ?? 'TTS failed' },
            { status: 500 }
        )
    }
}
