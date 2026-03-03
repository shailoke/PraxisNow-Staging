
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { X, MessageSquare, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    sessionId?: string | null;
}

const ISSUE_TYPES = [
    "Interview didn't respond",
    "Evaluation/PDF missing",
    "Audio not working",
    "Billing/session issue",
    "Something else"
];

export default function SupportModal({ isOpen, onClose, userId, sessionId }: SupportModalProps) {
    const [issueType, setIssueType] = useState(ISSUE_TYPES[0])
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const browserInfo = `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`;

            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    session_id: sessionId,
                    issue_type: issueType,
                    description,
                    browser_info: browserInfo
                })
            });

            if (!res.ok) throw new Error('Failed to submit');

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setDescription('');
                setIssueType(ISSUE_TYPES[0]);
            }, 2000);

        } catch (error) {
            console.error(error);
            alert('Failed to send report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        Report an Issue
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Message Sent!</h4>
                            <p className="text-gray-400">Thanks for letting us know.<br />We'll look into it ASAP.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Issue Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">What went wrong?</label>
                                <select
                                    value={issueType}
                                    onChange={(e) => setIssueType(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none"
                                >
                                    {ISSUE_TYPES.map(type => (
                                        <option key={type} value={type} className="bg-[#1a1a24] text-white">
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Details (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what happened..."
                                    rows={4}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none hover:bg-black/30 transition-colors"
                                />
                            </div>

                            {/* Trust Builder (Small) */}
                            <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                                <p className="text-xs text-purple-200/60 leading-relaxed text-center">
                                    Praxis is built by a small team. If something breaks, we want to hear about it and fix it fast.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Sending...
                                    </>
                                ) : 'Send Report'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
