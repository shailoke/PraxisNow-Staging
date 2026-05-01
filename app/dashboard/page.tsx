'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import SupportModal from '@/components/SupportModal'
import {
    AlertTriangle, AlertCircle, User as UserIcon,
    Download as DownloadIcon, Loader2, X, FileText,
    Zap, Trophy, Clock, Lock, MicOff
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import LegalFooter from '@/components/LegalFooter'
import CurrentBarCard, { type CurrentBarCardProps } from '@/components/CurrentBarCard'
import DashboardFilters, { FilterState } from '@/components/DashboardFilters'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Session = Database['public']['Tables']['sessions']['Row']

interface ScenarioRow {
    id: number
    role: string
    round: number
    round_title: string
    evaluation_dimensions: string[]
}

type ScoreHistoryRow = {
    id: string
    role: string
    round: number
    round_title: string
    dimension_scores: unknown
    weighted_composite: number | null
    recommendation: string | null
    primary_blocker: string | null
    created_at: string
}

type StuckSession = {
    id: string
    scenario_id: number | null
    session_type: string
    created_at: string
}

type RoundData = {
    latest: number
    history: number[]
    recommendation: string | null
}

type RecommendedRound = {
    round: number
    round_title: string
    scenario_id: number
    reason: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreBarColor(score: number): string {
    if (score >= 4.0) return 'bg-green-500'
    if (score >= 3.0) return 'bg-amber-500'
    return 'bg-red-500'
}

function getBandPill(recommendation: string | null): { label: string; className: string } {
    if (!recommendation) return { label: '—', className: 'bg-white/10 text-gray-400 border border-white/10' }
    const r = recommendation.toLowerCase()
    if (r.includes('strong hire')) return { label: 'Strong Hire', className: 'bg-green-500/20 text-green-400 border border-green-500/30' }
    if (r.includes('lean hire') && !r.includes('no')) return { label: 'Lean Hire', className: 'bg-green-500/15 text-green-400 border border-green-500/20' }
    if (r.includes('lean no hire')) return { label: 'Lean No Hire', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' }
    if (r.includes('no hire')) return { label: 'No Hire', className: 'bg-red-500/20 text-red-400 border border-red-500/30' }
    return { label: recommendation, className: 'bg-white/10 text-gray-400 border border-white/10' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()

    const [user, setUser] = useState<any>(null)
    const [userProfile, setUserProfile] = useState<User | null>(null)
    const [scenarios, setScenarios] = useState<ScenarioRow[]>([])
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)

    // Preserved state — not all rendered in new layout but kept per spec
    const [filters, setFilters] = useState<FilterState>({ role: '', dimension: '', search: '' })
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'practice' | 'history'>('practice')
    const [selectedRole, setSelectedRole] = useState<string>('Product Manager')
    const [selectedSession, setSelectedSession] = useState<any | null>(null)
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)
    const [isSupportOpen, setIsSupportOpen] = useState(false)
    const [currentBar, setCurrentBar] = useState<CurrentBarCardProps | null>(null)
    const [scoreHistory, setScoreHistory] = useState<ScoreHistoryRow[]>([])
    const [stuckSessions, setStuckSessions] = useState<StuckSession[]>([])
    const [recoveringId, setRecoveringId] = useState<string | null>(null)
    const [showPaywall, setShowPaywall] = useState(false)

    // ── Functions ─────────────────────────────────────────────────────────────

    const handleGeneratePDF = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation()
        setGeneratingPdfId(sessionId)
        try {
            const res = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })
            const data = await res.json()
            if (data.pdf_url) {
                setSessions((prev: any[]) => prev.map(s =>
                    s.id.toString() === sessionId.toString() ? { ...s, pdf_url: data.pdf_url } : s
                ) as any)
                if (selectedSession && selectedSession.id.toString() === sessionId.toString()) {
                    setSelectedSession((prev: any) => ({ ...prev, pdf_url: data.pdf_url }))
                }
                const link = document.createElement('a')
                link.href = data.pdf_url
                link.target = '_blank'
                link.download = `PraxisNow-Report-${sessionId}.pdf`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            } else {
                throw new Error(data.error || 'Unknown server error')
            }
        } catch (err) {
            console.error('PDF Generation failed', err)
            alert(`PDF Generation Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setGeneratingPdfId(null)
        }
    }

    const handleReplay = () => {
        if (!selectedSession) return
        const scenarioId = selectedSession.custom_scenario_id || selectedSession.scenario_id
        router.push(`/simulator/${scenarioId}?replay_from=${selectedSession.id}`)
    }

    const recoverSession = async (sessionId: string) => {
        setRecoveringId(sessionId)
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })
            if (res.ok) {
                router.push(`/results/${sessionId}`)
            } else {
                const data = await res.json()
                console.error('[RECOVER] Evaluate failed:', data.error)
            }
        } catch (err) {
            console.error('[RECOVER] Error:', err)
        } finally {
            setRecoveringId(null)
            setStuckSessions(prev => prev.filter(s => s.id !== sessionId))
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handlePurchase = async (packId: string) => {
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        if (!razorpayKey) {
            alert('Payment configuration error. Please contact support.')
            return
        }
        try {
            const res = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId })
            })
            if (!res.ok) throw new Error(`Failed to create order: ${res.statusText}`)
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            const descriptionMap: Record<string, string> = {
                single: 'PraxisNow — Single Session',
                practice_pack: 'PraxisNow — Practice Pack (3 Sessions)',
                full_prep: 'PraxisNow — Full Prep (5 Sessions)',
            }

            const options = {
                key: razorpayKey,
                amount: data.amount,
                currency: 'INR',
                name: 'PraxisNow AI',
                description: descriptionMap[packId] || 'Interview Sessions',
                order_id: data.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                packId
                            })
                        })
                        const verifyData = await verifyRes.json()
                        if (verifyData.success) {
                            window.location.href = '/dashboard?payment=success'
                        } else {
                            throw new Error(verifyData.error || 'Verification failed')
                        }
                    } catch (err) {
                        alert('Payment successful, but verification failed. Please contact support.')
                    }
                },
                theme: { color: '#9333ea' }
            }

            if (typeof (window as any).Razorpay === 'undefined') {
                alert('Payment system is still loading. Please try again in a moment.')
                return
            }
            const rzp = new (window as any).Razorpay(options)
            rzp.open()
        } catch (err) {
            alert(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    const handleStartInterview = (scenarioId: number) => {
        const isAIRound = [4, 8, 12].includes(scenarioId)

        if (isAIRound && sessionsRemaining === 0) {
            setShowPaywall(true)
            return
        }

        if (sessionsRemaining === 0 && freeSessionUsed) {
            setShowPaywall(true)
            return
        }

        router.push(`/simulator/${scenarioId}`)
    }

    // ── Data Loading ──────────────────────────────────────────────────────────

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth'); return }
            setUser(user)

            const [
                { data: profile, error: profileError },
                { data: dbScenarios }
            ] = await Promise.all([
                supabase.from('users').select('package_tier, available_sessions, free_session_used, onboarding_complete, primary_role, first_name, full_name, avatar_url').eq('id', user.id).single(),
                supabase.from('scenarios').select('id, role, round, round_title, evaluation_dimensions').eq('is_active', true).order('round', { ascending: true })
            ])

            console.log('[DASHBOARD] userProfile:', profile)
            console.log('[DASHBOARD] profileError:', profileError)

            if (profile) {
                setUserProfile(profile as any)
            } else {
                setUserProfile(null)
            }

            setScenarios((dbScenarios as ScenarioRow[]) || [])

            // 5. Fetch Sessions (History)
            const { data: dbSessions } = await supabase
                .from('sessions')
                .select('id, created_at, session_type, scenario_id, evaluation_depth')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            setSessions(dbSessions as any || [])

            // 5a. Fetch stuck sessions (status=evaluating, 10–90 min old) for recovery banner
            try {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
                const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString()
                const { data: stuck } = await supabase
                    .from('sessions')
                    .select('id, scenario_id, session_type, created_at')
                    .eq('user_id', user.id)
                    .eq('status', 'evaluating')
                    .lt('created_at', tenMinutesAgo)
                    .gt('created_at', ninetyMinutesAgo)
                setStuckSessions((stuck || []) as StuckSession[])
            } catch {
                // Non-critical
            }

            // 5b. Most recent evaluated session for CurrentBarCard (preserved, data used elsewhere)
            try {
                const { data: recentEvalSession } = await supabase
                    .from('sessions')
                    .select('id, created_at, evaluation_data, scenarios:scenario_id(role, round, round_title)')
                    .eq('user_id', user.id)
                    .not('evaluation_data', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (recentEvalSession) {
                    const evalData = (recentEvalSession as any).evaluation_data
                    if (evalData?.hiring_signal) {
                        const scenario = (recentEvalSession as any).scenarios
                        setCurrentBar({
                            hireable_level: evalData.hireable_level || 'Unknown',
                            hiring_signal: evalData.hiring_signal,
                            primary_blocker: evalData.distance_to_strong_hire?.primary_blocker ?? null,
                            role: scenario?.role || 'Unknown',
                            session_date: new Date(recentEvalSession.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        })
                    }
                }
            } catch {
                // Non-critical
            }

            // 5c. Score history for trend view + new computed cards
            try {
                const { data: scoreRows } = await supabase
                    .from('sessions')
                    .select('id, round, dimension_scores, evaluation_data, overall_score, created_at, scenarios:scenario_id(role, round_title)')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: true })

                const mapped: ScoreHistoryRow[] = (scoreRows || []).map((r: any) => ({
                    id: r.id,
                    role: r.scenarios?.role || '',
                    round: r.round || 0,
                    round_title: r.scenarios?.round_title || '',
                    dimension_scores: r.dimension_scores,
                    weighted_composite: r.overall_score ?? (r.evaluation_data as any)?.weighted_composite ?? null,
                    recommendation: (r.evaluation_data as any)?.recommendation ?? null,
                    primary_blocker: (r.evaluation_data as any)?.distance_to_strong_hire?.primary_blocker ?? null,
                    created_at: r.created_at || '',
                }))
                setScoreHistory(mapped)
            } catch {
                // Non-critical
            }

            setLoading(false)
        }
        loadData()
    }, [router, supabase])

    // ── Computed values ───────────────────────────────────────────────────────

    // scoreHistory rows for the active role tab, ascending by created_at (from query order)
    const roleScoreSessions = useMemo(
        () => scoreHistory.filter(s => s.role === selectedRole),
        [scoreHistory, selectedRole]
    )

    // Per-round: latest score, full history, most recent recommendation
    const roundDataMap = useMemo((): Map<number, RoundData> => {
        const map = new Map<number, RoundData>()
        for (const row of roleScoreSessions) {
            if (row.weighted_composite === null) continue
            const existing = map.get(row.round)
            if (!existing) {
                map.set(row.round, {
                    latest: row.weighted_composite,
                    history: [row.weighted_composite],
                    recommendation: row.recommendation,
                })
            } else {
                existing.history.push(row.weighted_composite)
                existing.latest = row.weighted_composite
                existing.recommendation = row.recommendation
            }
        }
        return map
    }, [roleScoreSessions])

    const completedRounds = useMemo(
        () => Array.from(roundDataMap.entries()).map(([round, data]) => ({ round, ...data })),
        [roundDataMap]
    )

    const avgScore = useMemo((): number | null => {
        if (completedRounds.length === 0) return null
        return completedRounds.reduce((sum, r) => sum + r.latest, 0) / completedRounds.length
    }, [completedRounds])

    const levelLabel = useMemo((): string | null => {
        if (avgScore === null) return null
        if (avgScore >= 4.0) return 'Senior-level'
        if (avgScore >= 3.0) return 'Mid-level'
        return 'Junior-level'
    }, [avgScore])

    const seniorGap = useMemo((): number | null => {
        if (avgScore === null) return null
        return Math.max(0, 4.0 - avgScore)
    }, [avgScore])

    const primaryGapText = useMemo((): string => {
        const withBlocker = roleScoreSessions.filter(s => s.primary_blocker !== null)
        if (withBlocker.length === 0) return 'Complete more rounds to see your primary gap.'
        return withBlocker[withBlocker.length - 1].primary_blocker!
    }, [roleScoreSessions])

    // Recommended next round: priority 1 = not started (round 1 first), priority 2 = lowest score
    const recommendedNextRound = useMemo((): RecommendedRound | null => {
        const roleScenarios = scenarios.filter(s => s.role === selectedRole)
        const notStarted = roleScenarios
            .filter(s => !roundDataMap.has(s.round))
            .sort((a, b) => a.round - b.round)

        if (notStarted.length > 0) {
            const target = notStarted[0]
            return { round: target.round, round_title: target.round_title, scenario_id: target.id, reason: 'not started yet' }
        }
        if (completedRounds.length === 0) return null
        const lowest = completedRounds.reduce((min, r) => r.latest < min.latest ? r : min)
        const scenario = roleScenarios.find(s => s.round === lowest.round)
        if (!scenario) return null
        return {
            round: lowest.round,
            round_title: scenario.round_title,
            scenario_id: scenario.id,
            reason: `your lowest scored round at ${lowest.latest.toFixed(1)}`,
        }
    }, [scenarios, selectedRole, roundDataMap, completedRounds])

    // Star Interviewer: all 4 rounds completed at >= 4.0
    const isStarInterviewer = useMemo(() => {
        const allPresent = [1, 2, 3, 4].every(r => roundDataMap.has(r))
        return allPresent && [1, 2, 3, 4].every(r => (roundDataMap.get(r)?.latest ?? 0) >= 4.0)
    }, [roundDataMap])

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
                Loading Dashboard...
            </div>
        </div>
    )

    const hasActivePack = !!(userProfile?.package_tier && userProfile.package_tier !== 'Free')
    const hasSessions = (userProfile?.available_sessions ?? 0) > 0
    const sessionsRemaining = userProfile?.available_sessions ?? 0
    const freeSessionUsed = userProfile?.free_session_used ?? true
    const totalSessionsAvailable = sessionsRemaining + (freeSessionUsed ? 0 : 1)

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30">

            {/* ── Topbar ───────────────────────────────────────────────────── */}
            <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

                    {/* Logo */}
                    <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
                        <Image
                            src="/praxisnow-logo-dark.svg"
                            alt="PraxisNow"
                            width={220}
                            height={44}
                            className="h-9 w-auto"
                            priority
                        />
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2">

                        {/* Sessions left badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300">
                            <Zap className="w-3 h-3 text-purple-400" />
                            {totalSessionsAvailable} sessions left
                        </div>

                        {/* Report issue */}
                        <button
                            onClick={() => setIsSupportOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <path d="M3 2h10l-2 4 2 4H3V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                                <path d="M3 14V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                            <span className="hidden sm:inline">Report issue</span>
                        </button>

                        {/* Avatar + dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 hover:bg-white/5 p-1 px-2 rounded-lg transition-colors group"
                            >
                                <div className="w-7 h-7 rounded-full bg-purple-500/20 overflow-hidden border border-purple-500/40 flex items-center justify-center">
                                    {(userProfile as any)?.avatar_url
                                        ? <img src={(userProfile as any).avatar_url} className="w-full h-full object-cover" alt="avatar" />
                                        : <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                                    }
                                </div>
                                <span className="hidden md:block text-sm text-gray-300 group-hover:text-white transition-colors">
                                    {(userProfile as any)?.first_name || (userProfile as any)?.full_name?.split(' ')[0] || 'Me'}
                                </span>
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                    <div className="absolute top-full right-0 mt-2 w-44 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                                        <div className="py-1">
                                            <Link
                                                href="/profile"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                                                onClick={() => setIsProfileOpen(false)}
                                            >
                                                My Profile
                                            </Link>
                                            <div className="h-px bg-white/10 my-1" />
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">

                {/* No Active Pack Banner — only when free session is used AND no sessions remain */}
                {!hasActivePack && freeSessionUsed && sessionsRemaining === 0 && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between text-red-200">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="font-semibold text-sm">You don&apos;t have an active plan. Choose a plan to start practicing.</span>
                        </div>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="bg-red-500 hover:bg-red-600 text-white border-0 font-bold shrink-0"
                            size="sm"
                        >
                            View Plans
                        </Button>
                    </div>
                )}

                {/* Recovery Banner */}
                {stuckSessions.length > 0 && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {stuckSessions.length === 1 ? 'An interview session' : 'Some interview sessions'} didn&apos;t finish evaluating. Tap below to recover.
                        </div>
                        {stuckSessions.map(s => (
                            <div key={s.id} className="flex items-center justify-between text-sm text-amber-200/80">
                                <span>Session from {new Date(s.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <button
                                    onClick={() => recoverSession(s.id)}
                                    disabled={recoveringId === s.id}
                                    className="ml-4 px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50 disabled:cursor-wait transition-colors"
                                >
                                    {recoveringId === s.id ? 'Recovering...' : 'Resume Evaluation'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Free Session Welcome Banner ──────────────────────────── */}
                {!freeSessionUsed && sessionsRemaining > 0 && (
                    <p className="text-sm text-green-400 mb-6">
                        You also have a free session available — your first session on any non-AI round is free.
                    </p>
                )}
                {!freeSessionUsed && sessionsRemaining === 0 && (
                    <div className="mb-6 bg-green-500/10 border border-green-500/25 rounded-xl px-5 py-4 flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-green-400">
                            <path d="M8 1l1.5 3h3l-2.5 2 1 3L8 7.5 5 9l1-3L3.5 4h3L8 1z"
                                stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                        <p className="text-sm text-green-200 leading-relaxed">
                            <strong className="text-green-300 font-semibold">Your first session is on us.</strong>{' '}
                            Try any round (except AI rounds) completely free — no payment needed. Start below.
                        </p>
                    </div>
                )}

                {/* ── Role Progress Card ───────────────────────────────────── */}
                <div className="mb-4 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                    {levelLabel === null ? (
                        /* Empty state for role */
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">
                                    {selectedRole} · your current bar
                                </p>
                                <p className="text-lg font-semibold text-gray-300">No sessions yet</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Start your first {selectedRole} session to get your baseline scores.
                                </p>
                            </div>
                            {recommendedNextRound && (
                                <button
                                    onClick={() => handleStartInterview(recommendedNextRound.scenario_id)}
                                    className="shrink-0 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-colors"
                                >
                                    Start Round 1
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Populated state */
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Left: level + gap */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">
                                    {selectedRole} · your current bar
                                </p>
                                <p className="text-2xl font-bold text-white leading-tight">{levelLabel}</p>
                                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-sm">{primaryGapText}</p>
                            </div>

                            {/* Right: 3 stats with dividers */}
                            <div className="flex items-stretch divide-x divide-white/10 shrink-0">
                                <div className="px-5 text-center first:pl-0">
                                    <p className="text-xs text-gray-500 mb-1 whitespace-nowrap">Avg score</p>
                                    <p className="text-xl font-bold text-white tabular-nums">
                                        {avgScore !== null ? avgScore.toFixed(1) : '—'}
                                    </p>
                                </div>
                                <div className="px-5 text-center">
                                    <p className="text-xs text-gray-500 mb-1 whitespace-nowrap">Rounds done</p>
                                    <p className="text-xl font-bold text-white tabular-nums">
                                        {completedRounds.length} <span className="text-gray-500 font-normal text-base">/ 4</span>
                                    </p>
                                </div>
                                <div className="px-5 text-center last:pr-0">
                                    <p className="text-xs text-gray-500 mb-1 whitespace-nowrap">To Senior bar</p>
                                    {avgScore !== null ? (
                                        avgScore >= 4.0 ? (
                                            <p className="text-base font-bold text-green-400">At bar</p>
                                        ) : (
                                            <p className="text-xl font-bold text-green-400 tabular-nums">
                                                +{(seniorGap ?? 0).toFixed(1)}
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-xl font-bold text-gray-500">—</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Directed Next Action Banner ──────────────────────────── */}
                {recommendedNextRound && (
                    <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-sm text-purple-200 leading-relaxed">
                            Next session: <strong className="text-white font-semibold">{recommendedNextRound.round_title}</strong>
                            {' '}— {recommendedNextRound.reason}. This is your highest-leverage session.
                        </p>
                        <button
                            onClick={() => handleStartInterview(recommendedNextRound.scenario_id)}
                            className="shrink-0 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-colors whitespace-nowrap"
                        >
                            Start now
                        </button>
                    </div>
                )}

                {/* ── Tabs ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-6 border-b border-white/5 mb-8">
                    <button
                        onClick={() => setActiveTab('practice')}
                        className={`pb-3.5 text-sm font-medium transition-colors relative ${activeTab === 'practice' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        Practice scenarios
                        {activeTab === 'practice' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-500 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3.5 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        Past sessions
                        {activeTab === 'history' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-500 rounded-full" />}
                    </button>
                </div>

                {activeTab === 'practice' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* Role selector pills */}
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            {(['Product Manager', 'Software Development Engineer', 'Data Scientist'] as const).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                        selectedRole === role
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        {/* 2×2 Round Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {scenarios
                                .filter(s => s.role === selectedRole)
                                .map(scenario => {
                                    const roundData = roundDataMap.get(scenario.round)
                                    const isCompleted = roundData !== undefined
                                    const isRecommended = recommendedNextRound?.round === scenario.round

                                    return (
                                        <div
                                            key={scenario.id}
                                            className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                                                isRecommended
                                                    ? 'border-purple-500/50 bg-purple-500/5'
                                                    : 'border-white/10 bg-white/[0.03]'
                                            }`}
                                        >
                                            {/* Lock overlay — only when no pack AND free session already used */}
                                            {!hasActivePack && freeSessionUsed && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-[2px]">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Lock className="w-5 h-5 text-gray-400" />
                                                        <span className="text-xs text-gray-400 font-medium">Unlock with a plan</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-base font-bold text-white leading-snug">{scenario.round_title}</h3>
                                                {isRecommended && (
                                                    <span className="shrink-0 text-xs font-semibold text-purple-400 bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        ↑ Next up
                                                    </span>
                                                )}
                                            </div>

                                            {/* Competency tags */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {(scenario.evaluation_dimensions || []).map(dim => (
                                                    <span
                                                        key={dim}
                                                        className="text-xs text-gray-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md"
                                                    >
                                                        {dim}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Score section */}
                                            {isCompleted && roundData ? (
                                                <div className="space-y-2">
                                                    {/* Bar + score + band */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(roundData.latest)}`}
                                                                style={{ width: `${(roundData.latest / 5) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-white tabular-nums whitespace-nowrap">
                                                            {roundData.latest.toFixed(1)}<span className="text-gray-500 font-normal"> / 5</span>
                                                        </span>
                                                        {(() => {
                                                            const pill = getBandPill(roundData.recommendation)
                                                            return (
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${pill.className}`}>
                                                                    {pill.label}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                    {/* Score history */}
                                                    {roundData.history.length > 1 && (
                                                        <p className="text-xs text-gray-500 tabular-nums">
                                                            History: {roundData.history.map(s => s.toFixed(1)).join(' → ')}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="inline-block text-xs font-medium text-gray-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                                        Not started
                                                    </span>
                                                </div>
                                            )}

                                            {/* Footer */}
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    30 min
                                                </div>
                                                {[4, 8, 12].includes(scenario.id) && sessionsRemaining === 0 ? (
                                                    <button
                                                        onClick={() => setShowPaywall(true)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors bg-purple-600 hover:bg-purple-500 text-white"
                                                    >
                                                        <Lock className="w-3 h-3" />
                                                        Unlock AI Round
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartInterview(scenario.id)}
                                                        className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                                                            isCompleted
                                                                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                                                        }`}
                                                    >
                                                        {isCompleted ? 'Retake' : 'Start Interview'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>

                        {/* Star Interviewer callout */}
                        {isStarInterviewer && (
                            <div className="mt-8 flex items-center gap-3 px-5 py-4 rounded-xl border border-green-500/40 bg-green-500/10">
                                <span className="text-lg">⭐</span>
                                <p className="text-sm font-semibold text-green-400">
                                    Star Interviewer threshold reached for {selectedRole}
                                </p>
                            </div>
                        )}
                    </div>

                ) : (

                    /* ── Past Sessions Tab ─────────────────────────────────── */
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="glass-panel rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
                            {sessions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-white/5 text-xs uppercase font-bold text-gray-300">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Scenario</th>
                                                <th className="px-6 py-4">Performance</th>
                                                <th className="px-6 py-4 text-right">Report</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {sessions.map((session: any) => {
                                                const date = new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

                                                let title = 'Standard Scenario'
                                                let subtitle = 'Interview • Practice'

                                                if (session.session_type === 'negotiation_simulation') {
                                                    title = 'Salary Negotiation Simulation'
                                                    subtitle = 'Bonus • Negotiation'
                                                } else {
                                                    const scenario = scenarios.find(s => s.id === session.scenario_id)
                                                    if (scenario) {
                                                        title = scenario.round_title
                                                        subtitle = scenario.role
                                                    }
                                                }

                                                const evaluationDepth = (session as any).evaluation_depth as 'full' | 'shallow' | 'insufficient' | null
                                                const hasEvaluation = evaluationDepth && evaluationDepth !== 'insufficient'
                                                const isGenerating = generatingPdfId === session.id.toString()

                                                return (
                                                    <tr key={session.id} className="h-20 border-b border-white/5 last:border-0">
                                                        <td className="px-6 py-4 font-mono text-xs align-middle" suppressHydrationWarning>{date}</td>
                                                        <td className="px-6 py-4 align-middle">
                                                            <div className="text-white font-medium">{title}</div>
                                                            <div className="text-xs opacity-50">{subtitle}</div>
                                                        </td>
                                                        <td className="px-6 py-4 align-middle">
                                                            {session.session_type === 'negotiation_simulation' ? (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Coach Scored
                                                                </span>
                                                            ) : evaluationDepth === 'full' ? (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Evaluation Complete
                                                                </span>
                                                            ) : evaluationDepth === 'shallow' ? (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Partial Feedback
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 text-gray-400 text-xs border border-white/10">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />Insufficient Data
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right align-middle">
                                                            {session.pdf_url ? (
                                                                <button
                                                                    onClick={(e) => handleGeneratePDF(e, session.id.toString())}
                                                                    disabled={isGenerating}
                                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-lg shadow-purple-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-wait w-[130px]"
                                                                >
                                                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <DownloadIcon className="w-3 h-3" />}
                                                                    Download PDF
                                                                </button>
                                                            ) : hasEvaluation ? (
                                                                <button
                                                                    onClick={(e) => handleGeneratePDF(e, session.id.toString())}
                                                                    disabled={isGenerating}
                                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait w-[130px]"
                                                                >
                                                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                                                    {isGenerating ? 'Generating...' : 'Generate PDF'}
                                                                </button>
                                                            ) : (
                                                                <span className="inline-block text-xs opacity-20 px-4 py-2 w-[130px] text-center">
                                                                    No Report
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-12 flex flex-col items-center justify-center text-gray-500 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                        <Zap className="w-8 h-8 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium text-gray-300">No completed sessions yet</p>
                                        <p className="text-sm opacity-50 mt-1">Start a scenario to get your first report</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-16 py-8 border-t border-white/5 text-center">
                    <p className="text-gray-500 text-sm">PraxisNow is built by a small team dedicated to your success.</p>
                    <div className="mt-2 text-sm text-gray-500">
                        Need help?{' '}
                        <button onClick={() => setIsSupportOpen(true)} className="text-purple-400 hover:text-purple-300 transition-colors">
                            Report an issue
                        </button>
                        {' '}or email{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                    </div>
                </footer>
            </main>

            <LegalFooter />

            <SupportModal
                isOpen={isSupportOpen}
                onClose={() => setIsSupportOpen(false)}
                userId={user?.id}
                sessionId={selectedSession?.id}
            />

            {/* ── Paywall Modal ─────────────────────────────────────────── */}
            {showPaywall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
                    <div className="relative w-full max-w-xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowPaywall(false)}
                            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>

                        <div className="p-8">
                            <h2 className="text-xl font-bold text-white mb-2">Ready to keep going?</h2>
                            <p className="text-sm text-gray-400 mb-8">
                                Your free session has been used. Buy a session pack to continue practising.
                            </p>

                            <div className="grid grid-cols-3 gap-4">
                                {/* Single Session */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Single Session</p>
                                        <p className="text-2xl font-bold text-white mt-1">₹499</p>
                                        <p className="text-xs text-gray-500 mt-1">1 session</p>
                                    </div>
                                    <button
                                        onClick={() => handlePurchase('single')}
                                        className="mt-auto w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                                    >
                                        Buy
                                    </button>
                                </div>

                                {/* Practice Pack — most popular */}
                                <div className="relative bg-purple-500/10 border border-purple-500/40 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                                        Most popular
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Practice Pack</p>
                                        <p className="text-2xl font-bold text-white mt-1">₹1,399</p>
                                        <p className="text-xs text-gray-500 mt-1">3 sessions</p>
                                        <p className="text-xs text-green-400 mt-0.5">Save ₹98</p>
                                    </div>
                                    <button
                                        onClick={() => handlePurchase('practice_pack')}
                                        className="mt-auto w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
                                    >
                                        Buy
                                    </button>
                                </div>

                                {/* Full Prep */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Full Prep</p>
                                        <p className="text-2xl font-bold text-white mt-1">₹2,199</p>
                                        <p className="text-xs text-gray-500 mt-1">5 sessions</p>
                                        <p className="text-xs text-green-400 mt-0.5">Save ₹296</p>
                                    </div>
                                    <button
                                        onClick={() => handlePurchase('full_prep')}
                                        className="mt-auto w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                                    >
                                        Buy
                                    </button>
                                </div>
                            </div>

                            <p className="text-center text-xs text-gray-500 mt-6">
                                All sessions are 30 minutes · Any role · Any round
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            {/* SESSION DETAILS MODAL — DISABLED FOR UI SIMPLIFICATION */}
            {false && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
                    <div className="relative w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedSession.session_type === 'negotiation_simulation'
                                        ? 'Negotiation Session'
                                        : (selectedSession as any).evaluation_depth === 'insufficient'
                                            ? 'Session Ended Early'
                                            : (selectedSession as any).evaluation_depth === 'shallow'
                                                ? 'Partial Evaluation Available'
                                                : 'Session Analysis'}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {new Date(selectedSession.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {(userProfile?.package_tier === 'Pro') && selectedSession.session_type === 'interview' && (
                                    <Button onClick={handleReplay} size="sm" variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                                        Replay Interview
                                    </Button>
                                )}
                                <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {selectedSession.session_type !== 'negotiation_simulation' && (selectedSession as any).evaluation_depth === 'insufficient' ? (
                            <div className="p-8 flex flex-col items-center justify-center text-center space-y-8 flex-grow">
                                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-2 animate-in zoom-in-50 duration-500">
                                    <MicOff className="w-10 h-10 text-gray-500" />
                                </div>
                                <div className="space-y-6 max-w-sm mx-auto">
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-2">Session ended early — not enough signal</h4>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            To provide meaningful feedback, PraxisNow needs enough spoken conversation to analyze your responses. This session ended before that threshold was reached.
                                        </p>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-left">
                                        <p className="text-purple-200 text-sm leading-relaxed">
                                            <span className="font-bold block mb-1">Nothing is wrong.</span>
                                            Short or silent sessions can happen due to connection issues or simply stopping early.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                                {selectedSession.session_type === 'negotiation_simulation' ? (
                                    <div className="space-y-6">
                                        <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/20">
                                            <div className="text-xs text-yellow-500 uppercase font-bold mb-3 flex items-center gap-2">
                                                <Trophy className="w-4 h-4" /> Coach&apos;s Strategy Notes
                                            </div>
                                            <div className="text-yellow-100 leading-relaxed">
                                                {selectedSession.evaluation_data?.strategy_notes || 'No strategy notes available.'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[{ label: 'Recovery', val: selectedSession.recovery }].map((stat) => (
                                            <div key={stat.label} className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">{stat.label}</div>
                                                <div className={`text-2xl font-bold ${(stat.val || 0) >= 70 ? 'text-green-400' : (stat.val || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {stat.val ?? '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-white">
                                Close
                            </Button>
                            {selectedSession.session_type !== 'negotiation_simulation' &&
                                (selectedSession as any).evaluation_depth &&
                                (selectedSession as any).evaluation_depth !== 'insufficient' && (
                                    <Link
                                        href={`/results/${selectedSession.id}`}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                                    >
                                        View Report
                                    </Link>
                                )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
