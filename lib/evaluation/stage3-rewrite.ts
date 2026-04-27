import OpenAI from 'openai';
import { Stage1Output } from './stage1-extract';
import { Stage2Output } from './stage2-evaluate';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnswerUpgrade {
    turn_index: number;
    question_context: string;
    weakness: string;
    original_verbatim: string;      // Copied from Stage 1 — the actual words
    upgraded_answer: string;        // Structural addition to original — no new facts
    pattern_name: string;           // The structural pattern added
}

const STAGE3_PROMPT = `You are a structural writing coach. You receive a candidate's verbatim interview answer and a diagnosis of what structural element was missing.

Your job: rewrite the answer by ADDING the missing structure to what the candidate actually said.

ABSOLUTE CONSTRAINTS:
1. The rewrite MUST contain the candidate's original phrasing. Minimum 3 word-for-word phrases from the original must appear in the rewrite.
2. ABSOLUTE CONSTRAINT 2 — HYPOTHETICAL ANSWERS ONLY:
For hypothetical answers (product design, system design, metrics,
strategy questions), you may NOT introduce specific company names,
proprietary data, or personal experiences not present in the original
answer. You may add structural elements, frameworks, and reasoning
patterns the candidate failed to demonstrate.

FOR BEHAVIORAL ANSWERS:
The opposite applies. A behavioral answer that lacks named context,
quantified outcomes, or specific situations MUST have those added in
the upgrade. Supply plausible specifics — a realistic product name,
a reasonable metric, a credible timeline — to show the candidate
exactly what level of detail a strong answer requires. The candidate
will use this as a model for the kind of specificity expected, not
as a script to memorise.
3. You may NOT change what happened — only how it is structured.
4. If the original answer has no content to work with (under 20 words), return null for upgraded_answer.

WHAT YOU ARE ALLOWED TO ADD (structural elements only):
- A sentence naming what the candidate did NOT know at the time ("What I wasn't certain of was...")
- A sentence naming the alternative they considered and ruled out ("We considered X but ruled it out because...")
- A sentence naming who pushed back and why ("The friction came from...")
- A closing sentence naming the transferable principle ("The pattern I've applied since is...")

pattern_name must be one of: "naming_uncertainty", "naming_ruled_out_alternative", "adding_stakeholder_perspective", "adding_outcome_with_scope", "adding_transferable_principle"

An upgrade is NOT a restatement or restructure of what the candidate said.
An upgrade must add what was concretely missing from the original answer.

For behavioral answers: if the original answer lacked a named product,
named company, named stakeholder, specific timeline, or quantified outcome —
the upgrade must supply plausible specifics that demonstrate what a strong
answer looks like. The candidate should be able to read the upgrade and
understand exactly what kind of detail they failed to include.

For hypothetical answers: if the original answer lacked a structured
approach, tradeoff reasoning, or solution comparison — the upgrade must
demonstrate that structure explicitly.

The upgrade must be meaningfully different from the original. If a reader
could mistake the upgrade for a light edit of the original answer, it is
not an upgrade — rewrite it.

The weakness field must name the specific thing that was absent — not a
vague description like "lacked depth" but the precise missing element:
"No named product or team context", "No quantified outcome",
"No alternative solution considered", "No tradeoff reasoning shown".

CRITICAL: The upgraded_answer field must NEVER reproduce the candidate's original answer verbatim.
It must be a substantively rewritten version that demonstrates the missing element identified
in the weakness field. If the original answer is strong in structure, the rewrite must add
the specific missing signal (e.g. statistical validity, explicit tradeoff comparison, guardrail
metrics) — not repeat what was already said. The rewrite should be 150-250 words maximum.

Return valid JSON only.
Format: { "upgrades": [ { turn_index, question_context, weakness, original_verbatim, upgraded_answer, pattern_name } ] }
upgraded_answer must be written in first person, spoken register — not essay style.`;

export async function runStage3(
    stage1: Stage1Output,
    stage2: Stage2Output,
    tier: string
): Promise<AnswerUpgrade[]> {
    const isExtended = tier === 'Pro' || tier === 'Pro+';
    if (!isExtended) return [];

    // Select the 3 turns with weakest signal for rewriting
    const weakestTurns = stage2.turn_diagnostics
        .filter(d => d.signal_strength !== 'strong' && stage1.turns.find(t => t.turn_index === d.turn_index)?.candidate_answer_verbatim)
        .sort((a, b) => {
            const order: Record<string, number> = { weak: 0, moderate: 1, strong: 2 };
            return (order[a.signal_strength] ?? 1) - (order[b.signal_strength] ?? 1);
        })
        .slice(0, 3);

    if (weakestTurns.length === 0) return [];

    const rewriteInputs = weakestTurns.map(d => {
        const turn = stage1.turns.find(t => t.turn_index === d.turn_index);
        // Use what_missed as the structural gap (matches TurnDiagnostic schema)
        const structuralGap = d.what_missed || d.fix_in_one_sentence || 'Missing structural element';
        return {
            turn_index: d.turn_index,
            question_context: d.question_context,
            original_verbatim: turn?.candidate_answer_verbatim || '',
            structural_gap: structuralGap,
        };
    }).filter(r => r.original_verbatim.length > 0);

    if (rewriteInputs.length === 0) return [];

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        messages: [
            { role: 'system', content: STAGE3_PROMPT },
            {
                role: 'user',
                content: `Rewrite these ${rewriteInputs.length} answers by adding the identified structural element only:\n\n${JSON.stringify(rewriteInputs, null, 2)}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
    });

    const rawContent = response.choices[0].message.content || ''
    let parsed: any
    try {
        parsed = JSON.parse(rawContent)
    } catch (parseErr: any) {
        console.error('[STAGE3] JSON parse failed:', {
            rawLength: rawContent?.length,
            preview: rawContent?.slice(-200),
            error: parseErr.message
        })
        throw new Error(
            `STAGE3_PARSE_FAILED: Response truncated at ${rawContent?.length} chars. ` +
            `Increase max_tokens if this persists.`
        )
    }
    return (parsed.upgrades || []) as AnswerUpgrade[];
}
