'use client'

import { useState, useRef, useCallback } from 'react'

export type Message = {
    role: 'user' | 'assistant'
    content: string
}

export type InterviewState = 'ASSISTANT_SPEAKING' | 'WAITING_FOR_USER' | 'READY_FOR_NEXT' | 'SESSION_ENDING'

export function useRealtimeVoice(sessionId: number | null, initialInstruction: string = "Introduce yourself as the interviewer and ask the first question.", isPausedExternal: boolean = false) {
    const [isConnected, setIsConnected] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [interviewState, setInterviewState] = useState<InterviewState>('ASSISTANT_SPEAKING')

    const [error, setError] = useState<string | null>(null)

    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const dataChannel = useRef<RTCDataChannel | null>(null)

    // NEW: Ref-based tracking for pipeline integrity
    const messagesRef = useRef<Message[]>([])
    const pendingTranscriptsCount = useRef(0)

    // TURN GATING: Track turns (NO automatic gate release)
    const assistantTurnCount = useRef(0)
    const userTurnCount = useRef(0)
    const isWaitingForUser = useRef(false)

    // PAUSE STATE: Track external pause (authoritative)
    const isPausedRef = useRef(isPausedExternal)

    // HARD GATE: Track if response.create is allowed
    const responseAllowedRef = useRef(false)

    // CONTRACT: Turn authority tracking (single-use token)
    const isFirstQuestionPending = useRef(true)  // First question hasn't been asked yet
    const turnAuthorityTokens = useRef(0)         // Counter: increments on click, decrements on consumption

    // Track audio stream for hard pause
    const audioStreamRef = useRef<MediaStream | null>(null)

    // Update pause ref when external state changes
    isPausedRef.current = isPausedExternal

    const startSession = useCallback(async () => {
        if (!sessionId) {
            console.error('Cannot start session: No Session ID')
            return
        }
        setError(null)

        try {
            setMessages([]) // Reset on start
            messagesRef.current = [] // Reset ref
            pendingTranscriptsCount.current = 0 // Reset pending count

            // 1. Get Ephemeral Token (POST with sessionId)
            const tokenResponse = await fetch('/api/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })

            if (!tokenResponse.ok) {
                const errData = await tokenResponse.json().catch(() => ({}))
                throw new Error(errData.error || `Failed to get session token: ${tokenResponse.status}`)
            }

            const data = await tokenResponse.json()
            const EPHEMERAL_KEY = data.client_secret.value

            // 2. Init PC
            const pc = new RTCPeerConnection()
            peerConnection.current = pc

            // 3. Audio Setup
            const audioEl = document.createElement('audio')
            audioEl.autoplay = true
            audioRef.current = audioEl

            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0]
            }

            // 4. Add Microphone
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
            pc.addTrack(ms.getTracks()[0])
            audioStreamRef.current = ms // Store for pause abort

            // 5. Data Channel
            const dc = pc.createDataChannel('oai-events')
            dataChannel.current = dc

            dc.onopen = () => {
                setIsConnected(true)
                // Note: System Instructions are now injected Server-Side in /api/session
                // We do NOT send session.update with instructions from client.

                // HARD GATE: Allow first question only
                responseAllowedRef.current = true

                // Trigger the first turn
                setTimeout(() => {
                    if (responseAllowedRef.current) {
                        dc.send(JSON.stringify({
                            type: "response.create",
                            response: {
                                instructions: initialInstruction
                            }
                        }))
                        // Block further responses until ASK_NEXT_QUESTION
                        responseAllowedRef.current = false
                        console.log('🎬 [HARD_GATE] First question triggered - gate now LOCKED')
                    }
                }, 500)
            }

            dc.onmessage = (e) => {
                const msg = JSON.parse(e.data)

                if (msg.type === 'response.audio.delta') {
                    // BUG FIX: Check pause state before allowing audio
                    if (isPausedRef.current) {
                        console.warn('[PAUSE_GATE] Ignoring audio delta - session is paused')
                        return
                    }
                    setIsSpeaking(true)
                    setIsInterviewerSpeaking(true)
                    setInterviewState('ASSISTANT_SPEAKING')
                }

                // DIAGNOSTIC: Log when response starts (was it authorized?)
                if (msg.type === 'response.created') {
                    console.log('🎬 [RESPONSE_CREATED] Server started response - was it authorized?', {
                        gateOpen: responseAllowedRef.current,
                        assistantTurn: assistantTurnCount.current
                    })
                }

                if (msg.type === 'response.done') {
                    setIsSpeaking(false)
                    setIsInterviewerSpeaking(false)
                    assistantTurnCount.current += 1

                    // DIAGNOSTIC: Warn if this was an unauthorized response
                    if (assistantTurnCount.current > 1 && !responseAllowedRef.current) {
                        console.error('⚠️ [BYPASS_DETECTED] Response completed but gate was CLOSED - possible server auto-trigger')
                    }

                    // TRANSPORT GATE: Always wait after assistant speaks
                    // User must explicitly signal ASK_NEXT_QUESTION
                    if (assistantTurnCount.current > 1) { // Skip first greeting
                        isWaitingForUser.current = true
                        setInterviewState('WAITING_FOR_USER')
                        console.log(`🔒 [TRANSPORT_GATE] Waiting for ASK_NEXT_QUESTION signal. (A: ${assistantTurnCount.current}, U: ${userTurnCount.current})`)
                    }
                }

                // Capture Transcript (Agent)
                if (msg.type === 'response.audio_transcript.done') {
                    if (msg.transcript) {
                        const newMsg = { role: 'assistant' as const, content: msg.transcript }
                        messagesRef.current.push(newMsg)
                        setMessages(prev => [...prev, newMsg])

                        // CONTRACT: Create interview_turn with explicit authority (single-use token)
                        const hasAuthority = isFirstQuestionPending.current || turnAuthorityTokens.current > 0

                        if (hasAuthority && sessionId) {
                            // Consume token BEFORE API call (atomic operation)
                            const consumedToken = turnAuthorityTokens.current > 0
                            if (consumedToken) {
                                turnAuthorityTokens.current -= 1
                            }

                            // Call turn creation API
                            fetch('/api/turns/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    session_id: sessionId,
                                    content: msg.transcript,
                                    is_first_question: isFirstQuestionPending.current,
                                    turn_authority: consumedToken
                                })
                            }).then(res => {
                                if (res.ok) {
                                    console.log('✅ [TURN_CREATED] interview_turn persisted', {
                                        is_first: isFirstQuestionPending.current,
                                        consumed_token: consumedToken,
                                        remaining_tokens: turnAuthorityTokens.current
                                    })
                                    // Reset first question flag
                                    isFirstQuestionPending.current = false
                                } else {
                                    console.error('⚠️ [TURN_FAILED] Failed to persist turn (non-blocking)')
                                    // Refund token on failure
                                    if (consumedToken) {
                                        turnAuthorityTokens.current += 1
                                    }
                                }
                            }).catch(err => {
                                console.error('⚠️ [TURN_ERROR] Turn creation error (non-blocking):', err)
                                // Refund token on error
                                if (consumedToken) {
                                    turnAuthorityTokens.current += 1
                                }
                            })
                        } else {
                            console.log('ℹ️ [TURN_SUPPRESSED] No authority - turn not created', {
                                is_first: isFirstQuestionPending.current,
                                tokens: turnAuthorityTokens.current,
                                transcript: msg.transcript.substring(0, 50)
                            })
                        }
                    }
                }

                // NEW: Track pending transcripts
                if (msg.type === 'input_audio_buffer.committed') {
                    pendingTranscriptsCount.current += 1
                    console.log('[PIPELINE] User audio committed, pending count:', pendingTranscriptsCount.current)
                }

                // Capture Transcript (User) - NO AUTOMATIC GATE RELEASE
                if (msg.type === 'conversation.item.input_audio_transcription.completed') {
                    pendingTranscriptsCount.current = Math.max(0, pendingTranscriptsCount.current - 1)
                    if (msg.transcript && msg.transcript.trim().length > 5) { // Minimum threshold
                        const newMsg = { role: 'user' as const, content: msg.transcript }
                        messagesRef.current.push(newMsg)
                        setMessages(prev => [...prev, newMsg])

                        // BUG FIX: Increment turn count but DO NOT release gate
                        // Only ASK_NEXT_QUESTION releases gate
                        if (isWaitingForUser.current) {
                            userTurnCount.current += 1
                            console.log(`📝 [TRANSCRIPT] User spoke. Turn count updated. Gate remains LOCKED. (A: ${assistantTurnCount.current}, U: ${userTurnCount.current})`)
                        }

                        console.log('[PIPELINE] User transcript received:', msg.transcript, '| Pending:', pendingTranscriptsCount.current)
                    }
                }

                // Handle transcription failures
                if (msg.type === 'conversation.item.input_audio_transcription.failed') {
                    pendingTranscriptsCount.current = Math.max(0, pendingTranscriptsCount.current - 1)
                    console.error('[PIPELINE] Transcription failed, pending count:', pendingTranscriptsCount.current)
                }
            }

            // 6. Offer/Answer
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            const baseUrl = 'https://api.openai.com/v1/realtime'
            const model = 'gpt-4o-realtime-preview-2024-12-17'

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    'Content-Type': 'application/sdp',
                },
            })

            const answerSdp = await sdpResponse.text()
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

        } catch (err: any) {
            console.error('Failed to start session:', err)
            setError(err.message || 'Connection failed')
            setIsConnected(false)
        }
    }, [sessionId, initialInstruction])

    // BUG FIX: Pause abort - immediately stop interviewer audio
    const abortInterviewerAudio = useCallback(() => {
        if (dataChannel.current && dataChannel.current.readyState === 'open') {
            console.log('⏸️ [PAUSE_ABORT] Stopping interviewer audio')
            // Send cancel command
            dataChannel.current.send(JSON.stringify({ type: "response.cancel" }))
            setIsSpeaking(false)
            setIsInterviewerSpeaking(false)

            // HARD KILL: Also revoke responseAllowed to prevent any new responses
            responseAllowedRef.current = false
        }

        // HARD KILL: Mute audio output
        if (audioRef.current) {
            audioRef.current.muted = true
            audioRef.current.pause()
            console.log('🔇 [PAUSE_ABORT] Audio muted')
        }
    }, [])

    // NEW: Promise-based wait for transcript synchronization
    const waitForSafeExit = useCallback((timeoutMs: number = 3000): Promise<void> => {
        return new Promise((resolve) => {
            const startTime = Date.now()
            const checkInterval = 100 // Check every 100ms

            const check = () => {
                const elapsed = Date.now() - startTime

                if (pendingTranscriptsCount.current === 0) {
                    console.log('[PIPELINE] Safe to disconnect, all transcripts received')
                    resolve()
                } else if (elapsed >= timeoutMs) {
                    console.warn('[PIPELINE] Timeout waiting for transcripts. Pending:', pendingTranscriptsCount.current)
                    resolve() // Force resolve on timeout
                } else {
                    setTimeout(check, checkInterval)
                }
            }

            check()
        })
    }, [])

    const endSession = useCallback(() => {
        peerConnection.current?.close()
        setIsConnected(false)
        setIsSpeaking(false)
        setError(null)
    }, [])

    // NEW: Inject system message for time control
    const injectSystemMessage = useCallback((message: string) => {
        if (dataChannel.current && dataChannel.current.readyState === 'open') {
            console.log('[TIME_CONTROL] Injecting system message:', message)
            dataChannel.current.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "system",
                    content: [{
                        type: "input_text",
                        text: message
                    }]
                }
            }))

            // DO NOT trigger response.create - let the conversation flow naturally
            // The AI will see this message in context when the user speaks next
        } else {
            console.warn('[TIME_CONTROL] Cannot inject message, data channel not ready')
        }
    }, [])

    // NEW: Ask Next Question - explicit user signal for interviewer to speak
    // BUG FIX: This is the ONLY way to trigger interviewer (after first question)
    const askNextQuestion = useCallback(() => {
        // Check pause state
        if (isPausedRef.current) {
            console.warn('[ASK_NEXT] Cannot trigger - session is paused')
            return
        }

        // CLARIFICATION 2: Ignore duplicate signals while interviewer is speaking
        if (isInterviewerSpeaking) {
            console.warn('[ASK_NEXT] Ignoring duplicate signal - interviewer already speaking')
            return
        }

        if (dataChannel.current && dataChannel.current.readyState === 'open') {
            console.log('[ASK_NEXT_QUESTION] User explicitly signaled for next question')

            // CONTRACT: Grant turn authority (single-use token - increment counter)
            turnAuthorityTokens.current += 1
            console.log(`🎟️ [AUTHORITY_GRANTED] Token issued. Total tokens: ${turnAuthorityTokens.current}`)

            // HARD GATE: Unlock response creation
            responseAllowedRef.current = true

            // Unmute audio if it was muted by pause
            if (audioRef.current) {
                audioRef.current.muted = false
                audioRef.current.play().catch(() => { })
            }

            // Set interviewer speaking state immediately
            setIsInterviewerSpeaking(true)

            // CRITICAL FIX: Commit user audio buffer FIRST
            // This ensures user speech appears in the transcript
            console.log('📝 [TRANSCRIPT_COMMIT] Committing user audio buffer before response')
            dataChannel.current.send(JSON.stringify({
                type: "input_audio_buffer.commit"
            }))

            // Inject control signal (NOT a user message - doesn't count in transcript)
            dataChannel.current.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "system",
                    content: [{
                        type: "input_text",
                        text: `[CONTROL_SIGNAL: ASK_NEXT_QUESTION] The user explicitly signaled they are ready for the next question. Continue the interview naturally with your next question.`
                    }]
                }
            }))

            // TRANSPORT GATE RELEASE: ASK_NEXT_QUESTION signal
            if (isWaitingForUser.current) {
                isWaitingForUser.current = false
                setInterviewState('READY_FOR_NEXT')
                console.log(`✅ [TRANSPORT_GATE] ASK_NEXT_QUESTION signal received. RELEASING gate.`)
            }

            // Trigger response - ONLY if gate is open
            // CRITICAL: Delayed to allow transcription to complete
            setTimeout(() => {
                if (dataChannel.current && dataChannel.current.readyState === 'open' && responseAllowedRef.current) {
                    dataChannel.current.send(JSON.stringify({ type: "response.create" }))
                    // Lock gate immediately after sending
                    responseAllowedRef.current = false
                    console.log('🔒 [HARD_GATE] response.create sent - gate now LOCKED')
                } else if (!responseAllowedRef.current) {
                    console.error('❌ [HARD_GATE] BLOCKED unauthorized response.create')
                }
            }, 500) // Increased delay to ensure transcription completes
        } else {
            console.warn('[ASK_NEXT_QUESTION] Cannot send, data channel not ready')
        }
    }, [isInterviewerSpeaking])

    // Get turn statistics for evaluation guard
    const getTurnStats = useCallback(() => {
        return {
            assistantTurns: assistantTurnCount.current,
            userTurns: userTurnCount.current,
            isValid: userTurnCount.current >= assistantTurnCount.current - 1 // Allow greeting
        }
    }, [])

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
        error
    }
}
