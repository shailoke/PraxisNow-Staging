'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ConsentPage() {
    const router = useRouter()
    const supabase = createClient()
    const [checked1, setChecked1] = useState(false)
    const [loading, setLoading] = useState(false)
    const [initialising, setInitialising] = useState(true)

    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/auth')
                return
            }
            const { data: profile } = await supabase
                .from('users')
                .select('terms_accepted')
                .eq('id', user.id)
                .single()
            if (profile?.terms_accepted === true) {
                router.replace('/dashboard')
                return
            }
            setInitialising(false)
        }
        checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSubmit = async () => {
        if (!checked1) return
        setLoading(true)
        try {
            const res = await fetch('/api/consent', { method: 'POST' })
            if (!res.ok) throw new Error('Failed to record consent')
            router.push('/dashboard')
        } catch (err) {
            console.error('[CONSENT] Error recording consent:', err)
            setLoading(false)
        }
    }

    if (initialising) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-md space-y-8">

                {/* Logo */}
                <div className="flex justify-center">
                    <Image
                        src="/praxisnow-logo-dark.svg"
                        alt="PraxisNow"
                        width={160}
                        height={32}
                        className="h-8 w-auto"
                        priority
                    />
                </div>

                {/* Heading */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Before you continue</h1>
                    <p className="text-gray-400 text-sm">Please confirm the following to use PraxisNow.</p>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={checked1}
                            onChange={e => setChecked1(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-purple-500 cursor-pointer shrink-0"
                        />
                        <span className="text-sm text-gray-300 leading-relaxed">
                            I have read and agree to the{' '}
                            <Link
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2"
                            >
                                Terms of Service
                            </Link>
                            {' '}and{' '}
                            <Link
                                href="/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2"
                            >
                                Privacy Policy
                            </Link>
                        </span>
                    </label>

                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!checked1 || loading}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Continue to PraxisNow'}
                </button>

            </div>
        </div>
    )
}
