'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import ScenarioCard from '@/components/ScenarioCard'
import { Button } from '@/components/ui/button'
import SupportModal from '@/components/SupportModal'
import { LogOut, Zap, Trophy, AlertTriangle, User as UserIcon, Plus, Download as DownloadIcon, Loader2, X, FileText, ChevronRight, HelpCircle, MicOff, Play, Clock, Lock } from 'lucide-react'


import Link from 'next/link'
import DashboardFilters, { FilterState } from '@/components/DashboardFilters'
import ProgressGraph from '@/components/ProgressGraph'
import CurrentBarCard, { type CurrentBarCardProps } from '@/components/CurrentBarCard'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Session = Database['public']['Tables']['sessions']['Row']

// Adapter type for UI components
interface UIScenario {
    id: string
    role: string
    level: string
    title: string
    description: string
    dimensions: string[]
    created_at?: string
    isCustom?: boolean
}

const AI_ROLES = [
    'AI Product Manager',
    'AI Engineer',
    'AI Marketer',
    'AI Project Manager',
    'AI Scientist',
]

const TRADITIONAL_ROLES = [
    'Product Manager',
    'Software Development Engineer',
    'Marketer',
    'Data Scientist',
    'Project Manager',
]

function getLevelDisplay(role: string, level: string): string {
    if (AI_ROLES.includes(role)) return 'Experienced · 5-10 yrs'
    return `${level} calibration`
}

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()

    const [user, setUser] = useState<any>(null)
    const [userProfile, setUserProfile] = useState<User | null>(null)
    const [scenarios, setScenarios] = useState<UIScenario[]>([])
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)

    const [filters, setFilters] = useState<FilterState>({
        role: '',
        dimension: '',
        search: ''
    })

    const [isProfileOpen, setIsProfileOpen] = useState(false)

    // New Dashboard State
    const [activeTab, setActiveTab] = useState<'practice' | 'history'>('practice')
    const [selectedSession, setSelectedSession] = useState<any | null>(null)
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)
    const [isSupportOpen, setIsSupportOpen] = useState(false)
    const [currentBar, setCurrentBar] = useState<CurrentBarCardProps | null>(null)

    const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())
    const [aiSectionExpanded, setAiSectionExpanded] = useState(true)

    const toggleRole = (role: string) => {
        setExpandedRoles(prev => {
            const next = new Set(prev)
            if (next.has(role)) next.delete(role)
            else next.add(role)
            return next
        })
    }

    const handleGeneratePDF = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Prevent row click
        setGeneratingPdfId(sessionId);
        try {
            const res = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const data = await res.json();

            if (data.pdf_url) {
                // Update local session state
                setSessions((prev: any[]) => prev.map(s =>
                    s.id.toString() === sessionId.toString() ? { ...s, pdf_url: data.pdf_url } : s
                ) as any);

                // Also update selected session if open
                if (selectedSession && selectedSession.id.toString() === sessionId.toString()) {
                    setSelectedSession((prev: any) => ({ ...prev, pdf_url: data.pdf_url }));
                }

                // 🚀 Auto-trigger download
                const link = document.createElement('a');
                link.href = data.pdf_url;
                link.target = '_blank';
                link.download = `PraxisNow-Report-${sessionId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (err) {
            console.error('PDF Generation failed', err);
            // Explicitly alert the user
            alert(`PDF Generation Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setGeneratingPdfId(null);
        }
    }

    const handleReplay = () => {
        if (!selectedSession) return
        const scenarioId = selectedSession.custom_scenario_id || selectedSession.scenario_id
        router.push(`/simulator/${scenarioId}?replay_from=${selectedSession.id}`)
    }

    // Data Loading
    useEffect(() => {
        const loadData = async () => {
            // ... (keep finding user logic)
            // 1. Auth check
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
                return
            }
            setUser(user)

            // 2. Fetch Profile, Scenarios, Custom Scenarios in Parallel
            const [
                { data: profile },
                { data: dbScenarios },
                { data: customData }
            ] = await Promise.all([
                supabase.from('users').select('package_tier, available_sessions, onboarding_complete, primary_role, first_name, full_name, display_pic_url, avatar_url, negotiation_credits').eq('id', user.id).single(),
                supabase.from('scenarios').select('id, role, level, scenario_title, evaluation_dimensions, prompt').eq('is_active', true).order('created_at', { ascending: false }),
                supabase.from('custom_scenarios').select('id, title, company_context, focus_dimensions, scenarios!inner(role, level, prompt)').eq('user_id', user.id).order('created_at', { ascending: false })
            ]);

            if (profile) {
                setUserProfile(profile as any)
                const hasActivePack = !!(profile.package_tier && profile.package_tier !== 'Free');

                // Immediately redirect new users without a pack to pricing
                if (!hasActivePack && profile.onboarding_complete === false) {
                    await supabase.from('users').update({ onboarding_complete: true } as any).eq('id', user.id)
                    router.replace('/pricing')
                    return
                }
            } else {
                setUserProfile(null)
            }

            let allScenarios: UIScenario[] = []

            if (dbScenarios) {
                const adapted = dbScenarios.map(s => {
                    // TITLE TRACE: Log RAW database record
                    if (s.role === 'Product Manager' && s.evaluation_dimensions?.includes('Leadership')) {
                        console.log('[TITLE_TRACE_RAW_DB]', {
                            id: s.id,
                            role: s.role,
                            scenario_title: s.scenario_title,
                            scenario_title_type: typeof s.scenario_title,
                            evaluation_dimensions: s.evaluation_dimensions
                        })
                    }

                    // DIMENSION-FIRST: Remove level from descriptions
                    // Generate description based on dimensions, not level
                    const primaryDimensions = s.evaluation_dimensions?.slice(0, 2).join(', ') || 'core skills'
                    let desc = `Full-length interview focused on ${primaryDimensions}. Difficulty calibrates to your responses in real-time.`

                    // Role-specific copy refinements (NO level mentions)
                    if (s.role === 'Software Engineer' && s.evaluation_dimensions?.includes('Architecture')) {
                        desc = "Interview focused on system design, scalability, and trade-off discussions. Depth adjusts based on your answers."
                    }
                    if (s.role === 'Product Manager' && s.evaluation_dimensions?.includes('Product Sense')) {
                        desc = "Product interview focused on user empathy, structured thinking, and prioritization. Rigor adapts dynamically."
                    }
                    if (s.role === 'AI Product Manager') {
                        desc = 'Simulates a full AI PM interview loop — product sense, execution, technical depth, and strategy. Calibrated to the hiring bar at top-tier AI-first product companies.'
                    }
                    if (s.role === 'AI Engineer') {
                        desc = 'Simulates a full AI Engineer interview loop — ML system design, LLM architecture, and AI infrastructure. Calibrated to the hiring bar at top-tier AI engineering teams.'
                    }
                    if (s.role === 'AI Marketer') {
                        desc = 'Simulates a full AI Marketer interview loop — AI campaign strategy, growth analytics, and marketing strategy. Calibrated to the hiring bar at top-tier AI-driven marketing teams.'
                    }
                    if (s.role === 'AI Project Manager') {
                        desc = 'Simulates a full AI Project Manager interview loop — AI delivery, program management, and stakeholder alignment. Calibrated to the hiring bar at top-tier AI product companies.'
                    }
                    if (s.role === 'AI Scientist') {
                        desc = 'Simulates a full AI Scientist interview loop — ML system design, analytics rigour, and data strategy. Calibrated to the hiring bar at top-tier AI research and applied science teams.'
                    }

                    const mappedScenario = {
                        id: s.id.toString(),
                        role: s.role,
                        level: s.level, // Preserved for interviewer calibration
                        title: s.scenario_title || `${s.role} — ${s.evaluation_dimensions?.slice(0, 2).join(' & ') || 'Interview'}`, // DIMENSION-FIRST
                        description: desc,
                        dimensions: s.evaluation_dimensions || [],
                        isCustom: false
                    }

                    // TITLE TRACE: Log original database value
                    if (s.scenario_title?.toLowerCase().includes('leader')) {
                        console.log('[TITLE_TRACE_DB]', {
                            dbValue: s.scenario_title,
                            mappedValue: mappedScenario.title,
                            match: s.scenario_title === mappedScenario.title
                        })
                    }

                    return mappedScenario
                })
                allScenarios = [...allScenarios, ...adapted]
            }

            if (customData) {
                const adaptedCustom = customData.map(s => {
                    const baseRole = (s.scenarios as any)?.role || 'Custom';
                    const baseLevel = (s.scenarios as any)?.level || 'Custom';

                    return {
                        id: s.id, // UUID
                        role: baseRole,
                        level: baseLevel,
                        title: s.title,
                        description: `Custom ${baseRole} scenario` + (s.company_context ? ` with context.` : ''),
                        dimensions: s.focus_dimensions || [],
                        isCustom: true
                    }
                })
                allScenarios = [...allScenarios, ...adaptedCustom]
            }

            setScenarios(allScenarios)

            // 5. Fetch Sessions (History) - Optimized Payload
            // evaluation_depth and progression_comparison added for history tab rendering
            const { data: dbSessions } = await supabase
                .from('sessions')
                .select('id, created_at, session_type, custom_scenario_id, scenario_id, clarity, structure, signal_noise, replay_of_session_id, evaluation_depth, progression_comparison')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            setSessions(dbSessions as any || [])

            // 5b. Targeted fetch: most recent session with evaluation_data for CurrentBarCard
            // Deliberately separate from the bulk fetch — keeps history payload lean.
            try {
                const { data: recentEvalSession } = await supabase
                    .from('sessions')
                    .select('id, created_at, evaluation_data, scenarios:scenario_id(role, level)')
                    .eq('user_id', user.id)
                    .not('evaluation_data', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (recentEvalSession) {
                    const evalData = (recentEvalSession as any).evaluation_data;
                    if (evalData?.hiring_signal) {
                        const scenario = (recentEvalSession as any).scenarios;
                        setCurrentBar({
                            hireable_level: evalData.hireable_level || 'Unknown',
                            hiring_signal: evalData.hiring_signal,
                            primary_blocker: evalData.distance_to_strong_hire?.primary_blocker ?? null,
                            role: scenario?.role || 'Unknown',
                            session_date: new Date(recentEvalSession.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        });
                    }
                }
            } catch {
                // Non-critical — CurrentBarCard simply won't render
            }

            // 6. Pre-select filter based on User Role
            if (profile && (profile as any).primary_role) {
                const userRole = (profile as any).primary_role.trim()
                const availableRoles = Array.from(new Set(allScenarios.map(s => s.role)))

                // Approved role mappings (5 primary roles only)
                const roleMap: Record<string, string> = {
                    'PM': 'Product Manager',
                    'Product Manager': 'Product Manager',
                    'Product': 'Product Manager',
                    'SDE': 'Software Development Engineer',
                    'Software Engineer': 'Software Development Engineer',
                    'Software Development Engineer': 'Software Development Engineer',
                    'Swe': 'Software Development Engineer',
                    'SWE': 'Software Development Engineer',
                    'Developer': 'Software Development Engineer',
                    'Engineer': 'Software Development Engineer',
                    'Marketer': 'Marketer',
                    'Marketing': 'Marketer',
                    'Data Scientist': 'Data Scientist',
                    'DS': 'Data Scientist',
                    'Data Science': 'Data Scientist',
                    'Project Manager': 'Project Manager',
                    'PgM': 'Project Manager',
                    'TPM': 'Project Manager',
                    'AI Product Manager': 'AI Product Manager',
                    'AI PM':              'AI Product Manager',
                    'AI Engineer':        'AI Engineer',
                    'AI Marketer':        'AI Marketer',
                    'AI Project Manager': 'AI Project Manager',
                    'AI Scientist':       'AI Scientist',
                }

                const targetRole = roleMap[userRole] || availableRoles.find(r => r.toLowerCase() === userRole.toLowerCase())

                if (targetRole && availableRoles.includes(targetRole)) {
                    setFilters(prev => ({ ...prev, role: targetRole }))
                    setExpandedRoles(new Set([targetRole]))
                    if (AI_ROLES.includes(targetRole)) {
                        setAiSectionExpanded(true)
                    }
                }
            }

            setLoading(false)
        }
        loadData()
    }, [router, supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    // Filter Options based on currently visible scenarios
    const roles = useMemo(() => Array.from(new Set(scenarios.map(s => s.role))), [scenarios])
    // Levels removed from primary filters - dimension-first model
    const allDimensions = useMemo(() => {
        const set = new Set<string>()
        scenarios.forEach(s => s.dimensions?.forEach(d => set.add(d)))
        return Array.from(set).sort()
    }, [scenarios])

    // Filter Logic - DIMENSION-FIRST (level filter removed)
    const filteredScenarios = useMemo(() => {
        return scenarios.filter(s => {
            const matchesRole = !filters.role || s.role === filters.role
            const matchesDimension = !filters.dimension || s.dimensions.includes(filters.dimension)
            const matchesSearch = !filters.search ||
                s.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                s.description.toLowerCase().includes(filters.search.toLowerCase())

            return matchesRole && matchesDimension && matchesSearch
        })
    }, [filters, scenarios])

    // Role-Based Scenario Ordering (UI-only)
    const sortedScenarios = useMemo(() => {
        const userRole = (userProfile as any)?.primary_role || ''

        const sorted = [...filteredScenarios].sort((a, b) => {
            // If user has a role, prioritize matching scenarios
            if (userRole) {
                const aMatches = a.role === userRole ? 0 : 1
                const bMatches = b.role === userRole ? 0 : 1

                if (aMatches !== bMatches) {
                    return aMatches - bMatches
                }
            }

            // Fallback: Alphabetical by role
            return a.role.localeCompare(b.role, undefined, { sensitivity: 'base' })
        })

        // DEV-ONLY console log
        console.log(
            '[SCENARIO_ORDER]',
            userRole ? `User Role: ${userRole}` : 'No user role - alphabetical by role',
            sorted.map(s => `${s.role} – ${s.title}`)
        )


        return sorted
    }, [filteredScenarios, userProfile])

    // Progress Over Time Data Calculation
    const progressData = useMemo(() => {
        if (!sessions.length) return []

        // Take last 10 sessions, sorted by created_at
        const recentSessions = [...sessions]
            .filter(s => s.session_type !== 'negotiation_simulation') // Exclude negotiation sessions
            .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
            .slice(-10)

        return recentSessions.map((s, idx) => ({
            session: idx + 1,
            date: new Date(s.created_at ?? 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            clarity: s.clarity ? s.clarity / 10 : null,
            structure: s.structure ? s.structure / 10 : null,
            signal: s.signal_noise ? s.signal_noise / 10 : null,
            isReplay: !!s.replay_of_session_id
        }))
    }, [sessions])

    // Identify Weakest Area (for banner message)
    const weakestArea = useMemo(() => {
        if (!sessions.length) return null
        // Simple heuristic based on recent sessions
        const recentSessions = sessions.slice(0, 5)
        const totals = { clarity: 0, structure: 0, signal_noise: 0 }
        const counts = { clarity: 0, structure: 0, signal_noise: 0 }

        recentSessions.forEach(s => {
            if (s.clarity) { totals.clarity += s.clarity; counts.clarity++ }
            if (s.structure) { totals.structure += s.structure; counts.structure++ }
            if (s.signal_noise) { totals.signal_noise += s.signal_noise; counts.signal_noise++ }
        })

        const avg = (key: keyof typeof totals) => counts[key] ? totals[key] / counts[key] : 0
        const scores = [
            { name: 'Clarity', score: avg('clarity') },
            { name: 'Structure', score: avg('structure') },
            { name: 'Signal', score: avg('signal_noise') }
        ]
        const sorted = scores.sort((a, b) => a.score - b.score)
        return sorted[0].score > 0 ? sorted[0].name : null
    }, [sessions])

    if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4"></div>
            Loading Dashboard...
        </div>
    </div>

    const hasActivePack = !!(userProfile?.package_tier && userProfile.package_tier !== 'Free');
    const hasSessions = (userProfile?.available_sessions || 0) > 0
    const packageTier = userProfile?.package_tier

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30">


            {/* Header */}
            <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
                        <Image
                            src="/praxisnow-logo.png"
                            alt="PraxisNow"
                            width={140}
                            height={40}
                            className="h-8 w-auto"
                            priority
                        />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                            PraxisNow AI
                        </span>
                    </div>

                    {/* Top Stats Bar */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            <Zap className="w-3 h-3" />
                            <span className="font-semibold">Sessions left: {userProfile?.available_sessions ?? 0}</span>
                        </div>
                        {weakestArea && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Focus area: {weakestArea}</span>
                            </div>
                        )}
                    </div>


                    <div className="flex items-center gap-4 relative">
                        {/* Help Button */}
                        <button
                            onClick={() => setIsSupportOpen(true)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                            title="Help & Support"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        {/* Custom Dropdown Trigger */}
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 hover:bg-white/5 p-1 px-2 rounded-lg transition-colors group outline-none"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 overflow-hidden border border-purple-500/50 flex items-center justify-center relative">
                                {(userProfile as any)?.display_pic_url || (userProfile as any)?.avatar_url ? (
                                    <img src={(userProfile as any).display_pic_url || (userProfile as any).avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-4 h-4 text-purple-400" />
                                )}
                            </div>
                            <div className="hidden md:block text-left">
                                <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
                                    {(userProfile as any)?.first_name || (userProfile as any)?.full_name?.split(' ')[0] || 'My Profile'}
                                </div>
                            </div>
                        </button>

                        {/* Dropdown Content */}
                        {isProfileOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                                <div className="py-1">
                                    <Link
                                        href="/profile"
                                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        My Profile
                                    </Link>

                                    <div className="h-px bg-white/10 my-1"></div>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Overlay to close dropdown when clicking outside */}
                        {isProfileOpen && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsProfileOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* No Active Pack Banner */}
                {!hasActivePack && (
                    <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between text-red-200 shadow-lg relative overflow-hidden">
                        <div className="flex items-center gap-3 relative z-10">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                            <span className="font-semibold text-sm">You don't have an active plan. Choose a plan to start practicing.</span>
                        </div>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="bg-red-500 hover:bg-red-600 text-white border-0 relative z-10 font-bold tracking-wide"
                            size="sm"
                        >
                            View Plans
                        </Button>
                    </div>
                )}

                {/* Welcome/Action Banner */}
                <div className="mb-10 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-1 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="px-6 py-4">
                        <h2 className="text-lg font-semibold text-purple-100 flex items-center gap-2">
                            Welcome, {(userProfile as any)?.first_name || (userProfile as any)?.full_name?.split(' ')[0] || 'back'}!
                            {((userProfile as any)?.package_tier) && (
                                <span className="text-xs font-normal text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                    {(userProfile as any).package_tier} Plan
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-purple-300/80">
                            {sessions.length > 0 && weakestArea
                                ? `You've completed ${sessions.length} sessions. Use each session to prepare for a specific interview.`
                                : "Start your first interview session to get your baseline scores."}
                        </p>
                    </div>
                    <div className="hidden sm:block pr-6">
                        <Link href="/pricing">
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                                Buy More Sessions
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="w-full">
                    <div className="min-h-[500px]">

                        {/* Tab Switcher */}
                        <div className="flex items-center gap-6 border-b border-white/5 mb-8">
                            <button
                                onClick={() => setActiveTab('practice')}
                                className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'practice' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                Practice Scenarios
                                {activeTab === 'practice' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-500 rounded-full" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                Past Sessions
                                {activeTab === 'history' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-500 rounded-full" />}
                            </button>
                        </div>

                        {activeTab === 'practice' ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Current Bar — shown after first evaluated session */}
                                {currentBar && <CurrentBarCard {...currentBar} />}

                                <DashboardFilters
                                    onFilterChange={setFilters}
                                    roles={roles}
                                    dimensions={allDimensions}
                                />

                                <div className="mb-4 text-sm text-gray-500" id="tour-scenarios">
                                    Showing {sortedScenarios.length} scenarios
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                                    {/* BONUS NEGOTIATION CARD (Pro+ Exclusive OR Credit Holders) */}
                                    {(((userProfile as any)?.package_tier === 'Pro+' && !sessions.find(s => s.session_type === 'negotiation_simulation')) || ((userProfile as any)?.negotiation_credits > 0)) && (
                                        <div
                                            onClick={() => router.push('/simulator/negotiation')}
                                            className="h-full p-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent hover:border-yellow-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                                                Bonus
                                            </div>
                                            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform shadow-lg shadow-yellow-500/20">
                                                <Trophy className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-yellow-200">Salary Negotiation Simulation</h4>
                                                <p className="text-sm text-yellow-200/60 mt-1">Practice negotiating your offer with realistic pushback</p>
                                            </div>
                                            <div className="mt-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-xs font-semibold text-yellow-400 border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                                                Start Simulation (30 min)
                                            </div>
                                        </div>
                                    )}

                                    {/* CREATE SCENARIO CARD (Always Second or First) */}
                                    {/* Custom Interview CTA - TIER GATED */}
                                    {userProfile?.package_tier === 'Starter' ? (
                                        /* Starter: Disabled with upgrade tooltip */
                                        <div className="relative group h-full">
                                            <div className="h-full p-6 rounded-2xl border border-dashed border-gray-700/30 bg-white/[0.02] opacity-50 cursor-not-allowed flex flex-col items-center justify-center text-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-600">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-500">Build a Custom Interview</h4>
                                                    <p className="text-sm text-gray-600/60 mt-1">Define role, focus dimensions, and context</p>
                                                </div>
                                                <div className="mt-2 px-4 py-1.5 rounded-full bg-gray-500/10 text-xs font-semibold text-gray-600 border border-gray-700/20">
                                                    Pro Feature
                                                </div>
                                            </div>
                                            {/* Upgrade tooltip */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="bg-black/95 text-white px-4 py-3 rounded-lg text-sm shadow-xl border border-purple-500/20 max-w-[280px]">
                                                    <p className="font-semibold mb-1">Upgrade to Pro</p>
                                                    <p className="text-gray-400 text-xs">Build focused custom interviews for your specific role and skills</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : userProfile?.package_tier === 'Pro+' ? (
                                        /* Pro+: Advanced with gold accent */
                                        <Link href="/scenarios/builder" className="block h-full cursor-pointer" id="tour-custom-builder">
                                            <div className="h-full p-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center text-center gap-4 group">
                                                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-amber-200">Advanced Custom Interviews & Tracking</h4>
                                                    <p className="text-sm text-amber-400/60 mt-1">Build, save, and re-run interviews to measure improvement</p>
                                                </div>
                                                <div className="mt-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-xs font-semibold text-amber-300 border border-amber-500/20">
                                                    Create & Track
                                                </div>
                                            </div>
                                        </Link>
                                    ) : (
                                        /* Pro: Basic custom interview */
                                        <Link href="/scenarios/builder" className="block h-full cursor-pointer" id="tour-custom-builder">
                                            <div className="h-full p-6 rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center text-center gap-4 group">
                                                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-purple-200">Build a Custom Interview</h4>
                                                    <p className="text-sm text-purple-400/60 mt-1">Define role, focus dimensions, and context for your practice</p>
                                                </div>
                                                <div className="mt-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-xs font-semibold text-purple-300 border border-purple-500/20">
                                                    Create Interview
                                                </div>
                                            </div>
                                        </Link>
                                    )}

                                </div>

                                {/* ── AI-Native Role Simulations ──────────────────── */}
                                {(() => {
                                    const aiScenarios = sortedScenarios.filter(s =>
                                        AI_ROLES.includes(s.role) && s.role !== 'Negotiation Coach'
                                    )
                                    if (aiScenarios.length === 0) return null
                                    const aiByRole = AI_ROLES.map(role => ({
                                        role,
                                        scenarios: aiScenarios.filter(s => s.role === role)
                                    })).filter(g => g.scenarios.length > 0)
                                    return (
                                        <div className="mb-8">
                                            {/* Super-section header */}
                                            <button
                                                onClick={() => setAiSectionExpanded(v => !v)}
                                                className="w-full flex items-center justify-between mb-4 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-px flex-1 w-8 bg-purple-500/30" />
                                                    <span className="text-xs font-semibold tracking-widest uppercase text-purple-400">
                                                        AI-Native Role Simulations
                                                    </span>
                                                    <div className="h-px flex-1 w-8 bg-purple-500/30" />
                                                </div>
                                                <span className="text-white/40 text-xs ml-4">
                                                    {aiSectionExpanded ? '↑ collapse' : '↓ expand'}
                                                </span>
                                            </button>
                                            {aiSectionExpanded && (
                                                <div className="space-y-6">
                                                    {aiByRole.map(({ role, scenarios: roleScenarios }) => {
                                                        const isExpanded = expandedRoles.has(role)
                                                        return (
                                                            <div key={role}>
                                                                <button
                                                                    onClick={() => toggleRole(role)}
                                                                    className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-semibold text-white/80">
                                                                            {role}
                                                                        </span>
                                                                        <span className="text-xs text-white/30">
                                                                            {roleScenarios.length} session{roleScenarios.length !== 1 ? 's' : ''}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-white/30 text-xs">
                                                                        {isExpanded ? '−' : '+'}
                                                                    </span>
                                                                </button>
                                                                {isExpanded && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                        {roleScenarios.map(scenario => {
                                                                            if (
                                                                                scenario.dimensions.length === 1 &&
                                                                                scenario.dimensions[0] === 'ai_fluency'
                                                                            ) {
                                                                                if (packageTier !== 'Pro' && packageTier !== 'Pro+') return null
                                                                            }
                                                                            return (
                                                                                <div key={scenario.id} className="block h-full min-w-0">
                                                                                    <ScenarioCard
                                                                                        scenario={scenario}
                                                                                        disabled={!hasSessions}
                                                                                        duration="30 min"
                                                                                        locked={!hasActivePack}
                                                                                        levelDisplay={getLevelDisplay(scenario.role, scenario.level)}
                                                                                        onClick={() => router.push(`/simulator/${scenario.id}`)}
                                                                                    />
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/* ── Traditional Role Interviews ──────────────────── */}
                                {(() => {
                                    const traditionalScenarios = sortedScenarios.filter(s =>
                                        TRADITIONAL_ROLES.includes(s.role) && s.role !== 'Negotiation Coach'
                                    )
                                    if (traditionalScenarios.length === 0) return null
                                    const filtered = traditionalScenarios.filter(s => {
                                        if (filters.role && s.role !== filters.role) return false
                                        if (filters.dimension && !s.dimensions.includes(filters.dimension)) return false
                                        if (filters.search) {
                                            const q = filters.search.toLowerCase()
                                            if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false
                                        }
                                        return true
                                    })
                                    const byRole = TRADITIONAL_ROLES.map(role => ({
                                        role,
                                        scenarios: filtered.filter(s => s.role === role)
                                    })).filter(g => g.scenarios.length > 0)
                                    return (
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="h-px flex-1 bg-white/10" />
                                                <span className="text-xs font-semibold tracking-widest uppercase text-white/30">
                                                    Role Interviews
                                                </span>
                                                <div className="h-px flex-1 bg-white/10" />
                                            </div>
                                            {filtered.length === 0 && (
                                                <div className="py-20 text-center text-gray-500">
                                                    No scenarios found matching your filters.
                                                    <Button variant="ghost" onClick={() => setFilters({ role: '', dimension: '', search: '' })} className="text-purple-400 hover:text-purple-300">
                                                        Clear all filters
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="space-y-6">
                                                {byRole.map(({ role, scenarios: roleScenarios }) => {
                                                    const isExpanded = expandedRoles.has(role)
                                                    return (
                                                        <div key={role}>
                                                            <button
                                                                onClick={() => toggleRole(role)}
                                                                className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-white/70">
                                                                        {role === 'Software Development Engineer' ? 'Software Engineer' : role}
                                                                    </span>
                                                                    <span className="text-xs text-white/30">
                                                                        {roleScenarios.length} session{roleScenarios.length !== 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                                <span className="text-white/30 text-xs">
                                                                    {isExpanded ? '−' : '+'}
                                                                </span>
                                                            </button>
                                                            {isExpanded && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                    {roleScenarios.map(scenario => {
                                                                        if (
                                                                            scenario.dimensions.length === 1 &&
                                                                            scenario.dimensions[0] === 'ai_fluency'
                                                                        ) {
                                                                            if (packageTier !== 'Pro' && packageTier !== 'Pro+') return null
                                                                        }
                                                                        return (
                                                                            <div key={scenario.id} className="block h-full min-w-0">
                                                                                <ScenarioCard
                                                                                    scenario={scenario}
                                                                                    disabled={!hasSessions}
                                                                                    duration="30 min"
                                                                                    locked={!hasActivePack}
                                                                                    levelDisplay={getLevelDisplay(scenario.role, scenario.level)}
                                                                                    onClick={() => router.push(`/simulator/${scenario.id}`)}
                                                                                />
                                                                                {scenario.isCustom && (
                                                                                    <div className="mt-2 text-center text-xs text-purple-400 uppercase tracking-widest font-bold">Custom Build</div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        ) : (
                            // HISTORY TAB
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

                                                        // Resolve Title
                                                        let title = 'Standard Scenario';
                                                        let subtitle = 'Interview • Practice';

                                                        if (session.session_type === 'negotiation_simulation') {
                                                            title = 'Salary Negotiation Simulation';
                                                            subtitle = 'Bonus • Negotiation';
                                                        } else {
                                                            const scenario = scenarios.find(s =>
                                                                s.id == (session.custom_scenario_id || session.scenario_id?.toString())
                                                            );
                                                            if (scenario) {
                                                                title = scenario.title;
                                                                subtitle = `${scenario.role} • ${scenario.level}`;
                                                            } else if (session.custom_scenario_id) {
                                                                title = 'Custom Scenario';
                                                            }
                                                        }

                                                        // AUTHORITATIVE STATE: Use evaluation_depth from backend
                                                        const evaluationDepth = (session as any).evaluation_depth as 'full' | 'shallow' | 'insufficient' | null;
                                                        const hasEvaluation = evaluationDepth && evaluationDepth !== 'insufficient';

                                                        const isGenerating = generatingPdfId === session.id.toString();

                                                        return (
                                                            <tr
                                                                key={session.id}
                                                                className="h-20 border-b border-white/5 last:border-0"
                                                            >
                                                                <td className="px-6 py-4 font-mono text-xs align-middle" suppressHydrationWarning>{date}</td>
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div className="text-white font-medium">{title}</div>
                                                                    <div className="text-xs opacity-50">{subtitle}</div>
                                                                    {(session as any).progression_comparison?.observed_changes?.[0] && (
                                                                        <div className="text-xs text-green-400 mt-1">
                                                                            ↑ {(session as any).progression_comparison.observed_changes[0]}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 align-middle">
                                                                    {session.session_type === 'negotiation_simulation' ? (
                                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                                            Coach Scored
                                                                        </span>
                                                                    ) : evaluationDepth === 'full' ? (
                                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                            Evaluation Complete
                                                                        </span>
                                                                    ) : evaluationDepth === 'shallow' ? (
                                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                                            Partial Feedback
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 text-gray-400 text-xs border border-white/10">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                                                            Insufficient Data
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
                    </div>
                </div>
                {/* Footer with Trust Builder */}
                <footer className="mt-16 py-8 border-t border-white/5 text-center">
                    <p className="text-gray-500 text-sm">PraxisNow is built by a small team dedicated to your success.</p>
                    <div className="mt-2 text-sm text-gray-500">
                        Need help? <button onClick={() => setIsSupportOpen(true)} className="text-purple-400 hover:text-purple-300 transition-colors">Report an issue</button> or email <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">support@praxisnow.ai</a>
                    </div>
                </footer>
            </main>

            <SupportModal
                isOpen={isSupportOpen}
                onClose={() => setIsSupportOpen(false)}
                userId={user?.id}
                sessionId={selectedSession?.id}
            />

            {/* SESSION DETAILS MODAL - DISABLED FOR UI SIMPLIFICATION */}
            {/* PDF is now the only feedback surface for past sessions */}
            {false && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedSession(null)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedSession.session_type === 'negotiation_simulation'
                                        ? "Negotiation Session"
                                        : (selectedSession as any).evaluation_depth === 'insufficient'
                                            ? "Session Ended Early"
                                            : (selectedSession as any).evaluation_depth === 'shallow'
                                                ? "Partial Evaluation Available"
                                                : "Session Analysis"}
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
                                <button
                                    onClick={() => setSelectedSession(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        {selectedSession.session_type !== 'negotiation_simulation' && (selectedSession as any).evaluation_depth === 'insufficient' ? (
                            // INSUFFICIENT SIGNAL UX
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

                                    <div className="mt-6 text-center">
                                        <p className="text-sm text-gray-300 leading-relaxed font-medium">
                                            This session has been recorded and counted toward your available sessions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // EXISTING CONTENT
                            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">

                                {/* Score Row */}
                                {/* Score Row - Conditional Rendering */}
                                {selectedSession.session_type === 'negotiation_simulation' ? (
                                    <div className="space-y-6">
                                        {/* Coach's Summary */}
                                        <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/20">
                                            <div className="text-xs text-yellow-500 uppercase font-bold mb-3 flex items-center gap-2">
                                                <Trophy className="w-4 h-4" /> Coach's Strategy Notes
                                            </div>
                                            <div className="text-yellow-100 leading-relaxed">
                                                {selectedSession.evaluation_data?.strategy_notes || "No strategy notes available."}
                                            </div>
                                        </div>

                                        {/* Tactics & Strengths Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Tactics */}
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                <h5 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Tactics Faced</h5>
                                                <ul className="space-y-2">
                                                    {selectedSession.evaluation_data?.tactics_encountered?.map((t: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                                            <span className="text-purple-400 mt-1">•</span> {t}
                                                        </li>
                                                    )) || <li className="text-sm text-gray-500 italic">None recorded</li>}
                                                </ul>
                                            </div>
                                            {/* Strengths */}
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                <h5 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Your Leverage</h5>
                                                <ul className="space-y-2">
                                                    {selectedSession.evaluation_data?.strengths?.map((s: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                                            <span className="text-green-400 mt-1">✓</span> {s}
                                                        </li>
                                                    )) || <li className="text-sm text-gray-500 italic">None recorded</li>}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Phrase Optimization */}
                                        {(selectedSession.evaluation_data?.weak_phrasing?.length > 0) && (
                                            <div>
                                                <h5 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                                    <Zap className="w-4 h-4" /> Phrasing Improvements
                                                </h5>
                                                <div className="space-y-3">
                                                    {selectedSession.evaluation_data.weak_phrasing.map((weak: string, i: number) => {
                                                        const strong = selectedSession.evaluation_data.strong_alternatives?.[i] || "";
                                                        return (
                                                            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white/5 rounded-lg p-3 text-sm">
                                                                <div className="text-red-300/80 border-l-2 border-red-500/30 pl-3 py-1">
                                                                    <div className="text-[10px] uppercase font-bold text-red-500 mb-1">Weaker</div>
                                                                    "{weak}"
                                                                </div>
                                                                <div className="text-green-300/80 border-l-2 border-green-500/30 pl-3 py-1">
                                                                    <div className="text-[10px] uppercase font-bold text-green-500 mb-1">Better</div>
                                                                    "{strong}"
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Clarity', val: selectedSession.clarity },
                                            { label: 'Structure', val: selectedSession.structure },
                                            { label: 'Recovery', val: selectedSession.recovery },
                                            { label: 'Signal', val: selectedSession.signal_noise }
                                        ].map((stat) => (
                                            <div key={stat.label} className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">{stat.label}</div>
                                                <div className={`text-2xl font-bold ${(stat.val || 0) >= 70 ? 'text-green-400' : (stat.val || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {stat.val ?? '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Key Insight (Standard Only) */}
                                {selectedSession.session_type !== 'negotiation_simulation' && selectedSession.key_insight && (
                                    <div>
                                        <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> Key Insight
                                        </h4>
                                        <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-xl text-purple-100 leading-relaxed">
                                            {selectedSession.key_insight}
                                        </div>
                                    </div>
                                )}

                                {/* Improvements (Standard Only) */}
                                {selectedSession.session_type !== 'negotiation_simulation' && selectedSession.improvement_priorities && selectedSession.improvement_priorities.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Priorities
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedSession.improvement_priorities.map((item: string, i: number) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                                    <div className="min-w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold mt-0.5">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-gray-300 text-sm leading-relaxed">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pro Section Wrapper (Standard Only) */}
                                {selectedSession.session_type !== 'negotiation_simulation' && (selectedSession.alternative_approaches || selectedSession.pattern_analysis) && (
                                    <div className="border-t border-white/10 pt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Trophy className="w-4 h-4 text-yellow-500" />
                                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Advanced Analysis</span>
                                        </div>

                                        {/* Alternative Approaches */}
                                        {selectedSession.alternative_approaches && (
                                            <div className="mb-6">
                                                <h5 className="text-sm font-semibold text-gray-300 mb-2">Alternative Approaches</h5>
                                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                                                    {selectedSession.alternative_approaches.map((alt: string, i: number) => (
                                                        <li key={i}>{alt}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Pattern Analysis */}
                                        {selectedSession.pattern_analysis && (
                                            <div className="bg-white/5 p-4 rounded-xl">
                                                <h5 className="text-sm font-semibold text-gray-300 mb-2">Pattern Analysis</h5>
                                                <p className="text-sm text-gray-400">{selectedSession.pattern_analysis}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}

                        {/* Footer Action */}
                        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                            {selectedSession.session_type !== 'negotiation_simulation' && (selectedSession as any).evaluation_depth === 'insufficient' ? (
                                // INSUFFICIENT SESSION FOOTER
                                <Button
                                    onClick={() => setSelectedSession(null)}
                                    className="bg-white text-black hover:bg-gray-200 font-bold"
                                >
                                    Try Again When Ready
                                </Button>
                            ) : (
                                // STANDARD FOOTER (for sessions with evaluations)
                                <>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSelectedSession(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        Close
                                    </Button>

                                    {/* Secondary: PDF icon button — shown for any evaluated non-insufficient session */}
                                    {(selectedSession as any).evaluation_depth && (selectedSession as any).evaluation_depth !== 'insufficient' && (
                                        <button
                                            onClick={(e) => handleGeneratePDF(e, selectedSession.id.toString())}
                                            disabled={generatingPdfId === selectedSession.id.toString()}
                                            title={selectedSession.pdf_url ? 'Download Full PDF' : 'Generate PDF Report'}
                                            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {generatingPdfId === selectedSession.id.toString()
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : selectedSession.pdf_url
                                                    ? <DownloadIcon className="w-4 h-4" />
                                                    : <FileText className="w-4 h-4" />
                                            }
                                        </button>
                                    )}

                                    {/* Primary: View Report — links to Results Screen for standard (non-negotiation) sessions */}
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
