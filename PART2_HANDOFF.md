# PraxisNow — Part 2 Handoff

You are the architect and lead engineer for PraxisNow.
Read this entire document before writing a single line of code.
This is a comprehensive handoff from the Part 1 rebuild session.

---

## What Part 1 Accomplished

Part 1 simplified the interviewer system. The question family system
was completely removed and replaced with GPT generating questions
directly from calibration banks injected into each scenario's
system_prompt. The blocklist prevents repetition across sessions.

### What was deleted
- lib/question-families.ts
- lib/entry-families.ts
- lib/probes.ts
- lib/answer-upgrades.ts
- lib/scenarios.ts
- app/config/interview-prompts.ts
- scripts/seed-entry-families.ts
- scripts/seed-question-families.ts
- scripts/verify-entry-logic.ts
- tests/workstream1.test.ts

### What was rewritten
- app/api/session/start/route.ts — simplified to under 200 lines.
  No family selection, no custom scenarios, no replay, no dimension
  shuffle. Flow: auth → parallel session check → negotiation path →
  credit check → fetch scenario → tier check → deduct credit →
  insert session → insert TMAY Turn 0 → return session.

- app/api/interview/route.ts — simplified. No family hydration,
  no dimension state computation, no entry family checks, no replay
  detection. Flow: invariant checks → fetch session → fetch scenario
  → turn authority gate → fetch blocklist → build system prompt by
  injecting {{BLOCKLIST}} and {{TRANSCRIPT}} into scenario.system_prompt
  → call GPT-4o → validate response → atomic DB writes → fire-and-forget
  insert to user_question_history → return { message }.

### What was cleaned up
- app/dashboard/page.tsx — role selector tabs (PM / SDE / DS),
  2x2 scenario cards per role showing round_title and
  evaluation_dimensions joined with " · ", Start Interview button,
  30 min badge. Removed custom scenario builder card. Removed all
  references to dropped columns (clarity, structure, signal_noise,
  replay_of_session_id, progression_comparison, display_pic_url,
  negotiation_credits).

- app/simulator/[scenarioId]/page.tsx — removed all references to
  family_selections, dimension_order, level on scenario objects.

- app/api/evaluate/route.ts — removed custom_scenarios join from
  session fetch. Removed answer_upgrades, replay_comparison,
  progression_comparison from dbPayload update (these were top-level
  session columns that were dropped in Phase 1 migrations).

- app/api/pdf/generate/route.ts — removed custom_scenarios join
  from session fetch.

- lib/runtime-scenario.ts — removed selectQuestionFamilies(),
  selectEntryFamily(), AI_MANDATORY_ROLE_KEYS, INTERVIEW_SCENARIOS
  map, normalizeLevel(). Kept normalizeRole() and
  resolveRuntimeScenario().

- lib/grounding-check.ts — fixed validateAnswerUpgrades to match
  each upgrade to its own turn by question_context, and pass through
  upgrades when no turn match is found rather than rejecting them.

### Database changes (already applied to live DB)
Tables dropped:
- question_families
- user_family_usage
- custom_scenarios
- scenarios_prompt_backup_pre_variety
- users_pro_plus_backup

Columns dropped from sessions:
- evaluation, clarity, structure, recovery, signal_noise,
  confidence_score, key_insight, improvement_priorities,
  alternative_approaches, pattern_analysis, risk_projection,
  readiness_assessment, framework_contrast, family_selections,
  probe_selections, dimension_order, answer_upgrades,
  replay_comparison, progression_comparison

Columns dropped from scenarios:
- seeded_questions, level

Columns dropped from users:
- negotiation_credits, resume_url, display_pic_url

Columns added to scenarios:
- round (integer)
- round_title (text)
- system_prompt (text)

Columns added to sessions:
- round (integer)

user_question_history table:
- level column dropped
- round column added (integer)

### 12 scenarios seeded (IDs 1-12)
Role: Product Manager
- ID 1: Round 1 — Product Sense & Design
  Competencies: Product Sense & Design, Strategy & Business
- ID 2: Round 2 — Metrics & Analytical Thinking
  Competencies: Analytical & Metrics, Estimation
- ID 3: Round 3 — Execution & Leadership
  Competencies: Execution & Prioritization, Leadership & Behavioral,
  Technical Understanding
- ID 4: Round 4 — AI Product Strategy
  Competencies: AI Product Sense & Design, AI Metrics & Evaluation,
  AI Strategy & Ethics

Role: Software Development Engineer
- ID 5: Round 1 — System Design & Architecture
  Competencies: System Design, Object-Oriented Design
- ID 6: Round 2 — Algorithms & Problem Solving
  Competencies: Coding & Data Structures, Algorithms & Problem Solving
- ID 7: Round 3 — Engineering Execution & Leadership
  Competencies: Behavioral & Leadership, Operating Systems & Concurrency
- ID 8: Round 4 — AI Engineering
  Competencies: LLM Fundamentals, AI Systems & Infrastructure,
  Coding & Implementation

Role: Data Scientist
- ID 9: Round 1 — Problem Framing & Analytics
  Competencies: Statistics & Probability, Coding & Data Manipulation
- ID 10: Round 2 — ML Design & Evaluation
  Competencies: ML System Design, Product & Business Sense
- ID 11: Round 3 — Research Depth & Leadership
  Competencies: Behavioral & Research Depth
- ID 12: Round 4 — AI Research & Alignment
  Competencies: Deep Learning Theory, LLM Research, RL & Alignment

Each scenario's system_prompt contains:
- Full interviewer persona and instructions
- Calibration banks (50 questions per competency)
- {{BLOCKLIST}} placeholder — replaced at runtime with recent questions
- {{TRANSCRIPT}} placeholder — replaced at runtime with conversation history
- Instruction to never end early — only stop when user ends or timer hits 00:00

### What still works unchanged
- lib/evaluation/stage1-extract.ts
- lib/evaluation/stage2-evaluate.ts
- lib/evaluation/stage3-rewrite.ts
- lib/evaluation/stage4-rules.ts
- lib/pdfGenerator.ts
- lib/signalSynthesis.ts
- lib/replay-comparison.ts
- app/api/voice/stt/route.ts
- app/api/voice/tts/route.ts
- app/api/voice/opening/route.ts
- app/api/turns/answer/route.ts
- hooks/useBatchVoice.ts
- hooks/useWakeLock.ts
- app/results/[session_id]/page.tsx
- All auth, pricing, admin pages
- Razorpay payment routes

### Current branch
main — all Part 1 work is merged.
TypeScript: zero errors across entire codebase.

---

## What Part 2 Must Deliver

Part 2 rebuilds the evaluation pipeline. The goal is to produce
evaluation output that matches how MAANG interviewers actually
assess candidates — dimension-level scores with evidence, weighted
composites, and round-appropriate feedback.

### The Core Problem With Current Evaluation

The current pipeline (stages 1-4) applies a single generic behavioral
rubric to every session regardless of round type. This produces
wrong feedback for hypothetical rounds. For example, PM Round 1
(Product Sense & Design) asks hypothetical product questions — the
correct feedback is about problem framing, user segmentation, solution
breadth, and tradeoff reasoning. The current pipeline gives behavioral
feedback like "provide specific examples and metrics" which is
irrelevant to a hypothetical design question.

Additionally, evaluation currently produces a single hiring_signal
with no dimension-level breakdown. There is no scoring, no
per-competency feedback, and no way to track improvement over time.

### The MAANG Evaluation Model

Every interviewer independently scores the candidate on role-specific
dimensions using a 4-band system:

Band scores:
- Strong No Hire = 1
- Lean No Hire = 2
- Lean Hire = 3
- Strong Hire = 4

Each dimension has a weight. The weighted composite is computed
deterministically from the scores — not by GPT.

PM dimension weights:
- Problem Framing & Structure: 25%
- Product Intuition & User Empathy: 25%
- Analytical & Metrics Thinking: 20%
- Execution & Prioritization: 15%
- Communication & Leadership: 15%

SDE dimension weights:
- Problem Solving & Coding: 35%
- System Design: 30%
- Technical Communication: 15%
- Code Quality & Engineering Craft: 10%
- Behavioral & Ownership: 10%

DS dimension weights:
- Statistical & ML Foundations: 25%
- Modeling Judgment: 25%
- ML System Design: 25%
- Coding & Data Manipulation: 15%
- Business & Product Sense: 10%

AI Engineer dimension weights:
- LLM & Model Architecture Depth: 30%
- ML Systems & Production Thinking: 25%
- Implementation & Coding: 20%
- Research Awareness & Judgment: 15%
- AI Safety & Ethics Awareness: 10%

Hire band thresholds:
- Weighted composite >= 3.5: Strong Hire
- Weighted composite >= 3.0: Lean Hire
- Weighted composite >= 2.0: Lean No Hire
- Weighted composite < 2.0: Strong No Hire

### Round-to-Dimension Mapping

Each round tests a subset of the full role dimension set. Stage 2
must know which dimensions to score based on role + round.

PM Round 1 (Product Sense & Design):
- Problem Framing & Structure
- Product Intuition & User Empathy

PM Round 2 (Metrics & Analytical Thinking):
- Analytical & Metrics Thinking

PM Round 3 (Execution & Leadership):
- Execution & Prioritization
- Communication & Leadership

PM Round 4 (AI Product Strategy):
- Uses AI Engineer dimension weights for this round

SDE Round 1 (System Design & Architecture):
- System Design
- Technical Communication

SDE Round 2 (Algorithms & Problem Solving):
- Problem Solving & Coding
- Code Quality & Engineering Craft
- Technical Communication

SDE Round 3 (Engineering Execution & Leadership):
- Behavioral & Ownership
- Technical Communication

SDE Round 4 (AI Engineering):
- Uses AI Engineer dimension weights for this round

DS Round 1 (Problem Framing & Analytics):
- Statistical & ML Foundations
- Coding & Data Manipulation

DS Round 2 (ML Design & Evaluation):
- ML System Design
- Modeling Judgment
- Business & Product Sense

DS Round 3 (Research Depth & Leadership):
- Behavioral & Research Depth (maps to Communication & Leadership
  weight for scoring)

DS Round 4 (AI Research & Alignment):
- Uses AI Engineer dimension weights for this round

### Round-Appropriate Feedback Rules

Stage 2 must apply different evaluation criteria based on round type:

HYPOTHETICAL rounds (PM R1, PM R2, PM R4, SDE R1, SDE R2, SDE R4,
DS R1, DS R2, DS R4):
- Evaluate problem framing — did they clarify before solving?
- Evaluate solution breadth — did they consider multiple approaches?
- Evaluate tradeoff reasoning — did they name tradeoffs unprompted?
- Evaluate user/system thinking — did they think about edge cases?
- Do NOT penalize for lack of personal examples or metrics from
  past experience
- DO penalize for jumping to solution without framing the problem

BEHAVIORAL rounds (PM R3, SDE R3, DS R3):
- Evaluate ownership — do stories use "I" not "we"?
- Evaluate specificity — are outcomes measurable?
- Evaluate structure — is there clear situation/action/result?
- Evaluate intellectual honesty — do they acknowledge failure?
- DO penalize for vague stories without personal impact
- DO penalize for sanitized answers that avoid real failure

### New evaluation_data JSONB Structure

The evaluation object written to sessions.evaluation_data must
include these new fields alongside all existing fields:

dimension_scores: [
  {
    dimension: string,        // e.g. "Problem Framing & Structure"
    score: number,            // 1 | 2 | 3 | 4
    band: string,             // "Strong No Hire" | "Lean No Hire" |
                              // "Lean Hire" | "Strong Hire"
    weight: number,           // e.g. 0.25
    weighted_score: number,   // score * weight
    evidence: string,         // specific behavior or quote from transcript
    gap: string | null        // what was missing, if score < 4
  }
],
weighted_composite: number,   // sum of all weighted_scores
hire_band: string,            // derived from weighted_composite threshold

### Score History — New DB Column

Add a new column to sessions:
  ALTER TABLE sessions ADD COLUMN dimension_scores JSONB;

This stores the dimension_scores array separately from evaluation_data
for efficient querying by the dashboard trend chart.

### Results Screen Changes

The results screen must show:
1. Existing verdict section — keep as-is but replace hiring_signal
   with hire_band from dimension_scores
2. New scorecard section — one row per dimension showing:
   - Dimension name
   - Score bar (visual, 1-4)
   - Numeric score e.g. 3.2/4.0
   - Band label
   - Evidence snippet
3. Weighted composite prominently displayed e.g. 3.2/4.0
4. Existing "The One Thing" section — keep as-is
5. Answer Upgrades — keep as-is (will work once stage 3 is fixed)

### Dashboard Score History

On the dashboard, below the scenario cards, add a score history
section. For each round the user has completed at least once, show:
- Round title
- Sparkline or score list of weighted composites across sessions
  e.g. "2.8 → 3.1 → 3.4"
- Most recent score prominently

### Star Interviewer Threshold

Users who achieve weighted composite >= 3.5 across ALL 4 rounds
for their role are flagged as star interviewees. This threshold
maps to "Lean Hire on everything, Strong Hire on core dimensions."
Implementation of the star system (consulting marketplace) is
out of scope for Part 2 — just ensure the flag is computed and
stored on the user record.

### Answer Upgrades Fix

The current answer_upgrades flow:
1. Stage 3 runs but turn_diagnostics is null in evaluation_data
2. turn_diagnostics is produced by stage 2 but not written to
   evaluation_data in the evaluate route
3. Stage 3 reads from stage2.turn_diagnostics in memory so it
   works in the pipeline but the stored data is incomplete

Fix required in app/api/evaluate/route.ts:
- Add turn_diagnostics to the evaluation object that gets written
  to evaluation_data so it is persisted correctly

Fix required in lib/evaluation/stage3-rewrite.ts:
- Ensure the weakestTurns selection works correctly with the
  new dimension_scores output from stage 2

---

## Implementation Sequence for Part 2

### Phase A — Database migration (30 min)
1. Add dimension_scores JSONB column to sessions table
2. Add star_interviewer boolean column to users table
3. Regenerate lib/database.types.ts via Supabase CLI

### Phase B — Stage 2 rewrite (3 hours)
This is the core change. Rewrite lib/evaluation/stage2-evaluate.ts
to produce dimension-level scores using the MAANG rubrics.

The new stage 2 prompt must:
1. Receive role, round, round_title, and competencies as inputs
2. Know which dimensions to score based on role + round mapping
3. Apply round-appropriate feedback rules (hypothetical vs behavioral)
4. Score each dimension 1-4 with a specific evidence quote
5. Note the gap for any dimension scored below 4
6. Return structured JSON matching the new Stage2Output interface

The weighted composite must be computed deterministically in
TypeScript after GPT returns scores — not by GPT.

New Stage2Output interface:
{
  dimension_scores: DimensionScore[],
  weighted_composite: number,
  hire_band: string,
  hiring_signal: string,       // keep for backward compat
  hiring_confidence: number,   // keep for backward compat
  hireable_level: string,      // keep for backward compat
  distance_to_strong_hire: {
    gaps_blocking: number,
    primary_blocker: string
  },
  tmay_diagnostic: TellMeAboutYourselfDiagnostic | null,
  answer_level_diagnostics: TurnDiagnostic[],
  turn_diagnostics: TurnDiagnostic[],
  dominant_failure_pattern: string | null,
  top_strengths: Strength[],
  gaps: Gap[]
}

### Phase C — Evaluate route updates (1 hour)
1. Pass role, round, round_title, competencies to runStage2
2. Add dimension_scores and weighted_composite to evaluation object
3. Add turn_diagnostics to evaluation object (fixes answer upgrades)
4. Write dimension_scores to the new sessions.dimension_scores column
5. Compute star_interviewer flag and update users table if threshold met

### Phase D — Results screen update (2 hours)
Add the scorecard section to app/results/[session_id]/page.tsx.
Show dimension bars, numeric scores, band labels, evidence snippets,
and weighted composite. Keep all existing sections intact.

### Phase E — Dashboard score history (2 hours)
Add score history section to app/dashboard/page.tsx.
Query sessions by user_id, role, round where dimension_scores
is not null. Show trend per round.

### Phase F — PDF update (1 hour)
Update lib/pdfGenerator.ts to include the dimension scorecard
in the PDF output. Replace the current generic assessment section
with the scored dimensions and weighted composite.

### Phase G — End-to-end test
Test one complete session for each role across all 4 rounds.
Verify dimension scores are produced, stored, and displayed correctly.
Verify answer upgrades are populated.
Verify PDF includes scorecard.
Verify dashboard shows score history after multiple sessions.

---

## Critical Invariants — Never Break These

All invariants from Part 1 remain in force. Additional invariants
for Part 2:

1. Weighted composite is ALWAYS computed in TypeScript from dimension
   scores — never ask GPT to compute it. GPT returns raw scores 1-4,
   TypeScript does the math.

2. Stage 2 output schema must match exactly what the evaluate route
   reads. If the GPT prompt asks for dimension_scores but the model
   returns scores, the entire evaluation silently produces empty
   sections. Field names in the prompt schema must exactly match
   what route.ts reads.

3. Never modify stage1-extract.ts. Stage 1 is correct and stable.
   All changes are in stage 2 only.

4. Round-to-dimension mapping is authoritative. Do not let GPT
   decide which dimensions to score — pass the dimension list
   explicitly in the prompt.

5. Evidence must be a specific quote or behavior from the transcript.
   Generic evidence like "candidate showed good thinking" must be
   rejected. The prompt must enforce specificity.

6. Do NOT add new OpenAI API calls without explicit approval.
   All new fields must be derived from existing stage output or
   computed deterministically.

---

## Hard-Won Lessons From Part 1

1. Always check database.types.ts before adding fields to any
   Supabase insert or update payload. PGRST204 errors from missing
   columns are silent in production.

2. PostgREST rejects the entire query when a joined table does not
   exist — not just the join. Removing custom_scenarios from joins
   was required in 3 separate files.

3. The live DB schema and the TypeScript types must be in sync.
   After every migration, regenerate types via:
   npx supabase gen types typescript --project-id wlfseesoezrtviexpawn
   --schema public > lib/database.types.ts

4. Vercel preview environments can be pinned to old commits. Always
   check which commit a preview URL is actually serving before
   debugging.

5. Fire-and-forget inserts fail silently. The user_question_history
   insert was failing for months because the level column was being
   written but the round column did not exist. Always verify the
   table schema matches the insert payload.

6. GPT field name mismatches are silent and catastrophic. If stage 2
   returns answer_level_diagnostics but the route reads turn_diagnostics,
   nothing errors — the array is just empty. Test field names explicitly.

7. The evaluate route has export const maxDuration = 60 at the top.
   Never remove this. Without it, evaluation times out on Vercel Hobby
   after 10 seconds.

---

## Environment
- Branch: main (all Part 1 work merged)
- Supabase project ID: wlfseesoezrtviexpawn
- Vercel: praxis-now-staging.vercel.app (staging)
- Stack: Next.js App Router, Supabase, OpenAI GPT-4o, Razorpay, PDFKit

## Current State
- TypeScript: zero errors
- Build: passing
- Sessions: start, run, and complete correctly
- Evaluation: completes but produces generic feedback (Part 2 fixes this)
- PDF: generates and downloads correctly
- Blocklist: working — questions vary between sessions
- Answer Upgrades: empty — fixed in Part 2 Phase C
- Dashboard: role selector + 4 scenario cards per role working correctly
- Score history: not yet implemented — Part 2 Phase E

Read CLAUDE.md and this document in full before starting.
Start with Phase A.
