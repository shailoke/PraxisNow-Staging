import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { Database } from '@/lib/database.types'
import { trackEvent } from '@/lib/analytics'

// Package Configuration
// All active SKUs map to Pro tier. Legacy SKUs kept for backward-compat webhook replays.
const PACKAGES = {
    single: {
        amount: 49900,
        sessions: 1,
        label: 'PraxisNow — Single Session',
        tier: 'Pro' as const
    },
    practice_pack: {
        amount: 139900,
        sessions: 3,
        label: 'PraxisNow — Practice Pack (3 Sessions)',
        tier: 'Pro' as const
    },
    full_prep: {
        amount: 219900,
        sessions: 5,
        label: 'PraxisNow — Full Prep (5 Sessions)',
        tier: 'Pro' as const
    },
    // Legacy SKUs — backward compatibility only, not exposed in UI
    starter: {
        amount: 59900,
        sessions: 3,
        label: 'Starter Pack (Legacy)',
        tier: 'Pro' as const
    },
    pro: {
        amount: 89900,
        sessions: 5,
        label: 'Pro Pack (Legacy)',
        tier: 'Pro' as const
    },
    pro_plus: {
        amount: 119900,
        sessions: 7,
        label: 'Pro Plus Pack (Legacy)',
        tier: 'Pro' as const
    }
} as const

type Tier = 'Starter' | 'Pro' | 'Pro+' // Legacy types kept for migration safety

const TIER_WEIGHT = {
    'Starter': 1,
    'Pro': 2,
    'Pro+': 2
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
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

        // 3. Verify Signature — unchanged; this is the cryptographic proof of payment
        const generated_signature = crypto
            .createHmac("sha256", keySecret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex")

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        // 4. Look up the authoritative SKU from our DB — never trust client-supplied packId.
        //    This record was written by /api/razorpay at order creation time.
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: orderRecord } = await adminClient
            .from('razorpay_orders')
            .select('sku, amount, verified, user_id')
            .eq('order_id', razorpay_order_id)
            .single()

        if (!orderRecord) {
            return NextResponse.json({ error: 'Order not found' }, { status: 400 })
        }

        if (orderRecord.verified) {
            return NextResponse.json({ error: 'Order already processed' }, { status: 400 })
        }

        // Ensure the authenticated user is the one who created this order
        if (orderRecord.user_id !== user.id) {
            console.error('[RAZORPAY_VERIFY] user_id mismatch — possible replay attempt', {
                order_user: orderRecord.user_id,
                request_user: user.id,
                order_id: razorpay_order_id,
            })
            return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 })
        }

        // 5. Resolve the pack from the DB-authoritative SKU — client-supplied packId is ignored
        const packId = orderRecord.sku
        const pack = PACKAGES[packId as keyof typeof PACKAGES]

        if (!pack) {
            return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
        }

        // 6. Mark order as verified before granting sessions (prevents replay on partial failure)
        await adminClient
            .from('razorpay_orders')
            .update({ verified: true })
            .eq('order_id', razorpay_order_id)

        // 7. Insert Purchase (Triggers +sessions)
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

        // 8. Handle Logic for Tier Upgrade
        // We fetch current tier to ensure we don't downgrade a user (e.g. Pro+ buys Starter pack for sessions)
        const { data: userProfile } = await supabase
            .from('users')
            .select('package_tier')
            .eq('id', user.id)
            .single()

        const currentTier = ((userProfile as any)?.package_tier || 'Starter') as Tier
        const newTier = pack.tier as Tier

        // Only upgrade if new tier is higher weight
        if (TIER_WEIGHT[newTier] > TIER_WEIGHT[currentTier]) {
            const { error: updateError } = await (supabase
                .from('users') as any)
                .update({ package_tier: newTier })
                .eq('id', user.id)

            if (updateError) {
                console.error('Tier Update Error:', updateError)
            }
        }

        // Fire-and-forget analytics
        trackEvent('pack_purchased', user.id, {
            sku: packId,
            amount_paise: pack.amount,
            sessions_granted: pack.sessions,
            label: pack.label,
        })

        return NextResponse.json({ success: true, upgraded: TIER_WEIGHT[newTier] > TIER_WEIGHT[currentTier] })

    } catch (error) {
        console.error('Verification Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
