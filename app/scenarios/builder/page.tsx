'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { ArrowLeft, Save, Sparkles, Target } from 'lucide-react'
import { DbScenario } from '@/lib/runtime-scenario'

// Mock data if DB is empty, but we should fetch
// Assuming UI components exist or using raw tailwind

export default function CustomBuilderPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form State
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedLevel, setSelectedLevel] = useState('')
    const [companyContext, setCompanyContext] = useState('')
    const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
    const [title, setTitle] = useState('')

    // Tier State (CRITICAL FOR GATING)
    const [userTier, setUserTier] = useState<'Pro'>('Pro')

    // Data State
    const [baseScenarios, setBaseScenarios] = useState<DbScenario[]>([])
    const [roles, setRoles] = useState<string[]>([])
    const [levels, setLevels] = useState<string[]>([])

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // TIER GATING: Check user tier FIRST
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('package_tier')
                .eq('id', user.id)
                .single()

            // Redirect Starter users to pricing
            if (profile?.package_tier === 'Starter') {
                router.push('/pricing?reason=custom_interviews')
                return
            }

            setUserTier('Pro')

            // Load scenarios
            const { data } = await supabase.from('scenarios').select('*')
            if (data) {
                setBaseScenarios(data)
                setRoles(Array.from(new Set(data.map(s => s.role))))
                setLevels(Array.from(new Set(data.map(s => s.level))))
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const availableDimensions = (() => {
        if (!selectedRole) return []
        // Gather all dimensions from ALL scenarios with this role, regardless of level
        const relevantScenarios = baseScenarios.filter(s => s.role === selectedRole)
        const allDims = new Set<string>()

        relevantScenarios.forEach(s => {
            if (s.evaluation_dimensions) {
                s.evaluation_dimensions.forEach(d => allDims.add(d))
            }
        })

        return Array.from(allDims).sort()
    })()

    const handleSave = async () => {
        if (!selectedRole || !selectedLevel || !title) return
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No user")

            const base = baseScenarios.find(s => s.role === selectedRole && s.level === selectedLevel)
            if (!base) throw new Error("Base scenario not found")

            const { error } = await supabase.from('custom_scenarios').insert({
                user_id: user.id,
                base_scenario_id: base.id,
                title: title,
                company_context: companyContext,
                focus_dimensions: selectedDimensions
            } as any) // Cast for new schema

            if (error) throw error

            router.push('/dashboard')
        } catch (e: any) {
            console.error(e)
            alert('Failed to save: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const toggleDimension = (dim: string) => {
        // PHASE 3: Pro+ merged into Pro - all paid users get 3-4 dimensions
        const maxDimensions = 4
        const minDimensions = 3

        if (selectedDimensions.includes(dim)) {
            // Allow deselection only if above minimum
            if (selectedDimensions.length > minDimensions) {
                setSelectedDimensions(prev => prev.filter(d => d !== dim))
            }
        } else {
            // Allow selection only if below maximum
            if (selectedDimensions.length < maxDimensions) {
                setSelectedDimensions(prev => [...prev, dim])
            }
        }
    }

    // Determine if save/start button should be enabled
    // PHASE 3: Pro+ merged into Pro - simplified validation
    const canProceed = selectedDimensions.length >= 3 && selectedDimensions.length <= 4 && selectedRole && selectedLevel && title

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                            Custom Interview Builder
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create, save, and reuse custom interviews to track improvement over time
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Role & Level Selection */}
                    <div className="space-y-6 glass-panel p-6 rounded-xl border border-white/10 bg-white/5">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Target Role</label>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => { setSelectedRole(r); setSelectedLevel(''); }}
                                        className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedRole === r
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                            }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedRole && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Interviewer Calibration</label>
                                <p className="text-xs text-gray-500 mb-2">Select target difficulty level for this interview</p>
                                <div className="flex flex-wrap gap-2">
                                    {baseScenarios
                                        .filter(s => s.role === selectedRole)
                                        .map(s => s.level) // Assuming naive unique mapping
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .map(l => (
                                            <button
                                                key={l}
                                                onClick={() => l && setSelectedLevel(l)}
                                                className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedLevel === l
                                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20'
                                                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-6 glass-panel p-6 rounded-xl border border-white/10 bg-white/5">
                        {/* Pro: Show title input for saving scenarios */}
                        {userTier === 'Pro' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Interview Name</label>
                                <input
                                    placeholder="e.g. Google L5 System Design"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Advanced Config (Only when role/level selected) */}
                {selectedRole && selectedLevel && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Company Context */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10 bg-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                    Company Context (Optional)
                                </label>
                                <span className="text-xs text-gray-500">Injects specific constraints</span>
                            </div>
                            <textarea
                                value={companyContext}
                                onChange={e => setCompanyContext(e.target.value)}
                                placeholder="e.g. You are interviewing for a streaming startup. We value low latency above all else..."
                                className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none resize-none"
                            />
                        </div>

                        {/* Focus Dimensions */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10 bg-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                                        <Target className="w-4 h-4 text-purple-400" />
                                        Focus Dimensions
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {userTier === 'Pro'
                                            ? 'Select 3-4 dimensions for comprehensive preparation'
                                            : 'Select exactly 2 dimensions to practice'
                                        }
                                    </p>
                                </div>
                                <span className={`text-xs font-semibold ${canProceed ? 'text-green-400' : 'text-amber-400'
                                    }`}>
                                    {selectedDimensions.length}/{userTier === 'Pro' ? '3-4' : '2'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableDimensions.map(dim => (
                                    <div
                                        key={dim}
                                        onClick={() => toggleDimension(dim)}
                                        className={`cursor-pointer border rounded-lg p-3 text-sm transition-all ${selectedDimensions.includes(dim)
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'
                                            }`}
                                    >
                                        {dim}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={saving || !canProceed}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-6 rounded-lg font-bold text-lg shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (userTier === 'Pro' ? 'Save Interview' : 'Start Interview Now')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
