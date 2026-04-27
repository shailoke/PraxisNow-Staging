import Link from 'next/link'

/**
 * Minimal legal footer — rendered on all authenticated pages and the landing page.
 * Server component: no state, no effects.
 */
export default function LegalFooter() {
    return (
        <footer className="border-t border-white/10 mt-12 py-6 px-6 bg-[#0a0a0f]">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500">
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/ai-disclaimer" className="hover:text-gray-300 transition-colors">
                        AI Disclaimer
                    </Link>
                </div>
                <p className="text-xs text-gray-600">&copy; 2026 PraxisNow</p>
            </div>
        </footer>
    )
}
