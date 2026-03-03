'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface Session {
    id: string
    scenario_id: string
}

export default function DevInterviewPage() {
    const router = useRouter()

    // Session state
    const [scenarios, setScenarios] = useState<any[]>([])
    const [selectedScenarioId, setSelectedScenarioId] = useState('')
    const [session, setSession] = useState<Session | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [transcript, setTranscript] = useState('')

    // Input state
    const [userInput, setUserInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Control state
    const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutes
    const [isPaused, setIsPaused] = useState(false)
    const [isActive, setIsActive] = useState(false)
    const [turnAuthority, setTurnAuthority] = useState(false)
    const [isFirstQuestion, setIsFirstQuestion] = useState(true)
    const sessionStartTime = useRef<number>(0)

    // Logs
    const [logs, setLogs] = useState<string[]>([])

    // Evaluation state
    const [evaluationResult, setEvaluationResult] = useState<any>(null)
    const [showEvaluation, setShowEvaluation] = useState(false)

    const transcriptEndRef = useRef<HTMLDivElement>(null)

    // Load scenarios on mount
    useEffect(() => {
        loadScenarios()
    }, [])

    // Timer logic
    useEffect(() => {
        if (!isActive || isPaused || timeRemaining <= 0) return

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleTimeExpired()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isActive, isPaused, timeRemaining])

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    }

    const loadScenarios = async () => {
        try {
            console.log('[DEV_HARNESS] Fetching scenarios from /api/admin/scenarios...')
            const response = await fetch('/api/admin/scenarios')
            console.log('[DEV_HARNESS] Scenarios response:', response.status, response.statusText)

            if (response.ok) {
                const data = await response.json()
                console.log('[DEV_HARNESS] Scenarios loaded:', data.scenarios?.length, 'scenarios')

                setScenarios(data.scenarios || [])
                addLog(`Loaded ${data.scenarios?.length || 0} scenarios`)
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                console.error('[DEV_HARNESS] Failed to load scenarios:', response.status, errorData)
                addLog(`Failed to load scenarios: ${response.status} - ${JSON.stringify(errorData)}`)
            }
        } catch (error) {
            console.error('[DEV_HARNESS] Scenarios fetch error:', error)
            addLog(`Scenarios fetch error: ${error}`)
        }
    }

    const handleStartSession = async () => {
        if (!selectedScenarioId) {
            addLog('Please select a scenario')
            return
        }

        setIsLoading(true)
        console.log('[DEV_AI_ROUND]', { scenario_id: selectedScenarioId, is_ai_round: selectedScenarioId.startsWith('ai-round-') })

        try {
            const response = await fetch('/api/admin/dev-interview/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_id: selectedScenarioId })
            })

            if (!response.ok) {
                throw new Error('Failed to start session')
            }

            const data = await response.json()
            setSession({ id: data.session_id, scenario_id: selectedScenarioId })
            setIsActive(true)
            sessionStartTime.current = Date.now()
            setIsFirstQuestion(true)
            setTurnAuthority(false) // No authority until user answers TMAY
            addLog(`Session started: ${data.session_id}`)

            // TMAY (Turn 0) is auto-created on backend and returned in response
            if (data.initial_turn) {
                const tmayMessage: Message = {
                    role: 'assistant',
                    content: data.initial_turn.content
                }
                setMessages([tmayMessage])
                setTranscript(`ASSISTANT: ${data.initial_turn.content}\n`)
                addLog('TMAY loaded from session response')
            }
        } catch (error) {
            addLog(`Error starting session: ${error}`)
        } finally {
            setIsLoading(false)
        }
    }

    const triggerInterviewerQuestion = async (sessionId: string, currentMessages: Message[], isFirst: boolean) => {
        addLog(`Triggering interviewer (first_question: ${isFirst}, turn_authority: true)`)

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: selectedScenarioId,
                    messages: currentMessages,
                    userMessage: '', // Empty for question trigger
                    sessionStartTime: sessionStartTime.current,
                    targetDuration: 30,
                    session_id: sessionId,
                    turn_authority: true,
                    is_first_question: isFirst
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                console.error('[DEV_HARNESS] Interview API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                })
                addLog(`Error: ${response.status} - ${JSON.stringify(errorData)}`)
                throw new Error(`Interview API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.message) {
                const assistantMessage: Message = { role: 'assistant', content: data.message }
                const newMessages = [...currentMessages, assistantMessage]
                setMessages(newMessages)
                setTranscript(prev => prev + `\nASSISTANT: ${data.message}\n`)
                addLog('Interviewer question received')

                if (isFirst) {
                    setIsFirstQuestion(false)
                }
            }

            setTurnAuthority(false)
        } catch (error) {
            addLog(`Error: ${error}`)
        }
    }

    const handleSendAnswer = async () => {
        if (!session || !userInput.trim()) return

        const userMessage: Message = { role: 'user', content: userInput }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setTranscript(prev => prev + `\nUSER: ${userInput}\n`)
        addLog(`User answer sent`)
        setUserInput('')

        // CORRECT FLOW: Only mark turn as answered, do NOT advance
        try {
            await fetch('/api/admin/dev-interview/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: session.id,
                    action: 'mark_answered'
                })
            })
            addLog('Turn marked as answered - click "Ask Next Question" to continue')
        } catch (err) {
            console.error('Failed to mark turn answered:', err)
        }
    }

    const handleAskNextQuestion = async () => {
        if (!session) return

        setTurnAuthority(true)
        setIsLoading(true)
        addLog('Turn authority granted - requesting next question')

        // ONLY PATH to /api/interview - explicit user action
        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: selectedScenarioId,
                    messages: messages,
                    userMessage: messages.filter(m => m.role === 'user').pop()?.content || '',
                    sessionStartTime: sessionStartTime.current,
                    targetDuration: 30,
                    session_id: session.id,
                    turn_authority: true,
                    is_first_question: isFirstQuestion
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                addLog(`Error: ${response.status} - ${JSON.stringify(errorData)}`)
                throw new Error(`Interview API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.message) {
                const assistantMessage: Message = { role: 'assistant', content: data.message }
                setMessages(prev => [...prev, assistantMessage])
                setTranscript(prev => prev + `\nASSISTANT: ${data.message}\n`)
                addLog('Next question received')

                if (isFirstQuestion) {
                    setIsFirstQuestion(false)
                }
            }

            setTurnAuthority(false)
        } catch (error) {
            addLog(`Error: ${error}`)
            setTurnAuthority(false)
        } finally {
            setIsLoading(false)
        }
    }


    const handlePause = async () => {
        if (!session) return

        setIsPaused(true)
        await fetch('/api/admin/dev-interview/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, action: 'pause' })
        })
        addLog('Session paused')
    }

    const handleResume = async () => {
        if (!session) return

        setIsPaused(false)
        await fetch('/api/admin/dev-interview/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, action: 'resume' })
        })
        addLog('Session resumed')
    }

    const handleEndSession = async () => {
        if (!session) return

        setIsActive(false)
        const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000)

        try {
            await fetch('/api/admin/dev-interview/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: session.id,
                    action: 'end',
                    duration_seconds: duration
                })
            })
            addLog(`Session ended (duration: ${duration}s)`)

            // Trigger evaluation
            await runEvaluation()
        } catch (error) {
            addLog(`Error ending session: ${error}`)
        }
    }

    const runEvaluation = async () => {
        if (!session) return

        addLog('Running evaluation...')
        setIsLoading(true)

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: session.id })
            })

            if (!response.ok) {
                throw new Error('Evaluation failed')
            }

            const data = await response.json()
            setEvaluationResult(data)
            setShowEvaluation(true)
            addLog('Evaluation complete')
        } catch (error) {
            addLog(`Evaluation error: ${error}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTimeExpired = () => {
        addLog('Timer expired - ending session')
        handleEndSession()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-mono">
            {/* Header */}
            <div className="bg-gray-950 border-b border-red-900 p-4">
                <h1 className="text-2xl font-bold text-red-500">
                    DEV INTERVIEW HARNESS — TEXT MODE
                </h1>
                <p className="text-xs text-gray-500 mt-1">DEBUG ONLY • NO VOICE API</p>
            </div>

            {/* Session Config */}
            {!session && (
                <div className="p-6 bg-gray-800 border-b border-gray-700">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-2">Scenario</label>
                            <select
                                value={selectedScenarioId}
                                onChange={(e) => setSelectedScenarioId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                            >
                                <option value="">Select scenario...</option>
                                {scenarios.map(s => {
                                    const label = `${s.role} — ${s.level}${s.persona ? ' (' + s.persona + ')' : ''}`
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {label}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        <button
                            onClick={handleStartSession}
                            disabled={!selectedScenarioId || isLoading}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium"
                        >
                            Start Session
                        </button>
                    </div>
                </div>
            )}

            {/* Main Layout */}
            {session && (
                <div className="flex h-[calc(100vh-120px)]">
                    {/* Left: Transcript */}
                    <div className="flex-1 flex flex-col border-r border-gray-800">
                        <div className="p-4 bg-gray-800 border-b border-gray-700">
                            <h2 className="text-sm font-bold text-gray-300">TRANSCRIPT</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48">
                            {transcript.split('\n').filter(l => l.trim()).map((line, i) => (
                                <div key={i} className={`text-sm ${line.startsWith('USER:') ? 'text-blue-400' : 'text-green-400'}`}>
                                    {line}
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>

                    {/* Right: State Panel */}
                    <div className="w-96 flex flex-col bg-gray-950">
                        <div className="p-4 bg-gray-900 border-b border-gray-800">
                            <h2 className="text-sm font-bold text-gray-300">SESSION STATE</h2>
                        </div>
                        <div className="p-4 space-y-4 text-xs">
                            <div>
                                <span className="text-gray-500">Time Remaining:</span>
                                <span className={`ml-2 font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-green-500'}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Status:</span>
                                <span className="ml-2 text-white">
                                    {isPaused ? 'Paused' : isActive ? 'Active' : 'Ended'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Turn Authority:</span>
                                <span className="ml-2">{turnAuthority ? '✅ Granted' : '❌ None'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Session ID:</span>
                                <span className="ml-2 text-gray-400 text-[10px]">{session.id}</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-800 p-4 flex-1 overflow-y-auto">
                            <h3 className="text-xs font-bold text-gray-500 mb-2">CONSOLE LOGS</h3>
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-[10px] text-gray-600">{log}</div>
                                ))}
                            </div>
                        </div>

                        {showEvaluation && evaluationResult && (
                            <div className="border-t border-gray-800 p-4 max-h-64 overflow-y-auto">
                                <h3 className="text-xs font-bold text-yellow-500 mb-2">EVALUATION</h3>
                                <div className="text-[10px] text-gray-400">
                                    <div>Depth: {evaluationResult.evaluation_depth}</div>
                                    {evaluationResult.primary_failure_mode && (
                                        <div className="mt-2">
                                            <div className="text-red-400">
                                                {evaluationResult.primary_failure_mode.label}
                                            </div>
                                            <div className="text-gray-500 mt-1">
                                                {evaluationResult.primary_failure_mode.diagnosis}
                                            </div>
                                        </div>
                                    )}
                                    {evaluationResult.answer_upgrades && (
                                        <div className="mt-2 text-blue-400">
                                            Answer Upgrades: {evaluationResult.answer_upgrades.length} items
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom: Controls */}
            {session && isActive && (
                <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 p-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                disabled={isPaused || !isActive}
                                placeholder="Type your answer..."
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSendAnswer}
                                disabled={!userInput.trim() || isPaused || !isActive}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm"
                            >
                                Send Answer
                            </button>
                            <button
                                onClick={handleAskNextQuestion}
                                disabled={isPaused || !isActive || isLoading}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-bold"
                            >
                                {isLoading ? 'Processing...' : 'Ask Next Question'}
                            </button>
                            <button
                                onClick={isPaused ? handleResume : handlePause}
                                disabled={!isActive}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm"
                            >
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button
                                onClick={handleEndSession}
                                disabled={!isActive}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm"
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
