import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Standard Node runtime — Whisper returns JSON (no streaming), no timeout concern
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/voice/stt
 *
 * Accepts: multipart/form-data with fields:
 *   audio      — Blob (audio/webm or audio/mp4 from MediaRecorder)
 *   session_id — string (for logging only)
 *
 * Returns: { transcript: string }
 *
 * Called by useBatchVoice.ts inside askNextQuestion() after the user's
 * MediaRecorder stops and the audio blob is collected.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const audioBlob = formData.get('audio') as File | null
        const sessionId  = formData.get('session_id') as string | null

        if (!audioBlob) {
            return NextResponse.json(
                { success: false, error: 'audio field required' },
                { status: 400 }
            )
        }

        // Whisper requires a File with a name that has a recognisable extension.
        // MediaRecorder typically produces audio/webm; name it accordingly.
        const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' })

        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            response_format: 'json',
        })

        const transcript = transcription.text?.trim() ?? ''

        console.log(`[STT] session=${sessionId ?? 'unknown'} length=${transcript.length} chars`)

        return NextResponse.json({ transcript })

    } catch (error: any) {
        console.error('[STT] Whisper error:', error)
        return NextResponse.json(
            { success: false, error: error.message ?? 'Transcription failed' },
            { status: 500 }
        )
    }
}
