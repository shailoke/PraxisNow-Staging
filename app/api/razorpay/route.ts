import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Server-side package map — amount is never taken from the client request body.
const PACKAGES: Record<string, { amount: number; label: string }> = {
    // New SKUs
    single:        { amount: 49900,  label: 'PraxisNow — Single Session' },
    practice_pack: { amount: 139900, label: 'PraxisNow — Practice Pack (3 Sessions)' },
    full_prep:     { amount: 219900, label: 'PraxisNow — Full Prep (5 Sessions)' },
    // Legacy SKUs — kept for backward compatibility
    starter:       { amount: 59900,  label: 'PraxisNow — Starter Pack (Legacy)' },
    pro:           { amount: 89900,  label: 'PraxisNow — Pro Pack (Legacy)' },
    pro_plus:      { amount: 119900, label: 'PraxisNow — Pro Plus Pack (Legacy)' },
}

export async function POST(req: NextRequest) {
    try {
        const { packId } = await req.json()

        // 1. Resolve pack server-side — rejects unknown SKUs before touching Razorpay
        const pack = PACKAGES[packId as string]
        if (!pack) {
            return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
        }

        // 2. Authenticate user
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value, ...options }) } catch { }
                    },
                    remove(name: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value: '', ...options }) } catch { }
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Create Razorpay order using server-resolved amount
        const order = await razorpay.orders.create({
            amount: pack.amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        })

        // 4. Persist order → SKU binding so verify/route.ts never trusts the client
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: insertError } = await adminClient
            .from('razorpay_orders')
            .insert({
                order_id: order.id,
                user_id: user.id,
                sku: packId,
                amount: pack.amount,
                created_at: new Date().toISOString(),
            })

        if (insertError) {
            // Order was created in Razorpay but we couldn't persist the binding.
            // Log and surface — client should retry rather than proceeding.
            console.error('[RAZORPAY] Failed to persist order record:', insertError)
            return NextResponse.json({ error: 'Order setup failed. Please try again.' }, { status: 500 })
        }

        return NextResponse.json(order)

    } catch (error) {
        console.error('Razorpay Error:', error)
        return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
    }
}
