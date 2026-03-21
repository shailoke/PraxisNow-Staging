import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TurnExtraction {
    turn_index: number;
    question: string;
    question_type: 'tmay' | 'behavioral' | 'case' | 'hypothetical' | 'technical';
    candidate_answer_verbatim: string;  // EXACT words, no paraphrase
    core_claim: string;                  // The single main point they made
    answer_length_words: number;
    has_specific_example: boolean;
    has_metric_or_number: boolean;
    has_explicit_outcome: boolean;
}

export interface Stage1Output {
    turns: TurnExtraction[];
    total_answered: number;
    tmay_turn: TurnExtraction | null;
}

const STAGE1_PROMPT = `You are a transcript analyst. Your ONLY job is extraction — not evaluation, not coaching, not rewriting.

For each answered interview turn, extract exactly what the candidate said.

RULES:
- candidate_answer_verbatim: Copy the candidate's EXACT words. Do not paraphrase. Do not summarize. If the answer is long, copy the first 200 words verbatim.
- core_claim: One sentence maximum. The central point they made.
- has_specific_example: true only if they named a real project, company, or situation by name or clear reference.
- has_metric_or_number: true only if they stated a number, percentage, or measurable quantity.
- has_explicit_outcome: true only if they described what happened as a result of their action.
- question_type: "tmay" for "tell me about yourself", "behavioral" for experience-based, "case" for problem-solving, "hypothetical" for scenario-based, "technical" for technical content.

DO NOT evaluate quality. DO NOT suggest improvements. DO NOT indicate what was missing.
ONLY extract what is there.

Return valid JSON only. No markdown, no explanation outside the JSON.
Return: { "turns": [ { turn_index, question, question_type, candidate_answer_verbatim, core_claim, answer_length_words, has_specific_example, has_metric_or_number, has_explicit_outcome } ] }`;

export async function runStage1(
    turns: { turn_index: number; content: string; user_answer: string }[]
): Promise<Stage1Output> {
    const answeredTurns = turns.filter(t => t.user_answer?.trim());

    const turnsFormatted = answeredTurns.map(t => ({
        turn_index: t.turn_index,
        interviewer_question: t.content,
        candidate_answer: t.user_answer,
    }));

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,   // Near-deterministic — we want exact extraction
        messages: [
            { role: 'system', content: STAGE1_PROMPT },
            {
                role: 'user',
                content: `Extract from these ${answeredTurns.length} interview turns:\n\n${JSON.stringify(turnsFormatted, null, 2)}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    const turnExtractions: TurnExtraction[] = parsed.turns || [];

    return {
        turns: turnExtractions,
        total_answered: answeredTurns.length,
        tmay_turn: turnExtractions.find(t => t.question_type === 'tmay') || null,
    };
}
