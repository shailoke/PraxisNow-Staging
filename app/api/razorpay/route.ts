import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
    try {
        const { packId } = await req.json()

        const amountMap: Record<string, number> = {
            single: 49900,         // ₹499 in paise
            practice_pack: 139900, // ₹1,399 in paise
            full_prep: 219900,     // ₹2,199 in paise
        }

        const amount = amountMap[packId]
        if (!amount) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

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
