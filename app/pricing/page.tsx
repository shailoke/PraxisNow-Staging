'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

export default function PricingPage() {
    const router = useRouter()

    // ── Preserved: existing Razorpay purchase handler ──────────────────────────
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

            {/* Page header */}
            <div className="pt-20 pb-14 text-center max-w-2xl mx-auto px-6">
                <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">Pricing</p>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple pricing. No tiers.</h1>
                <p className="text-gray-400 text-lg">
                    Every session is 30 minutes, any role, any round. Sessions do not expire.
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-6">

                {/* Free session callout — full-width card */}
                <div className="mb-10 rounded-2xl border border-green-500/25 bg-green-500/8 px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div>
                        <p className="text-lg font-bold text-green-300 mb-1">Your first session is on us</p>
                        <p className="text-sm text-green-200/70">
                            Try any round except the AI rounds — completely free.
                        </p>
                    </div>
                    <Button
                        className="shrink-0 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold px-6"
                        asChild
                    >
                        <Link href="/auth">Start free →</Link>
                    </Button>
                </div>

                {/* Pack cards — four in a row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

                    {/* Free session */}
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 flex flex-col">
                        <p className="text-base font-bold mb-1">Free session</p>
                        <p className="text-3xl font-bold mb-1">₹0</p>
                        <p className="text-sm text-gray-400 mb-6 flex-grow">1 session · any round except AI</p>
                        <Button variant="outline" className="w-full rounded-xl" asChild>
                            <Link href="/auth">Start free →</Link>
                        </Button>
                    </div>

                    {/* Single */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col">
                        <p className="text-base font-bold mb-1">Single</p>
                        <p className="text-3xl font-bold mb-1">₹499</p>
                        <p className="text-sm text-gray-400 mb-6 flex-grow">1 session</p>
                        <Button
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={() => handlePurchase('single')}
                        >
                            Buy
                        </Button>
                    </div>

                    {/* Practice Pack — highlighted */}
                    <div className="relative rounded-2xl border border-purple-500/50 bg-gradient-to-b from-purple-900/20 to-black/20 p-6 flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.12)]">
                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                            Most popular
                        </div>
                        <p className="text-base font-bold mb-1">Practice Pack</p>
                        <p className="text-3xl font-bold mb-1">₹1,399</p>
                        <p className="text-sm text-gray-400 mb-1">3 sessions</p>
                        <p className="text-xs text-green-400 font-medium mb-5 flex-grow">Save ₹98</p>
                        <Button
                            className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => handlePurchase('practice_pack')}
                        >
                            Buy
                        </Button>
                    </div>

                    {/* Full Prep */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col">
                        <p className="text-base font-bold mb-1">Full Prep</p>
                        <p className="text-3xl font-bold mb-1">₹2,199</p>
                        <p className="text-sm text-gray-400 mb-1">5 sessions</p>
                        <p className="text-xs text-green-400 font-medium mb-5 flex-grow">Save ₹296</p>
                        <Button
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={() => handlePurchase('full_prep')}
                        >
                            Buy
                        </Button>
                    </div>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-gray-600 mb-14">
                    All sessions are 30 minutes · Any role · Any round · Sessions never expire
                </p>

                <div className="text-center">
                    <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors underline underline-offset-4 text-sm">
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
