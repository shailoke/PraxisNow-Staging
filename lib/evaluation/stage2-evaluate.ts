import OpenAI from 'openai';
import { Stage1Output, TurnExtraction } from './stage1-extract';
import type { AnswerLevelDiagnostic, TellMeAboutYourselfDiagnostic } from '@/lib/signalSynthesis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * TurnDiagnostic maps directly to AnswerLevelDiagnostic from signalSynthesis.ts.
 * Field names and types are intentionally identical to avoid mismatch bugs.
 *
 * Verified against signalSynthesis.ts interface (2026-03-21):
 *   turn_index: number
 *   question_type: 'tell_me_about_yourself' | 'behavioral' | 'case' | 'technical' | 'leadership'
 *   question_label: string
 *   signal_strength: 'strong' | 'mixed' | 'weak'
 *   issues_detected: string[]
 *   severity: 'HIGH' | 'MEDIUM' | 'LOW'
 *   impact_on_interviewer: string
 *   interviewer_consequence: string
 */
export type TurnDiagnostic = AnswerLevelDiagnostic;

export interface Stage2Output {
    hiring_signal: 'NO_HIRE' | 'BORDERLINE' | 'HIRE' | 'STRONG_HIRE';
    hiring_confidence: number;           // 0.0–1.0
    hireable_level: string;
    distance_to_strong_hire: {
        gaps_blocking: number;
        primary_blocker: string;
    };
    tmay_diagnostic: TellMeAboutYourselfDiagnostic | null;
    // answer_level_diagnostics maps to AnswerLevelDiagnostic[] for signalSynthesis.ts
    answer_level_diagnostics: TurnDiagnostic[];
    tell_me_about_yourself_diagnostic: TellMeAboutYourselfDiagnostic | null;
    dominant_failure_pattern: string | null;
    top_strengths: {
        skill: string;
        evidence_from_turn: number;
        exact_quote_fragment: string;
        why_it_signals_seniority: string;
    }[];
    gaps: {
        limit: string;
        gap_type: 'fundamental' | 'role_level' | 'polish';
        impact_scope: 'blocks_hire' | 'blocks_next_level' | 'polish_only';
        why_it_matters: string;
        fix_in_one_sentence: string;
    }[];
    // Alias for backward compat with the synthesis wiring
    turn_diagnostics: TurnDiagnostic[];
}

function buildStage2Prompt(role: string, level: string, tier: string): string {
    const isExtended = tier === 'Pro' || tier === 'Pro+';
    return `You are a ${role} ${level} interviewer conducting a post-session calibration.

You have received structured extraction of the candidate's exact answers (from a prior analysis pass). Every assessment you make MUST reference the specific turn index and quote from that extraction.

REQUIRED TOP-LEVEL OUTPUT FIELDS (exact names, all mandatory):
- hiring_signal: "NO_HIRE" | "BORDERLINE" | "HIRE" | "STRONG_HIRE"
- hiring_confidence: number 0.0–1.0
- hireable_level: string (e.g. "Senior Product Manager")
- distance_to_strong_hire: { gaps_blocking: number, primary_blocker: string }
- top_strengths: array of { skill, evidence_from_turn, exact_quote_fragment, why_it_signals_seniority }
- gaps: array of { limit, gap_type, impact_scope, why_it_matters, fix_in_one_sentence }
- dominant_failure_pattern: string | null
- answer_level_diagnostics: array (see FIELD TYPES below)
- tell_me_about_yourself_diagnostic: object | null

RULES:
- top_strengths[].exact_quote_fragment: Must be 4–8 words taken verbatim from the Stage 1 extraction. If you cannot quote it, do not claim the strength.
- answer_level_diagnostics[].issues_detected: Array of specific structural absences — not "they should have been more specific" but "the answer named the decision but not the uncertainty that preceded it."
- dominant_failure_pattern: Only populate if the same structural gap appears in 2 or more turns. Otherwise null.
- hiring_confidence: 0.5 = borderline, 0.7 = solid hire, 0.9 = strong hire. Be calibrated — do not default to 0.7.
- distance_to_strong_hire.primary_blocker: One sentence naming the single specific behaviour change that would move this to STRONG_HIRE.

FIELD TYPES (exact match required for downstream synthesis):
- top_strengths[].skill: string (skill name)
- top_strengths[].evidence_from_turn: number (turn index)
- top_strengths[].exact_quote_fragment: string (4–8 verbatim words)
- top_strengths[].why_it_signals_seniority: string
- gaps[].limit: string
- gaps[].gap_type: "fundamental" | "role_level" | "polish"
- gaps[].impact_scope: "blocks_hire" | "blocks_next_level" | "polish_only"
- gaps[].why_it_matters: string
- gaps[].fix_in_one_sentence: string
- answer_level_diagnostics[].question_type: "tell_me_about_yourself" | "behavioral" | "case" | "technical" | "leadership"
- answer_level_diagnostics[].signal_strength: "strong" | "mixed" | "weak"
- answer_level_diagnostics[].severity: "HIGH" | "MEDIUM" | "LOW"
- answer_level_diagnostics[].issues_detected: string[] (array of specific issue strings)
- answer_level_diagnostics[].impact_on_interviewer: string
- answer_level_diagnostics[].interviewer_consequence: string
- answer_level_diagnostics[].question_label: string (human-readable question label)
- tell_me_about_yourself_diagnostic.question_type: must use "tell_me_about_yourself" (not "tmay")

INVARIANTS (from eval-logic.ts):
- If hiring_signal is HIRE or STRONG_HIRE, no gap may have gap_type = 'fundamental'.
- If hiring_confidence >= 0.85, at least one strength must explicitly affirm readiness.

Return valid JSON only. Use EXACTLY the field names listed above — no aliases, no camelCase variants.${isExtended ? '\nInclude all fields. Generate 3–5 gaps typed by severity.' : '\nStarter tier: 3 strengths, 3 gaps with gap_type, no issues_detected depth needed.'}`;
}

export async function runStage2(
    stage1: Stage1Output,
    role: string,
    level: string,
    tier: string,
    evaluationDimensions: string[]
): Promise<Stage2Output> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
            { role: 'system', content: buildStage2Prompt(role, level, tier) },
            {
                role: 'user',
                content: `Role: ${role} ${level}
Evaluation dimensions: ${evaluationDimensions.join(', ')}
Tier: ${tier}

Extracted candidate answers:
${JSON.stringify(stage1, null, 2)}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
    });

    const rawContent = response.choices[0].message.content || ''
    let raw: Stage2Output
    try {
        raw = JSON.parse(rawContent) as Stage2Output
    } catch (parseErr: any) {
        console.error('[STAGE2] JSON parse failed:', {
            rawLength: rawContent?.length,
            preview: rawContent?.slice(-200),
            error: parseErr.message
        })
        throw new Error(
            `STAGE2_PARSE_FAILED: Response truncated at ${rawContent?.length} chars. ` +
            `Increase max_tokens if this persists.`
        )
    }

    // Normalize: alias turn_diagnostics to answer_level_diagnostics for Stage 3 compatibility
    if (!raw.turn_diagnostics && raw.answer_level_diagnostics) {
        raw.turn_diagnostics = raw.answer_level_diagnostics;
    } else if (!raw.answer_level_diagnostics && raw.turn_diagnostics) {
        raw.answer_level_diagnostics = raw.turn_diagnostics;
    }
    raw.answer_level_diagnostics = raw.answer_level_diagnostics || [];
    raw.turn_diagnostics = raw.turn_diagnostics || [];

    // Ensure tell_me_about_yourself_diagnostic is copied from tmay_diagnostic if GPT uses that key
    if (!raw.tell_me_about_yourself_diagnostic && raw.tmay_diagnostic) {
        raw.tell_me_about_yourself_diagnostic = raw.tmay_diagnostic;
    }

    return raw;
}
