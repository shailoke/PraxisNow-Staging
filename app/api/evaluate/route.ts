
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { Database } from '@/lib/database.types'
import { generateSessionPDF } from '@/lib/pdfGenerator'
import { runStage1 } from '@/lib/evaluation/stage1-extract'
import { runStage2 } from '@/lib/evaluation/stage2-evaluate'
import { runStage3 } from '@/lib/evaluation/stage3-rewrite'
import { runStage4 } from '@/lib/evaluation/stage4-rules'
import { validateAnswerUpgrades } from '@/lib/grounding-check'
import { synthesizePreparationSignals } from '@/lib/signalSynthesis'
import type { ReplayComparison } from '@/lib/replay-comparison'

// ── Progression Architecture — Interfaces ────────────────────────────────────

interface MomentumCard {
    strongest_signal: string;    // Single strongest thing from session. Max 6 words.
    one_fix: string;             // Single highest-leverage behavioral change. One sentence.
    progress_note: string | null; // Improvement note if prior session exists. Null otherwise.
}

// ── Shared helper: most recent prior completed session in same role/level ─────
// Used by both momentum_card (progress_note) and progression_comparison.
// Returns the full session row (with evaluation_data) or null.
async function getPriorSessionForRoleLevel(
    adminClient: SupabaseClient,
    userId: string,
    role: string,
    level: string,
    excludeSessionId: string
): Promise<any | null> {
    const { data, error } = await (adminClient
        .from('sessions')
        .select('id, created_at, evaluation_data, scenarios:scenario_id(role, level)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('evaluation_data', 'is', null)
        .neq('id', excludeSessionId)
        .order('created_at', { ascending: false })
        .limit(10) as any);

    if (error || !data) return null;

    // Filter in JS — PostgREST join-column filtering is unreliable across client versions
    const prior = (data as any[]).find((s: any) =>
        s.scenarios?.role === role && s.scenarios?.level === level
    );
    return prior ?? null;
}

export async function POST(req: NextRequest) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    try {
        const { session_id } = await req.json();

        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value, ...options }) } catch { }
                    },
                    remove(name: string, options: CookieOptions) {
                        try { cookieStore.set({ name, value: '', ...options }) } catch { }
                    },
                },
            }
        )

        // 1. Fetch session
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('*, scenarios:scenario_id(*), custom_scenarios:custom_scenario_id(*)')
            .eq('id', session_id)
            .single();

        if (sessionError || !sessionData) {
            throw new Error('Session not found');
        }

        const session = sessionData as any;

        // Hoist service-role client — reused throughout this entire request
        const adminServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminServiceKey);

        // 🛑 IDEMPOTENCY CHECK
        // If session is already completed, do NOT re-run AI.
        // Return existing data + Fresh Signed URL.
        if (session.status === 'completed' && session.evaluation_data) {
            console.log('Session already completed. Returning existing evaluation.');

            // Generate fresh signed URL if PDF exists
            let signedUrl = null;
            if (session.pdf_url) { // pdf_url now stores the PATH
                const { data: signedData } = await adminClient.storage
                    .from('reports')
                    .createSignedUrl(session.pdf_url, 3600); // 1 hour expiry
                signedUrl = signedData?.signedUrl;
            }

            // X4 fix: also return momentum_card from the persisted session record
            return NextResponse.json({
                ...session.evaluation_data,
                pdf_url: signedUrl,
                momentum_card: session.momentum_card ?? null,
            });
        }

        // 2. Fetch user tier (SERVER TRUTH)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('package_tier')
            .eq('id', session.user_id)
            .single();

        if (userError || !userData) {
            throw new Error('User not found');
        }

        const user = userData as { package_tier: string };

        // ... existing derived fields logic ...
        const baseScenario = session.scenarios;
        const customScenario = session.custom_scenarios;
        const role = baseScenario?.role || 'User';
        const level = baseScenario?.level || 'Standard';
        const interview_type = 'Behavioral Interview';
        const scenario_title = customScenario?.title || `${role} ${level} - ${baseScenario?.prompt?.substring(0, 30)}...`;

        let dimensions = (customScenario?.focus_dimensions && customScenario.focus_dimensions.length > 0)
            ? customScenario.focus_dimensions
            : baseScenario?.evaluation_dimensions;
        const role_specific_dimensions = Array.isArray(dimensions) ? dimensions.join('\n') : '';

        let context = baseScenario?.prompt || '';
        if (customScenario?.company_context) {
            context += `\n\nSpecific Company Context:\n${customScenario.company_context}`;
        }
        const full_scenario_description = `${scenario_title}\n\n${context}`;
        const prior_session_summaries = '';

        // DEPRECATED: Early pipeline check removed.
        // We now fetch and reconstruct the transcript first.

        // CANONICAL DEPTH CALCULATION (using interview_turns table)
        // Fetch canonical interviewer questions INCLUDING answered status and user content
        const { data: turns, error: turnsError } = await (supabase
            .from('interview_turns') as any)
            .select('*') // Select ALL columns to find the user answer field
            .eq('session_id', session_id)
            .order('turn_index', { ascending: true });

        if (turnsError) {
            console.error('Failed to fetch interview_turns:', turnsError);
            throw new Error('Failed to determine evaluation depth');
        }

        // AGGREGATION: Build transcript from interview_turns source of truth
        // User answers are stored in interview_turns (per requirements)
        // We look for common field names since schema is opaque
        let reconstructedTranscript = '';

        if (turns && turns.length > 0) {
            console.log('[TRANSCRIPT_DEBUG] interview_turn keys:', Object.keys(turns[0] as any));

            reconstructedTranscript = turns.map((turn: any) => {
                // CANONICAL: Read from user_answer only.
                // This field is written by /api/turns/answer before the turn is marked answered=true.
                // No fallback to legacy fields — ambiguous field-guessing produced silent empty transcripts.
                const userAnswer = (turn as any).user_answer || '';

                if (turn.answered && !userAnswer) {
                    console.error(
                        `[DATA_LOSS] Turn #${turn.turn_index} marked answered but user_answer is empty.`,
                        `Session: ${session_id}. Evaluation may be unreliable.`
                    );
                }

                let entry = `ASSISTANT: ${turn.content}`;
                if (turn.answered && userAnswer) {
                    entry += `\n\nUSER: ${userAnswer}`;
                }
                return entry;
            }).join('\n\n');
        }

        // PERSISTENCE: Write reconstructed transcript to sessions table BEFORE evaluation
        if (reconstructedTranscript) {
            const { error: updateError } = await supabase
                .from('sessions')
                .update({ transcript: reconstructedTranscript } as any)
                .eq('id', session_id);

            if (updateError) {
                console.error('Failed to persist transcript aggregation:', updateError);
                // We typically continue, but this is critical data
            } else {
                console.log('[TRANSCRIPT_FIX] Persisted aggregated transcript to session');
            }
        }

        // ===================================================================
        // CANONICAL SOURCE: interview_turns table (NOT transcript)
        // ===================================================================
        // DO NOT infer turns from transcript
        // DO NOT count ASSISTANT messages
        // USE interview_turns.answered as sole authoritative source
        // ===================================================================

        // HARD INVARIANT: Transcript must exist
        const effectiveTranscript = reconstructedTranscript || session.transcript || '';

        if (!effectiveTranscript || effectiveTranscript.trim().length === 0) {
            // Edge Case: 0 turns is possible if session started but no turns created? 
            // But usually we have at least greeting.
            // If turns exist but transcript is empty, that's a failure.
            if (turns && turns.length > 0) {
                console.error('❌ FATAL: Transcript empty despite existing turns');
                throw new Error('Measurement Invariant Failed: Session has turns but generated empty transcript');
            }
        }

        // UPDATE LOCAL VAR
        const full_transcript = effectiveTranscript;

        // DATA QUALITY GUARD: Abort if fewer than 50% of answered turns have user_answer content.
        // This prevents fabricated evaluations on sessions where answers were not captured.
        const answersWithContent = turns?.filter((t: any) => t.answered && (t as any).user_answer?.trim()).length || 0;
        const answeredTurns = turns?.filter((t: any) => t.answered === true).length || 0;

        if (answeredTurns > 0 && answersWithContent / answeredTurns < 0.5) {
            console.error(
                `[EVAL_ABORT] Only ${answersWithContent}/${answeredTurns} answered turns have user_answer content.`,
                `Fewer than 50% — aborting to prevent fabricated output.`
            );
            return NextResponse.json({
                evaluation_depth: 'insufficient',
                pdf_url: null,
                error: 'Insufficient answer content captured for reliable evaluation. Please reattempt the session.'
            });
        }

        // CANONICAL DEPTH COMPUTATION
        const totalTurns = turns?.length || 0;
        const durationMinutes = (session.duration_seconds || 0) / 60;


        // DEPTH CLASSIFICATION (thresholds unchanged)
        let evaluationDepth: 'full' | 'shallow' | 'insufficient' = 'full';

        if (answeredTurns === 0) {
            evaluationDepth = 'insufficient';  // No user speech at all
        } else if (answeredTurns < 2) {
            evaluationDepth = 'insufficient';  // < 2 answered turns
        } else if (answeredTurns < 4) {
            evaluationDepth = 'shallow';       // < 4 answered turns
        }
        // >= 4 answered turns → 'full' (default)

        // LOGGING: Single invariant debug log
        console.log('[DEPTH_DEBUG]', {
            session_id,
            total_turns: totalTurns,
            answered_turns: answeredTurns
        });




        if (evaluationDepth === 'insufficient') {
            // Insufficient data - no evaluation
            const noDataEval = {
                primary_failure_mode: null,
                communication_diagnostics: {
                    structure: null,
                    evidence_grounding: null,
                    verbal_noise: {
                        detected: null,
                        patterns: null
                    }
                },
                corrections: null,
                evaluation_data: null,
                pdf_url: null,
                evaluation_depth: 'insufficient',
                answer_upgrades: null
            };

            await (supabase.from('sessions') as any)
                .update({ ...noDataEval, status: 'completed' })
                .eq('id', session_id);

            return NextResponse.json(noDataEval);
        }

        if (evaluationDepth === 'shallow') {
            // Log shallow evaluation for monitoring
            console.log(`⚠️ Shallow evaluation: ${answeredTurns} answered turns, ${durationMinutes.toFixed(1)} minutes - will skip Answer Upgrades`);
        }


        const dimensionNames: string[] = Array.isArray(dimensions)
            ? dimensions.map((d: any) => (typeof d === 'string' ? d : d?.name || String(d)))
            : [];

        // ── Stage 1: Extract ──────────────────────────────────────────────────────────
        console.log('[EVAL_STAGE1] Starting extraction...');
        const stage1 = await runStage1(
            turns.map((t: any) => ({
                turn_index: t.turn_index,
                content: t.content,
                user_answer: (t as any).user_answer || '',
                dimension: t.dimension ?? null,
            }))
        );
        console.log(`[EVAL_STAGE1] Extracted ${stage1.turns.length} turns.`);

        // ── Stage 2: Evaluate ─────────────────────────────────────────────────────────
        console.log('[EVAL_STAGE2] Starting evaluation...');
        const stage2 = await runStage2(
            stage1,
            role,
            level,
            user.package_tier,
            dimensionNames
        );
        console.log(`[EVAL_STAGE2] Signal: ${stage2.hiring_signal}, Confidence: ${stage2.hiring_confidence}`);

        // ── Stage 3: Rewrite (Pro/Pro+ only, full depth only) ────────────────────────
        let answerUpgrades: any[] = [];
        if (evaluationDepth === 'full') {
            console.log('[EVAL_STAGE3] Generating grounded rewrites...');
            const rawUpgrades = await runStage3(stage1, stage2, user.package_tier);

            const turnsWithAnswers = turns.filter((t: any) => (t as any).user_answer?.trim());
            const { valid, flagged } = validateAnswerUpgrades(rawUpgrades, turnsWithAnswers);
            if (flagged.length > 0) {
                console.warn(`[EVAL_STAGE3] ${flagged.length} rewrites failed grounding check — excluded.`);
            }
            answerUpgrades = valid;
            console.log(`[EVAL_STAGE3] ${answerUpgrades.length} grounded upgrades produced.`);
        }

        // ── Stage 4: Personal Rules (Pro/Pro+, full depth only) ───────────────────────
        let personalRules: any[] = [];
        const isExtendedEval = user.package_tier === 'Pro' || user.package_tier === 'Pro+';
        if (isExtendedEval && evaluationDepth === 'full') {
            console.log('[EVAL_STAGE4] Generating session-specific rules...');
            personalRules = await runStage4(stage1, stage2);
            console.log(`[EVAL_STAGE4] ${personalRules.length} validated rules produced.`);
        }

        // ── Assemble evaluation object ────────────────────────────────────────────────
        const evaluation: any = {
            hiring_signal: stage2.hiring_signal,
            hiring_confidence: stage2.hiring_confidence,
            hireable_level: stage2.hireable_level,
            distance_to_strong_hire: stage2.distance_to_strong_hire,
            confidence_calibration: stage2.hiring_confidence >= 0.85 ? 'above_bar'
                : stage2.hiring_confidence >= 0.65 ? 'at_bar' : 'below_bar',

            tmay_analysis: stage2.tmay_diagnostic ? {
                critique: stage2.tmay_diagnostic.key_risk,
                rewrite: null,  // Stage 3 handles rewrites
            } : null,

            high_level_assessment: {
                seniority_observation: `${stage2.hireable_level}. ${stage2.distance_to_strong_hire.primary_blocker}`,
                strongest_signals: stage2.top_strengths.map((s: any) => s.skill).join(', '),
                barriers_to_next_level: stage2.distance_to_strong_hire.primary_blocker,
            },

            strengths: stage2.top_strengths.map((s: any) => ({
                skill: s.skill,
                observation: `Turn ${s.evidence_from_turn}: "${s.exact_quote_fragment}"`,
                why_it_matters: s.why_it_signals_seniority,
            })),
            areas_for_improvement: stage2.gaps,

            // Stage 3 — grounded rewrites only (no BUILD_PROMPT answer_upgrades)
            answer_upgrades: answerUpgrades,

            // Stage 4 — session-specific rules (Pro/Pro+ only)
            personal_answer_rules: personalRules.map((r: any) => r.rule_text),
            personal_answer_rules_detailed: personalRules,

            // For signalSynthesis.ts
            answer_level_diagnostics: stage2.answer_level_diagnostics,
            tell_me_about_yourself_diagnostic: stage2.tell_me_about_yourself_diagnostic,

            // Verbatim transcript for PDF Turn-by-Turn section
            transcript_extracts: stage1.turns.map(t => ({
                turn_index: t.turn_index,
                question: t.question,
                candidate_answer_verbatim: t.candidate_answer_verbatim,
            })),
        };

        // ── Signal Synthesis (Tasks 5) ─────────────────────────────────────────────
        try {
            const synthesized = synthesizePreparationSignals({
                evaluation: {
                    primary_failure_mode: stage2.gaps[0] ? {
                        label: stage2.gaps[0].gap_type || 'Structure',
                        diagnosis: stage2.gaps[0].limit,
                        why_it_hurt: stage2.gaps[0].why_it_matters,
                    } : null,
                    corrections: stage2.gaps.map(g => ({
                        issue: g.limit,
                        evidence_scope: 'session',
                        severity: g.impact_scope === 'blocks_hire' ? 'HIGH' as const
                            : g.impact_scope === 'blocks_next_level' ? 'MEDIUM' as const : 'LOW' as const,
                        interviewer_consequence: g.why_it_matters,
                        do_instead: g.fix_in_one_sentence,
                        rule_of_thumb: '',
                        illustrative_variant: null,
                    })),
                    communication_diagnostics: {
                        structure: stage2.tmay_diagnostic?.structure || null,
                        evidence_grounding: stage2.turn_diagnostics.some(d => d.signal_strength === 'weak')
                            ? 'Partial' : 'Strong',
                        verbal_noise: { detected: null, patterns: null },
                    },
                    evaluation_depth: evaluationDepth,
                    answer_level_diagnostics: stage2.answer_level_diagnostics,
                    tell_me_about_yourself_diagnostic: stage2.tell_me_about_yourself_diagnostic,
                },
                role,
                level,
                dimensions: dimensionNames,
            }, user.package_tier);

            evaluation.synthesis = synthesized;
            console.log(`[EVAL_SYNTHESIS] repeated_issues: ${synthesized.repeated_issues.length}`);
        } catch (synthErr) {
            console.error('[EVAL_SYNTHESIS] Signal synthesis failed (non-critical):', synthErr);
        }


        // 7. Replay Comparison (Conditional, PDF-only)
        // CONTRACT: Only generated if current (replay) session is full
        // Original session depth does NOT matter
        let replayComparison = null;

        if (session.replay_of_session_id && evaluationDepth === 'full') {
            try {
                console.log(`🔄 Comparing replay against original session ${session.replay_of_session_id}...`);

                // Fetch original session's evaluation
                const { data: originalSession, error: originalError } = await supabase
                    .from('sessions')
                    .select('evaluation_data')
                    .eq('id', session.replay_of_session_id)
                    .single();

                if (originalError || !originalSession) {
                    console.log('⚠️ Original session not found, skipping comparison');
                } else if (!(originalSession as any).evaluation_data) {
                    console.log('ℹ️ Original session has no evaluation data, skipping comparison');
                } else {
                    // CORRECTED: No depth check on original session
                    // Comparison uses only evidence that exists in both evaluations
                    const { compareReplayAttempts } = await import('@/lib/replay-comparison');

                    replayComparison = await compareReplayAttempts({
                        originalEvaluation: (originalSession as any).evaluation_data,
                        currentEvaluation: evaluation,
                        role,
                        level
                    });

                    if (replayComparison) {
                        console.log(`✅ Replay comparison generated: ${replayComparison.observed_changes.length} changes, ${replayComparison.unchanged_areas.length} unchanged`);
                    } else {
                        console.log('ℹ️ Replay comparison suppressed (insufficient evidence or no changes)');
                    }
                }
            } catch (err) {
                console.error('⚠️ Replay comparison failed (non-critical):', err);
                // Non-blocking: suppress on error
                replayComparison = null;
            }
        }

        // ── Prior session lookup (shared: momentum_card + progression_comparison) ──
        // Single DB call reused by both blocks below. Max 10 rows, filtered in JS.
        let priorSessionData: any | null = null;
        try {
            priorSessionData = await getPriorSessionForRoleLevel(
                adminClient,
                session.user_id,
                role,
                level,
                session_id
            );
        } catch (priorErr) {
            console.error('[PROGRESSION] Prior session query failed (non-critical):', priorErr);
        }

        // ── Change 1: Momentum Card derivation ───────────────────────────────────
        // Derived deterministically from stage2 output + prior session. No new AI calls.
        const signalRank: Record<string, number> = {
            STRONG_HIRE: 4, HIRE: 3, BORDERLINE: 2, NO_HIRE: 1
        };

        // strongest_signal: top strength skill, truncated to 6 words
        const rawSkill: string | undefined = stage2.top_strengths[0]?.skill;
        const strongestSignalRaw = rawSkill || dimensionNames[0] || 'Strong communication';
        const strongest_signal = strongestSignalRaw.split(' ').slice(0, 6).join(' ');

        // one_fix: gaps[0].fix_in_one_sentence → first sentence of primary_blocker → fallback
        let one_fix = 'Focus on adding measurable outcomes to your answers.';
        const rawFix: string | null = stage2.gaps[0]?.fix_in_one_sentence ?? null;
        const rawBlocker: string | null = stage2.distance_to_strong_hire?.primary_blocker ?? null;
        if (rawFix) {
            one_fix = rawFix;
        } else if (rawBlocker) {
            const firstSentence = rawBlocker.split('.')[0].trim();
            if (firstSentence) one_fix = firstSentence + '.';
        }

        // progress_note: compare hiring signals vs. most recent prior session
        let progress_note: string | null = null;
        if (priorSessionData?.evaluation_data?.hiring_signal) {
            const priorSignal: string = priorSessionData.evaluation_data.hiring_signal;
            const currentSignal: string = stage2.hiring_signal;
            const priorRank = signalRank[priorSignal] ?? 0;
            const currentRank = signalRank[currentSignal] ?? 0;
            if (currentRank > priorRank) {
                progress_note = `Your hiring signal improved from ${priorSignal} to ${currentSignal} since your last session.`;
            } else if (currentRank === priorRank) {
                progress_note = `You're holding your bar consistently. Focus on ${one_fix} to break through.`;
            } else {
                progress_note = `This session was tougher than your last. That's normal — use the feedback below.`;
            }
        }

        const momentumCard: MomentumCard = { strongest_signal, one_fix, progress_note };
        console.log('[MOMENTUM_CARD]', momentumCard);

        // ── Change 3: Progression Comparison (non-replay, full sessions only) ────
        // Reuses priorSessionData from the shared lookup above. No new AI call design —
        // compareReplayAttempts is existing logic already used by the replay block.
        // Guard: evaluationDepth === 'full' ensures we never run on shallow sessions.
        let progressionComparison: ReplayComparison | null = null;
        if (!session.replay_of_session_id && evaluationDepth === 'full') {
            try {
                if (priorSessionData?.evaluation_data) {
                    console.log(`📈 Running progression comparison against session ${priorSessionData.id}...`);
                    const { compareReplayAttempts } = await import('@/lib/replay-comparison');
                    progressionComparison = await compareReplayAttempts({
                        originalEvaluation: priorSessionData.evaluation_data,
                        currentEvaluation: evaluation,
                        role,
                        level,
                    });
                    if (progressionComparison) {
                        console.log(`✅ Progression comparison: ${progressionComparison.observed_changes.length} changes, ${progressionComparison.unchanged_areas.length} unchanged`);
                    } else {
                        console.log('ℹ️ Progression comparison suppressed (insufficient evidence or no changes)');
                    }
                }
            } catch (progressionErr) {
                console.error('⚠️ Progression comparison failed (non-critical):', progressionErr);
                progressionComparison = null;
            }
        }

        // 8. Generate PDF & Upload (SECURE) - After all analysis complete
        let pdfPath = null;
        let signedUrl = null;

        try {
            // Add answer_upgrades and replay_comparison to evaluation object for PDF
            // CONTRACT: replay_comparison lives inside evaluation (which becomes evaluation_data)
            const evaluationWithExtras = {
                ...evaluation,
                replay_comparison: replayComparison  // Nested inside evaluation_data, not top-level
            };

            // DEBUG: Log what we're about to send to PDF generator
            console.log('[DEBUG_PDF_INPUT_KEYS]', Object.keys(evaluationWithExtras));
            console.log('[DEBUG_PDF_INPUT_TIER]', user.package_tier);
            console.log('[DEBUG_PDF_ANSWER_DIAGNOSTICS_TYPE]', typeof evaluationWithExtras.answer_level_diagnostics);
            console.log('[DEBUG_PDF_TMAY_DIAGNOSTIC_TYPE]', typeof evaluationWithExtras.tell_me_about_yourself_diagnostic);
            console.log('[DEBUG_PDF_ANSWER_UPGRADES_COUNT]', evaluationWithExtras.answer_upgrades?.length || 'null');

            console.log('[DEBUG_BEFORE_PDF_GENERATION]');
            const pdfBuffer = await generateSessionPDF(
                evaluationWithExtras,
                {
                    role,
                    level,
                    scenario: scenario_title,
                    date: new Date().toLocaleDateString(),
                    duration: session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}m` : 'N/A',
                    session_id: session_id,
                    session_type: customScenario ? 'Custom Scenario' : 'Standard Interview'
                },
                user.package_tier
            );
            console.log('[DEBUG_AFTER_PDF_GENERATION_SUCCESS]');

            // adminClient is hoisted above — no re-creation needed here
            const sanitizedRole = role.replace(/[^a-zA-Z0-9]/g, '');
            const sanitizedLevel = level.replace(/[^a-zA-Z0-9]/g, '');
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `PraxisNow_${sanitizedRole}_${sanitizedLevel}_${session_id.toString().slice(0, 6)}_${dateStr}.pdf`;

            const { error: uploadError } = await adminClient.storage
                .from('reports')
                .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

            if (uploadError) throw new Error(uploadError.message);

            pdfPath = fileName;

            // Generate Signed URL for immediate response
            const { data: signedData } = await adminClient.storage
                .from('reports')
                .createSignedUrl(fileName, 3600);

            signedUrl = signedData?.signedUrl;

        } catch (pdfErr) {
            console.error('PDF Error', pdfErr);
            throw new Error('Failed to generate PDF report. Evaluation not saved.');
        }


        // BUG FIX: Only persist structured fields, not arbitrary evaluation keys
        // evaluation_data is the JSONB container for all evaluator output
        const dbPayload: any = {
            evaluation_data: evaluation,   // single source of truth
            pdf_url: pdfPath, // Store PATH
            status: 'completed',
            evaluation_depth: evaluationDepth,
            answer_upgrades: answerUpgrades,
            replay_comparison: replayComparison,
            momentum_card: momentumCard,
            progression_comparison: progressionComparison,
        };

        // DEBUG: Log what we're about to persist to DB
        console.log('[DEBUG_DB_PAYLOAD_KEYS]', Object.keys(dbPayload));
        console.log('[DEBUG_DB_EVALUATION_DATA_KEYS]', Object.keys(dbPayload.evaluation_data || {}));
        console.log('[DEBUG_DB_ANSWER_UPGRADES_TYPE]', typeof dbPayload.answer_upgrades);
        console.log('[DEBUG_DB_EVALUATION_DEPTH]', dbPayload.evaluation_depth);

        // 7. Persist
        const { error: updateError } = await (supabase.from('sessions') as any)
            .update(dbPayload)
            .eq('id', session_id);

        if (updateError) {
            console.error('❌ Supabase UPDATE failed', {
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                payloadKeys: Object.keys(dbPayload),
                session_id
            });
            throw new Error(updateError.message);
        }

        return NextResponse.json({ ...evaluation, pdf_url: signedUrl, momentum_card: momentumCard });

    } catch (error: unknown) {
        console.error('Error in evaluate endpoint:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
    }
}

function BUILD_PROMPT(params: {
    role: string,
    level: string,
    interview_type: string,
    scenario_title: string,
    role_specific_dimensions: string,
    package_tier: string,
    full_transcript: string,
    prior_session_summaries: string,
    evaluationDepth: 'full' | 'shallow' | 'insufficient'
}) {
    const isShallow = params.evaluationDepth === 'shallow';
    const isInsufficient = params.evaluationDepth === 'insufficient';
    const isStarter = params.package_tier === 'Starter';
    const isPro = params.package_tier === 'Pro';
    const isProPlus = params.package_tier === 'Pro+';

    return `PRAXISNOW — INTERVIEWER-CALIBRATED CORRECTIVE REPORT

You are an experienced FAANG-level ${params.role} ${params.level} interviewer.
Your job is to provide truthful, confidence-calibrated interview feedback.

GLOBAL PRINCIPLES (NON-NEGOTIABLE)

1. Do NOT force criticism if the candidate is strong.
2. Distinguish between fundamental gaps and polish-level improvements.
3. If the candidate is hireable at their target level, EXPLICITLY say so.
4. Feedback should feel like it came from a thoughtful human interviewer, not a checklist.

––––––––––––
STEP 1: DECIDE HIREABILITY FIRST
––––––––––––
You MUST make these decisions BEFORE generating any sections:

1. Overall Hiring Signal
   Enum: NO_HIRE | BORDERLINE | HIRE | STRONG_HIRE

2. Hireable Level
   Examples: "Mid-Level PM", "Senior PM", "Staff PM", "Principal PM"
   Be specific about what level they demonstrate.

3. Confidence Calibration
   Enum: below_bar | at_bar | above_bar
   This governs tone across all sections.

CRITICAL: These decisions feed into every section below.
If the candidate is HIRE or STRONG_HIRE, your tone must reflect confidence, not forced criticism.

––––––––––––
LOGICAL INVARIANTS (HARD RULES)
––––––––––––
1. If hiring_signal ∈ {HIRE, STRONG_HIRE}, then gap_type MUST NOT be 'fundamental'
   Rationale: A fundamental gap blocks hiring. This creates a logical contradiction.

2. TMAY may appear at most ONCE outside the TMAY section
   Rationale: Prevents TMAY-dominated reports and ensures other answers are represented.

3. If confidence_calibration = above_bar, High-Level Assessment MUST include at least one explicit affirmation of readiness or hireability
   Rationale: Prevents "technically correct but emotionally cold" reports.

––––––––––––
CONTEXT
––––––––––––
Role: ${params.role} ${params.level}
Scenario: ${params.scenario_title}
Dimensions: ${params.role_specific_dimensions}
Tier: ${params.package_tier}

Transcript:
${params.full_transcript}

––––––––––––
OUTPUT SCHEMA (STRICT JSON)
––––––––––––
Return a SINGLE valid JSON object with these EXACT sections.

{
  // STEP 1: UPSTREAM DECISIONS (MANDATORY)
  "hiring_signal": "NO_HIRE | BORDERLINE | HIRE | STRONG_HIRE",
  "hireable_level": "Specific level (e.g., Senior PM, Staff PM)",
  "confidence_calibration": "below_bar | at_bar | above_bar",

  // SECTION 1: TMAY ANALYSIS
  "tmay_analysis": {
    "critique": "2-3 sentences assessing Structure (Arc), Brevity, and Achievement Emphasis. Be direct.",
    ${isStarter ? '' : '"rewrite": "REWRITE the candidate\'s TMAY into a strong, ideal answer (60-90s). Use ONLY their content. Improve sequencing/impact. NO new facts."'}
  },

  // SECTION 2: HIGH-LEVEL ASSESSMENT
  "high_level_assessment": {
    "seniority_observation": "Clear statement of apparent seniority. If HIRE or STRONG_HIRE, state this plainly. If confidence_calibration = above_bar, MUST include explicit affirmation of readiness.",
    "strongest_signals": "What specifically makes them hireable? (Be evidence-based)",
    "barriers_to_next_level": "What is the ONE thing holding them back?${isProPlus ? ' Include explicit level ceiling if borderline (e.g., \'This is why Staff is borderline\').' : ''}"
  },

  // SECTION 3: STRENGTHS
  "strengths": [ // ${isStarter ? '3 ITEMS' : isPro ? '3-5 ITEMS' : '3-5 ITEMS'}
    {
      "skill": "Concrete skill (e.g., 'User-Centric Prioritization')",
      "observation": "What they actually did/said.",
      "why_it_matters": "Why this is a strong signal for this role."
    }
  ],

  // SECTION 4: AREAS FOR IMPROVEMENT
  "areas_for_improvement": [ // ${isStarter ? '3 ITEMS (no gap typing)' : '3 ITEMS (gap-typed)'}
    {
      "limit": "What is limiting performance? (e.g., 'Rambling Context')",
      ${isStarter ? '' : '"gap_type": "fundamental | role_level | polish", // INVARIANT: If hiring_signal ∈ {HIRE, STRONG_HIRE}, gap_type MUST NOT be \'fundamental\''}
      ${isStarter ? '' : '"impact_scope": "blocks_hire | blocks_next_level | polish_only", // Psychological clarity for rendering'}
      "why_it_matters": "Why this hurts confidence at this level.${isStarter ? '' : ' If polish-level, frame as \'to reach next level\' — not as a hiring risk.'}"${isProPlus ? ',\n      // Pro+ ONLY: Must include at least one failure mode under pressure' : ''}
    }
  ],

  // SECTION 5: ANSWER UPGRADES
  ${isStarter ? '// STARTER: No answer upgrades generated' : ''}
  "answer_upgrades": [${isStarter ? '' : ` // MANDATORY: MINIMUM 3 ITEMS (TMAY does NOT count toward this minimum)
    // Select the 3 weakest or most pivotal answers to upgrade.
    // TMAY RULES:
    //   - TMAY may appear HERE only if it is MATERIALLY WEAK
    //   - TMAY may appear at MOST ONCE outside the TMAY section
    //   - If TMAY appears here, still provide 3 OTHER upgrades
    {
      "question_context": "Context (e.g., 'Conflict Question', 'Product Prioritization'). If TMAY, use 'Tell Me About Yourself'.",
      "weakness": "What was missing (e.g., 'Missing concrete example', 'No quantified outcome', 'Ownership unclear')",
      "upgraded_answer": "REWRITE the answer into a stronger version using THEIR content and POV. Improve structure, clarity, and evidence. Write in natural, spoken interview style. The upgrade should sound like the candidate — just sharper."${isProPlus ? ',\n      // Pro+ ONLY: Include pressure-compressed version or interruption-resistant variant if relevant' : ''}
    }`}
  ]${isProPlus ? `,

  // PRO+ ONLY: PERSONAL ANSWER RULES
  "personal_answer_rules": [ // 3-5 custom rules for this candidate
    "Always lead with the decision",
    "Anchor impact claims in metrics",
    "State ownership explicitly"
  ]` : ''}
}

${isInsufficient ? `
SUPPRESSION: Insufficient content.
Still attempt to generate a report based on available turns if > 1.
If 0 turns, return strictly NULL for all fields.
` : ''}

${isStarter ? `
––––––––––––
TIER-SPECIFIC RULES: STARTER (AWARENESS & TRUTH)
––––––––––––
- TMAY: Critique only, NO rewrite
- Strengths: 3
- Improvements: 3 (no gap typing)
- Answer Upgrades: NONE
Focus: "I now clearly know where I stand — and it's real."
` : ''}

${isPro ? `
––––––––––––
TIER-SPECIFIC RULES: PRO (CORRECTION & SKILL REPAIR)
––––––––––––
- TMAY: Critique + Rewrite
- Strengths: 3-5
- Improvements: Gap-typed (Fundamental/Role-Level/Polish)
- Answer Upgrades: Minimum 3 (TMAY doesn't count)
Focus: "I see exactly how to fix this."
` : ''}

${isProPlus ? `
––––––––––––
TIER-SPECIFIC RULES: PRO+ (BEHAVIOR CHANGE & READINESS)
––––––––––––
- High-Level: Include explicit level ceiling if borderline
- Improvements: Must include failure modes under pressure
- Answer Upgrades: Include pressure-compressed or interruption-resistant variants
- Personal Answer Rules: 3-5 custom rules
Focus: "This changes my interview outcomes."
` : ''}

––––––––––––
TONE & VOICE (NON-NEGOTIABLE)
––––––––––––
1. ACTIVE & CORRECTIVE: Don't just diagnose. REWRITE and FIX.
2. DIRECT & SPECIFIC: "Your answer was too long (3m). Cut the backstory." (Good) vs "Structure could be tighter." (Bad/Banned)
3. INTERVIEWER PERSPECTIVE: Explain EXACTLY why a senior interviewer would pass or fail this.
4. NO HEDGING: Avoid "It seems like", "You might want to". Say "Do X."
5. CALIBRATE TO HIRING SIGNAL: If HIRE or STRONG_HIRE, don't invent weaknesses. Reflect confidence.

––––––––––––
ABSOLUTE NEGATIVE CONSTRAINTS
––––––––––––
1. NO ABSTRACT NOUNS ALONE: "Strategy", "Clarity", "Confidence", "Structure" are BANNED without specific behavioral descriptions.
2. NO PLATITUDES: "Good job", "Keep practicing" -> BANNED.
3. NO RUBRIC SPEAK: Don't sound like a grading algorithm. Sound like a hiring manager debriefing a colleague.
4. DO NOT TEACH FRAMEWORKS: Rewrite in their voice, don't give lessons.

VALIDATION:
- JSON only.
- DID YOU DECIDE HIRING_SIGNAL FIRST? (Required)
- DID YOU CALIBRATE TONE TO CONFIDENCE LEVEL? (Required)
${isStarter ? '' : '- DID YOU REWRITE THE TMAY? (Required for Pro/Pro+)'}
${isStarter ? '' : '- DID YOU PROVIDE 3 ANSWER UPGRADES (not counting TMAY)? (Required for Pro/Pro+)'}
- IS THE TONE DIRECT?
- NO GENERIC ADVICE.
`;
}