import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
    title: 'Privacy Policy',
}

export default function PrivacyPage() {
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
                    <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                    <p className="text-sm text-gray-400">
                        Effective Date: 01 May 2026 &nbsp;|&nbsp; Last Updated: 26 April 2026
                    </p>
                </div>

                <p className="text-gray-300 leading-relaxed">
                    Welcome to PraxisNow. Your privacy matters to us. This Privacy Policy explains how we collect, use, and protect your personal data.
                </p>

                <Section title="1. Who We Are">
                    <p>
                        PraxisNow provides an AI-powered interview simulation platform.
                        Contact:{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                    </p>
                </Section>

                <Section title="2. Data We Collect">
                    <SubSection title="a. Information You Provide">
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            <li>Name and email address (via Google sign-in or email signup)</li>
                            <li>Interview responses &mdash; verbatim text transcripts of your answers during practice sessions</li>
                        </ul>
                    </SubSection>
                    <SubSection title="b. Automatically Collected Data">
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            <li>Device information and IP address</li>
                            <li>Usage behaviour &mdash; sessions started, rounds completed, features used</li>
                        </ul>
                    </SubSection>
                    <SubSection title="c. AI-Generated Data">
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                            <li>Evaluation scores, competency assessments, answer upgrades, and coaching reports generated from your inputs</li>
                        </ul>
                    </SubSection>
                    <SubSection title="d. Voice Input &mdash; Important Clarification">
                        <p className="text-gray-300">
                            PraxisNow uses voice input for interview simulation. Your voice is captured, sent to OpenAI&apos;s Whisper API for transcription, and immediately discarded. We do not store audio recordings. Only the resulting text transcript is retained.
                        </p>
                    </SubSection>
                </Section>

                <Section title="3. How We Use Your Data">
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>Deliver AI interview simulations and generate evaluation reports</li>
                        <li>Improve product quality and user experience</li>
                        <li>Communicate with you regarding support and product updates</li>
                        <li>Detect and prevent fraud or misuse</li>
                    </ul>
                </Section>

                <Section title="4. Data Sharing &mdash; Third-Party Providers">
                    <p className="text-gray-300 mb-4">
                        We do not sell your personal data. We share data only with the following service providers, solely to deliver the PraxisNow service:
                    </p>

                    <div className="space-y-6">
                        <ThirdParty name="OpenAI (United States)">
                            Your interview transcripts &mdash; verbatim text answers &mdash; are sent to OpenAI for two purposes: (1) to power the AI interviewer via GPT-4o, and (2) to generate your evaluation report via o4-mini. This means your interview answers, which may include references to employers, colleagues, and workplace situations, are processed by OpenAI.{' '}
                            <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                                Privacy Policy
                            </a>
                        </ThirdParty>
                        <ThirdParty name="Supabase (United States)">
                            Supabase provides our database and authentication infrastructure. Your account data, session records, transcripts, and evaluation reports are stored on Supabase.{' '}
                            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                                Privacy Policy
                            </a>
                        </ThirdParty>
                        <ThirdParty name="Razorpay (India)">
                            Razorpay processes payments. Payment card data never touches PraxisNow servers.{' '}
                            <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                                Privacy Policy
                            </a>
                        </ThirdParty>
                        <ThirdParty name="Vercel (United States)">
                            Vercel hosts the PraxisNow application.{' '}
                            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                                Privacy Policy
                            </a>
                        </ThirdParty>
                    </div>
                </Section>

                <Section title="5. Legal Basis for Processing">
                    <ul className="list-disc list-inside space-y-1 text-gray-300 mb-3">
                        <li>Your consent &mdash; provided when you create an account and accept these terms</li>
                        <li>Legitimate interest &mdash; to operate, secure, and improve the platform</li>
                    </ul>
                    <p className="text-gray-300">
                        This aligns with the Digital Personal Data Protection Act, 2023 (India) and the General Data Protection Regulation (EU/UK).
                    </p>
                </Section>

                <Section title="6. Data Storage and Retention">
                    <p className="text-gray-300 mb-3">
                        Data is stored on Supabase infrastructure with encryption at rest and in transit.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300 mb-3">
                        <li>Session transcripts and evaluation reports: retained for 12 months from the session date, then deleted</li>
                        <li>Account data (name, email, session history): retained until you delete your account</li>
                        <li>Payment transaction records: retained for 7 years as required by Indian tax law (GST compliance)</li>
                    </ul>
                    <p className="text-gray-300">
                        You can request deletion of your account and associated data at any time by contacting{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                        . Self-serve account deletion will be available in the app.
                    </p>
                </Section>

                <Section title="7. Your Rights">
                    <p className="text-gray-300">
                        You have the right to: access your data, request correction, request deletion, and withdraw consent at any time. Contact{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                        . We will respond within 30 days.
                    </p>
                </Section>

                <Section title="8. International Data Transfers">
                    <p className="text-gray-300">
                        PraxisNow is based in India. Some service providers including OpenAI, Supabase, and Vercel are based in the United States. By using PraxisNow, you consent to your data being processed in the United States. Both OpenAI and Supabase maintain data processing agreements and industry-standard security certifications.
                    </p>
                </Section>

                <Section title="9. Security">
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>Encryption at rest and in transit for all stored data</li>
                        <li>Secure authentication via Google OAuth and Supabase Auth</li>
                        <li>Server-side verification of all payment transactions &mdash; card data never reaches our servers</li>
                        <li>Access controls restricting internal access to user data</li>
                    </ul>
                </Section>

                <Section title="10. Cookies and Analytics">
                    <p className="text-gray-300">
                        We may use basic analytics tools to understand how users interact with the platform and improve the product. Advanced tracking or advertising cookies are not currently used.
                    </p>
                </Section>

                <Section title="11. Children's Privacy">
                    <p className="text-gray-300">
                        PraxisNow is not intended for users under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account, contact{' '}
                        <a href="mailto:support@praxisnow.ai" className="text-purple-400 hover:text-purple-300 transition-colors">
                            support@praxisnow.ai
                        </a>
                        .
                    </p>
                </Section>

                <Section title="12. Changes to This Policy">
                    <p className="text-gray-300">
                        We may update this policy periodically. Changes will be reflected with a new &ldquo;Last Updated&rdquo; date. For material changes, we will notify users by email or by a notice within the app.
                    </p>
                </Section>

                <Section title="13. Contact Us">
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
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
                    <Link href="/ai-disclaimer" className="hover:text-gray-300 transition-colors">AI Disclaimer</Link>
                </div>
            </footer>

        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">{children}</div>
        </section>
    )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2 pl-4 border-l border-white/10">
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            <div className="text-gray-300 leading-relaxed">{children}</div>
        </div>
    )
}

function ThirdParty({ name, children }: { name: string; children: React.ReactNode }) {
    return (
        <div className="pl-4 border-l-2 border-purple-500/30 space-y-1">
            <p className="text-sm font-semibold text-gray-200">{name}</p>
            <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
        </div>
    )
}
