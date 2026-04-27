'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Zap, BarChart, CheckCircle2, Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import LegalFooter from '@/components/LegalFooter'

export default function LandingPage() {
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

      if (!res.ok) {
        throw new Error(`Failed to create order: ${res.statusText}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

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
        handler: function (response: any) {
          alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`)
          // Create session/transaction record here or rely on webhook
          router.push('/dashboard')
        },
        theme: {
          color: "#9333ea"
        }
      }

      // Check if Razorpay script is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        alert('Payment system is still loading. Please try again in a moment.')
        console.error('Razorpay script not loaded')
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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">

      {/* ── Section 1: Nav ──────────────────────────────────────────────────── */}
      <nav className="fixed w-full z-50 glass-panel border-b-0 border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/praxisnow-logo-dark.svg"
              alt="PraxisNow"
              width={220}
              height={44}
              className="h-9 w-auto"
              priority
            />
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Section 2: Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Purple pill badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
            Your first interview is free
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Practice interviews that feel<br />
            <span style={{ color: '#7F77DD' }}>uncomfortably real.</span>
          </h1>

          <p className="text-lg text-gray-400 mb-10 max-w-[520px] mx-auto leading-relaxed">
            An AI interviewer calibrated to the standard top tech companies actually use. It asks targeted follow-up questions, probes for specifics, and evaluates you the way a real hiring panel would. Get a detailed coaching report after every session.
          </p>

          <Button className="h-12 px-8 text-lg rounded-full" asChild>
            <Link href="/auth">Start your free session →</Link>
          </Button>

          {/* Role pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['Product Manager', 'Software Development Engineer', 'Data Scientist'].map((role) => (
              <span key={role} className="px-4 py-1.5 rounded-full border border-white/10 text-sm text-gray-400">
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: How it works ─────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold">Three steps from signup to coaching report</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 'Step 1',
                title: 'Pick your role and round',
                body: 'Choose PM, SDE, or Data Scientist. Each role has four rounds that mirror the hiring loop at top tech companies.'
              },
              {
                step: 'Step 2',
                title: 'Interview under real pressure',
                body: '30 minutes. The interviewer asks targeted follow-up questions and probes weak answers — staying in character for the full session.'
              },
              {
                step: 'Step 3',
                title: 'Get your coaching report',
                body: 'Competency scores with evidence from your actual answers, your primary gap, answer rewrites, and a downloadable PDF.'
              },
            ].map((card) => (
              <div key={card.step} className="glass-panel p-8 rounded-2xl">
                <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-4">
                  {card.step}
                </span>
                <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Interview rounds ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">Interview rounds</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Four rounds per role. The full hiring loop.</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Each round tests a distinct set of competencies. Complete all four to know exactly where you stand.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Product Manager */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-purple-400 mb-5">Product Manager</h3>
              <ul className="space-y-3">
                <li className="text-gray-300 text-sm">R1: Product Sense &amp; Design</li>
                <li className="text-gray-300 text-sm">R2: Metrics &amp; Analytical Thinking</li>
                <li className="text-gray-300 text-sm">R3: Execution &amp; Leadership</li>
                <li className="flex items-center gap-2 text-gray-300 text-sm">
                  <span>R4: AI Product Strategy</span>
                  <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">AI</span>
                </li>
              </ul>
            </div>

            {/* Software Development Engineer */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-purple-400 mb-5">Software Development Engineer</h3>
              <ul className="space-y-3">
                <li className="text-gray-300 text-sm">R1: System Design &amp; Architecture</li>
                <li className="text-gray-300 text-sm">R2: Algorithms &amp; Problem Solving</li>
                <li className="text-gray-300 text-sm">R3: Engineering Execution &amp; Leadership</li>
                <li className="flex items-center gap-2 text-gray-300 text-sm">
                  <span>R4: AI Engineering</span>
                  <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">AI</span>
                </li>
              </ul>
            </div>

            {/* Data Scientist */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-purple-400 mb-5">Data Scientist</h3>
              <ul className="space-y-3">
                <li className="text-gray-300 text-sm">R1: Problem Framing &amp; Analytics</li>
                <li className="text-gray-300 text-sm">R2: ML Design &amp; Evaluation</li>
                <li className="text-gray-300 text-sm">R3: Research Depth &amp; Leadership</li>
                <li className="flex items-center gap-2 text-gray-300 text-sm">
                  <span>R4: AI Research &amp; Alignment</span>
                  <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">AI</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: What you get ─────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">What you get</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Every session produces a coaching report</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Not a generic score. Evidence-anchored feedback based on what you actually said.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                Icon: BarChart,
                title: 'Competency scorecard',
                body: 'Scores on the specific competencies for that round — with a quote or behaviour from your transcript as evidence for every score.'
              },
              {
                Icon: Zap,
                title: 'The one thing to fix',
                body: 'One primary gap identified — the single highest-leverage change before your next session. Not a list of everything you did wrong.'
              },
              {
                Icon: CheckCircle2,
                title: 'Answer upgrades',
                body: 'Your weakest answers rewritten to show exactly what a stronger response looks like — a rewrite of what you actually said, not a template.'
              },
              {
                Icon: Bot,
                title: 'Score history',
                body: 'Every session is tracked. See your scores improve across rounds and identify where to focus your next session.'
              },
            ].map((card, i) => (
              <div key={i} className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4 text-purple-400">
                  <card.Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Pricing ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 relative" id="pricing">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple pricing. No tiers.</h2>
          <p className="text-gray-400 mb-12">Every session is 30 minutes, any role, any round. Sessions do not expire.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Free session */}
            <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Free session</h3>
              <div className="text-3xl font-bold mb-1">₹0</div>
              <p className="text-sm text-gray-400 mb-6 flex-grow">1 session · any round except AI</p>
              <Button className="w-full rounded-xl" variant="outline" asChild>
                <Link href="/auth">Start free →</Link>
              </Button>
            </div>

            {/* Single */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Single</h3>
              <div className="text-3xl font-bold mb-1">₹499</div>
              <p className="text-sm text-gray-400 mb-6 flex-grow">1 session</p>
              <Button className="w-full rounded-xl" variant="outline" onClick={() => handlePurchase('single')}>
                Buy
              </Button>
            </div>

            {/* Practice Pack — highlighted */}
            <div className="glass-panel p-6 rounded-2xl border border-purple-500/50 bg-gradient-to-b from-purple-900/20 to-black/20 relative flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.12)]">
              <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                Most popular
              </div>
              <h3 className="text-lg font-bold mb-1">Practice Pack</h3>
              <div className="text-3xl font-bold mb-1">₹1,399</div>
              <p className="text-sm text-gray-400 mb-2">3 sessions</p>
              <span className="inline-block self-start px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-xs font-medium mb-5 flex-grow">
                Save ₹98
              </span>
              <Button className="w-full rounded-xl bg-purple-600 hover:bg-purple-700" onClick={() => handlePurchase('practice_pack')}>
                Buy
              </Button>
            </div>

            {/* Full Prep */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Full Prep</h3>
              <div className="text-3xl font-bold mb-1">₹2,199</div>
              <p className="text-sm text-gray-400 mb-2">5 sessions</p>
              <span className="inline-block self-start px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-xs font-medium mb-5 flex-grow">
                Save ₹296
              </span>
              <Button className="w-full rounded-xl" variant="outline" onClick={() => handlePurchase('full_prep')}>
                Buy
              </Button>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-600">
            All sessions are 30 minutes · Any role · Any round · Sessions never expire
          </p>
        </div>
      </section>

      {/* ── Section 7: FAQ ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Common questions</h2>
          </div>
          <div className="divide-y divide-white/5">
            {[
              {
                q: 'What is a session?',
                a: 'One 30-minute interview on a specific round — for example, PM Product Sense & Design or SDE System Design. You can do the same round multiple times and track your score improvement across sessions.'
              },
              {
                q: 'Which round should I start with?',
                a: 'Start with Round 1 for your role. Your free session is a good way to experience the format before deciding where to focus your preparation.'
              },
              {
                q: 'What makes this different from reading interview guides?',
                a: 'Reading about interviews and doing interviews are different skills. PraxisNow puts you in the seat, under pressure, having to produce answers in real time. The evaluation after each session tells you specifically what you did well and what you did not — based on your actual answers.'
              },
              {
                q: 'What are the AI rounds?',
                a: 'Round 4 for each role focuses on AI-specific knowledge — AI Product Strategy for PMs, AI Engineering for SDEs, and AI Research & Alignment for Data Scientists. These rounds are available with any paid session.'
              },
              {
                q: 'Do sessions expire?',
                a: 'No. Sessions you purchase are yours to use whenever you are ready.'
              },
            ].map((item, i) => (
              <div key={i} className="py-6">
                <h3 className="text-lg font-semibold mb-3">{item.q}</h3>
                <p className="text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 8: Footer CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to find out where you actually stand?
          </h2>
          <p className="text-gray-400 mb-8">
            Join candidates preparing seriously for their next tech interview.
          </p>
          <Button className="h-12 px-8 text-lg rounded-full" asChild>
            <Link href="/auth">Start your free session →</Link>
          </Button>
        </div>
      </section>

      <LegalFooter />

      {/* Razorpay checkout script — preserved */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
    </div>
  )
}
