/**
 * GROUNDING CHECK
 *
 * Validates that a rewritten answer contains phrases from the original.
 * Prevents fabricated rewrites from reaching the PDF.
 *
 * A rewrite is grounded if at least 2 trigrams (3-word sequences) from
 * the original appear in the rewrite. This is a low bar — it ensures
 * the model used the actual answer as input, not its imagination.
 */

export function extractTrigrams(text: string): string[] {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2);  // Skip short filler words

    const trigrams: string[] = [];
    for (let i = 0; i < words.length - 2; i++) {
        trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    return trigrams;
}

export function isGrounded(
    originalAnswer: string,
    rewrite: string,
    minMatchCount: number = 2
): boolean {
    if (!originalAnswer || !rewrite) return false;
    // Very short answers can't produce enough trigrams — skip check
    if (originalAnswer.split(/\s+/).length < 8) return true;

    const originalTrigrams = new Set(extractTrigrams(originalAnswer));
    const rewriteTrigrams = extractTrigrams(rewrite);

    const matches = rewriteTrigrams.filter(t => originalTrigrams.has(t));
    return matches.length >= minMatchCount;
}

export function validateAnswerUpgrades(
    upgrades: any[],
    transcriptTurns: { user_answer?: string }[]
): { valid: any[]; flagged: any[] } {
    const valid: any[] = [];
    const flagged: any[] = [];

    // Use the longest answer as the grounding reference — the most likely source text
    const longestAnswer = transcriptTurns
        .map(t => t.user_answer || '')
        .sort((a, b) => b.length - a.length)[0] || '';

    for (const upgrade of upgrades) {
        // Stage 3 format uses upgraded_answer; legacy format uses what_to_change_next_time
        const rewrite = upgrade.upgraded_answer || upgrade.what_to_change_next_time || '';

        if (!rewrite || isGrounded(longestAnswer, rewrite)) {
            console.log('[GROUNDING_CHECK] Passed upgrade:', {
                question_context: upgrade.question_context
            });
            valid.push(upgrade);
        } else {
            const originalTrigrams = new Set(extractTrigrams(longestAnswer));
            const rewriteTrigrams = extractTrigrams(rewrite);
            const matches = rewriteTrigrams.filter(t => originalTrigrams.has(t));
            const flagReason = `trigram_match_count=${matches.length} (minimum=2)`;
            const matchedText = matches.slice(0, 3).join(' | ') || '(none)';

            console.log('[GROUNDING_CHECK] Rejected upgrade:', {
                question_context: upgrade.question_context,
                reason: flagReason,
                transcript_match_attempted: matchedText
            });
            console.warn('[GROUNDING_FAIL] Upgrade appears fabricated — no trigram overlap with candidate answers:', {
                rewrite: rewrite.substring(0, 80),
                original_preview: longestAnswer.substring(0, 80),
            });
            flagged.push({ ...upgrade, _grounding_failed: true });
        }
    }

    console.log('[GROUNDING_CHECK] Results:', {
        total: upgrades.length,
        valid: valid.length,
        flagged: flagged.length
    });

    return { valid, flagged };
}
