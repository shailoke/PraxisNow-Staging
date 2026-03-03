'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function InterviewTestPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [turnCount, setTurnCount] = useState(0)
    const scenarioId = 'sde-l5-system-design'

    // TRANSACTIONAL TURN STATE (client-only, not persisted)
    const [currentTurnStatus, setCurrentTurnStatus] = useState<'pending' | 'completed' | 'failed'>('completed')
    const [currentTurnId, setCurrentTurnId] = useState<string | null>(null)
    const [retryable, setRetryable] = useState(false)

    const sendMessage = async (isRetry: boolean = false) => {
        if (!input.trim() || loading || turnCount >= 5) return

        setLoading(true)
        const userMessage = input.trim()
        if (!isRetry) {
            setInput('')
        }

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId,
                    messages,
                    userMessage,
                    // Include turnId if retrying
                    ...(isRetry && currentTurnId ? { turn_id: currentTurnId } : {})
                })
            })

            const data = await response.json()

            if (response.ok) {
                // SUCCESS: Update messages and clear retry state
                setMessages([
                    ...messages,
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: data.message }
                ])
                setTurnCount(turnCount + 1)
                setCurrentTurnStatus(data.turn_status || 'completed')
                setCurrentTurnId(null)
                setRetryable(false)
                if (!isRetry) {
                    setInput('')
                }
            } else if (data.retryable) {
                // RETRYABLE ERROR: Preserve turnId for retry
                console.log('🔄 [RETRYABLE_ERROR] Preserving turnId for retry:', data.turn_id)
                setCurrentTurnStatus('failed')
                setCurrentTurnId(data.turn_id)
                setRetryable(true)
            } else {
                // TERMINAL ERROR: Show error and reset
                console.error('API error:', data.error)
                alert('Error: ' + data.error)
                setCurrentTurnStatus('failed')
                setRetryable(false)
            }
        } catch (error) {
            console.error('Request failed:', error)
            alert('Failed to send message')
            setCurrentTurnStatus('failed')
            setRetryable(false)
        } finally {
            setLoading(false)
        }
    }

    const startInterview = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId,
                    messages: [],
                    userMessage: 'Hello, I\'m ready to begin.'
                })
            })

            const data = await response.json()

            if (response.ok) {
                setMessages([
                    { role: 'user', content: 'Hello, I\'m ready to begin.' },
                    { role: 'assistant', content: data.message }
                ])
                setTurnCount(1)
            }
        } catch (error) {
            console.error('Failed to start interview:', error)
            alert('Failed to start interview')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Interview Test: SDE L5 System Design</h1>
                    <p className="text-gray-400">Testing master prompt template with OpenAI GPT-4o</p>
                    <div className="mt-4 flex gap-4 text-sm">
                        <span className="text-purple-400">Turn: {turnCount}/5</span>
                        <span className="text-gray-500">Scenario: {scenarioId}</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto bg-black/20 rounded-lg p-6">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">
                            <p className="mb-4">Click "Start Interview" to begin</p>
                            <Button onClick={startInterview} disabled={loading}>
                                {loading ? 'Starting...' : 'Start Interview'}
                            </Button>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-lg ${msg.role === 'user'
                                    ? 'bg-purple-900/30 ml-12'
                                    : 'bg-gray-800/50 mr-12'
                                    }`}
                            >
                                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                                    {msg.role === 'user' ? 'You (Candidate)' : 'Interviewer'}
                                </div>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                {messages.length > 0 && turnCount < 5 && (
                    <div className="space-y-3">
                        {/* Retry button for failed turns */}
                        {retryable && currentTurnStatus === 'failed' && (
                            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                                <p className="text-yellow-400 text-sm mb-2">⚠️ Failed to generate response</p>
                                <Button
                                    onClick={() => sendMessage(true)}
                                    disabled={loading}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {loading ? 'Retrying...' : '🔄 Retry'}
                                </Button>
                            </div>
                        )}

                        {/* Normal input */}
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !retryable && sendMessage(false)}
                                placeholder="Type your response..."
                                disabled={loading || retryable}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                            />
                            <Button
                                onClick={() => sendMessage(false)}
                                disabled={loading || !input.trim() || retryable}
                                className="px-6"
                            >
                                {loading ? 'Sending...' : 'Send'}
                            </Button>
                        </div>
                    </div>
                )}

                {turnCount >= 5 && (
                    <div className="text-center py-8 bg-green-900/20 rounded-lg border border-green-700/30">
                        <p className="text-green-400 font-semibold mb-2">✓ Test Complete</p>
                        <p className="text-gray-400 text-sm">5 turns completed successfully</p>
                        <Button
                            onClick={() => {
                                setMessages([])
                                setTurnCount(0)
                            }}
                            className="mt-4"
                            variant="outline"
                        >
                            Reset Test
                        </Button>
                    </div>
                )}

                {/* Debug Info */}
                <details className="mt-8 text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                        Debug: View Raw Messages
                    </summary>
                    <pre className="mt-2 bg-black/40 p-4 rounded overflow-x-auto">
                        {JSON.stringify(messages, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    )
}
