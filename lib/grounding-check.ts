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
    transcriptTurns: { user_answer?: string; question_label?: string; content?: string }[]
): { valid: any[]; flagged: any[] } {
    const valid: any[] = [];
    const flagged: any[] = [];

    for (const upgrade of upgrades) {
        const rewrite = upgrade.upgraded_answer || upgrade.what_to_change_next_time || '';

        const matchedTurn = transcriptTurns.find(t => {
            const label = t.question_label || t.content || '';
            return upgrade.question_context &&
                label.toLowerCase().includes(upgrade.question_context.toLowerCase().slice(0, 30));
        });

        const sourceAnswer = matchedTurn?.user_answer || '';

        // If no turn matched, we cannot verify grounding — pass through
        if (!rewrite || !matchedTurn || isGrounded(sourceAnswer, rewrite)) {
            valid.push(upgrade);
        } else {
            console.warn('[GROUNDING_FAIL] Upgrade failed trigram check:', {
                question_context: upgrade.question_context,
                matched_turn: !!matchedTurn,
                rewrite: rewrite.substring(0, 80),
                source_preview: sourceAnswer.substring(0, 80),
            });
            flagged.push({ ...upgrade, _grounding_failed: true });
        }
    }

    return { valid, flagged };
}
