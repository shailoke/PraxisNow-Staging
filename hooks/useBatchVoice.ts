'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Shared types (mirror of useRealtimeVoice.ts) ────────────────────────────
export type Message = {
    role: 'user' | 'assistant'
    content: string
}

export type InterviewState =
    | 'ASSISTANT_SPEAKING'
    | 'WAITING_FOR_USER'
    | 'READY_FOR_NEXT'
    | 'SESSION_ENDING'
    | 'TRANSCRIBING'
    | 'THINKING'

// ─── useBatchVoice ────────────────────────────────────────────────────────────
/**
 * Drop-in replacement for useRealtimeVoice.
 *
 * Architecture: STT (Whisper) → /api/interview (streaming) → sentence-level TTS
 * No WebRTC, no DataChannel, no Realtime API.
 *
 * Interface contract: identical return shape to useRealtimeVoice so the
 * simulator and negotiator pages need only a one-line import change.
 *
 * Turn flow inside askNextQuestion():
 *   1. Stop MediaRecorder, collect blob         → TRANSCRIBING state
 *   2. POST blob → /api/voice/stt → transcript  → THINKING state
 *   3. POST answer_text → /api/turns/answer     (ordering invariant)
 *   4. POST → /api/interview (stream mode)      → sentence chunks piped to TTS queue
 *   5. processTtsQueue plays sentences as they arrive → ASSISTANT_SPEAKING on first
 *   6. After queuePromise resolves: push messages to ref, set WAITING_FOR_USER
 *   7. startRecording() called after all audio done
 */
export function useBatchVoice(
    sessionId: string | null,
    initialInstruction: string = 'Introduce yourself briefly as the interviewer, then ask me to tell you about myself.',
    isPausedExternal: boolean = false,
    targetDuration: number = 30
) {
    // ── State ──────────────────────────────────────────────────────────────
    const [isConnected,           setIsConnected]           = useState(false)
    const [isSpeaking,            setIsSpeaking]            = useState(false)
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
    const [messages,              setMessages]              = useState<Message[]>([])
    const [interviewState,        setInterviewState]        = useState<InterviewState>('ASSISTANT_SPEAKING')
    const [error,                 setError]                 = useState<string | null>(null)

    // ── Refs ───────────────────────────────────────────────────────────────
    const isStartingRef             = useRef(false)
    const messagesRef               = useRef<Message[]>([])
    const mediaStreamRef            = useRef<MediaStream | null>(null)
    const mediaRecorderRef          = useRef<MediaRecorder | null>(null)
    const audioChunksRef            = useRef<Blob[]>([])
    const audioContextRef           = useRef<AudioContext | null>(null)
    const audioSourceRef            = useRef<AudioBufferSourceNode | null>(null)
    const ttsAbortControllerRef     = useRef<AbortController | null>(null)
    const pendingSystemMessagesRef  = useRef<string[]>([])
    const isPausedRef               = useRef(isPausedExternal)
    const isFirstQuestionPending    = useRef(true)
    const turnAuthorityTokens       = useRef(0)
    const assistantTurnCount        = useRef(0)
    const userTurnCount             = useRef(0)

    // ── Streaming TTS pipeline refs ────────────────────────────────────────
    const ttsQueueRef        = useRef<string[]>([])
    const isTtsProcessingRef = useRef(false)
    const streamCompleteRef  = useRef(false)

    // Keep pause ref in sync with external prop
    isPausedRef.current = isPausedExternal

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Start a fresh MediaRecorder session. Called after each interviewer turn. */
    const startRecording = useCallback(() => {
        if (!mediaStreamRef.current) return
        const track = mediaStreamRef.current?.getAudioTracks()[0]
        console.log('[startRecording] track state:', track?.readyState)
        if (!track || track.readyState === 'ended') {
            console.error('[useBatchVoice] Mic track is dead — cannot record')
            setError('Microphone disconnected. Please refresh.')
            return
        }
        const recorder = new MediaRecorder(mediaStreamRef.current, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm',
        })
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                audioChunksRef.current.push(e.data)
            }
        }
        recorder.start(250) // collect chunks every 250 ms
        mediaRecorderRef.current = recorder
    }, [])

    /** Stop the active MediaRecorder and return the collected Blob. */
    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current
            if (!recorder || recorder.state === 'inactive') {
                resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
                return
            }
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                resolve(blob)
            }
            recorder.stop()
        })
    }, [])

    // ── speakSentence ─────────────────────────────────────────────────────
    /**
     * Synthesise a single sentence via /api/voice/tts and play it via AudioContext.
     *
     * Returns a Promise that resolves after the sentence finishes playing.
     * Does NOT set interviewState, does NOT call startRecording, does NOT
     * increment assistantTurnCount — all post-turn logic is handled by
     * askNextQuestion() after processTtsQueue resolves.
     *
     * Used by both startSession() (for TMAY, full utterance) and
     * processTtsQueue() (for streaming sentence-by-sentence playback).
     */
    const speakSentence = useCallback(async (text: string) => {
        const abortController = new AbortController()
        ttsAbortControllerRef.current = abortController

        try {
            const ttsRes = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'onyx' }),
                signal: abortController.signal,
            })

            if (!ttsRes.ok) {
                throw new Error(`TTS error: ${ttsRes.status}`)
            }

            const audioBuffer = await ttsRes.arrayBuffer()
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = audioContext
            const decodedBuffer = await audioContext.decodeAudioData(audioBuffer)
            const source = audioContext.createBufferSource()
            audioSourceRef.current = source
            source.buffer = decodedBuffer
            source.connect(audioContext.destination)

            await new Promise<void>((resolve) => {
                source.onended = () => {
                    audioContext.close()
                    audioContextRef.current = null
                    audioSourceRef.current = null
                    resolve()
                }
                source.start(0)
            })

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[useBatchVoice] TTS fetch aborted (pause or end)')
                return
            }
            console.error('[useBatchVoice] speakSentence error:', err)
            // Resolve rather than reject so the queue continues
        }
    }, [])

    // ── processTtsQueue ───────────────────────────────────────────────────
    /**
     * Drain the TTS sentence queue concurrently with the streaming interview call.
     * Plays sentences as they arrive; waits 50 ms when queue is empty but stream
     * is still running. Resolves when both stream is complete and queue is empty.
     */
    const processTtsQueue = useCallback(async () => {
        if (isTtsProcessingRef.current) return
        isTtsProcessingRef.current = true
        let isFirstSentence = true

        while (true) {
            if (ttsQueueRef.current.length > 0) {
                const sentence = ttsQueueRef.current.shift()!

                if (isFirstSentence) {
                    setInterviewState('ASSISTANT_SPEAKING')
                    setIsInterviewerSpeaking(true)
                    setIsSpeaking(true)
                    isFirstSentence = false
                }

                await speakSentence(sentence)

            } else if (streamCompleteRef.current) {
                // Stream done and queue drained — all audio played
                break
            } else {
                // Stream still running, wait for more sentences
                await new Promise(r => setTimeout(r, 50))
            }
        }

        isTtsProcessingRef.current = false
    }, [speakSentence])

    // ── startSession ───────────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        if (isStartingRef.current) {
            console.warn('[useBatchVoice] startSession already in progress — skipping')
            return
        }
        if (!sessionId) {
            console.error('[useBatchVoice] Cannot start: no sessionId')
            return
        }
        isStartingRef.current = true
        setError(null)

        try {
            // 1. Request microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream

            // 2. Fetch Turn 0 (TMAY) from DB via server-side API route (bypasses RLS).
            //    TMAY is NEVER generated here. /api/interview must not be called for Turn 0.
            //    Invariant: turn_index=0 always exists at this point (session/start pre-seeds it).
            const openingRes = await fetch('/api/voice/opening', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
            })

            if (!openingRes.ok) {
                throw new Error('Failed to fetch opening question')
            }

            const { content: tmayContent } = await openingRes.json()

            // 3. Speak TMAY — blocks until audio finishes.
            //    startRecording() is called after speakSentence resolves (below).
            setIsInterviewerSpeaking(true)
            setIsSpeaking(true)
            setInterviewState('ASSISTANT_SPEAKING')
            await speakSentence(tmayContent)
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('WAITING_FOR_USER')
            isFirstQuestionPending.current = false
            audioChunksRef.current = []
            startRecording()

            // 4. Mark connected ONLY after TMAY has been spoken successfully.
            //    The simulator enters live-session UI state here — not before.
            const tmayMsg: Message = { role: 'assistant', content: tmayContent }
            messagesRef.current = [tmayMsg]
            setMessages([tmayMsg])
            assistantTurnCount.current += 1
            setIsConnected(true)

        } catch (err: any) {
            console.error('[useBatchVoice] startSession error:', err)
            setError(err.message || 'Failed to start session')
            setIsConnected(false)
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('ASSISTANT_SPEAKING')
            // Stop mic stream if it was acquired before the failure
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(t => t.stop())
                mediaStreamRef.current = null
            }
        } finally {
            isStartingRef.current = false
        }
    }, [sessionId, speakSentence, startRecording])

    // ── askNextQuestion ────────────────────────────────────────────────────
    const askNextQuestion = useCallback(async () => {
        // Guard: paused
        if (isPausedRef.current) {
            console.warn('[useBatchVoice] askNextQuestion blocked — session is paused')
            return
        }
        // Guard: already speaking
        if (isInterviewerSpeaking) {
            console.warn('[useBatchVoice] askNextQuestion blocked — interviewer already speaking')
            return
        }

        try {
            // 1. Stop MediaRecorder and assemble blob FIRST, then clear the chunk buffer.
            //    Clearing before stopRecording() produces an empty blob (root cause of 965B bug).
            console.log('[askNext] recorder state:', mediaRecorderRef.current?.state)
            console.log('[askNext] chunks before stop:', audioChunksRef.current.length)
            const audioBlob = await stopRecording()
            audioChunksRef.current = []

            // Guard: reject blobs too small to contain real speech (~5KB minimum)
            if (audioBlob.size < 5000) {
                console.warn('[useBatchVoice] Audio blob too small:', audioBlob.size, 'bytes — likely empty recording')
                audioChunksRef.current = []
                startRecording()
                return
            }

            // 2. STT
            setInterviewState('TRANSCRIBING')

            const sttFormData = new FormData()
            sttFormData.append('audio', audioBlob, 'audio.webm')
            sttFormData.append('session_id', sessionId ?? '')

            const sttRes = await fetch('/api/voice/stt', {
                method: 'POST',
                body: sttFormData,
            })

            if (!sttRes.ok) {
                throw new Error(`STT failed: ${sttRes.status}`)
            }

            const { transcript: sttTranscript } = await sttRes.json()

            // Guard: minimum transcript length (mirrors > 5 char threshold in useRealtimeVoice)
            if (!sttTranscript || sttTranscript.trim().length <= 5) {
                console.warn('[useBatchVoice] STT transcript too short — restarting recorder')
                audioChunksRef.current = []
                startRecording()
                return
            }

            // 3. ORDERING INVARIANT: await /api/turns/answer BEFORE /api/interview.
            //    The interview route marks the previous turn answered=true atomically.
            //    user_answer MUST be written first so it is never null on answered=true.
            //    .catch() keeps this non-throwing on failure; await enforces sequencing.
            setInterviewState('THINKING')

            await fetch('/api/turns/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    answer_text: sttTranscript.trim(),
                }),
            }).catch((err) => console.error('[useBatchVoice] answer persist failed:', err))

            // 4. Build pending system messages snapshot (cap at 3, discard oldest if over)
            const systemMsgsToSend = [...pendingSystemMessagesRef.current]

            // 5. Token + authority
            turnAuthorityTokens.current += 1

            // 6. Build message history including current user answer for GPT context
            const historySnapshot = [
                ...messagesRef.current,
                { role: 'user' as const, content: sttTranscript.trim() },
            ]

            // 7. Reset streaming state before starting
            streamCompleteRef.current = false
            ttsQueueRef.current = []
            isTtsProcessingRef.current = false

            // 8. Start TTS queue processor (runs concurrently with stream)
            const queuePromise = processTtsQueue()

            // 9. Fetch interview with streaming
            const interviewRes = await fetch('/api/interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-response-mode': 'stream',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    messages: historySnapshot,
                    userMessage: sttTranscript.trim(),
                    is_first_question: isFirstQuestionPending.current,
                    turn_authority: true,
                    sessionStartTime: Date.now(),
                    targetDuration: targetDuration,
                    pending_system_messages: systemMsgsToSend,
                }),
            })

            // 10. Clear the system message buffer AFTER interview call
            pendingSystemMessagesRef.current = []

            if (!interviewRes.ok || !interviewRes.body) {
                streamCompleteRef.current = true // unblock queue
                const errData = await interviewRes.json().catch(() => ({}))
                throw new Error((errData as any).error || `Interview API error: ${interviewRes.status}`)
            }

            // 11. Stream text, split on sentence boundaries
            const reader = interviewRes.body.getReader()
            const decoder = new TextDecoder()
            let fullText = ''
            let sentenceBuffer = ''

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    fullText += chunk
                    sentenceBuffer += chunk

                    // Split on sentence boundary: . ! ? followed by whitespace or end
                    let boundary: number
                    while ((boundary = sentenceBuffer.search(/[.!?](\s|$)/)) !== -1) {
                        const sentence = sentenceBuffer.slice(0, boundary + 1).trim()
                        sentenceBuffer = sentenceBuffer.slice(boundary + 2)
                        if (sentence.length > 15) {
                            ttsQueueRef.current.push(sentence)
                        }
                    }
                }

                // Flush remaining buffer
                const remaining = sentenceBuffer.trim()
                if (remaining.length > 15) {
                    ttsQueueRef.current.push(remaining)
                }
            } finally {
                // Always signal stream complete, even on error/abort
                streamCompleteRef.current = true
            }

            // 12. Wait for all TTS sentences to finish playing
            await queuePromise

            // 13. Post-turn state updates (stream + audio both done)
            const llmText = fullText.trim()
            if (!llmText) throw new Error('Empty response from interview API')

            turnAuthorityTokens.current -= 1
            isFirstQuestionPending.current = false
            userTurnCount.current += 1

            const userMsg: Message      = { role: 'user',      content: sttTranscript.trim() }
            const assistantMsg: Message = { role: 'assistant', content: llmText }
            messagesRef.current = [...messagesRef.current, userMsg, assistantMsg]
            setMessages([...messagesRef.current])

            // 14. Completion UI state — hand back to user
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('WAITING_FOR_USER')
            assistantTurnCount.current += 1
            audioChunksRef.current = []
            startRecording()

        } catch (err: any) {
            console.error('[useBatchVoice] askNextQuestion error:', err)
            setError(err.message || 'Turn failed')
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('WAITING_FOR_USER')
            // Restart recorder so the user can try again
            audioChunksRef.current = []
            startRecording()
        }
    }, [sessionId, isInterviewerSpeaking, stopRecording, startRecording, processTtsQueue, targetDuration])

    // ── injectSystemMessage ────────────────────────────────────────────────
    /**
     * Buffer a system message to be flushed with the next /api/interview call.
     * Cap at 3 items — discard oldest if a 4th is pushed.
     * (Amendment 5: prevents time-checkpoint backlog flooding GPT context)
     */
    const injectSystemMessage = useCallback((message: string) => {
        const MAX_BUFFER = 3
        const current = pendingSystemMessagesRef.current
        if (current.length >= MAX_BUFFER) {
            // Discard oldest
            pendingSystemMessagesRef.current = [...current.slice(1), message]
            console.warn('[useBatchVoice] injectSystemMessage: buffer full, discarded oldest')
        } else {
            pendingSystemMessagesRef.current = [...current, message]
        }
        console.log('[useBatchVoice] injectSystemMessage buffered. Buffer size:', pendingSystemMessagesRef.current.length)
    }, [])

    // ── waitForSafeExit ────────────────────────────────────────────────────
    /**
     * In the batch flow all round-trips are awaited synchronously.
     * Nothing is in-flight when handleEnd() fires — return immediately.
     */
    const waitForSafeExit = useCallback((_timeoutMs: number = 3000): Promise<void> => {
        return Promise.resolve()
    }, [])

    // ── abortInterviewerAudio ──────────────────────────────────────────────
    /**
     * Stop AudioContext playback, abort TTS fetch, clear TTS queue, reset state.
     */
    const abortInterviewerAudio = useCallback(() => {
        // Stop current audio
        audioSourceRef.current?.stop()
        audioContextRef.current?.close()
        audioContextRef.current = null
        audioSourceRef.current = null
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null
        // Clear streaming TTS pipeline
        ttsQueueRef.current = []
        isTtsProcessingRef.current = false
        setIsInterviewerSpeaking(false)
        setIsSpeaking(false)
        console.log('[useBatchVoice] abortInterviewerAudio — audio stopped, queue cleared')
    }, [])

    // ── endSession ─────────────────────────────────────────────────────────
    /**
     * Fully idempotent — safe to call multiple times.
     */
    const endSession = useCallback(() => {
        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
        }
        mediaRecorderRef.current = null

        // Stop mic stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop())
            mediaStreamRef.current = null
        }

        // Stop AudioContext
        audioSourceRef.current?.stop()
        audioContextRef.current?.close()
        audioContextRef.current = null
        audioSourceRef.current = null
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null

        // Clear streaming TTS pipeline
        ttsQueueRef.current = []
        isTtsProcessingRef.current = false
        streamCompleteRef.current = true // unblock any waiting processTtsQueue

        // Clear buffers
        audioChunksRef.current = []
        pendingSystemMessagesRef.current = []

        setIsConnected(false)
        setIsSpeaking(false)
        setIsInterviewerSpeaking(false)
        setInterviewState('SESSION_ENDING')

        console.log('[useBatchVoice] endSession — fully torn down')
    }, [])

    // ── getTurnStats ───────────────────────────────────────────────────────
    const getTurnStats = useCallback(() => ({
        assistantTurns: assistantTurnCount.current,
        userTurns:      userTurnCount.current,
        isValid:        userTurnCount.current >= assistantTurnCount.current - 1,
    }), [])

    // ── Return ─────────────────────────────────────────────────────────────
    return {
        isConnected,
        isSpeaking,
        isInterviewerSpeaking,
        startSession,
        endSession,
        abortInterviewerAudio,
        messages,
        messagesRef,
        waitForSafeExit,
        injectSystemMessage,
        askNextQuestion,
        getTurnStats,
        interviewState,
        error,
    }
}

// ─── Named alias so pages can import { useRealtimeVoice } from '@/hooks/useBatchVoice'
// without changing any destructuring in simulator or negotiator. ──────────────
export { useBatchVoice as useRealtimeVoice }

// ─── Step 4: Compile-time interface contract check ────────────────────────────
// This type assertion must compile without error before any page imports
// useBatchVoice. If it fails, the return shape diverges from useRealtimeVoice.
import type { useRealtimeVoice } from './useRealtimeVoice'
type _InterfaceCheck = ReturnType<typeof useBatchVoice> extends ReturnType<typeof useRealtimeVoice>
    ? true
    : never
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _check: _InterfaceCheck = true
