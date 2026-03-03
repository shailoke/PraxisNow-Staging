import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
    try {
        const { packId } = await req.json()

        let amount = 0
        if (packId === 'starter') amount = 599 * 100
        if (packId === 'pro') amount = 899 * 100
        if (packId === 'pro_plus') amount = 1199 * 100 // Legacy SKU - still accepted

        if (amount === 0) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error('Razorpay Error:', error)
        return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
    }
}
