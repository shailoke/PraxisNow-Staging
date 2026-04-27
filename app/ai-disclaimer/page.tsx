import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
    title: 'AI Disclaimer',
}

export default function AIDisclaimerPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">

            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="max-w-3xl mx-auto">
                    <Link href="/">
                        <Image
                            src="/praxisnow-logo-dark.svg"
                            alt="PraxisNow"
                            width={160}
                            height={32}
                            className="h-8 w-auto"
                            priority
                        />
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">

                <h1 className="text-3xl font-bold">AI Disclaimer</h1>

                <p className="text-gray-300 leading-relaxed">
                    PraxisNow uses artificial intelligence to simulate interviews and generate performance evaluations.
                </p>

                <div>
                    <h2 className="text-lg font-bold text-white mb-4">What this means for you:</h2>
                    <ul className="space-y-3">
                        {[
                            'Evaluations are AI-generated and may contain inaccuracies',
                            'Scores are calibrated to observed hiring standards at top technology companies, but are not a guarantee of real-world interview performance',
                            'No employer has access to your PraxisNow scores or reports — this platform is for your personal practice only',
                            'PraxisNow does not guarantee job outcomes',
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-300 leading-relaxed">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-gray-300 leading-relaxed">
                    PraxisNow is a practice tool. Use it to identify patterns, improve your structure, and build confidence &mdash; not as a definitive assessment of your ability.
                </p>

                <p className="text-gray-400">
                    Questions? Contact{' '}
                    <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                        support@praxisnow.ai
                    </a>
                </p>

            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-8 py-6 px-6">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-6 text-sm text-gray-500">
                    <Link href="/" className="hover:text-gray-300 transition-colors">&larr; Home</Link>
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
                </div>
            </footer>

        </div>
    )
}
