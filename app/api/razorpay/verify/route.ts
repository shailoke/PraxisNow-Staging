import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { Database } from '@/lib/database.types'

// Package Configuration to ensure consistency
// PRICING REDESIGN: tiers removed — every paid pack grants the full experience.
// Packs differ only in how many sessions they include. All paid purchases set
// package_tier = 'Pro' for backward compat with the negotiation gate (see
// session/start's negotiation check, which is left untouched and still reads
// package_tier === 'Pro' || 'Pro+'). package_tier is no longer used to gate
// evaluation features — see app/api/evaluate/route.ts.
const PACKAGES = {
    'single': { amount: 49900, sessions: 1, tier: 'Pro' },
    'practice_pack': { amount: 139900, sessions: 3, tier: 'Pro' },
    'full_prep': { amount: 219900, sessions: 5, tier: 'Pro' },
    // Legacy SKU — kept for backward compatibility with old purchase records.
    // Not surfaced anywhere in the UI.
    'pro_plus': { amount: 119900, sessions: 7, tier: 'Pro' },
} as const

type Tier = 'Starter' | 'Pro' | 'Pro+' // Pro+ kept for type safety during migration

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packId
        } = body

        // 1. Verify User Authentication
        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value, ...options }) } catch (e) { }
                    },
                    remove(name: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value: '', ...options }) } catch (e) { }
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Load Razorpay Secret
        const keySecret = process.env.RAZORPAY_KEY_SECRET
        if (!keySecret) {
            console.error('RAZORPAY_KEY_SECRET is not set')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // 3. Verify Signature
        const generated_signature = crypto
            .createHmac("sha256", keySecret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex")

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        // 4. Resolve Package Details
        // Trusting client-side packId is risky, normally we'd fetch order from Razorpay to confirm amount.
        // For Validated Schema MVP, we'll map packId and enforce amount consistency if needed.
        const pack = PACKAGES[packId as keyof typeof PACKAGES]
        if (!pack) {
            return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
        }

        // 5. Insert Purchase (Triggers +sessions)
        const { error: purchaseError } = await (supabase
            .from('purchases') as any)
            .insert({
                user_id: user.id,
                order_id: razorpay_order_id,
                amount: pack.amount,
                sessions_added: pack.sessions,
                status: 'completed' // Critical for trigger
            })

        if (purchaseError) {
            console.error('Purchase Record Error:', purchaseError)
            // Even if DB insert fails, payment succeeded. We should log this critical error.
            return NextResponse.json({ error: 'Payment verified but session update failed' }, { status: 500 })
        }

        // 6. Tier assignment — no tiers in the new pricing model.
        // Every paid purchase sets package_tier = 'Pro' unconditionally. This is
        // purely for backward compat with the negotiation gate in session/start
        // (untouched, still checks package_tier === 'Pro' || 'Pro+') — it no
        // longer has any effect on evaluation feature gating.
        const newTier = pack.tier as Tier

        const { error: updateError } = await (supabase
            .from('users') as any)
            .update({ package_tier: newTier })
            .eq('id', user.id)

        if (updateError) {
            console.error('Tier Update Error:', updateError)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Verification Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
