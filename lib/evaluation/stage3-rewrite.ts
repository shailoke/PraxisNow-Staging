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
2. You may NOT introduce metrics, numbers, company names, outcomes, or experiences not present in the original answer.
3. You may NOT change what happened — only how it is structured.
4. If the original answer has no content to work with (under 20 words), return null for upgraded_answer.

WHAT YOU ARE ALLOWED TO ADD (structural elements only):
- A sentence naming what the candidate did NOT know at the time ("What I wasn't certain of was...")
- A sentence naming the alternative they considered and ruled out ("We considered X but ruled it out because...")
- A sentence naming who pushed back and why ("The friction came from...")
- A closing sentence naming the transferable principle ("The pattern I've applied since is...")

pattern_name must be one of: "naming_uncertainty", "naming_ruled_out_alternative", "adding_stakeholder_perspective", "adding_outcome_with_scope", "adding_transferable_principle"

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
            const order = { weak: 0, mixed: 1, strong: 2 };
            return order[a.signal_strength] - order[b.signal_strength];
        })
        .slice(0, 3);

    if (weakestTurns.length === 0) return [];

    const rewriteInputs = weakestTurns.map(d => {
        const turn = stage1.turns.find(t => t.turn_index === d.turn_index);
        // Use issues_detected[0] as the structural gap (matches AnswerLevelDiagnostic schema)
        const structuralGap = d.issues_detected[0] || d.interviewer_consequence || 'Missing structural element';
        return {
            turn_index: d.turn_index,
            question_context: d.question_label,
            original_verbatim: turn?.candidate_answer_verbatim || '',
            structural_gap: structuralGap,
        };
    }).filter(r => r.original_verbatim.length > 0);

    if (rewriteInputs.length === 0) return [];

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [
            { role: 'system', content: STAGE3_PROMPT },
            {
                role: 'user',
                content: `Rewrite these ${rewriteInputs.length} answers by adding the identified structural element only:\n\n${JSON.stringify(rewriteInputs, null, 2)}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return (parsed.upgrades || []) as AnswerUpgrade[];
}
