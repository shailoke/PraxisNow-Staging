'use client'

import { useRealtimeVoice } from '@/hooks/useBatchVoice'
import { getEvaluationSteps } from '@/lib/evaluation-progress'
import { useWakeLock } from '@/hooks/useWakeLock'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, PhoneOff, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EvalResult } from '@/lib/eval-logic'

// ... imports
import { resolveRuntimeScenario, RuntimeScenario, DbScenario } from '@/lib/runtime-scenario'

// Adapter type for efficient UI rendering
type SimulatorScenario = RuntimeScenario & {
    id: string | number
    isCustom: boolean
    baseId: number // Needed for DB linkage
    customId?: string // Needed for DB linkage
    round?: number // DB round number — used for evaluation progress steps
    // UI helpers
    title: string
    description: string
    dimensions: string[]
}

export default function SimulatorPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const replayFromId = searchParams.get('replay_from')
    const scenarioIdStr = params.scenarioId as string

    const [scenario, setScenario] = useState<SimulatorScenario | null>(null)
    const [loading, setLoading] = useState(true)

    // Session State
    const [sessionId, setSessionId] = useState<string | null>(null)
    const sessionIdRef = useRef<string | null>(null)
    const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [duration, setDuration] = useState(30 * 60) // Default 30m
    const [isWarningExpanded, setIsWarningExpanded] = useState(false)

    // Time Controller State
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
    const [targetDuration, setTargetDuration] = useState(30) // minutes

    // Data Fetching: Hybrid (Legacy Static + New DB)
    useEffect(() => {
        async function loadScenario() {
            setLoading(true)
            const supabase = createClient()

            // Determine if Custom (UUID) or Global (Int)
            const isCustom = isNaN(parseInt(scenarioIdStr))

            try {
                let runtime: RuntimeScenario
                let uiScenario: SimulatorScenario

                if (scenarioIdStr === 'negotiation') {
                    // Fetch the Special Negotiation Scenario
                    const { data: negData, error } = await supabase
                        .from('scenarios')
                        .select('*')
                        .eq('role', 'Negotiation Coach')
                        .single()

                    if (error || !negData) throw new Error("Negotiation Scenario not configured in DB")

                    runtime = resolveRuntimeScenario(negData, null)

                    uiScenario = {
                        ...runtime,
                        id: negData.id,
                        baseId: negData.id,
                        isCustom: false,
                        round: negData.round ?? 1,
                        title: "Salary Negotiation Simulation",
                        description: "A guided role-play with an expert negotiation coach to help you maximize your offer.",
                        dimensions: runtime.evaluation_dimensions.map((d: any) => d.name)
                    }
                } else if (isCustom) {
                    const { data: customData, error } = await supabase
                        .from('custom_scenarios')
                        .select('*, scenarios(*)')
                        .eq('id', scenarioIdStr)
                        .single()

                    if (error || !customData) throw new Error("Custom Scenario not found")

                    // @ts-ignore
                    const base = customData.scenarios as DbScenario
                    const custom = customData as any

                    runtime = resolveRuntimeScenario(base, custom)

                    uiScenario = {
                        ...runtime,
                        id: custom.id,
                        baseId: base.id,
                        customId: custom.id,
                        isCustom: true,
                        round: base.round ?? 1,
                        title: runtime.scenario_title,
                        description: runtime.scenario_description,
                        dimensions: runtime.evaluation_dimensions.map((d: any) => d.name)
                    }

                } else {
                    const id = parseInt(scenarioIdStr)
                    const { data: baseData, error } = await supabase
                        .from('scenarios')
                        .select('*')
                        .eq('id', id)
                        .single()

                    if (error || !baseData) throw new Error("Scenario not found")

                    runtime = resolveRuntimeScenario(baseData, null)

                    uiScenario = {
                        ...runtime,
                        id: baseData.id,
                        baseId: baseData.id,
                        isCustom: false,
                        round: baseData.round ?? 1,
                        title: runtime.scenario_title,
                        description: runtime.scenario_description,
                        dimensions: runtime.evaluation_dimensions.map(d => d.name)
                    }
                }

                setScenario(uiScenario)
                const mins = uiScenario.session_duration_minutes ?? 30
                setDuration(mins * 60)
                setTargetDuration(mins)
            } catch (e) {
                console.error(e)
            }

            // 3. Fetch User Tier (Parallel-ish)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('package_tier, available_sessions, free_session_used')
                    .eq('id', user.id)
                    .single()

                const hasActivePack = !!(profile?.package_tier && profile.package_tier !== 'Free')
                const remainingSessions = profile?.available_sessions ?? 0
                const scenarioIdNum = parseInt(scenarioIdStr, 10)
                const isAIScenario = [4, 8, 12].includes(scenarioIdNum)
                const freeSessionAvailable = profile?.free_session_used !== true
                const canAccessViaFreeSession = freeSessionAvailable && !isAIScenario

                // Client-side protection double-check
                console.log('[ACCESS CHECK]', {
                    hasActivePack,
                    remainingSessions,
                    isAIScenario,
                    freeSessionAvailable,
                    canAccessViaFreeSession,
                    free_session_used_raw: profile?.free_session_used,
                    package_tier: profile?.package_tier,
                    available_sessions: profile?.available_sessions,
                    scenarioIdNum,
                    willRedirect: !hasActivePack && remainingSessions <= 0 && !canAccessViaFreeSession
                })
                if (!hasActivePack && remainingSessions <= 0 && !canAccessViaFreeSession) {
                    window.location.href = '/pricing'
                    return
                }
            } else {
                router.replace('/auth')
                return
            }
            setLoading(false)
        }
        loadScenario()
    }, [scenarioIdStr])

    const initialInstruction = scenarioIdStr === 'negotiation'
        ? "Introduce yourself as the Praxis Salary Negotiation Simulation. Briefly explain that we will start with Phase 1 (Context Setup) and ask me for my target role, level, and company type."
        : "Introduce yourself briefly as the interviewer, then ask me to tell you about myself."

    // PAUSE STATE (must be before hook initialization)
    const [isPaused, setIsPaused] = useState(false)

    const { isConnected, isSpeaking, isInterviewerSpeaking, startSession, endSession, abortInterviewerAudio, messages, messagesRef, waitForSafeExit, injectSystemMessage, askNextQuestion, getTurnStats, interviewState, error: voiceError } = useRealtimeVoice(sessionId, initialInstruction, isPaused, targetDuration)
    const { requestWakeLock, releaseWakeLock } = useWakeLock()
    const [timeLeft, setTimeLeft] = useState(duration)
    const [sessionStarted, setSessionStarted] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [isEnding, setIsEnding] = useState(false)

    // UI-ONLY STATE (Clarification 1: Does not persist, not sent to server)
    const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
    const isFirstQuestion = useRef(true)

    // Evaluation progress step state
    const [evalStepIndex, setEvalStepIndex] = useState(0)
    const evalStepIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Time Controller: Coverage Tracking
    const [questionCount, setQuestionCount] = useState(0)
    const lastCheckpointRef = useRef<number>(0)

    // Timer Effect with Time Controller and PAUSE BEHAVIOR
    useEffect(() => {
        let interval: NodeJS.Timeout
        // CLARIFICATION: Timer only ticks when session started, time left > 0, connected, AND not paused
        if (sessionStarted && timeLeft > 0 && isConnected && !isPaused) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleEnd()
                        return 0
                    }

                    const newTimeLeft = prev - 1
                    const elapsedSeconds = duration - newTimeLeft
                    const elapsedMinutes = Math.floor(elapsedSeconds / 60)
                    const remainingMinutes = Math.floor(newTimeLeft / 60)

                    // TIME CHECKPOINT INJECTION (every 3 minutes for tighter control)
                    if (elapsedMinutes > 0 && elapsedMinutes % 3 === 0 && elapsedMinutes !== lastCheckpointRef.current) {
                        lastCheckpointRef.current = elapsedMinutes

                        let checkpointMessage = `[TIME CHECKPOINT - ${elapsedMinutes} min elapsed, ${remainingMinutes} min remaining]\n\n`

                        if (remainingMinutes > 30) {
                            checkpointMessage += `CRITICAL: You have ${remainingMinutes} minutes remaining. This interview MUST last ${targetDuration}+ minutes. Continue asking deep core questions with 2+ follow-ups each. Demand real-world examples. NEVER attempt to conclude.`
                        } else if (remainingMinutes > 20) {
                            checkpointMessage += `CONTINUE PHASE: You have ${remainingMinutes} minutes remaining. The interview is NOT close to ending. Continue asking deep core questions with 2+ follow-ups. Do NOT attempt to conclude.`
                        } else if (remainingMinutes > 10) {
                            checkpointMessage += `MID-INTERVIEW PHASE: You have ${remainingMinutes} minutes remaining. Introduce new core questions with 1 follow-up each. Examples still required. Do NOT wrap up - there is still significant time.`
                        } else if (remainingMinutes > 5) {
                            checkpointMessage += `FINAL QUESTION PHASE: You have ${remainingMinutes} minutes remaining. Ask ONE final high-signal deep question. Do NOT conclude yet - wait for the final 5 minutes.`
                        } else {
                            checkpointMessage += `WRAP-UP ALLOWED: You have ${remainingMinutes} minutes remaining. You may now conclude the interview if appropriate.`
                        }

                        console.log(`⏱️ [CHECKPOINT ${elapsedMinutes}m] Remaining: ${remainingMinutes}m - Injecting time control`)
                        injectSystemMessage?.(checkpointMessage)
                    }

                    return newTimeLeft
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [sessionStarted, timeLeft, duration, isConnected, isPaused, injectSystemMessage])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Normalise DB role string to evaluation-progress key (pm / sde / ds)
    const toEvalRole = (role: string): string => {
        const r = role.toLowerCase()
        if (r.includes('engineer') || r.includes('developer') || r.includes('sde')) return 'sde'
        if (r.includes('data')) return 'ds'
        if (r.includes('product') || r.includes(' pm') || r === 'pm') return 'pm'
        return r
    }

    // Advance evaluation progress steps while /api/evaluate is in flight
    useEffect(() => {
        if (isEvaluating && scenario) {
            const steps = getEvaluationSteps(toEvalRole(scenario.role), scenario.round ?? 1)
            setEvalStepIndex(0)
            const intervalMs = Math.floor(75000 / steps.length)
            evalStepIntervalRef.current = setInterval(() => {
                setEvalStepIndex(prev => Math.min(prev + 1, steps.length - 1))
            }, intervalMs)
        } else {
            if (evalStepIntervalRef.current) {
                clearInterval(evalStepIntervalRef.current)
                evalStepIntervalRef.current = null
            }
        }
        return () => {
            if (evalStepIntervalRef.current) {
                clearInterval(evalStepIntervalRef.current)
                evalStepIntervalRef.current = null
            }
        }
    }, [isEvaluating, scenario])

    // Track question coverage from messages
    useEffect(() => {
        const assistantQuestions = messages.filter(m => m.role === 'assistant' && m.content.includes('?'))
        setQuestionCount(assistantQuestions.length)
    }, [messages])

    const handleStart = async () => {
        console.log('[handleStart] called')
        if (!scenario) return

        setLoading(true)
        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenario_id: scenario.baseId,
                    custom_scenario_id: scenario.customId || null,
                    duration_seconds: duration,
                    session_type: scenarioIdStr === 'negotiation' ? 'negotiation_simulation' : 'interview',
                    replay_session_id: replayFromId || undefined
                })
            })

            const data = await res.json()
            console.log('[handleStart] session/start response:', data)

            if (!res.ok) {
                // Handle specific errors
                throw new Error(data.error || 'Failed to start session')
            }

            const newSessionId = data.id
            setSessionId(newSessionId)

            // Initialize time controller
            setSessionStartTime(Date.now())
            // targetDuration already set from scenario load — do not override here

            // 2. Start Voice (Now we have a sessionId, the hook uses it to fetch token)
            // Wait a tick for state update (or pass explicitly if hook allowed, but hook depends on state)
            // Hook depends on `sessionId` state.
            // React State update is async. We need to trigger startSession AFTER sessionId is set.
            // Actually, we can't trigger startSession instantly if it depends on the new `sessionId` state variable.
            // SOLUTION: We should wait for effect, or pass ID to startSession? 
            // My hook signature is `useRealtimeVoice(sessionId)`. 
            // If I call startSession() immediately, it sees old sessionId (null).
            // Fix: Modify useRealtimeVoice to accept sessionId in startSession OR use ref or wait.
            // Easier: Just setSessionStarted(true) here. 
            // Better: Let's pass sessionId to startSession? No, hook design is state-based.
            // I will change the logic slightly:

            // Wait for next render cycle? No.
            // I will update the hook in previous step? Too late.
            // I will refactor hook usage logic in this file.
            // Actually, startSession() in hook depends on scoped variable `sessionId`.
            // If I setSessionId(val), re-render happens.
            // I can add a `useEffect` that triggers startSession when `sessionStarted` becomes true AND `sessionId` is set.
            setSessionStarted(true)

        } catch (e: any) {
            console.error('Session Start Failed', e)
            setErrorMsg(e.message)
            setSessionStarted(false)
        } finally {
            setLoading(false)
        }
    }

    // Effect to actually start voice when session is ready
    useEffect(() => {
        if (sessionStarted && sessionId && !isConnected) {
            startSession()
        }
    }, [sessionStarted, sessionId, isConnected, startSession])

    // Inject initial time checkpoint when connected
    useEffect(() => {
        if (isConnected && sessionStarted && sessionStartTime) {
            const initialMessage = `[SESSION START - Target duration: ${targetDuration} minutes]

CRITICAL INSTRUCTION: This interview MUST last at least ${targetDuration} minutes. You have ${targetDuration} minutes total.

- Ask deep core questions with 2+ follow-ups each
- Demand real-world examples for every answer
- Do NOT conclude until you receive explicit permission (when remaining time <= 5 minutes)
- NEVER say "that's all" or attempt to wrap up early
- The interview is NOT complete until you are told so

You will receive time updates every 3 minutes. Follow them strictly.`

            setTimeout(() => {
                console.log('⏱️ [INIT] Injecting 40-minute enforcement message')
                injectSystemMessage?.(initialMessage)
            }, 2000) // Wait for initial greeting
        }
    }, [isConnected, sessionStarted, sessionStartTime, targetDuration, injectSystemMessage])

    // Acquire wake lock when session connects
    useEffect(() => {
        if (isConnected && sessionStarted) {
            requestWakeLock()
        }
    }, [isConnected, sessionStarted, requestWakeLock])

    // Release wake lock on cleanup
    useEffect(() => {
        return () => {
            if (sessionStarted) {
                releaseWakeLock()
            }
        }
    }, [sessionStarted, releaseWakeLock])

    // Keep sessionIdRef in sync with sessionId state so the beforeunload
    // handler can read the current session ID without a stale closure.
    useEffect(() => {
        sessionIdRef.current = sessionId
    }, [sessionId])

    // Browser unload guard — fires when the tab is closed or navigated away mid-session.
    // sendBeacon is best-effort; always returns 200 from the route.
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!sessionIdRef.current || !sessionStarted) return
            e.preventDefault()
            e.returnValue = ''
            navigator.sendBeacon(
                '/api/session/abandon',
                JSON.stringify({ session_id: sessionIdRef.current })
            )
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [sessionStarted])

    // Track when interviewer finishes speaking to show button
    useEffect(() => {
        if (interviewState === 'WAITING_FOR_USER' && isConnected && !isPaused && timeLeft > 0) {
            // First question auto-triggers, subsequent questions wait for button
            if (isFirstQuestion.current) {
                isFirstQuestion.current = false
                setWaitingForNextQuestion(false)
            } else {
                setWaitingForNextQuestion(true)
            }
        } else {
            setWaitingForNextQuestion(false)
        }
    }, [interviewState, isConnected, isPaused, timeLeft])

    const handlePause = () => {
        setIsPaused(true)
        // BUG FIX: Immediately abort interviewer audio when paused
        abortInterviewerAudio?.()
        console.log('⏸️ [PAUSE] Session paused - timer frozen, interviewer aborted')
    }

    const handleResume = () => {
        setIsPaused(false)
        // BUG FIX: Resume does NOT auto-continue interviewer
        // User must still click "Ask Next Question"
        console.log('▶️ [RESUME] Session resumed - timer resumes, waiting for ASK_NEXT_QUESTION')
    }

    const handleAskNextQuestion = () => {
        console.log('👆 [USER] Explicitly asked for next question')
        setWaitingForNextQuestion(false)
        askNextQuestion?.()
    }

    const handleEnd = async () => {
        if (!sessionId || isEvaluating || isEnding) return // Idempotency check

        setIsEnding(true)
        setIsEvaluating(true)

        try {
            // PHASE 1: Wait for pending transcripts (CLARIFICATION 3: Bounded wait)
            console.log('[HANDLEEND] Waiting for safe exit (bounded to 3000ms)...')
            await waitForSafeExit(3000)

            // PHASE 2: Disconnect
            console.log('[HANDLEEND] Disconnecting session...')
            endSession()
            setSessionStarted(false)
            setShowResults(true)

            // PHASE 2.5: Release wake lock
            releaseWakeLock()

            // PHASE 3: Capture from Ref (source of truth)
            const finalMessages = messagesRef.current
            const finalTranscript = finalMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

            // PHASE 4: PERSIST TO DB FIRST - ALWAYS SET STATUS=COMPLETED
            // This ensures evaluation path is reached regardless of content checks
            const supabase = createClient()

            const { error: updateError } = await supabase
                .from('sessions')
                .update({
                    transcript: finalTranscript,
                    duration_seconds: duration - timeLeft,
                    status: 'evaluating' // Results page polls while !== 'completed'; /api/evaluate sets 'completed'
                } as any)
                .eq('id', sessionId)

            if (updateError) {
                console.error('Session Update Error:', updateError)
                setErrorMsg('Failed to save session. Please contact support.')
                setIsEvaluating(false)
                setIsEnding(false)
                return
            }

            console.log('✅ [SESSION] Status set to completed - session_id:', sessionId)

            // PHASE 5: CONTENT SUFFICIENCY CHECK
            const userMsgCount = finalMessages.filter(m => m.role === 'user').length
            const assistantMsgCount = finalMessages.filter(m => m.role === 'assistant').length

            console.log('[HANDLEEND] Message stats - Assistant:', assistantMsgCount, 'User:', userMsgCount)

            // Minimum 2 user responses required for evaluation
            if (userMsgCount < 2) {
                console.error('[EVAL] Insufficient user responses (<2) - session completed but not evaluated')
                setErrorMsg('Session too short: At least 2 answered questions required for evaluation.')
                setIsEvaluating(false)
                setIsEnding(false)
                return // Early return OK now - status already set
            }

            if (assistantMsgCount > 0 && userMsgCount === 0) {
                // CRITICAL FAILURE: Assistant spoke but no user speech captured
                console.error('❌ PIPELINE_INTEGRITY_FAILURE: Assistant messages exist but zero user messages captured')
                console.error('Final Messages:', finalMessages)
                setErrorMsg('Pipeline Error: Your speech was lost during transmission. This session will not be saved. Please report this issue.')
                setIsEvaluating(false)
                setIsEnding(false)
                return // Early return OK - status already set
            }

            // PHASE 6: Trigger Evaluation (Routing based on type)
            let res
            if (scenarioIdStr === 'negotiation') {
                res = await fetch('/api/negotiation/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId })
                })
            } else {
                res = await fetch('/api/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId })
                })
            }

            const result = await res.json()
            if (res.ok) {
                // Determine if it's negotiation result (has summary) or standard
                if (result.summary) {
                    // Negotiation simulation — stays on simulator results view
                    setEvalResult(result.summary) // Normalize to fit state (type cast if needed)
                } else {
                    // Standard interview — redirect to Results Screen
                    // Do NOT call setEvalResult here: the simulator results view
                    // is never rendered for standard interviews; setting evalResult
                    // before the push causes a .map() crash on undefined fields.
                    router.push(`/results/${sessionId}`)
                }
            } else {
                console.error('Evaluation failed:', result.error)
                setErrorMsg(result.error || 'Evaluation failed. Please contact support if this persists.')
            }
        } catch (err: any) {
            console.error('[HANDLEEND] Error:', err)
            setErrorMsg(err.message)
        } finally {
            setIsEvaluating(false)
            setIsEnding(false)
        }
    }

    const handleDashboard = () => {
        router.push('/dashboard')
    }

    if (loading) return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">Loading Scenario...</div>
    if (!scenario) return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">Scenario not found</div>

    if (showResults) {
        const evalSteps = getEvaluationSteps(toEvalRole(scenario.role), scenario.round ?? 1)
        const currentEvalStep = evalSteps[Math.min(evalStepIndex, evalSteps.length - 1)]

        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6">
                <div className="max-w-4xl w-full glass-panel p-8 rounded-2xl border border-white/10 animate-in fade-in zoom-in duration-500 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-2 text-center">Session Complete</h2>
                    <p className="text-gray-400 text-center mb-8">Performance Evaluation</p>

                    {isEvaluating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-purple-300 animate-pulse">Evaluating {currentEvalStep}...</p>
                        </div>
                    ) : evalResult ? (
                        <>
                            {/* NEGOTIATION UI CHECK */}
                            {(evalResult as any).tactics_encountered ? (
                                <div className="space-y-8">
                                    <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-2xl">
                                        <h3 className="font-bold text-lg text-purple-200 mb-2">Simulation Summary</h3>
                                        <p className="text-gray-300 leading-relaxed">{(evalResult as any).strategy_notes}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4">Tactics Faced</h4>
                                            <ul className="space-y-2">
                                                {(evalResult as any).tactics_encountered?.map((t: string, i: number) => (
                                                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                                                        <span className="text-yellow-500">•</span> {t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4">Your Leverage</h4>
                                            <ul className="space-y-2">
                                                {(evalResult as any).strengths?.map((t: string, i: number) => (
                                                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                                                        <span className="text-green-500">✓</span> {t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-4">Phrase Optimization</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(evalResult as any).weak_phrasing?.map((weak: string, i: number) => (
                                                <div key={i} className="contents">
                                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-sm text-red-200">
                                                        <div className="text-xs font-bold text-red-500 uppercase mb-1">Avoid</div>
                                                        "{weak}"
                                                    </div>
                                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-sm text-green-200">
                                                        <div className="text-xs font-bold text-green-500 uppercase mb-1">Use Instead</div>
                                                        "{(evalResult as any).strong_alternatives?.[i] || '...'}"
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* STANDARD INTERVIEW UI */
                                evalResult.clarity === 0 && evalResult.structure === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <AlertCircle className="w-10 h-10 text-yellow-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-4 text-white">Session Incomplete</h2>
                                        <div className="bg-white/5 rounded-xl p-6 max-w-lg mx-auto mb-8 border border-white/10">
                                            <p className="text-lg text-yellow-200 font-medium mb-4">{evalResult.key_insight}</p>
                                            <div className="text-left bg-black/20 p-4 rounded-lg">
                                                <p className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-widest">Suggestions</p>
                                                <ul className="space-y-3">
                                                    {evalResult.improvement_priorities.map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-sm text-gray-300">
                                                            <span className="text-purple-500">•</span>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-400">Your session balance has been consumed as per policy.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Scores */}
                                        <div className="space-y-6">
                                            <h3 className="font-semibold text-lg border-b border-white/10 pb-2">Core Metrics</h3>
                                            <div className="space-y-4">
                                                {[
                                                    { label: 'Clarity', val: evalResult.clarity },
                                                    { label: 'Structure', val: evalResult.structure },
                                                    { label: 'Recovery', val: evalResult.recovery },
                                                    { label: 'Signal/Noise', val: evalResult.signal_noise }
                                                ].map(metric => (
                                                    <div key={metric.label}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-400">{metric.label}</span>
                                                            <span className={cn(
                                                                "font-mono font-bold",
                                                                metric.val >= 70 ? "text-green-400" : metric.val >= 50 ? "text-yellow-400" : "text-red-400"
                                                            )}>{metric.val}/100</span>
                                                        </div>
                                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${metric.val}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Insights */}
                                        <div className="space-y-6">
                                            <h3 className="font-semibold text-lg border-b border-white/10 pb-2">Key Insights</h3>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <h4 className="text-purple-300 text-sm font-bold uppercase mb-2 flex items-center gap-2">
                                                    <Check className="w-4 h-4" /> Strength
                                                </h4>
                                                <p className="text-sm text-gray-300">{evalResult.key_insight}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <h4 className="text-yellow-300 text-sm font-bold uppercase mb-2 flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4" /> Focus Areas
                                                </h4>
                                                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                                    {evalResult.improvement_priorities.map((item, i) => (
                                                        <li key={i}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Pro Analysis (if available) */}
                                        {evalResult.readiness_assessment && (
                                            <div className="col-span-full mt-4 pt-4 border-t border-white/10">
                                                <h3 className="font-semibold text-lg mb-4 text-purple-200">Pro Analysis</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl">
                                                        <div className="text-xs uppercase text-purple-400 font-bold mb-1">Readiness</div>
                                                        <div className="text-lg font-semibold">{evalResult.readiness_assessment}</div>
                                                    </div>
                                                    <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl">
                                                        <div className="text-xs uppercase text-purple-400 font-bold mb-1">Risk Projection</div>
                                                        <div className="text-sm text-gray-300">{evalResult.risk_projection}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 text-red-400 flex flex-col gap-2">
                            <p className="font-bold">Failed to load evaluation results.</p>
                            <p className="text-sm font-mono bg-red-500/10 p-2 rounded">{errorMsg || 'Please try again or check the dashboard.'}</p>
                        </div>
                    )}

                    <div className="mt-8 flex gap-4 justify-center">
                        <div onClick={handleDashboard} className="cursor-pointer text-sm text-gray-500 hover:text-white transition-colors border-b border-transparent hover:border-white">
                            Return to Dashboard
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background */}
            <div className={cn(
                "absolute inset-0 transition-opacity duration-1000 pointer-events-none",
                isConnected ? "opacity-100" : "opacity-0"
            )}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <div className="z-10 text-center max-w-2xl px-6">
                <div className="mb-8">
                    {scenarioIdStr === 'negotiation' ? (
                        <>
                            <h2 className="text-gray-400 text-sm tracking-widest uppercase mb-2">Guided • Realistic • India-aware</h2>
                            <h1 className="text-4xl font-bold mb-4 text-yellow-100">Salary Negotiation Simulation</h1>
                            <div className="flex justify-center gap-2 mt-4">
                                {['Leverage', 'Communication', 'Strategy'].map(d => (
                                    <span key={d} className="text-xs bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded text-yellow-200">{d}</span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-gray-400 text-sm tracking-widest uppercase mb-2">{scenario.role}</h2>
                            <h1 className="text-4xl font-bold mb-2">{scenario.title}</h1>
                            <p className="text-sm text-gray-400 mb-4">Realistic, interviewer-led simulation • Preparation, not coaching • One question at a time</p>
                            {scenario.dimensions?.length === 1 && scenario.dimensions[0] === 'ai_fluency' ? (
                                <div className="flex justify-center gap-2 mt-2">
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-cyan-300 font-medium border border-cyan-500/30">
                                        AI Fluency Round
                                    </span>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                <div className="h-64 flex items-center justify-center mb-10">
                    {!sessionStarted ? (
                        <div className="w-32 h-32 rounded-full border-2 border-white/10 flex flex-col items-center justify-center relative group">
                            {scenarioIdStr === 'negotiation' ? (
                                <div className="text-4xl">🤝</div>
                            ) : (
                                <>
                                    <Mic className="w-10 h-10 text-gray-500 mb-2" />
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Microphone Ready</span>
                                </>
                            )}
                            <div className="absolute inset-0 rounded-full border border-white/5 group-hover:border-purple-500/30 transition-colors"></div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className={cn(
                                "w-40 h-40 rounded-full bg-gradient-to-br flex items-center justify-center transition-all duration-300 shadow-[0_0_50px_rgba(168,85,247,0.4)]",
                                scenarioIdStr === 'negotiation' ? "from-yellow-600 to-orange-600" : "from-purple-500 to-pink-500",
                                isSpeaking ? "scale-110 shadow-[0_0_80px_rgba(168,85,247,0.6)]" : "scale-100"
                            )}>
                                {isSpeaking ? (
                                    <div className="space-y-1 flex gap-1 items-center h-8">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-1 bg-white animate-pulse" style={{ height: `${Math.random() * 24 + 8}px` }}></div>
                                        ))}
                                    </div>
                                ) : ( // Idle state
                                    <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                                )}
                            </div>
                            <div className="mt-8 text-sm font-medium text-purple-200">
                                {voiceError ? (
                                    <span className="text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded border border-red-500/20">{voiceError}</span>
                                ) : isConnected ? (
                                    interviewState === 'TRANSCRIBING' ? 'Processing your answer...'
                                    : interviewState === 'THINKING' ? 'Interviewer is thinking...'
                                    : interviewState === 'ASSISTANT_SPEAKING' ? (scenarioIdStr === 'negotiation' ? 'Simulation in progress...' : 'Interviewer is speaking...')
                                    : 'Listening...'
                                ) : (
                                    <span className="animate-pulse">Connecting...</span>
                                )}
                            </div>
                            {/* Timer Display */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 font-mono text-2xl font-bold text-white/80 tracking-widest">
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    )}
                </div>

                {!sessionStarted ? (
                    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">

                        {/* 1. CTA Button (Moved Up) */}
                        <div className="flex flex-col items-center gap-2 mb-4 w-full">
                            <Button onClick={handleStart} className={cn(
                                "rounded-full px-8 py-6 text-lg h-auto transform hover:scale-105 transition-all text-white w-full shadow-lg",
                                scenarioIdStr === 'negotiation' ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40" : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/40"
                            )}>
                                {replayFromId ? (
                                    <>
                                        Start Replay Session ({Math.round(duration / 60)} min)
                                    </>
                                ) : (
                                    scenarioIdStr === 'negotiation' ? `Start Preparation Session (${Math.round(duration / 60)}m)` : `Begin Interview Simulation (${Math.round(duration / 60)} min)`
                                )}
                            </Button>
                            {scenarioIdStr === 'negotiation' ? (
                                <span className="text-xs text-gray-500">You can practice freely — this session is not scored.</span>
                            ) : (
                                <span className="text-xs text-gray-600">Once started, the interviewer will begin immediately.</span>
                            )}
                        </div>

                        {/* 2. Collapsible Warning Panel */}
                        <div
                            className={cn(
                                "w-full overflow-hidden transition-all duration-300 border rounded-lg cursor-pointer bg-black/20",
                                scenarioIdStr === 'negotiation' ? "border-yellow-500/20 hover:bg-yellow-500/5" : "border-white/10 hover:bg-white/5"
                            )}
                            onClick={() => setIsWarningExpanded(!isWarningExpanded)}
                        >
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <div className="text-left">
                                        <p className={cn("font-bold text-sm", scenarioIdStr === 'negotiation' ? "text-yellow-100" : "text-white")}>
                                            Before you begin
                                        </p>
                                        {!isWarningExpanded && (
                                            <p className="text-xs text-gray-500 mt-0.5">Important details about how this session works</p>
                                        )}
                                    </div>
                                </div>
                                <div className={cn("transition-transform duration-300", isWarningExpanded ? "rotate-180" : "")}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <div className={cn(
                                "px-4 pb-4 text-left text-sm transition-[max-height,opacity] duration-300 ease-in-out",
                                isWarningExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                            )}>
                                {scenarioIdStr === 'negotiation' ? (
                                    <div className="text-yellow-200/90 pt-2 border-t border-yellow-500/10">
                                        <p className="mb-2">This is a 30-minute realistic salary negotiation simulation.</p>
                                        <ul className="list-disc list-inside space-y-1 mb-4 text-yellow-200/80">
                                            <li>You’ll role-play a real offer discussion with a hiring manager</li>
                                            <li>The session includes realistic negotiation responses and feedback pauses</li>
                                        </ul>
                                        <p className="text-yellow-100 font-medium">Please ensure you’re in a quiet space and can speak freely for the next 30 minutes.</p>
                                    </div>
                                ) : (
                                    <div className="text-gray-300 pt-2 border-t border-white/5">
                                        <p className="mb-2">This is a full-length interview simulation.</p>
                                        <ul className="list-disc list-inside space-y-1 mb-4 text-gray-400">
                                            <li>The interviewer will ask one question at a time</li>
                                            <li>Follow-ups may happen based on your answers</li>
                                        </ul>
                                        <p className="text-white font-medium mb-4">Please ensure you’re in a quiet space for the next {Math.round(duration / 60)} minutes.</p>
                                        <div className="text-xs bg-black/40 p-3 rounded text-gray-400 border border-white/5">
                                            <strong>Note:</strong> To generate a meaningful evaluation report, the interviewer needs enough conversation to assess your responses. If the session ends very early or there’s little spoken input, a report may not be generated.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleDashboard} className="mt-2 text-sm text-gray-500 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">
                            ← Back to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4 justify-center items-center">
                        {/* End Session Button */}
                        <Button variant="outline" className="rounded-full h-12 w-12 p-0 border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleEnd} disabled={timeLeft === 0}>
                            <PhoneOff className="w-5 h-5" />
                        </Button>

                        {/* Pause/Resume Button */}
                        {!isPaused ? (
                            <Button
                                variant="outline"
                                onClick={handlePause}
                                className="rounded-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-500/50 px-4 transition-all text-sm"
                                disabled={timeLeft === 0}
                            >
                                ⏸️ Pause
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleResume}
                                className="rounded-full border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-green-500/50 px-4 transition-all text-sm"
                            >
                                ▶️ Resume
                            </Button>
                        )}

                        {/* Ask Next Question Button - Only visible when appropriate */}
                        {waitingForNextQuestion && (
                            <Button
                                variant="outline"
                                onClick={handleAskNextQuestion}
                                className="rounded-full border-purple-500/50 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/70 px-6 transition-all text-sm font-semibold"
                                title="Click when you're ready for the next question"
                            >
                                Ask Next Question
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
