/**
 * CurrentBarCard — Progression Architecture, Change 2
 *
 * Displays the user's current assessed performance level and the one-line
 * gap to the next level. Visible on the Practice tab between sessions.
 * Updates after every completed evaluation.
 *
 * Design: dark theme — bg-[#0a0a0f], white text, purple accents, Tailwind only.
 */

export interface CurrentBarCardProps {
    hireable_level: string;   // e.g. "Mid-level PM"
    hiring_signal: string;    // e.g. "HIRE"
    primary_blocker: string | null;  // e.g. "Connect decisions to business outcomes"
    role: string;             // e.g. "Product Manager"
    session_date: string;     // e.g. "Mar 21"
}

const signalBorderClass: Record<string, string> = {
    STRONG_HIRE: 'border-l-green-500',
    HIRE:        'border-l-purple-500',
    BORDERLINE:  'border-l-yellow-500',
    NO_HIRE:     'border-l-red-500/40',
};

export default function CurrentBarCard({
    hireable_level,
    hiring_signal,
    primary_blocker,
    role,
    session_date,
}: CurrentBarCardProps) {
    const borderColor = signalBorderClass[hiring_signal] ?? 'border-l-purple-500';

    return (
        <div
            className={`bg-black/30 border border-white/10 border-l-4 ${borderColor} rounded-2xl p-6 mb-6`}
        >
            <p className="text-xs uppercase tracking-widest text-gray-400">
                YOUR CURRENT BAR
            </p>

            <h3 className="text-2xl font-bold text-white mt-1">
                {hireable_level}
            </h3>

            {primary_blocker && (
                <p className="text-sm text-gray-300 mt-2">
                    Gap to next level: {primary_blocker}
                </p>
            )}

            <p className="text-xs text-gray-500 mt-4 text-right">
                Based on session {session_date}
            </p>
        </div>
    );
}
