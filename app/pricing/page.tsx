'use client'

import { Check, Minus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        sessions: '2',
        duration: '30 mins',
        price: '999',
        description: 'Exposure to real interview pressure',
        features: ['2 interviews (30 min each)', 'Realistic AI interviewer', 'Interviewer-grade evaluation', 'Basic PDF performance summary'],
        excludes: ['No question randomization', 'No interview replay', 'No answer upgrades', 'No deep performance insights', 'No custom interview scenarios'],
        highlight: false
    },
    {
        id: 'pro',
        name: 'Pro',
        sessions: '5',
        duration: '30 mins',
        price: '2499',
        description: 'Complete preparation toolkit with advanced insights',
        features: [
            'Dedicated AI Fluency Round (role-specific)',
            '5 interviews (30 min each)',
            'Question randomization',
            'Interview replay (same questions)',
            'Deep performance insights in PDF',
            'Answer upgrades included',
            'Advanced custom interview scenarios (3-4 dimensions)',
            'Replay-based improvement detection',
            'Offer & salary conversation simulation'
        ],
        excludes: [],
        highlight: true
    }
]

const COMPARISON_ROWS = [
    { title: 'Realistic AI interviewer', starter: true, pro: true },
    { title: 'Role-specific scenarios', starter: true, pro: true },
    { title: 'Pressure probing & follow-ups', starter: true, pro: true },
    { title: 'Question randomization', starter: false, pro: true },
    { title: 'Interview replay (same questions)', starter: false, pro: true },
    { title: 'Deep performance insights in PDF', starter: false, pro: true },
    { title: 'Answer upgrades', starter: false, pro: true },
    { title: 'Advanced custom scenarios (3-4 dimensions)', starter: false, pro: true },
    { title: 'Replay-based improvement detection', starter: false, pro: true },
    { title: 'Dedicated AI Fluency Round', starter: false, pro: true },
    { title: 'Offer & salary conversation simulation', starter: false, pro: true },
]

export default function PricingPage() {
    const router = useRouter()

    const handlePurchase = async (packId: string) => {
        // Validate Razorpay key is configured
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        if (!razorpayKey) {
            alert('Payment configuration error: Razorpay key is missing. Please contact support.')
            console.error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set in environment variables')
            return
        }

        // Call API to create order
        try {
            const res = await fetch('/api/razorpay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ packId })
            })

            if (!res.ok) throw new Error(`Failed to create order: ${res.statusText}`)

            const data = await res.json()
            if (data.error) throw new Error(data.error)

            const descriptionMap: Record<string, string> = {
                'starter': 'Starter Pack (2 Sessions)',
                'pro': 'Pro Pack (5 Sessions)'
            }

            const options = {
                key: razorpayKey,
                amount: data.amount,
                currency: "INR",
                name: "PraxisNow AI",
                description: descriptionMap[packId] || "Interview Sessions",
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
                                packId: packId
                            })
                        })

                        const verifyData = await verifyRes.json()
                        if (verifyData.success) {
                            // router.push('/dashboard')
                            // Force hard reload or ensure data revalidation
                            window.location.href = '/dashboard?payment=success'
                        } else {
                            throw new Error(verifyData.error || 'Verification failed')
                        }
                    } catch (err) {
                        console.error('Verification error', err)
                        alert('Payment successful, but verification failed. Please contact support.')
                    }
                },
                theme: {
                    color: "#9333ea"
                }
            }

            if (typeof (window as any).Razorpay === 'undefined') {
                alert('Payment system is still loading. Please try again in a moment.')
                return
            }

            const rzp1 = new (window as any).Razorpay(options)
            rzp1.open()

        } catch (err) {
            console.error("Payment failed", err)
            alert(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-purple-500/30 font-sans pb-20">
            {/* Header */}
            <div className="pt-20 pb-16 text-center max-w-3xl mx-auto px-6">
                <h2 className="text-purple-400 font-semibold tracking-wider uppercase text-sm mb-4">Pricing Plans</h2>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Invest in your career
                </h1>
                <p className="text-gray-400 text-lg">
                    Choose the plan that fits your preparation needs. Upgrading your skills pays the highest dividends.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 max-w-4xl mx-auto">
                    {PLANS.map((plan) => (
                        <div key={plan.name} className={cn(
                            "relative flex flex-col p-8 rounded-2xl border transition-all duration-300",
                            plan.highlight
                                ? "bg-gradient-to-b from-purple-900/40 to-black/40 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
                                : "bg-white/5 border-white/5 hover:border-white/10"
                        )}>
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                                    Recommended
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-gray-400">INR</span>
                                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                                </div>
                                <p className="text-gray-400 text-sm mt-4 min-h-[20px]">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8 flex-grow">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                        <Check className={cn("w-4 h-4 mt-0.5 flex-shrink-0", plan.highlight ? "text-purple-400" : "text-purple-500")} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {plan.excludes && plan.excludes.length > 0 && (
                                <>
                                    <p className="text-xs text-gray-500 mb-3 border-t border-white/5 pt-4">Does NOT include:</p>
                                    <ul className="space-y-2 mb-8 text-gray-500 text-xs">
                                        {plan.excludes.map((exclude, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span>•</span>
                                                <span>{exclude}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            <Button
                                onClick={() => handlePurchase(plan.id)}
                                className={cn(
                                    "w-full h-12 rounded-xl font-semibold text-base transition-all",
                                    plan.highlight
                                        ? "bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                        : "bg-white/10 hover:bg-white/20 text-white"
                                )}
                            >
                                {plan.id === 'starter' ? 'Try Starter' : 'Get Pro'}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold">Compare Features</h2>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-6 font-semibold text-gray-400 w-1/2">Feature</th>
                                    <th className="p-6 font-bold text-center w-1/4 text-gray-200">Starter</th>
                                    <th className="p-6 font-bold text-center w-1/4 text-purple-300">Pro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {COMPARISON_ROWS.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm md:text-base font-medium text-gray-300">{row.title}</td>

                                        {/* Starter Column */}
                                        <td className="p-6 text-center">
                                            {row.starter ? (
                                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-gray-400">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>

                                        {/* Pro Column */}
                                        <td className="p-6 text-center bg-purple-900/10">
                                            {row.pro ? (
                                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors underline underline-offset-4">
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
            />
        </div>
    )
}
