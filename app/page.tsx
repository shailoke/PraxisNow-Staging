'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Mic, Zap, BarChart, CheckCircle2, Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

export default function LandingPage() {
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
      {/* Navbar */}
      <nav className="fixed w-full z-50 glass-panel border-b-0 border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/praxisnow-logo.png"
              alt="PraxisNow"
              width={140}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              PraxisNow AI
            </span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Live: Real-time AI Interviewers
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Prepare for Your Next <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400">
              Tech Interview
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed font-medium">
            Practice realistic, high-pressure interviews with AI.
          </p>
          <p className="text-md text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            From fresh graduates to senior leaders, PraxisNow helps you prepare for conversations that actually decide outcomes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="h-12 px-8 text-lg rounded-full" asChild>
              <Link href="/auth">
                Start Practicing Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5">
            <p className="text-xs uppercase tracking-widest text-gray-600 mb-4 font-bold">Built For</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm font-medium text-gray-400 mb-3">
              <span>Product Managers</span>
              <span>•</span>
              <span>Project Managers</span>
              <span>•</span>
              <span>Software Development Engineers</span>
              <span>•</span>
              <span>Marketers</span>
              <span>•</span>
              <span>Data Scientists</span>
            </div>
            <p className="text-xs text-gray-500 text-center">Including fresh graduates applying for these roles</p>
          </div>
        </div>
      </section>

      {/* Dimension-Based Interviews Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Build Custom Interviews</h2>
          <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Build custom interviews by choosing the skills you want to be evaluated on.
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select your role, pick the dimensions that matter most (like product sense, communication, or technical depth), and add context. Our AI interviewer adapts in real-time to create realistic, targeted practice.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" id="features">
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: Mic,
              title: "Realistic Interview Pressure",
              desc: "Practice with an interviewer that probes, interrupts, and pushes — just like a real interview."
            },
            {
              icon: Zap, // Using Zap for Replay/Refresh logic if RefreshCw isn't imported, but I should import it. I'll use Zap for now or just generic icons if I can't guarantee import. Actually I'll stick to existing imports or add new ones to top.
              title: "Replay & Improve (Pro)",
              desc: "Retry the same interview questions to apply feedback and see how your answers improve."
            },
            {
              icon: CheckCircle2, // Using CheckCircle2 for Upgrades/Quality
              title: "Answer Upgrades (Pro)",
              desc: "See two stronger ways experienced candidates handle key questions — fast, practical, and reusable."
            },
            {
              icon: Bot,
              title: "Dedicated AI Fluency Round (Pro)",
              desc: "A full-length interview focused entirely on real-world AI implementation, trade-offs, and system depth."
            }
          ].map((feature, i) => (
            <div key={i} className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-6 text-purple-400">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section >

      {/* Pricing Section */}
      < section className="py-20 px-6 relative" id="pricing" >
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-gray-400 mb-12">Invest in your career with our flexible plans</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all flex flex-col">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-1">₹999</div>
              <p className="text-xs text-gray-400 mb-6">Exposure to real interview pressure</p>
              <ul className="text-left space-y-4 mb-6 text-gray-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> 2 interviews (30 min each)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Realistic AI interviewer</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Interviewer-grade evaluation</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Basic PDF performance summary</li>
              </ul>
              <p className="text-xs text-gray-500 mb-4 border-t border-white/5 pt-4">Does NOT include:</p>
              <ul className="text-left space-y-2 mb-8 text-gray-500 text-xs flex-grow">
                <li className="flex items-center gap-2">• No question randomization</li>
                <li className="flex items-center gap-2">• No interview replay</li>
                <li className="flex items-center gap-2">• No answer upgrades</li>
                <li className="flex items-center gap-2">• No deep performance insights</li>
                <li className="flex items-center gap-2">• No custom interview scenarios</li>
              </ul>
              <Button onClick={() => handlePurchase('starter')} variant="outline" className="w-full py-6 rounded-xl">Try Starter</Button>
            </div>

            {/* Pro */}
            <div className="glass-panel p-8 rounded-3xl border border-purple-500/50 bg-gradient-to-b from-purple-900/20 to-black/20 relative overflow-hidden flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recommended</div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-1">₹2499</div>
              <p className="text-xs text-gray-400 mb-6">Complete preparation toolkit with advanced insights</p>
              <ul className="text-left space-y-4 mb-8 text-gray-300 flex-grow">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Dedicated AI Fluency Round (role-specific)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> 5 interviews (30 min each)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Question randomization</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Interview replay (same questions)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Deep performance insights in PDF</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Answer upgrades included</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Advanced custom scenarios (3-4 dimensions)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Replay-based improvement detection</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Offer & salary conversation simulation</li>
              </ul>
              <Button onClick={() => handlePurchase('pro')} className="w-full py-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">Get Pro</Button>
            </div>


          </div>
        </div>
      </section >

      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
    </div >
  )
}
