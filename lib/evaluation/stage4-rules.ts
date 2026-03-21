import OpenAI from 'openai';
import { Stage1Output } from './stage1-extract';
import { Stage2Output } from './stage2-evaluate';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PersonalRule {
    rule_text: string;
    derived_from_turn: number;
    quoted_phrase: string;       // 3–6 words verbatim from that turn
    behaviour_observed: string;  // What they did in that turn
    in_practice: string;         // One-sentence action for next time
}

const STAGE4_PROMPT = `You generate personal interview rules for a specific candidate based on patterns observed in their session.

HARD REQUIREMENTS for each rule:
1. derived_from_turn: Must be a real turn index from the session data provided.
2. quoted_phrase: Must be 3–6 words taken verbatim from that turn's answer. If you cannot quote it, you cannot write the rule.
3. behaviour_observed: What they specifically did in that turn — not a general pattern.
4. rule_text: Under 100 characters. Must not apply to every candidate universally. Test: would this rule be false for a different candidate in a different session? If not, it is too generic. Reject it.
5. in_practice: One sentence. Starts with a verb. Describes a concrete action for their next session.

FORBIDDEN:
- "Always lead with the decision" — applies to everyone, no session reference
- "Anchor impact claims in metrics" — generic blog advice
- "State ownership explicitly" — no turn reference, applies universally
- Any rule without a turn number and a direct quote

Generate 3–5 rules. Fewer specific rules are better than more generic ones.
Return valid JSON only: { "rules": [ { rule_text, derived_from_turn, quoted_phrase, behaviour_observed, in_practice } ] }`;

export async function runStage4(
    stage1: Stage1Output,
    stage2: Stage2Output
): Promise<PersonalRule[]> {
    if (stage2.turn_diagnostics.length === 0) return [];

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
            { role: 'system', content: STAGE4_PROMPT },
            {
                role: 'user',
                content: `Session data:

Dominant failure pattern: ${stage2.dominant_failure_pattern || 'none identified'}

Turn diagnostics:
${JSON.stringify(stage2.turn_diagnostics, null, 2)}

Extracted answers (for quoting):
${JSON.stringify(stage1.turns.map(t => ({
                    turn_index: t.turn_index,
                    verbatim_preview: t.candidate_answer_verbatim?.substring(0, 150)
                })), null, 2)}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    const rules: PersonalRule[] = parsed.rules || [];

    // Validate — reject rules without turn references or quotes
    return rules.filter(r =>
        r.derived_from_turn !== undefined &&
        r.quoted_phrase?.trim().length > 0 &&
        r.rule_text?.length < 120
    );
}
