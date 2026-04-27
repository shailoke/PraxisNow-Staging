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
 * Architecture: STT (Whisper) → /api/interview (full response) → single TTS call
 * No WebRTC, no DataChannel, no Realtime API.
 *
 * Interface contract: identical return shape to useRealtimeVoice so the
 * simulator and negotiator pages need only a one-line import change.
 *
 * Turn flow inside askNextQuestion():
 *   1. Stop MediaRecorder, collect blob         → TRANSCRIBING state
 *   2. POST blob → /api/voice/stt → transcript  → THINKING state
 *   3. POST answer_text → /api/turns/answer     (ordering invariant)
 *   4. POST → /api/interview → full JSON response
 *   5. speakText(llmText)                       → ASSISTANT_SPEAKING state
 *   6. onended: reset state, startRecording()
 *   7. Post-turn: update messages, turn counters
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
    const audioElRef                = useRef<HTMLAudioElement | null>(null)
    const blobUrlRef                = useRef<string | null>(null)
    const readerRef                 = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
    const ttsAbortControllerRef     = useRef<AbortController | null>(null)
    const interruptedTextRef         = useRef<string | null>(null)
    const speakRejectRef             = useRef<((reason: Error) => void) | null>(null)
    const pendingSystemMessagesRef  = useRef<string[]>([])
    const isPausedRef               = useRef(isPausedExternal)
    const isFirstQuestionPending    = useRef(true)
    const turnAuthorityTokens       = useRef(0)
    const assistantTurnCount        = useRef(0)
    const userTurnCount             = useRef(0)
    const recordingSafetyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
    const askNextQuestionRef        = useRef<() => void>(() => {})

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

        // Safety: auto-submit after 3 minutes to prevent oversized blobs
        const MAX_RECORDING_MS = 180_000
        if (recordingSafetyTimerRef.current) clearTimeout(recordingSafetyTimerRef.current)
        recordingSafetyTimerRef.current = setTimeout(() => {
            console.warn('[useBatchVoice] Max recording duration reached — auto-stopping')
            askNextQuestionRef.current()
        }, MAX_RECORDING_MS)
    }, [])

    /** Stop the active MediaRecorder and return the collected Blob. */
    const stopRecording = useCallback((): Promise<Blob> => {
        // Clear safety timer whenever recording stops normally
        if (recordingSafetyTimerRef.current) {
            clearTimeout(recordingSafetyTimerRef.current)
            recordingSafetyTimerRef.current = null
        }
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
     * Synthesise the full interviewer response via /api/voice/tts and play
     * it via AudioContext as one continuous audio buffer.
     *
     * onended handler handles all post-turn side effects:
     *   - Resets isSpeaking / isInterviewerSpeaking state
     *   - Sets interviewState → WAITING_FOR_USER
     *   - Increments assistantTurnCount
     *   - Clears audioChunksRef
     *   - Calls startRecording() to re-arm the mic
     *
     * Returns a Promise that resolves after audio finishes (onended has run).
     */
    const speakText = useCallback(async (text: string) => {
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

            const supportsMediaSource = typeof MediaSource !== 'undefined' &&
                MediaSource.isTypeSupported('audio/mpeg')

            if (!supportsMediaSource) {
                // Fallback: blob URL path for browsers without MediaSource (iOS Safari)
                const blob = await ttsRes.blob()
                const blobUrl = URL.createObjectURL(blob)
                return new Promise<void>((resolve, reject) => {
                    speakRejectRef.current = reject
                    const audioEl = new Audio(blobUrl)
                    audioElRef.current = audioEl
                    blobUrlRef.current = blobUrl
                    audioEl.onended = () => {
                        speakRejectRef.current = null
                        URL.revokeObjectURL(blobUrl)
                        audioContextRef.current = null
                        audioSourceRef.current = null
                        setIsInterviewerSpeaking(false)
                        setIsSpeaking(false)
                        setInterviewState('WAITING_FOR_USER')
                        assistantTurnCount.current += 1
                        audioChunksRef.current = []
                        startRecording()
                        resolve()
                    }
                    audioEl.onerror = (err) => {
                        speakRejectRef.current = null
                        console.error('[AUDIO_PLAYBACK_ERROR_FALLBACK]', err)
                        URL.revokeObjectURL(blobUrl)
                        audioContextRef.current = null
                        audioSourceRef.current = null
                        setIsInterviewerSpeaking(false)
                        setIsSpeaking(false)
                        setInterviewState('WAITING_FOR_USER')
                        assistantTurnCount.current += 1
                        audioChunksRef.current = []
                        startRecording()
                        resolve()
                    }
                    audioEl.oncanplay = () => {
                        setInterviewState('ASSISTANT_SPEAKING')
                        setIsInterviewerSpeaking(true)
                        setIsSpeaking(true)
                    }
                    audioEl.play().catch(err => console.error('[AUDIO_PLAY_ERROR_FALLBACK]', err))
                })
            }

            // MediaSource path continues below (existing code unchanged)
            return new Promise<void>((resolve, reject) => {
                speakRejectRef.current = reject
                const audioEl = new Audio()
                const mediaSource = new MediaSource()
                const msUrl = URL.createObjectURL(mediaSource)
                audioEl.src = msUrl

                // Fires when browser has enough data to start playing — accurate ASSISTANT_SPEAKING point
                audioEl.oncanplay = () => {
                    setInterviewState('ASSISTANT_SPEAKING')
                    setIsInterviewerSpeaking(true)
                    setIsSpeaking(true)
                }

                mediaSource.addEventListener('sourceopen', async () => {
                    let sourceBuffer: SourceBuffer
                    try {
                        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
                    } catch (e) {
                        console.error('[AUDIO_MEDIASOURCE_ERROR] addSourceBuffer failed:', e)
                        URL.revokeObjectURL(msUrl)
                        // fallback: resolve to avoid stuck state
                        setIsInterviewerSpeaking(false)
                        setIsSpeaking(false)
                        setInterviewState('WAITING_FOR_USER')
                        assistantTurnCount.current += 1
                        audioChunksRef.current = []
                        startRecording()
                        resolve()
                        return
                    }

                    const reader = ttsRes.body!.getReader()
                    readerRef.current = reader

                    let playbackStarted = false

                    const appendNext = async () => {
                        try {
                            const { done, value } = await reader.read()
                            if (done) {
                                // All chunks appended — signal end of stream
                                if (!sourceBuffer.updating) {
                                    mediaSource.endOfStream()
                                } else {
                                    sourceBuffer.addEventListener('updateend', () => mediaSource.endOfStream(), { once: true })
                                }
                                return
                            }
                            if (sourceBuffer.updating) {
                                await new Promise<void>(r => sourceBuffer.addEventListener('updateend', () => r(), { once: true }))
                            }
                            sourceBuffer.appendBuffer(value)
                            sourceBuffer.addEventListener('updateend', () => {
                                if (!playbackStarted) {
                                    playbackStarted = true
                                    audioEl.play().catch(err => console.error('[AUDIO_PLAY_ERROR]', err))
                                }
                                appendNext()
                            }, { once: true })
                        } catch (err) {
                            console.error('[AUDIO_STREAM_ERROR]', err)
                        }
                    }

                    appendNext()
                })

                audioEl.onended = () => {
                    speakRejectRef.current = null
                    URL.revokeObjectURL(msUrl)
                    audioContextRef.current = null   // no-op, kept for abort compat
                    audioSourceRef.current = null    // no-op, kept for abort compat
                    setIsInterviewerSpeaking(false)
                    setIsSpeaking(false)
                    setInterviewState('WAITING_FOR_USER')
                    assistantTurnCount.current += 1
                    audioChunksRef.current = []
                    startRecording()
                    resolve()
                }

                audioEl.onerror = (err) => {
                    speakRejectRef.current = null
                    console.error('[AUDIO_PLAYBACK_ERROR]', err)
                    URL.revokeObjectURL(msUrl)
                    audioContextRef.current = null
                    audioSourceRef.current = null
                    setIsInterviewerSpeaking(false)
                    setIsSpeaking(false)
                    setInterviewState('WAITING_FOR_USER')
                    assistantTurnCount.current += 1
                    audioChunksRef.current = []
                    startRecording()
                    resolve()
                }

                audioElRef.current = audioEl
                blobUrlRef.current = msUrl
                // play() is called inside appendNext() after first chunk is appended
            })

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[useBatchVoice] TTS fetch aborted (pause or end)')
                throw err
            }
            console.error('[useBatchVoice] speakText error:', err)
        }
    }, [startRecording])

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

            // 3. Speak TMAY as full audio.
            //    oncanplay inside speakText fires ASSISTANT_SPEAKING when audio is actually ready.
            //    speakText onended will: reset state, call startRecording(), increment assistantTurnCount.
            setInterviewState('THINKING')  // accurate — still waiting for TTS
            await speakText(tmayContent)
            // onended has already run — mic is recording, state is WAITING_FOR_USER

            // 4. Session-specific post-TMAY setup
            isFirstQuestionPending.current = false
            const tmayMsg: Message = { role: 'assistant', content: tmayContent }
            messagesRef.current = [tmayMsg]
            setMessages([tmayMsg])

            // 5. Mark connected ONLY after TMAY has been spoken successfully.
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
    }, [sessionId, speakText])

    // ── askNextQuestion ────────────────────────────────────────────────────
    const askNextQuestion = useCallback(async () => {
        setError(null)

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

            // Re-encode at lower bitrate if blob is large to avoid hitting Vercel body limits
            let blobToSend: Blob = audioBlob
            if (audioBlob.size > 4 * 1024 * 1024) {
                try {
                    // Convert to lower quality by re-encoding via AudioContext
                    const arrayBuffer = await audioBlob.arrayBuffer()
                    const audioContext = new AudioContext({ sampleRate: 16000 })
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
                    const offlineContext = new OfflineAudioContext(
                        1, // mono
                        audioBuffer.duration * 16000,
                        16000
                    )
                    const source = offlineContext.createBufferSource()
                    source.buffer = audioBuffer
                    source.connect(offlineContext.destination)
                    source.start()
                    const renderedBuffer = await offlineContext.startRendering()
                    // Convert to WAV for Whisper compatibility
                    const wavBlob = audioBufferToWav(renderedBuffer)
                    blobToSend = wavBlob
                    console.log(`[useBatchVoice] Compressed audio: ${audioBlob.size} → ${wavBlob.size} bytes`)
                } catch (compressionError) {
                    console.warn('[useBatchVoice] Compression failed, sending original:', compressionError)
                    blobToSend = audioBlob
                }
            }

            // 2. STT
            setInterviewState('TRANSCRIBING')

            const sttFormData = new FormData()
            const audioFileName = blobToSend.type === 'audio/wav' ? 'audio.wav' : 'audio.webm'
            sttFormData.append('audio', blobToSend, audioFileName)
            sttFormData.append('session_id', sessionId ?? '')

            const sttRes = await fetch('/api/voice/stt', {
                method: 'POST',
                body: sttFormData,
            })

            if (!sttRes.ok) {
                throw new Error(`STT failed: ${sttRes.status}`)
            }

            const { transcript: sttTranscript } = await sttRes.json()

            // Guard: minimum transcript length
            if (!sttTranscript || sttTranscript.trim().length <= 5) {
                console.warn('[useBatchVoice] STT transcript too short — restarting recorder')
                audioChunksRef.current = []
                startRecording()
                return
            }

            // 3. ORDERING INVARIANT: await /api/turns/answer BEFORE /api/interview.
            //    user_answer MUST be written first so it is never null on answered=true.
            setInterviewState('THINKING')

            await fetch('/api/turns/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    answer_text: sttTranscript.trim(),
                }),
            }).catch((err) => console.error('[useBatchVoice] answer persist failed:', err))

            // 4. Build context for interview call
            const systemMsgsToSend = [...pendingSystemMessagesRef.current]
            turnAuthorityTokens.current += 1

            const historySnapshot = [
                ...messagesRef.current,
                { role: 'user' as const, content: sttTranscript.trim() },
            ]

            // 5. Fetch full interview response (non-streaming)
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

            // Clear system message buffer after interview call
            pendingSystemMessagesRef.current = []

            if (!interviewRes.ok) {
                const errData = await interviewRes.json().catch(() => ({}))
                throw new Error((errData as any).error || `Interview API error: ${interviewRes.status}`)
            }

            const data = await interviewRes.json()
            const llmText = (data.message || '').trim()
            if (!llmText) throw new Error('Empty response from interview API')

            // 6. Speak full response as one continuous audio.
            //    oncanplay inside speakText fires ASSISTANT_SPEAKING when audio is actually ready.
            //    speakText onended will: reset state, call startRecording(), increment assistantTurnCount.
            setInterviewState('THINKING')  // accurate — still waiting for TTS
            interruptedTextRef.current = llmText
            try {
                await speakText(llmText)
            } catch (e) {
                // speakText was aborted mid-playback (e.g. user paused)
                // interruptedTextRef.current already holds the text
                // handleResume will replay it — nothing to do here
                return
            }
            interruptedTextRef.current = null
            // onended has already run — mic is recording, state is WAITING_FOR_USER

            // 7. Post-turn state updates
            turnAuthorityTokens.current -= 1
            isFirstQuestionPending.current = false
            userTurnCount.current += 1

            const userMsg: Message      = { role: 'user',      content: sttTranscript.trim() }
            const assistantMsg: Message = { role: 'assistant', content: llmText }
            messagesRef.current = [...messagesRef.current, userMsg, assistantMsg]
            setMessages([...messagesRef.current])

        } catch (err: any) {
            console.error('[useBatchVoice] askNextQuestion error:', err)
            const rawMessage: string = err.message || ''
            const userMessage =
                rawMessage.includes('413') ? 'Your answer was too long to process. Please try a shorter response.' :
                rawMessage.includes('401') ? 'Session expired. Please refresh the page.' :
                rawMessage.includes('500') ? 'Something went wrong on our end. Please try again.' :
                'Could not process your answer. Please try again.'
            setError(userMessage)
            setIsInterviewerSpeaking(false)
            setIsSpeaking(false)
            setInterviewState('WAITING_FOR_USER')
            audioChunksRef.current = []
            startRecording()
        }
    }, [sessionId, isInterviewerSpeaking, stopRecording, startRecording, speakText, targetDuration])

    // Keep ref in sync so the safety timer can call the latest version without a dependency cycle
    askNextQuestionRef.current = askNextQuestion

    // ── replayInterruptedText ──────────────────────────────────────────────
    /**
     * Re-speak the question that was interrupted mid-playback by a pause.
     * Called by handleResume() in the simulator page after isPaused flips false.
     * speakText's onended handler takes care of startRecording() and state reset.
     */
    const replayInterruptedText = useCallback(async () => {
        const text = interruptedTextRef.current
        if (!text) return
        setInterviewState('THINKING')
        try {
            await speakText(text)
        } catch (e) {
            // aborted again during replay — leave interruptedTextRef for next resume
            return
        }
        // speakText onended already ran: startRecording() and setInterviewState('WAITING_FOR_USER')
        const assistantMsg: Message = { role: 'assistant', content: text }
        messagesRef.current = [...messagesRef.current, assistantMsg]
        setMessages([...messagesRef.current])
        interruptedTextRef.current = null
    }, [speakText])

    // ── injectSystemMessage ────────────────────────────────────────────────
    /**
     * Buffer a system message to be flushed with the next /api/interview call.
     * Cap at 3 items — discard oldest if a 4th is pushed.
     */
    const injectSystemMessage = useCallback((message: string) => {
        const MAX_BUFFER = 3
        const current = pendingSystemMessagesRef.current
        if (current.length >= MAX_BUFFER) {
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
     * Stop AudioContext playback, abort TTS fetch, reset state.
     */
    const abortInterviewerAudio = useCallback(() => {
        // Stop audio element if active
        audioElRef.current?.pause()
        audioElRef.current = null
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
        }
        // Cancel the stream reader if mid-stream
        readerRef.current?.cancel()
        readerRef.current = null
        // These are now no-ops but kept for safety
        audioContextRef.current = null
        audioSourceRef.current = null
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null
        setIsInterviewerSpeaking(false)
        setIsSpeaking(false)
        speakRejectRef.current?.(new Error('AbortError'))
        speakRejectRef.current = null
        setInterviewState('WAITING_FOR_USER')
        console.log('[useBatchVoice] abortInterviewerAudio — audio stopped')
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

        // Stop audio element
        audioElRef.current?.pause()
        audioElRef.current = null
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
        }
        // These are now no-ops but kept for safety
        audioContextRef.current = null
        audioSourceRef.current = null
        ttsAbortControllerRef.current?.abort()
        ttsAbortControllerRef.current = null

        // Clear recording safety timer
        if (recordingSafetyTimerRef.current) {
            clearTimeout(recordingSafetyTimerRef.current)
            recordingSafetyTimerRef.current = null
        }

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
        interruptedTextRef,
        replayInterruptedText,
    }
}

// ─── audioBufferToWav ─────────────────────────────────────────────────────────
/**
 * Convert an AudioBuffer to a WAV Blob (16-bit PCM, mono, 16 kHz).
 * Used to compress large WebM blobs before sending to the STT API so they
 * stay within Vercel's request body limit.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = 1      // always downmix to mono
    const sampleRate  = buffer.sampleRate
    const bitsPerSample = 16
    const samples     = buffer.getChannelData(0)  // channel 0 only — mono
    const dataLength  = samples.length * 2         // 16-bit = 2 bytes per sample
    const totalLength = 44 + dataLength            // 44-byte WAV header

    const ab   = new ArrayBuffer(totalLength)
    const view = new DataView(ab)

    const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i))
        }
    }

    // RIFF chunk descriptor
    writeStr(0, 'RIFF')
    view.setUint32(4,  totalLength - 8,                              true)
    writeStr(8, 'WAVE')

    // fmt sub-chunk
    writeStr(12, 'fmt ')
    view.setUint32(16, 16,                                           true) // sub-chunk size (PCM)
    view.setUint16(20, 1,                                            true) // audio format = PCM
    view.setUint16(22, numChannels,                                  true)
    view.setUint32(24, sampleRate,                                   true)
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true) // byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8,              true) // block align
    view.setUint16(34, bitsPerSample,                                true)

    // data sub-chunk
    writeStr(36, 'data')
    view.setUint32(40, dataLength, true)

    // Write 16-bit PCM samples (clamp float32 to [-1, 1] → int16)
    let offset = 44
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }

    return new Blob([ab], { type: 'audio/wav' })
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
