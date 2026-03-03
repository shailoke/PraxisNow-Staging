
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { Database } from '@/lib/database.types'
import { generateSessionPDF } from '@/lib/pdfGenerator'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
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

        // 🛑 IDEMPOTENCY CHECK
        // If session is already completed, do NOT re-run AI.
        // Return existing data + Fresh Signed URL.
        if (session.status === 'completed' && session.evaluation_data) {
            console.log('Session already completed. Returning existing evaluation.');

            // Generate fresh signed URL if PDF exists
            let signedUrl = null;
            if (session.pdf_url) { // pdf_url now stores the PATH
                const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                const adminClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    serviceKey
                );
                const { data: signedData } = await adminClient.storage
                    .from('reports')
                    .createSignedUrl(session.pdf_url, 3600); // 1 hour expiry
                signedUrl = signedData?.signedUrl;
            }

            return NextResponse.json({ ...session.evaluation_data, pdf_url: signedUrl });
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
            // Log keys to identify the correct field if debugging is needed
            const firstTurn = turns[0] as any;
            console.log('[TRANSCRIPT_DEBUG] interview_turn keys:', Object.keys(firstTurn));

            reconstructedTranscript = turns.map((turn: any) => {
                // Heuristic to find user answer field
                const userAnswer = turn.user_content || turn.user_audio_transcription || turn.answer_content || turn.user_response || '';

                // Format:
                // ASSISTANT: <question>
                // USER: <answer>
                let entry = `ASSISTANT: ${turn.content}`;
                if (turn.answered && userAnswer) {
                    entry += `\n\nUSER: ${userAnswer}`;
                } else if (turn.answered) {
                    // Fallback if marked answered but no text found (prevents silent failure of data extraction)
                    console.warn(`[TRANSCRIPT_WARN] Turn #${turn.turn_index} marked answered but empty content. Keys available: ${Object.keys(turn).join(', ')}`);
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

        // CANONICAL DEPTH COMPUTATION
        const totalTurns = turns?.length || 0;
        const answeredTurns = turns?.filter((t: any) => t.answered === true).length || 0;

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


        // 4. Build prompt
        const prompt = BUILD_PROMPT({
            role, level, interview_type, scenario_title: full_scenario_description,
            role_specific_dimensions, package_tier: user.package_tier,
            full_transcript, prior_session_summaries,
            evaluationDepth
        });

        // 4. Call OpenAI
        const result = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: "json_object" }
        });

        // 5. JSON Parsing
        let evaluation;
        try {
            evaluation = JSON.parse(result.choices[0].message.content || '{}');
        } catch (err) {
            console.error('JSON Parse Error', err);
            throw new Error('Invalid evaluation JSON');
        }

        // Normalize fields
        if (typeof evaluation.alternative_approaches === 'string') evaluation.alternative_approaches = [evaluation.alternative_approaches];


        // Note: Suppression is handled in the prompt itself

        // 6. Extract Answer Upgrades (Interviewer-Calibrated)
        // CONTRACT: The prompt generates "answer_upgrades" with { question_context, weakness, upgraded_answer }
        // We map these to the DB schema { issue, why_it_matters, what_to_change_next_time }
        let answerUpgrades = null;

        // Note: New schema generates this for everyone, but we only strictly persist/use it if present.
        // The Prompt ensures it's always generated.
        if (evaluation.answer_upgrades && Array.isArray(evaluation.answer_upgrades)) {
            console.log(`✅ Extracting ${evaluation.answer_upgrades.length} Answer Upgrades (New Schema)`);
            answerUpgrades = evaluation.answer_upgrades.map((u: any) => ({
                issue: `[${u.question_context}] ${u.weakness}`,
                why_it_matters: "Critical for demonstrating seniority and executive presence.", // Static fallback as per strict schema
                what_to_change_next_time: u.upgraded_answer
            }));
        } else if (evaluation.transformations) {
            // Fallback for transition period if legacy prompt somehow runs
            answerUpgrades = evaluation.transformations.map((t: any) => ({
                issue: `[${t.question_label}] ${t.original_summary}`,
                why_it_matters: "Optimized for interviewer signal and clarity.",
                what_to_change_next_time: t.cleaned_up_version
            }));
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

            // Use Service Role
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

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
            replay_comparison: replayComparison
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

        return NextResponse.json({ ...evaluation, pdf_url: signedUrl });

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
    const isStarter = params.package_tier === 'Starter' || params.package_tier === 'Free';
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