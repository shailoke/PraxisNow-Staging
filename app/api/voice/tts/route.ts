import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Edge runtime required — prevents Vercel's 30-second serverless timeout
// from killing audio mid-stream on long interviewer responses.
export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/voice/tts
 *
 * Accepts: { text: string, voice?: string }
 * Returns: ReadableStream<audio/mpeg>
 *
 * Voice defaults to 'verse' — matches the Realtime API voice used in
 * /api/session/route.ts. Configurable per call for future persona mapping.
 *
 * Called by useBatchVoice.ts inside askNextQuestion() after the /api/interview
 * response is received, to synthesise the interviewer's spoken question.
 */
export async function POST(request: NextRequest) {
    try {
        const { text, voice = 'verse' } = await request.json()

        if (!text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json(
                { success: false, error: 'text field required' },
                { status: 400 }
            )
        }

        const response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: text.trim(),
            response_format: 'mp3',
        })

        // response.body is a ReadableStream<Uint8Array> — pipe it directly
        const stream = response.body as ReadableStream<Uint8Array>

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
