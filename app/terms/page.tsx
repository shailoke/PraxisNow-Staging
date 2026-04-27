import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
    title: 'Terms of Service',
}

export default function TermsPage() {
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
            <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">

                <div>
                    <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
                    <p className="text-sm text-gray-400">Effective Date: 01 May 2026</p>
                </div>

                <Section title="1. Acceptance of Terms">
                    <p>
                        By creating an account and checking the consent box at signup, you confirm you have read and agreed to these Terms of Service and our{' '}
                        <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">Privacy Policy</Link>
                        . If you do not agree, do not use the service.
                    </p>
                </Section>

                <Section title="2. Description of Service">
                    <p>
                        PraxisNow provides AI-powered interview simulations and detailed evaluation reports to help users prepare for job interviews. The platform is a practice tool. It is not a hiring service and no employer has access to your PraxisNow scores or reports.
                    </p>
                </Section>

                <Section title="3. Eligibility">
                    <p>
                        You must be at least 18 years old to use PraxisNow. By using the service, you confirm that you meet this requirement.
                    </p>
                </Section>

                <Section title="4. User Responsibilities">
                    <p>You agree to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>Provide accurate account information</li>
                        <li>Use the platform solely for personal interview practice</li>
                        <li>Not share your account with others</li>
                        <li>Not upload harmful or illegal content</li>
                        <li>Not attempt to reverse-engineer or misuse the AI or platform infrastructure</li>
                    </ul>
                </Section>

                <Section title="5. AI Disclaimer">
                    <p>PraxisNow uses artificial intelligence to simulate interviews and generate evaluations. You should be aware that:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>AI-generated evaluations may contain inaccuracies</li>
                        <li>Scores are calibrated to observed hiring standards but are not a guarantee of real-world performance</li>
                        <li>No employer has access to your PraxisNow scores or reports</li>
                        <li>PraxisNow does not guarantee job outcomes</li>
                    </ul>
                    <p className="text-gray-300">
                        Do not rely solely on PraxisNow feedback for critical career decisions.
                    </p>
                </Section>

                <Section title="6. Payments and Refunds">
                    <p>
                        Pricing is displayed clearly on the pricing page before purchase. Payments are processed by Razorpay. Session packs are non-refundable once purchased. Sessions do not expire.
                    </p>
                    <p className="text-gray-300">
                        Exception: if a session fails to complete due to a verified technical error on our part, we will credit one replacement session to your account. To report a technical failure, contact{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>{' '}
                        within 7 days of the session date. We will respond within 5 business days.
                    </p>
                </Section>

                <Section title="7. Intellectual Property">
                    <p>
                        The PraxisNow platform, design, codebase, and AI models belong to PraxisNow. You retain ownership of your inputs. You grant PraxisNow a limited, non-exclusive licence to process your inputs solely to deliver the service.
                    </p>
                </Section>

                <Section title="8. Account Suspension and Termination">
                    <p>
                        We may suspend or terminate accounts for Terms violations, detected misuse, or as required by law. You may request account deletion at any time by contacting{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                        .
                    </p>
                </Section>

                <Section title="9. Limitation of Liability">
                    <p>
                        To the maximum extent permitted by law, PraxisNow is not liable for decisions made based on AI output, loss of employment opportunities, or indirect or consequential damages. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
                    </p>
                </Section>

                <Section title="10. Indemnity">
                    <p>
                        You agree to indemnify PraxisNow against claims arising from your misuse of the platform or violation of these Terms.
                    </p>
                </Section>

                <Section title="11. Governing Law">
                    <p>
                        These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of India.
                    </p>
                </Section>

                <Section title="12. Changes to Terms">
                    <p>
                        We may update these Terms periodically. Continued use constitutes acceptance. We will notify users of material changes by email or in-app notice.
                    </p>
                </Section>

                <Section title="13. Contact">
                    <p>
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                    </p>
                </Section>

            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-8 py-6 px-6">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-6 text-sm text-gray-500">
                    <Link href="/" className="hover:text-gray-300 transition-colors">&larr; Home</Link>
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                    <Link href="/ai-disclaimer" className="hover:text-gray-300 transition-colors">AI Disclaimer</Link>
                </div>
            </footer>

        </div>
    )
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">{children}</div>
        </section>
    )
}
