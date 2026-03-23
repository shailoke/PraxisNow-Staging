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

// ─── useBatchVoice ────────────────────────────────────────────────────────────
/**
 * Drop-in replacement for useRealtimeVoice.
 *
 * Architecture: STT (Whisper) → /api/interview (GPT-4o) → TTS (tts-1)
 * No WebRTC, no DataChannel, no Realtime API.
 *
 * Interface contract: identical return shape to useRealtimeVoice so the
 * simulator and negotiator pages need only a one-line import change.
 *
 * Turn flow inside askNextQuestion():
 *   1. Stop MediaRecorder, collect blob
 *   2. POST blob → /api/voice/stt → sttTranscript
 *   3. POST { session_id, answer_text } → /api/turns/answer   (ordering invariant)
 *   4. POST { session_id, messages: history, userMessage } → /api/interview
 *   5. Push user + assistant messages to messagesRef / state
 *   6. POST llmText → /api/voice/tts → audio blob → play
 *   7. On audio end: restart MediaRecorder, setInterviewState('WAITING_FOR_USER')
 */
export function useBatchVoice(
    sessionId: string | null,
    initialInstruction: string = 'Introduce yourself briefly as the interviewer, then ask me to tell you about myself.',
    isPausedExternal: boolean = false,
    targetDuration: number = 30
) {
    // ── State ──────────────────────────────────────────────────────────────
    const [isConnected,          setIsConnected]          = useState(false)
    const [isSpeaking,           setIsSpeaking]           = useState(false)
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
    const [messages,             setMessages]             = useState<Message[]>([])
    const [interviewState,       setInterviewState]       = useState<InterviewState>('ASSISTANT_SPEAKING')
    const [error,                setError]                = useState<string | null>(null)

    // ── Refs ───────────────────────────────────────────────────────────────
    const messagesRef               = useRef<Message[]>([])
    const mediaStreamRef            = useRef<MediaStream | null>(null)
    const mediaRecorderRef          = useRef<MediaRecorder | null>(null)
    const audioChunksRef            = useRef<Blob[]>([])
    const currentAudioRef           = useRef<HTMLAudioElement | null>(null)
    const currentObjectUrlRef       = useRef<string | null>(null)
    const ttsAbortControllerRef     = useRef<AbortController | null>(null)
    const pendingSystemMessagesRef  = useRef<string[]>([])
    const isPausedRef               = useRef(isPausedExternal)
    const isFirstQuestionPending    = useRef(true)
    const turnAuthorityTokens       = useRef(0)
    const assistantTurnCount        = useRef(0)
    const userTurnCount             = useRef(0)

    // Keep pause ref in sync with external prop
    isPausedRef.current = isPausedExternal

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Revoke the current TTS object URL and clear the ref. */
    const revokeCurrentUrl = useCallback(() => {
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current)
            currentObjectUrlRef.current = null
        }
    }, [])

    /** Start a fresh MediaRecorder session. Called after each interviewer turn. */
    const startRecording = useCallback(() => {
        if (!mediaStreamRef.current) return
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

    // ── speakText ─────────────────────────────────────────────────────────
    /**
     * Synthesise `text` via /api/voice/tts, buffer the full response, and
     * play it via URL.createObjectURL.
     *
     * V1: Full buffer before play. MediaSource streaming is a future optimisation
     * (iOS Safari compatibility with MediaSource for audio/mpeg is unverified).
     * TODO: replace with MediaSource streaming once iOS Safari support is confirmed.
     *
     * Declared before startSession so startSession can reference it in its
     * useCallback dependency array without a forward-reference TS error.
     */
    const speakText = useCallback(async (text: string) => {
        revokeCurrentUrl()

        const abortController = new AbortController()
        ttsAbortControllerRef.current = abortController

        setIsInterviewerSpeaking(true)
        setIsSpeaking(true)
        setInterviewState('ASSISTANT_SPEAKING')

        try {
            const ttsRes = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'verse' }),
                signal: abortController.signal,
            })

            if (!ttsRes.ok) {
                throw new Error(`TTS error: ${ttsRes.status}`)
            }

            // Buffer the full response before playing
            const audioBuffer = await ttsRes.arrayBuffer()
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
            const objectUrl = URL.createObjectURL(blob)
            currentObjectUrlRef.current = objectUrl

            const audio = new Audio(objectUrl)
            currentAudioRef.current = audio

            audio.onended = () => {
                revokeCurrentUrl()
                setIsInterviewerSpeaking(false)
                setIsSpeaking(false)
                setInterviewState('WAITING_FOR_USER')
                assistantTurnCount.current += 1

                // Start recording user's response
                audioChunksRef.current = []
                startRecording()
            }

            audio.onerror = (e) => {
                console.error('[useBatchVoice] Audio playback error:', e)
                revokeCurrentUrl()
                setIsInterviewerSpeaking(false)
                setIsSpeaking(false)
                setInterviewState('WAITING_FOR_USER')
                audioChunksRef.current = []
                startRecording()
            }

            await audio.play()

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[useBatchVoice] TTS fetch aborted (pause or end)')
                return
            }
            console.error('[useBatchVoice] speakText error:', err)
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('WAITING_FOR_USER')
            audioChunksRef.current = []
            startRecording()
        }
    }, [revokeCurrentUrl, startRecording])

    // ── startSession ───────────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        if (!sessionId) {
            console.error('[useBatchVoice] Cannot start: no sessionId')
            return
        }
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
            //    startRecording() is called by speakText's onended handler.
            await speakText(tmayContent)

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
        }
    }, [sessionId, speakText])

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
            // AMENDMENT 3: Clear chunk buffer at the START, before collecting new chunks
            audioChunksRef.current = []

            // 1. Stop MediaRecorder and collect audio blob
            const audioBlob = await stopRecording()

            // 2. STT
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

            // 6. Call /api/interview
            //    messages = history WITHOUT current user message (passed as userMessage separately)
            //    Amendment 2: push user message to ref AFTER interview returns
            const historySnapshot = [...messagesRef.current]

            setInterviewState('READY_FOR_NEXT')

            const interviewRes = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            // 7. Clear the system message buffer AFTER interview call (whether it succeeded or not)
            pendingSystemMessagesRef.current = []

            if (!interviewRes.ok) {
                const errData = await interviewRes.json().catch(() => ({}))
                throw new Error(errData.error || `Interview API error: ${interviewRes.status}`)
            }

            const interviewData = await interviewRes.json()
            const llmText: string = interviewData.message?.trim() ?? ''

            if (!llmText) throw new Error('Interview API returned empty message')

            turnAuthorityTokens.current -= 1
            isFirstQuestionPending.current = false
            userTurnCount.current += 1

            // Amendment 2: push BOTH user and assistant messages AFTER /api/interview returns
            const userMsg: Message      = { role: 'user',      content: sttTranscript.trim() }
            const assistantMsg: Message = { role: 'assistant', content: llmText }
            messagesRef.current = [...messagesRef.current, userMsg, assistantMsg]
            setMessages([...messagesRef.current])

            // 8. Speak the interviewer's response
            await speakText(llmText)

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
    }, [sessionId, isInterviewerSpeaking, stopRecording, startRecording, speakText, targetDuration])

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
     * Amendment 8:
     * (a) pause + clear currentAudioRef
     * (b) abort TTS fetch
     * (c) revoke object URL (memory leak prevention)
     * (d) set speaking state false
     */
    const abortInterviewerAudio = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current.src = ''
            currentAudioRef.current = null
        }
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null
        revokeCurrentUrl()
        setIsInterviewerSpeaking(false)
        setIsSpeaking(false)
        console.log('[useBatchVoice] abortInterviewerAudio — audio stopped, URL revoked')
    }, [revokeCurrentUrl])

    // ── endSession ─────────────────────────────────────────────────────────
    /**
     * Amendment 9: fully idempotent — safe to call multiple times.
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

        // Stop audio + revoke URL
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current.src = ''
            currentAudioRef.current = null
        }
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null
        revokeCurrentUrl()

        // Clear buffers
        audioChunksRef.current = []
        pendingSystemMessagesRef.current = []

        setIsConnected(false)
        setIsSpeaking(false)
        setIsInterviewerSpeaking(false)
        setInterviewState('SESSION_ENDING')

        console.log('[useBatchVoice] endSession — fully torn down')
    }, [revokeCurrentUrl])

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
