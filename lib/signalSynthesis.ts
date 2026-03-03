/**
 * Preparation Signal Synthesis Layer
 * 
 * Sits between evaluation output and PDF rendering.
 * Ranks evaluation findings by interviewer signal impact and translates
 * evaluator language into preparation-focused signals.
 * 
 * SCOPE RULES:
 * - Ranks existing evaluation fields (does not add intelligence)
 * - Selects and reorders corrections deterministically
 * - Translates evaluator language → interviewer intent language
 * - Does NOT modify evaluation logic or invent content
 */

// ========================================================================
// TYPE DEFINITIONS
// ========================================================================

export interface Correction {
    issue: string;
    evidence_scope: string; // NEW: Where pattern appeared
    severity: 'HIGH' | 'MEDIUM' | 'LOW'; // NEW: Interviewer impact
    interviewer_consequence: string; // NEW: Explicit reaction
    do_instead: string;
    rule_of_thumb: string;
    illustrative_variant: string | null; // NEW: 60-90s structural example (HIGH/MEDIUM only)
}

export interface PrimaryFailureMode {
    label: string;
    diagnosis: string;
    why_it_hurt: string;
}

export interface CommunicationDiagnostics {
    structure: string | null;
    evidence_grounding: string | null;
    verbal_noise: {
        detected: boolean | null;
        patterns: string[] | null;
    };
}

export interface AnswerLevelDiagnostic {
    turn_index: number;
    question_type: 'tell_me_about_yourself' | 'behavioral' | 'case' | 'technical' | 'leadership';
    question_label: string; // NEW: Human-readable question label
    signal_strength: 'strong' | 'mixed' | 'weak';
    issues_detected: string[];
    severity: 'HIGH' | 'MEDIUM' | 'LOW'; // NEW: Derived from highest-severity pattern
    impact_on_interviewer: string;
    interviewer_consequence: string; // NEW: Explicit interviewer reaction
}

export interface TellMeAboutYourselfDiagnostic {
    length_assessment: 'too_short' | 'optimal' | 'too_long';
    structure: 'clear' | 'meandering' | 'unclear';
    filler_language_detected: boolean;
    key_risk: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW'; // NEW: Almost always HIGH unless explicitly strong
    interviewer_consequence: string; // NEW: First impression consequence
    illustrative_variant: string | null; // NEW: 60-90s structural example (HIGH/MEDIUM only)
}

export interface SignalSynthesisInput {
    evaluation: {
        primary_failure_mode: PrimaryFailureMode | null;
        corrections: Correction[] | null;
        communication_diagnostics: CommunicationDiagnostics;
        evaluation_depth: 'full' | 'shallow' | 'insufficient';
        // NEW: Per-answer diagnostics (Pro/Pro+ only)
        answer_level_diagnostics?: AnswerLevelDiagnostic[] | null;
        tell_me_about_yourself_diagnostic?: TellMeAboutYourselfDiagnostic | null;
    };
    role: string;
    level: string;
    dimensions: string[];
}

export interface SignalSynthesisOutput {
    interviewer_intent_bullets: string[];     // 3–5 items for "What this interview was testing"
    primary_preparation_gap: string;          // 1 sentence, highest-impact gap
    secondary_preparation_gaps: string[];     // 1–2 items max
    prioritized_corrections: Correction[];    // Ordered by impact, highest first
    // NEW: Per-answer synthesis outputs
    repeated_issues: string[];                // Issues that appear across multiple answers
    tmay_first_impression_risk: string | null; // TMAY-specific risk if present
    tmay_diagnostic: TellMeAboutYourselfDiagnostic | null; // Full TMAY diagnostic for PDF (Pro/Pro+)
    high_impact_answer_observations: AnswerLevelDiagnostic[]; // Top 2-3 for Pro, more for Pro+
}

// ========================================================================
// RANKING LOGIC (ORDINAL, NON-NUMERIC)
// ========================================================================

/**
 * Assigns a tier to a correction based on its content and alignment with
 * the primary failure mode.
 * 
 * Tier 1: Aligned with primary_failure_mode
 * Tier 2: Strategic / evidence signal gaps
 * Tier 3: Communication clarity issues
 * Tier 4: Cosmetic hygiene
 */
function assignCorrectionTier(
    correction: Correction,
    primaryFailureMode: PrimaryFailureMode | null
): number {
    const issue = correction.issue.toLowerCase();
    const primaryLabel = primaryFailureMode?.label?.toLowerCase() || '';

    // Tier 1: Aligned with primary failure mode
    if (primaryFailureMode && primaryLabel !== 'none' && primaryLabel !== 'null') {
        // Check if correction issue relates to the primary failure mode category
        if (
            (primaryLabel.includes('evidence') && issue.includes('metric')) ||
            (primaryLabel.includes('evidence') && issue.includes('outcome')) ||
            (primaryLabel.includes('evidence') && issue.includes('specific')) ||
            (primaryLabel.includes('structure') && issue.includes('structure')) ||
            (primaryLabel.includes('structure') && issue.includes('context')) ||
            (primaryLabel.includes('structure') && issue.includes('action')) ||
            (primaryLabel.includes('signal') && issue.includes('signal')) ||
            (primaryLabel.includes('decision') && issue.includes('decision')) ||
            (primaryLabel.includes('decision') && issue.includes('criteria'))
        ) {
            return 1;
        }
    }

    // Tier 2: Strategic / evidence signal gaps
    if (
        issue.includes('metric') ||
        issue.includes('outcome') ||
        issue.includes('measurable') ||
        issue.includes('specific') ||
        issue.includes('criteria') ||
        issue.includes('decision') ||
        issue.includes('tradeoff') ||
        issue.includes('impact') ||
        issue.includes('scope')
    ) {
        return 2;
    }

    // Tier 3: Communication clarity issues
    if (
        issue.includes('structure') ||
        issue.includes('clarity') ||
        issue.includes('verbose') ||
        issue.includes('hedging') ||
        issue.includes('filler') ||
        issue.includes('unclear') ||
        issue.includes('rambling')
    ) {
        return 3;
    }

    // Tier 4: Cosmetic hygiene
    return 4;
}

/**
 * Ranks corrections by interviewer signal impact using ordinal tiers.
 * Within each tier, maintains original order from evaluation.
 */
function rankCorrections(
    corrections: Correction[] | null,
    primaryFailureMode: PrimaryFailureMode | null
): Correction[] {
    if (!corrections || corrections.length === 0) {
        return [];
    }

    // Assign tier to each correction
    const tieredCorrections = corrections.map((correction, index) => ({
        correction,
        tier: assignCorrectionTier(correction, primaryFailureMode),
        originalIndex: index
    }));

    // Sort by tier (ascending), then by original index (stable sort)
    tieredCorrections.sort((a, b) => {
        if (a.tier !== b.tier) {
            return a.tier - b.tier;
        }
        return a.originalIndex - b.originalIndex;
    });

    return tieredCorrections.map(tc => tc.correction);
}

// ========================================================================
// INTERVIEWER INTENT TRANSLATION
// ========================================================================

/**
 * Translates evaluation dimensions into interviewer capability signals.
 * Avoids filler verbs ("navigate", "handle", "manage").
 */
function translateDimensionToIntent(dimension: string): string {
    let clean = dimension.trim();

    // Remove role/level prefixes if present
    clean = clean.replace(/^for\s+(\w+\s*)+:\s*/i, '');

    const lower = clean.toLowerCase();

    // Strategic dimensions
    if (lower.includes('priorit')) {
        return 'Evidence that you can evaluate competing priorities when data is incomplete';
    }
    if (lower.includes('strategy') || lower.includes('strategic')) {
        return 'Your ability to think beyond immediate execution and consider long-term implications';
    }

    // Technical dimensions
    if (lower.includes('technical') && lower.includes('decision')) {
        return 'Your ability to articulate technical tradeoffs with clarity';
    }
    if (lower.includes('system') || lower.includes('architecture')) {
        return 'Whether you can reason about systems with incomplete information';
    }

    // Leadership dimensions
    if (lower.includes('leadership') || lower.includes('influence')) {
        return 'Whether you can deliver results through others without direct authority';
    }

    // Stakeholder/communication dimensions
    if (lower.includes('stakeholder') || lower.includes('alignment')) {
        return 'Whether you can align diverse stakeholders on a single decision';
    }
    if (lower.includes('communication') && lower.includes('complex')) {
        return 'Your ability to make complex decisions understandable to non-experts';
    }

    // Impact dimensions
    if (lower.includes('impact') || lower.includes('outcome')) {
        return 'Evidence of measurable impact in your past decisions';
    }

    // Ambiguity/problem-solving dimensions
    if (lower.includes('ambiguity') || lower.includes('unclear')) {
        return 'Your approach to problems where the solution is not obvious';
    }

    // Generic transformation: convert to capability signal
    // Remove common prefixes
    clean = clean.replace(/^(how you|your ability to|capacity for|whether you)\s+/i, '');

    // If it starts with a verb, convert to noun phrase
    if (/^(navigate|handle|manage|demonstrate|show|exhibit)\s+/i.test(clean)) {
        clean = clean.replace(/^(navigate|handle|manage|demonstrate|show|exhibit)\s+/i, '');
        return `Your ability to ${clean.toLowerCase()}`;
    }

    // Otherwise, prefix with capability language
    return `Evidence that you can ${clean.toLowerCase()}`;
}

/**
 * Generates 3-5 interviewer intent bullets from evaluation dimensions.
 */
function generateInterviewerIntentBullets(dimensions: string[]): string[] {
    if (!dimensions || dimensions.length === 0) {
        return [
            'Your ability to structure answers with clear context, actions, and outcomes',
            'Evidence of measurable impact in your decisions',
            'Whether you can articulate tradeoffs when facing constraints'
        ];
    }

    const bullets = dimensions.slice(0, 5).map(translateDimensionToIntent);

    // Ensure we have at least 3 bullets
    if (bullets.length < 3) {
        bullets.push('Your ability to provide concrete examples rather than hypotheticals');
    }

    return bullets;
}

// ========================================================================
// PREPARATION GAP IDENTIFICATION
// ========================================================================

/**
 * Identifies the primary preparation gap based on prioritized corrections
 * and primary failure mode.
 * 
 * SHALLOW DEPTH RULE: If evaluation_depth is shallow, do NOT emit a gap
 * stronger than what evidence supports, even if primary_failure_mode exists.
 */
function identifyPrimaryPreparationGap(
    prioritizedCorrections: Correction[],
    primaryFailureMode: PrimaryFailureMode | null,
    evaluationDepth: 'full' | 'shallow' | 'insufficient'
): string {
    // Shallow depth: limit confidence
    if (evaluationDepth === 'shallow') {
        if (prioritizedCorrections.length > 0) {
            return `Based on limited evidence: ${prioritizedCorrections[0].issue.toLowerCase()}`;
        }
        return 'Based on limited evidence: insufficient data for confident gap identification';
    }

    // Full depth: use highest-priority correction or primary failure mode
    if (prioritizedCorrections.length > 0) {
        return prioritizedCorrections[0].issue;
    }

    if (primaryFailureMode && primaryFailureMode.diagnosis) {
        return primaryFailureMode.diagnosis;
    }

    return 'No significant preparation gap identified from this session';
}

/**
 * Identifies 1-2 secondary preparation gaps.
 * 
 * SHALLOW DEPTH RULE: Limit to 1 item maximum and prefix with confidence limiter.
 */
function identifySecondaryPreparationGaps(
    prioritizedCorrections: Correction[],
    evaluationDepth: 'full' | 'shallow' | 'insufficient'
): string[] {
    const maxGaps = evaluationDepth === 'shallow' ? 1 : 2;

    if (prioritizedCorrections.length <= 1) {
        return [];
    }

    const gaps = prioritizedCorrections.slice(1, 1 + maxGaps).map(c => c.issue);

    // Prefix with confidence limiter for shallow depth
    if (evaluationDepth === 'shallow') {
        return gaps.map(gap => `Based on limited evidence: ${gap.toLowerCase()}`);
    }

    return gaps;
}

// ========================================================================
// PER-ANSWER DIAGNOSTIC SYNTHESIS (NEW)
// ========================================================================

/**
 * Detects issues that appear repeatedly across multiple answers.
 * This promotes dominant failure patterns for prioritization.
 */
function detectRepeatedIssues(
    answerDiagnostics: AnswerLevelDiagnostic[] | null
): string[] {
    if (!answerDiagnostics || answerDiagnostics.length === 0) {
        return [];
    }

    // Collect all issues across all answers
    const issueFrequency: Record<string, number> = {};

    answerDiagnostics.forEach(diagnostic => {
        diagnostic.issues_detected.forEach(issue => {
            // Normalize issue for matching (lowercase, trim)
            const normalized = issue.toLowerCase().trim();

            // Group similar issues by keywords
            let matchedKey: string | null = null;

            // Check if this issue is similar to an existing one
            for (const existingKey in issueFrequency) {
                if (normalized.includes(existingKey.split(' ')[0]) || existingKey.includes(normalized.split(' ')[0])) {
                    matchedKey = existingKey;
                    break;
                }
            }

            if (matchedKey) {
                issueFrequency[matchedKey]++;
            } else {
                issueFrequency[normalized] = 1;
            }
        });
    });

    // Filter to issues that appear in 2+ answers
    const repeated = Object.entries(issueFrequency)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]) // Sort by frequency, descending
        .slice(0, 3) // Top 3 most repeated
        .map(([issue, count]) => {
            // Capitalize first letter for display
            const capitalized = issue.charAt(0).toUpperCase() + issue.slice(1);
            return `${capitalized} (observed in ${count} answers)`;
        });

    return repeated;
}

/**
 * Extracts TMAY-specific first impression risk.
 * Returns null if TMAY diagnostic is not present.
 */
function extractTMAYFirstImpressionRisk(
    tmayDiagnostic: TellMeAboutYourselfDiagnostic | null
): string | null {
    if (!tmayDiagnostic) {
        return null;
    }

    // Prioritize key_risk if it's substantive
    if (tmayDiagnostic.key_risk && tmayDiagnostic.key_risk.length > 10) {
        return tmayDiagnostic.key_risk;
    }

    // Otherwise, synthesize from other fields
    const risks: string[] = [];

    if (tmayDiagnostic.length_assessment === 'too_long') {
        risks.push('Answer length dilutes early signal');
    } else if (tmayDiagnostic.length_assessment === 'too_short') {
        risks.push('Answer lacks sufficient context for interviewer confidence');
    }

    if (tmayDiagnostic.structure === 'meandering' || tmayDiagnostic.structure === 'unclear') {
        risks.push('Structure makes it difficult for interviewer to extract relevance');
    }

    if (tmayDiagnostic.filler_language_detected) {
        risks.push('Filler language weakens first impression confidence');
    }

    return risks.length > 0 ? risks[0] : null;
}

/**
 * Selects high-impact answer observations for PDF rendering.
 * Pro: Top 2-3 observations
 * Pro+: Top 5 observations (or all if fewer)
 */
function selectHighImpactAnswerObservations(
    answerDiagnostics: AnswerLevelDiagnostic[] | null,
    tier: string
): AnswerLevelDiagnostic[] {
    if (!answerDiagnostics || answerDiagnostics.length === 0) {
        return [];
    }

    // Prioritize weak signal strength first, then mixed
    const prioritized = [...answerDiagnostics].sort((a, b) => {
        const signalOrder = { 'weak': 0, 'mixed': 1, 'strong': 2 };
        const aOrder = signalOrder[a.signal_strength];
        const bOrder = signalOrder[b.signal_strength];

        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        // If same signal strength, prioritize by number of issues detected
        return b.issues_detected.length - a.issues_detected.length;
    });

    // Determine how many to return based on tier
    const maxObservations = tier === 'Pro+' ? 5 : 3;
    return prioritized.slice(0, maxObservations);
}

// ========================================================================
// MAIN SYNTHESIS FUNCTION
// ========================================================================

/**
 * Synthesizes preparation-focused signals from evaluation data.
 * 
 * This is the ONLY public API of this module.
 * 
 * EXTENDED in Phase 1: Now includes per-answer diagnostic synthesis for Pro/Pro+
 */
export function synthesizePreparationSignals(
    input: SignalSynthesisInput,
    tier: string = 'Starter' // NEW: tier parameter for answer observation filtering
): SignalSynthesisOutput {
    const { evaluation, role, level, dimensions } = input;

    // Rank corrections by interviewer signal impact (ordinal, non-numeric)
    const prioritizedCorrections = rankCorrections(
        evaluation.corrections,
        evaluation.primary_failure_mode
    );

    // Translate dimensions to interviewer intent
    const interviewer_intent_bullets = generateInterviewerIntentBullets(dimensions);

    // Identify preparation gaps with depth-based confidence limiting
    const primary_preparation_gap = identifyPrimaryPreparationGap(
        prioritizedCorrections,
        evaluation.primary_failure_mode,
        evaluation.evaluation_depth
    );

    const secondary_preparation_gaps = identifySecondaryPreparationGaps(
        prioritizedCorrections,
        evaluation.evaluation_depth
    );

    // NEW: Per-answer diagnostic synthesis
    const repeated_issues = detectRepeatedIssues(
        evaluation.answer_level_diagnostics || null
    );

    const tmay_first_impression_risk = extractTMAYFirstImpressionRisk(
        evaluation.tell_me_about_yourself_diagnostic || null
    );

    const high_impact_answer_observations = selectHighImpactAnswerObservations(
        evaluation.answer_level_diagnostics || null,
        'Starter' // Default to Starter if not provided
    );

    return {
        interviewer_intent_bullets,
        primary_preparation_gap,
        secondary_preparation_gaps,
        prioritized_corrections: prioritizedCorrections,
        // NEW: Per-answer synthesis outputs
        repeated_issues,
        tmay_first_impression_risk,
        high_impact_answer_observations
    };
}
