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

            const base = baseScenarios.find(s => s.role === selectedRole)
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

    // TODO: rebuild in Phase 6
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
            <p className="text-gray-500">Custom scenario builder is being rebuilt. Check back soon.</p>
        </div>
    )

}

