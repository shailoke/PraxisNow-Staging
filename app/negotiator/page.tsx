'use client'

import { useRealtimeVoice } from '@/hooks/useBatchVoice'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, PhoneOff, Download, FileText, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NegotiatorPage() {
    const router = useRouter()

    // Auth & Tier Check
    const [hasAccess, setHasAccess] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)

    // Session State
    const [sessionId, setSessionId] = useState<number | null>(null)
    const [sessionStarted, setSessionStarted] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [summary, setSummary] = useState<any | null>(null) // NegotiationEvaluation
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)

    // Voice Hook
    const { isConnected, isSpeaking, startSession, endSession, messages } = useRealtimeVoice(
        sessionId,
        "Introduce yourself as the Praxis Salary Negotiation Coach. Briefly explain that we will start with Phase 1 (Context Setup) and ask me for my target role, level, and company type."
    )

    // Duration (Fixed 30 mins)
    const DURATION = 30 * 60
    const [timeLeft, setTimeLeft] = useState(DURATION)

    useEffect(() => {
        async function checkAccess() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('package_tier')
                .eq('id', user.id)
                .single()

            // Also check for credits (if feature is unbundled later)
            if (profile?.package_tier === 'Pro') {
                setHasAccess(true)
            }
            setCheckingAccess(false)
        }
        checkAccess()
    }, [])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (sessionStarted && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleEnd()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [sessionStarted, timeLeft])

    // Auto-start voice when session ID is ready
    useEffect(() => {
        if (sessionStarted && sessionId && !isConnected) {
            startSession()
        }
    }, [sessionStarted, sessionId, isConnected, startSession])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleStart = async () => {
        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenario_id: 1, // Placeholder
                    duration_seconds: DURATION,
                    session_type: 'negotiation_simulation'
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to start')

            setSessionId(data.id)
            setSessionStarted(true)

        } catch (e: any) {
            console.error(e)
            alert(e.message) // Simple alert for now
        }
    }

    const handleEnd = async () => {
        if (!sessionId || isAnalyzing) return

        setIsAnalyzing(true)
        endSession()
        setSessionStarted(false)

        try {
            // Call End & Analyze Endpoint
            const res = await fetch('/api/negotiation/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })

            const data = await res.json()
            if (res.ok) {
                setSummary(data.summary)
                setPdfUrl(data.pdf_url)
            } else {
                console.error('Analysis failed', data.error)
            }

        } catch (e) {
            console.error(e)
        } finally {
            setIsAnalyzing(false)
        }
    }

    if (checkingAccess) return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">Checking Access...</div>

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-6 p-4">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">
                    <Lock className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold">Pro Exclusive Access</h1>
                <p className="text-gray-400 max-w-md mx-auto mt-2">
                    The Salary Negotiation Coach is available only on the Pro plan. Upgrade to unlock guided negotiation simulations, tactics training, and PDF summaries.
                </p>
                <Button onClick={() => router.push('/pricing')} className="bg-purple-600 hover:bg-purple-700">View Plans</Button>
                <Button variant="ghost" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
        )
    }

    if (summary) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6">
                <div className="max-w-3xl w-full glass-panel p-8 rounded-2xl border border-white/10">
                    <h2 className="text-3xl font-bold mb-6 text-center">Negotiation Complete</h2>

                    <div className="grid gap-6 mb-8">
                        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                            <h3 className="text-purple-400 font-bold mb-2 uppercase text-sm">Coach's Notes</h3>
                            <p className="text-gray-300">{summary.strategy_notes}</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                            <h3 className="text-purple-400 font-bold mb-4 uppercase text-sm">Tactics Faced</h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.tactics_encountered.map((t: string, i: number) => (
                                    <span key={i} className="bg-yellow-500/10 text-yellow-200 px-3 py-1 rounded-full text-sm border border-yellow-500/20">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        {pdfUrl ? (
                            <a href={pdfUrl} download="Praxis_Negotiation_Summary.pdf" className="w-full max-w-sm">
                                <Button className="w-full bg-purple-600 hover:bg-purple-700 h-12 gap-2 text-lg">
                                    <Download className="w-5 h-5" /> Download PDF Summary
                                </Button>
                            </a>
                        ) : (
                            <p className="text-red-400">Failed to generate PDF</p>
                        )}
                        <Button variant="ghost" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <div className="z-10 text-center max-w-2xl px-6">
                <div className="mb-8">
                    <h2 className="text-indigo-400 text-sm tracking-widest uppercase mb-2 font-bold">Pro Feature</h2>
                    <h1 className="text-4xl font-bold mb-4">Salary Negotiation Coach</h1>
                    <p className="text-gray-400">Master the art of negotiation in a risk-free environment.</p>
                </div>

                <div className="h-64 flex items-center justify-center mb-10">
                    {!sessionStarted ? (
                        <div className="w-32 h-32 rounded-full border-2 border-white/10 flex items-center justify-center relative group bg-indigo-500/5">
                            <FileText className="w-10 h-10 text-indigo-400" />
                            <div className="absolute inset-0 rounded-full border border-white/5 group-hover:border-indigo-500/30 transition-colors"></div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className={cn(
                                "w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transition-all duration-300 shadow-[0_0_50px_rgba(99,102,241,0.4)]",
                                isSpeaking ? "scale-110 shadow-[0_0_80px_rgba(99,102,241,0.6)]" : "scale-100"
                            )}>
                                {isSpeaking ? (
                                    <div className="space-y-1 flex gap-1 items-center h-8">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-1 bg-white animate-pulse" style={{ height: `${Math.random() * 24 + 8}px` }}></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                                )}
                            </div>
                            <div className="mt-8 text-sm font-medium text-indigo-200">
                                {isAnalyzing ? "Analyzing Negotiation..." : (isConnected ? (isSpeaking ? "Coach is speaking..." : "Listening...") : "Connecting...")}
                            </div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 font-mono text-2xl font-bold text-white/80 tracking-widest">
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    )}
                </div>

                {!sessionStarted ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-5 text-left text-indigo-200/80 max-w-md w-full">
                            <h3 className="font-bold text-indigo-100 mb-2">What to expect:</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong>Phase 1:</strong> Setup (Role, Level, Offer)</li>
                                <li><strong>Phase 2:</strong> Role-play (Employer vs You)</li>
                                <li><strong>Phase 3:</strong> Debrief & Strategy</li>
                            </ul>
                            <p className="mt-4 text-xs text-indigo-300/60">*Simulated environment. No legal advice provided.</p>
                        </div>
                        <Button onClick={handleStart} className="rounded-full px-8 py-6 text-lg h-auto bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/40 transform hover:scale-105 transition-all">
                            Start Session (30m)
                        </Button>
                        <Button variant="ghost" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                    </div>
                ) : (
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" className="rounded-full h-12 px-6 text-red-400 border-red-500/50 hover:bg-red-500/10" onClick={handleEnd} disabled={isAnalyzing}>
                            <PhoneOff className="w-5 h-5 mr-2" /> End Session
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
