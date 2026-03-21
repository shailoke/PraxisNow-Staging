import OpenAI from 'openai'
import type { TurnExtraction } from '@/lib/evaluation/stage1-extract'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ReplayComparison {
    observed_changes: string[]
    unchanged_areas: string[]
    insufficient_evidence_note?: string
}

interface CompareSessionsParams {
    originalEvaluation: any  // Evaluation output from original session
    currentEvaluation: any   // Evaluation output from current (replay) session
    role: string
    level: string
}

export async function compareReplayAttempts(params: CompareSessionsParams): Promise<ReplayComparison | null> {
    const { originalEvaluation, currentEvaluation, role, level } = params

    if (!originalEvaluation || !currentEvaluation) return null;

    // Prefer comparing verbatim answer pairs (populated by Stage 1 extraction)
    // Falls back to summary comparison for pre-pipeline sessions
    const originalTurns: TurnExtraction[] | undefined = originalEvaluation.transcript_extracts;
    const currentTurns: TurnExtraction[] | undefined = currentEvaluation.transcript_extracts;

    if (originalTurns?.length && currentTurns?.length) {
        return compareByAnswerPairs(originalTurns, currentTurns, role, level);
    }

    return compareBySummaries(originalEvaluation, currentEvaluation, role, level);
}

async function compareByAnswerPairs(
    originalTurns: TurnExtraction[],
    currentTurns: TurnExtraction[],
    role: string,
    level: string
): Promise<ReplayComparison | null> {
    const matchedPairs: { original: TurnExtraction; current: TurnExtraction }[] = [];

    for (const origTurn of originalTurns) {
        const matchedCurrent = currentTurns.find(ct =>
            ct.question === origTurn.question ||
            ct.question_type === origTurn.question_type
        );
        if (matchedCurrent?.candidate_answer_verbatim && origTurn.candidate_answer_verbatim) {
            matchedPairs.push({ original: origTurn, current: matchedCurrent });
        }
    }

    if (matchedPairs.length < 2) return null;

    const pairsFormatted = matchedPairs.map(p => ({
        question: p.original.question,
        original_answer: p.original.candidate_answer_verbatim,
        replay_answer: p.current.candidate_answer_verbatim,
    }));

    const prompt = `You are comparing two attempts at the same interview questions by the same candidate.

For each matched question pair, identify ONLY observable changes in the answer structure.
Do not invent improvements. Do not assume intent. Compare only what is written.

Rules:
- observed_changes: Only include if the replay answer demonstrably adds something the original lacked (a metric, named uncertainty, named stakeholder, explicit outcome). Quote the new element verbatim.
- unchanged_areas: Patterns that appear identically in both attempts.
- Do NOT say "improved" unless you can quote the specific addition.

Return valid JSON only: { "observed_changes": string[], "unchanged_areas": string[] }`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.1,  // Near-deterministic: evidence-based, never inventive
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: JSON.stringify(pairsFormatted, null, 2) }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}')
        const comparison: ReplayComparison = {
            observed_changes: parsed.observed_changes || [],
            unchanged_areas: parsed.unchanged_areas || [],
        };

        if (comparison.observed_changes.length === 0 && comparison.unchanged_areas.length === 0) {
            return null;
        }

        return comparison;
    } catch (err) {
        console.error('Replay answer-pair comparison failed (non-critical):', err);
        return null;
    }
}

async function compareBySummaries(
    originalEvaluation: any,
    currentEvaluation: any,
    role: string,
    level: string
): Promise<ReplayComparison | null> {
    const prompt = `SYSTEM INSTRUCTION — REPLAY COMPARATIVE ANALYSIS

You are comparing two completed interview sessions by the SAME user:
- Session A (earlier): The original attempt
- Session B (replay): The current replay attempt

Your role is to identify observable changes, not to judge readiness.

CONTEXT
Role: ${role}
Level: ${level}

ORIGINAL SESSION (Session A):
${JSON.stringify(originalEvaluation, null, 2)}

CURRENT REPLAY SESSION (Session B):
${JSON.stringify(currentEvaluation, null, 2)}

HARD RULES
1. Compare only dimensions discussed in BOTH sessions.
2. Do NOT show rewritten answers.
3. No numeric scores. No hiring conclusions.
4. Improvement may be noted ONLY if Session B shows clearer structure, more concrete examples, more explicit ownership, or clearer articulation of trade-offs.
5. If no clear improvement is visible, say so. Silence is better than fabrication.

Return ONLY valid JSON:
{
  "observed_changes": ["<specific observable improvement>"],
  "unchanged_areas": ["<dimension that remained consistent>"],
  "insufficient_evidence_note": "<optional>"
}

Do NOT include markdown. Output MUST be valid JSON.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1  // Near-deterministic: comparisons must be evidence-based, never inventive
        })

        const content = response.choices[0].message.content || '{}'
        const parsed = JSON.parse(content)

        const comparison: ReplayComparison = {
            observed_changes: parsed.observed_changes || [],
            unchanged_areas: parsed.unchanged_areas || [],
            insufficient_evidence_note: parsed.insufficient_evidence_note
        }

        if (comparison.insufficient_evidence_note) {
            console.log('ℹ️ Replay comparison suppressed: insufficient evidence');
            return null;
        }

        if (comparison.observed_changes.length === 0 && comparison.unchanged_areas.length === 0) {
            console.log('ℹ️ Replay comparison suppressed: no observable changes or patterns');
            return null;
        }

        return comparison;

    } catch (err) {
        console.error('Replay comparison failed (non-critical):', err)
        return null;
    }
}
