'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

const PACKS = [
    {
        id: 'free',
        name: 'Free session',
        price: '0',
        description: '1 session · any round except AI',
        cta: 'Start free →',
        href: '/dashboard',
        highlight: false,
        savings: null,
    },
    {
        id: 'single',
        name: 'Single',
        price: '499',
        description: '1 session',
        cta: 'Buy',
        href: null,
        highlight: false,
        savings: null,
    },
    {
        id: 'practice_pack',
        name: 'Practice Pack',
        price: '1,399',
        description: '3 sessions',
        cta: 'Buy',
        href: null,
        highlight: true,
        savings: 'Save ₹98',
        badge: 'MOST POPULAR',
    },
    {
        id: 'full_prep',
        name: 'Full Prep',
        price: '2,199',
        description: '5 sessions',
        cta: 'Buy',
        href: null,
        highlight: false,
        savings: 'Save ₹296',
    },
]

export default function PricingPage() {
    const router = useRouter()

    const handlePurchase = async (packId: string) => {
        // Auth check — same redirect target middleware.ts uses for unauthenticated users
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth')
            return
        }

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
                'single': 'PraxisNow — Single Session',
                'practice_pack': 'PraxisNow — Practice Pack (3 sessions)',
                'full_prep': 'PraxisNow — Full Prep (5 sessions)',
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
                <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Simple pricing. No tiers.
                </h1>
                <p className="text-gray-400 text-lg">
                    Every session is 30 minutes, any role, any round. Sessions do not expire.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                    {PACKS.map((pack) => (
                        <div key={pack.id} className={cn(
                            "relative flex flex-col p-8 rounded-2xl border transition-all duration-300",
                            pack.highlight
                                ? "bg-gradient-to-b from-purple-900/40 to-black/40 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                        )}>
                            {pack.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg whitespace-nowrap">
                                    {pack.badge}
                                </div>
                            )}

                            <div className="mb-6 flex-grow">
                                <h3 className="text-lg font-bold mb-3 text-gray-200">{pack.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-gray-400">₹</span>
                                    <span className="text-4xl font-bold tracking-tight text-white">{pack.price}</span>
                                </div>

                                {pack.savings && (
                                    <span className="inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
                                        {pack.savings}
                                    </span>
                                )}

                                <p className="text-gray-400 text-sm mt-4">{pack.description}</p>
                            </div>

                            {pack.href ? (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full h-12 rounded-xl font-semibold text-base"
                                >
                                    <Link href={pack.href}>{pack.cta}</Link>
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handlePurchase(pack.id)}
                                    variant={pack.highlight ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full h-12 rounded-xl font-semibold text-base transition-all",
                                        pack.highlight && "hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                    )}
                                >
                                    {pack.cta}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="text-center text-gray-500 text-sm mb-16">
                    All sessions are 30 minutes · Any role · Any round · Sessions never expire
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
