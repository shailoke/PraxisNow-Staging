# PraxisNow — Claude Code Context

## What This App Does
PraxisNow is an AI interview simulation platform that replicates high-stakes, high-pressure interviews
to enable professionals to prepare for real-life interviews. It uses a GPT-4o-powered interviewer
to conduct realistic behavioral and technical interviews, followed by a deeply structured evaluation
pipeline that generates a PDF coaching report.

Built for: Product Managers, Project Managers, Software Development Engineers, Marketers, Data Scientists,
and fresh graduates applying for these roles.

---

## Stack
- **Frontend/Backend:** Next.js App Router (TypeScript)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **AI:** OpenAI GPT-4o (interviewer + evaluator), Whisper (STT), TTS-1 (voice synthesis)
- **Payments:** Razorpay (INR, session credit packs)
- **File Storage:** Supabase Storage (signed URLs for PDF reports)
- **Deployment:** Vercel

---

## Tiers & Packages
Two active tiers (Pro+ was merged into Pro):
- **Free** — No access, must purchase a plan
- **Starter** — 3 sessions per pack (₹599), awareness-focused evaluation
- **Pro** — 5 sessions per pack (₹899), full skill-repair evaluation with answer upgrades, salary negotiation simulation, AI Fluency round (Round 4)
- **Pro+** — Legacy SKU only; maps to Pro tier for backward compatibility. `pro_plus` enum still exists in TypeScript types during migration cleanup.

Payment SKUs in `app/api/razorpay/verify/route.ts`:
- `starter` → Starter tier, 3 sessions
- `pro` → Pro tier, 5 sessions
- `pro_plus` → Legacy SKU → Pro tier, 7 sessions

---

## Voice Architecture (Current — Batch Pipeline)

The voice layer uses `hooks/useBatchVoice.ts` — a drop-in replacement for the legacy `useRealtimeVoice.ts`.
**No WebRTC, no DataChannel, no OpenAI Realtime API.**

### Turn flow
```
User speaks → MediaRecorder (250ms chunks) → blob collected on stop
  → POST blob → /api/voice/stt (Whisper)        → TRANSCRIBING state
  → POST transcript → /api/turns/answer          (write user_answer before answered=true)
  → POST → /api/interview (GPT-4o, non-streaming) → THINKING state
  → POST text → /api/voice/tts (TTS-1, 'onyx')   → ASSISTANT_SPEAKING state
  → AudioContext.decodeAudioData → source.start() → onended callback
  → reset state → startRecording()               → WAITING_FOR_USER state
```

### Voice API routes
| Route | Purpose |
|-------|---------|
| `POST /api/voice/stt` | Whisper-1 transcription. Accepts `multipart/form-data` with `audio` (Blob) + `session_id`. Returns `{ transcript }`. |
| `POST /api/voice/tts` | TTS-1 synthesis. Accepts `{ text, voice? }`. Returns `audio/mpeg` stream. Runs on Edge runtime to avoid Vercel 30s timeout. Voice defaults to `'onyx'`. |
| `POST /api/voice/opening` | Fetches Turn 0 content from `interview_turns` for initial TMAY playback. Returns `{ content }`. |

### InterviewState machine
`'ASSISTANT_SPEAKING' | 'WAITING_FOR_USER' | 'READY_FOR_NEXT' | 'SESSION_ENDING' | 'TRANSCRIBING' | 'THINKING'`

- `ASSISTANT_SPEAKING` → set before `speakText()` call
- `WAITING_FOR_USER` → set in `source.onended` callback after TTS finishes; mic recording starts here
- `TRANSCRIBING` → set after blob collected, before STT call
- `THINKING` → set after STT, before `/api/interview` call

### Critical voice invariants
- `isStartingRef` guard prevents double `startSession()` calls
- 5KB blob guard in `askNextQuestion()` rejects near-empty recordings
- All post-turn side effects (`assistantTurnCount++`, `startRecording()`) live in `source.onended` — never before
- **Do NOT call `setEvalResult` before `router.push`** in `handleEnd()` for standard interviews
- "Ask Next Question" button gated on `interviewState === 'WAITING_FOR_USER'`, NOT `!isInterviewerSpeaking`

### Known latency issue
14–16 second gap between user finishing answer and interviewer speaking. Breakdown:
1. STT (Whisper): ~2s
2. `/api/turns/answer` write: ~1s
3. `/api/interview` (GPT-4o): ~8–10s
4. TTS-1: ~2s
Primary bottleneck is GPT-4o response time; reducing system prompt size is the correct fix.

---

## Critical Invariants — Never Break These

### 1. TMAY is Always Turn 0, Pre-Seeded
- "Tell me about yourself." is inserted into `interview_turns` at `turn_index: 0` during session creation (`app/api/session/start/route.ts`)
- The interview API (`app/api/interview/route.ts`) **must never generate TMAY** — it throws if `messages.length === 0`

### 2. Turn Authority — AI Never Speaks Without User Input
- The interview API validates that GPT-4o did not hallucinate a candidate response
- AI questions are only written to DB **after** the previous turn is marked `answered = true`
- DB writes are atomic: mark previous turn answered + insert new AI question in one transaction

### 3. Anti-Convergence Blocklist
- Recent questions from past sessions are passed to GPT-4o as a blocklist to prevent repetition
- Blocklist is scoped by `user_id`, `role`, AND `round` — not just role
- The scenario's `system_prompt` contains `{{BLOCKLIST}}` and `{{TRANSCRIPT}}` placeholders that are substituted at runtime

### 4. RLS Must Never Be Bypassed Casually
- Use the service role client (`adminClient`) only for session creation and internal operations
- User-facing queries must go through the standard Supabase client with RLS enforced
- **NEVER use the anon Supabase client for cross-user queries.** Use `adminClient` (service role) for any query that crosses RLS boundaries.

### 5. Evaluation Depth Rules
- `< 2 answered turns` → Insufficient (no evaluation)
- `< 4 answered turns` → Shallow (skips answer upgrades)
- `>= 4 answered turns` → Full evaluation
- Answer upgrades only available on Pro tier

### 6. Evaluation Pipeline Hard Rules
- **NEVER add new OpenAI API calls in the evaluate pipeline without explicit approval.** All new fields must be derived deterministically from already-computed evaluation output.
- **NEVER edit `lib/database.types.ts` manually.** Always regenerate from Supabase CLI after running migrations: `npx supabase gen types typescript --project-id [project-id] --schema public > lib/database.types.ts`
- **NEVER modify the stage1→stage2→stage3→stage4 pipeline files** without explicit approval.
- **NEVER hardcode duration values in the simulator.** Always read from `scenario.session_duration_minutes` with `?? 30` fallback.
- **NEVER call `setEvalResult` before `router.push` in simulator `handleEnd()`** for standard interviews — causes `.map()` crash on undefined fields in the in-page results view.
- **`interview_turns.user_answer` must never be null on a turn marked `answered = true`.** Evaluate route aborts if < 50% of answered turns have `user_answer` content.
- **PostgREST join-column filtering is unreliable.** Filter joined data in JavaScript after fetching, not in the query. See `getPriorSessionForRoleLevel` for the approved pattern.

### 7. Weighted Composite is Always Computed in TypeScript
- GPT returns raw `score` (1–4) per dimension and `evidence`/`gap` text only
- `band`, `weight`, `weighted_score`, `weighted_composite`, and `hire_band` are **all computed in TypeScript** after the GPT response is received
- The weight map comes from `renormalize(getDimensionsForRound(role, round))` — GPT does not know the weights
- **NEVER ask GPT to compute weighted scores, bands, or composite scores**

### 8. Round-to-Dimension Mapping is Authoritative
- The dimension list passed to stage 2 is determined by `getDimensionsForRound(role, round)` in `lib/evaluation/stage2-evaluate.ts`
- GPT is instructed to score **exactly** those dimensions and no others
- Round 4 always uses `AI_ENGINEER_DIMENSIONS` regardless of role
- Rounds 1–3 use a role-specific subset of the full dimension set, renormalized to sum to 1.0

---

## Key Files

| File | Purpose |
|------|---------|
| `app/api/interview/route.ts` | Core interview loop — GPT-4o question generation, anti-convergence via `user_question_history` scoped by role + round |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → momentum card → PDF generation → signed URL |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, credit deduction, round stored on session row, null guard |
| `app/api/voice/stt/route.ts` | Whisper-1 STT endpoint — accepts audio blob, returns transcript |
| `app/api/voice/tts/route.ts` | TTS-1 synthesis endpoint — returns audio/mpeg stream (Edge runtime) |
| `app/api/voice/opening/route.ts` | Fetches Turn 0 content for initial TMAY playback |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `app/results/[session_id]/page.tsx` | **Results Screen** — 5 sections: Verdict, Performance Scorecard (new), Strongest Moment, The One Thing, What's Next |
| `app/dashboard/page.tsx` | Main user dashboard — Practice tab with role selector, scenario grid, score history; History tab with session table |
| `app/scenarios/builder/page.tsx` | Custom scenario builder (Pro only) |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — reads duration from scenario row, redirects to Results Screen on eval complete |
| `hooks/useBatchVoice.ts` | **Primary voice hook** — STT→LLM→TTS batch pipeline |
| `hooks/useRealtimeVoice.ts` | Legacy voice hook — WebRTC/Realtime API. No longer used in production. |
| `components/CurrentBarCard.tsx` | Persistent dashboard card showing `hireable_level` + gap to next level |
| `lib/runtime-scenario.ts` | `resolveRuntimeScenario`, `normalizeRole`, `derivePersona`, `VALID_EVALUATION_DIMENSIONS`. `normalizeRole` imported by session/start. |
| `lib/eval-logic.ts` | Legacy evaluator prompt generation — no longer imported by the main pipeline |
| `lib/signalSynthesis.ts` | Post-evaluation signal processing before PDF |
| `lib/pdfGenerator.ts` | PDF generation — Performance Scorecard section on page 3, level-unlock reframe on areas_for_improvement |
| `lib/grounding-check.ts` | Validates answer upgrades — passes through when source turn cannot be matched |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation |
| `lib/database.types.ts` | Supabase-generated TypeScript types — **do not edit manually** |
| `lib/replay-comparison.ts` | `compareReplayAttempts` — used by the replay block in the evaluate route |
| `lib/evaluation/stage1-extract.ts` | Stage 1 — parses `interview_turns` into structured `Stage1Output` |
| `lib/evaluation/stage2-evaluate.ts` | Stage 2 — MAANG 4-band dimension scoring, weighted composite computed in TypeScript |
| `lib/evaluation/stage3-rewrite.ts` | Stage 3 — grounded structural answer rewrites (Pro only, full depth only) |
| `lib/evaluation/stage4-rules.ts` | Stage 4 — session-specific personal answer rules with verbatim quote grounding |

---

## Database Tables (Core)
- `users` — profile, `package_tier`, `available_sessions`, `total_sessions_used`
- `sessions` — interview sessions. Key columns:
  - `round INTEGER` — which round (1–4) this session covers. Written at session creation from `scenario.round`.
  - `evaluation_data JSONB` — single JSONB container for all evaluator output, including `dimension_scores`, `weighted_composite`, `hire_band`, `hiring_signal`, `hireable_level`, `turn_diagnostics`, `top_strengths`, `gaps`
  - `dimension_scores JSONB` — array of `DimensionScore` objects. Written by evaluate route after stage 2. Indexed separately for score history queries.
  - `momentum_card JSONB` — 3-field summary (`strongest_signal`, `one_fix`, `progress_note`). Derived deterministically after stage 2. `DEFAULT NULL`
  - `pdf_url TEXT` — storage path (not signed URL). Signed URL generated on demand.
  - `replay_of_session_id UUID` — links to original session for replay sessions
- `interview_turns` — canonical source of truth for all turns:
  - `turn_index`, `turn_type`, `content`, `answered`
  - `user_answer TEXT` — verbatim candidate voice answer. **Canonical field for evaluation.** Written by `/api/turns/answer` before `answered = true`
  - `user_answer_word_count`, `user_answer_captured_at`
- `scenarios` — pre-defined role × round scenarios:
  - `role TEXT`, `round INTEGER`, `round_title TEXT`
  - `evaluation_dimensions TEXT[]` — dimensions scored in this round
  - `system_prompt TEXT` — full GPT system prompt with `{{BLOCKLIST}}` and `{{TRANSCRIPT}}` placeholders
  - `duration_minutes INTEGER DEFAULT 30`
  - `is_active BOOLEAN`
- `user_question_history` — anti-convergence store. Keyed by `user_id`, `role`, `round`. No `level` column.
- `purchases` — payment records; insert triggers session credit addition

### DB constraints
- `sessions_status_check` — valid statuses: `'created' | 'active' | 'evaluating' | 'completed' | 'failed'`

**After any migration, regenerate types:**
```
npx supabase gen types typescript --project-id [project-id] --schema public > lib/database.types.ts
```
Do NOT edit `lib/database.types.ts` manually.

---

## Scenario Architecture

12 seeded scenarios in `supabase/seed/scenarios.sql`:
- **Product Manager** — 4 rounds: Product Sense & Design (R1), Metrics & Execution (R2), Behavioral & Leadership (R3), AI Fluency (R4)
- **Software Development Engineer** — 4 rounds: System Design (R1), Coding & Problem Solving (R2), Behavioral & Ownership (R3), AI/ML Systems (R4)
- **Data Scientist** — 4 rounds: Statistics & Foundations (R1), ML System Design (R2), Behavioral (R3), AI Fluency (R4)

Each scenario's `system_prompt` column contains the complete GPT interviewer prompt including persona, anti-convergence blocklist injection (`{{BLOCKLIST}}`), and transcript context (`{{TRANSCRIPT}}`). There is no separate prompt-builder; the prompt lives entirely in the DB row.

Round 4 (AI Fluency) requires Pro tier — enforced in session/start.

---

## Evaluation Pipeline (`app/api/evaluate/route.ts`)

### Stage flow (do not modify without explicit approval)
1. **Stage 1 — Extract** (`lib/evaluation/stage1-extract.ts`): Parses `interview_turns` into structured `Stage1Output` (array of `TurnExtraction`). `max_tokens: 8000` (supports 25-turn sessions).
2. **Stage 2 — Evaluate** (`lib/evaluation/stage2-evaluate.ts`): MAANG 4-band dimension scoring. See below. `max_tokens: 4000`.
3. **Stage 3 — Rewrite** (`lib/evaluation/stage3-rewrite.ts`): Generates grounded structural answer rewrites (Pro only, full depth only). Selects the 3 weakest turns by `signal_strength`. Validated by `lib/grounding-check.ts`. `max_tokens: 3000`.
4. **Stage 4 — Rules** (`lib/evaluation/stage4-rules.ts`): Generates 3–5 session-specific personal answer rules, each grounded to a specific `turn_index` and verbatim quote. Pro only, full depth only. `max_tokens: 1000`.

All stages have JSON parse safety wrappers — on parse failure, logs `rawLength`, last 200 chars, and throws `STAGE{N}_PARSE_FAILED` with char count.

### Stage 2 — MAANG Dimension Scoring (Rewritten)

**Function signature:** `runStage2(stage1Output, role, round, roundTitle): Promise<Stage2Output>`

**Dimension sets:**
- `PM_DIMENSIONS` (5 dims, weights sum to 1.0): Problem Framing & Structure (0.25), Product Intuition & User Empathy (0.25), Analytical & Metrics Thinking (0.20), Execution & Prioritization (0.15), Communication & Leadership (0.15)
- `SDE_DIMENSIONS` (5 dims): Problem Solving & Coding (0.35), System Design (0.30), Technical Communication (0.15), Code Quality & Engineering Craft (0.10), Behavioral & Ownership (0.10)
- `DS_DIMENSIONS` (5 dims): Statistical & ML Foundations (0.25), Modeling Judgment (0.25), ML System Design (0.25), Coding & Data Manipulation (0.15), Business & Product Sense (0.10)
- `AI_ENGINEER_DIMENSIONS` (5 dims): LLM & Model Architecture Depth (0.30), ML Systems & Production Thinking (0.25), Implementation & Coding (0.20), Research Awareness & Judgment (0.15), AI Safety & Ethics Awareness (0.10)

**Round-to-dimension mapping (`getDimensionsForRound`):**
- Each round scores a **subset** of the role's full dimension set. The subset is renormalized so weights sum to 1.0.
- Round 4 always uses `AI_ENGINEER_DIMENSIONS` for all roles.

**Round type classification (`isHypotheticalRound`):**
- `HYPOTHETICAL` (case study / design): R1, R2, R4 for all roles
- `BEHAVIORAL` (STAR stories): R3 for all roles
- Evaluation criteria sent to GPT differ by round type.

**Scoring bands:**
- Score 1 → Strong No Hire, Score 2 → Lean No Hire, Score 3 → Lean Hire, Score 4 → Strong Hire
- Composite bands: ≥ 3.5 → Strong Hire, ≥ 3.0 → Lean Hire, ≥ 2.0 → Lean No Hire, < 2.0 → Strong No Hire

**TypeScript post-processing (not GPT):**
GPT returns only `dimension`, `score`, `evidence`, `gap` per dimension. TypeScript computes:
- `band` (from `scoreToBand(score)`)
- `weight` (from renormalized weight map)
- `weighted_score = score × weight`
- `weighted_composite = Σ(weighted_scores)` rounded to 2dp
- `hire_band` (from `compositeToBand(weighted_composite)`)

**`Stage2Output` key fields:**
```typescript
dimension_scores: DimensionScore[]    // with band, weight, weighted_score populated by TS
weighted_composite: number            // computed in TS
hire_band: string                     // computed in TS
hiring_signal: string                 // GPT-generated sentence, backward compat
hiring_confidence: number             // 0.0–1.0
hireable_level: string                // Junior|Mid|Senior|Staff|Principal
distance_to_strong_hire: { gaps_blocking, primary_blocker }
tmay_diagnostic: TellMeAboutYourselfDiagnostic | null
turn_diagnostics: TurnDiagnostic[]   // per-turn signal + coaching
answer_level_diagnostics: TurnDiagnostic[]  // same array, backward compat alias
top_strengths: Strength[]
gaps: Gap[]
dominant_failure_pattern: string | null
```

### Post-stage derived fields (no new AI calls)
- **`momentum_card`** — derived after stage 2, before PDF. Three fields:
  - `strongest_signal`: `stage2.top_strengths[0].skill` truncated to 6 words
  - `one_fix`: `stage2.gaps[0].fix_in_one_sentence` → first sentence of `primary_blocker` → hardcoded fallback
  - `progress_note`: hiring signal delta vs prior session in same role (see `signalRank`). `null` if no prior session.
- **`getPriorSessionForRoleLevel`** — shared async helper. Fetches up to 10 prior completed sessions with `evaluation_data`, filters in JS for matching role. Used by `momentum_card`.

### Idempotency path
If `session.status === 'completed'` and `session.evaluation_data` exists, the route returns immediately with existing data + fresh signed URL + `momentum_card`. **No re-evaluation.**

---

## Simulator & Session Flow

### Session creation
- `POST /api/session/start` creates the session, stores `round` from the scenario, deducts one credit
- TMAY (`turn_index: 0`) is pre-seeded into `interview_turns` immediately
- No question families, no entry families, no dimension_order — the scenario's `system_prompt` column carries everything
- Round 4 requires Pro tier; enforced in session/start before credit deduction

### Session duration
- Duration is read from `scenario.session_duration_minutes`, which flows from `scenarios.duration_minutes` DB column
- Default: `30` minutes for all scenarios
- **Do NOT hardcode any duration value anywhere in the simulator**

### Post-evaluation redirect
- `handleEnd()` in `app/simulator/[scenarioId]/page.tsx` calls `/api/evaluate` then:
  - If `result.summary` exists → **negotiation simulation** → `setEvalResult(result.summary)` and stay in-page
  - Otherwise → **standard interview** → `router.push('/results/[session_id]')` immediately
- **Do NOT call `setEvalResult` before `router.push`** — the in-page results view will crash

### Session start null guard
- After `insert().select().single()`, check **both** `insertError` AND `!session`
- Both failure cases must run credit compensation
- The null case logs `[SESSION_START] Insert returned null data with no error`

---

## PDF Generation (`lib/pdfGenerator.ts`)

### Section order (page layout)
1. **Cover page** — role, level, date, session ID
2. **Page 2** — TMAY analysis + High-Level Assessment (hiring signal badge, hireable level, seniority observation)
3. **Page 3** — **Performance Scorecard** (new) + Dimensions Assessed + Core Strengths + Areas for Improvement
4. **Page 4+** — Answer Upgrades (Pro only, if present)
5. **Annotated Transcript** — turn-by-turn with signal annotations
6. **Personal Answer Rules** (Pro only, if present)

### Performance Scorecard (page 3)
- Rendered only if `evaluation.dimension_scores` exists and has length > 0; old sessions skip it silently
- Header: `"Overall: {weightedComposite.toFixed(1)} / 4.0 — {hireBand}"` in band colour
- Per-dimension: name + score + band label on one line, 6pt score bar (grey background, coloured fill at `score/4`), Evidence in italic, Gap note in muted text
- `checkPageBreak(y, 120)` before each row

### Level-unlock reframe in `areas_for_improvement`
- Before the improvements loop, derive `nextLevelLabel` from `evaluation.hireable_level`
- `nextLevelLabel` is rendered once in gray italic above the first item only
- `"To reach the next level: "` prepended to `imp.why_it_matters` in rendered text — **data object never mutated**

---

## Results Screen (`app/results/[session_id]/page.tsx`)

### Section structure
1. **Verdict** — hiring signal as human sentence, `hireable_level`, coloured top border keyed to `hiring_signal`, `progress_note` from `momentum_card`
2. **Performance Scorecard** — dimension score bars, band pills, gap notes, evidence quotes. Rendered only if `evaluation_data.dimension_scores` is present. Gracefully absent on old sessions.
3. **Strongest Moment** — best `signal_strength === 'strong'` diagnostic, matched to `turn_type === 'question'` turn
4. **The One Thing** — `primary_blocker`, `nextLevelLabel`, first `answer_upgrades[0]` or Starter upsell
5. **What's Next** — next-session nudge, PDF download card, back-to-dashboard link

### Scorecard colour helpers (defined in results page)
- `bandColour(band)` → `{ bg, text, border }` Tailwind classes for Strong Hire / Lean Hire / Lean No Hire / Strong No Hire
- `scoreColour(score)` → Tailwind `bg-*` class for bar fill

### Graceful states
- **Loading** — pulse skeleton
- **Polling** — `session.status !== 'completed'` — auto-refreshes every 3s
- **Not found / unauthorized** — plain message + dashboard link
- **Insufficient eval** — in-page message + "Go to Dashboard" CTA. **Do NOT redirect.**

---

## Dashboard (`app/dashboard/page.tsx`)

### Practice tab
- **CurrentBarCard** — most recent evaluated session's `hireable_level` + `hiring_signal` + `primary_blocker`
- **Role selector** — toggle between Product Manager / Software Development Engineer / Data Scientist
- **2×2 scenario grid** — filtered to the selected role, showing `round_title` + `evaluation_dimensions`. Locked overlay if no active plan.
- **Score History** (below grid) — fetches sessions with `dimension_scores IS NOT NULL`, joined to scenarios for `role` and `round_title`. Extracts `weighted_composite` from `evaluation_data` JSONB in JavaScript.
  - Grouped by round (ascending 1→4), filtered to the currently selected role tab
  - Each round block shows a trend: `2.8 → 3.1 → 3.4`, muted past scores, latest score colour-coded by `compositeColour()`
  - **Star Interviewer callout** — green highlighted box shown if all 4 rounds have at least one session AND the most recent `weighted_composite` for every round is ≥ 3.5. Frontend display only — no DB write.

### History tab
- Session table with Date, Scenario, Performance (evaluation depth badge), Report (download / generate PDF)
- `evaluation_depth` badge: full → green, shallow → yellow, insufficient → gray

---

## Known Issues

1. **14–16 second latency** — between user finishing answer and interviewer speaking. Bottleneck is GPT-4o (~8–10s). Reducing system prompt size is the primary lever.

2. **`Pro+` enum still present** — TypeScript types still reference Pro+ in several places. Cleanup pending after stability period.

3. **Negotiation tier check references `'Pro+'` string** — `session/start` checks `profile.package_tier !== 'Pro' && profile.package_tier !== 'Pro+'`. Must be updated when Pro+ is fully retired.

4. **`lib/eval-logic.ts` is dead code** — The file exists but is no longer imported by the evaluation pipeline. Stage 2 was fully rewritten. Can be deleted after confirming no other callers.

5. **Star Interviewer not written to DB** — The dashboard displays the Star Interviewer callout as a frontend-only computation. The `star_interviewer` column on `users` (if it exists) is not updated by the evaluate route.

---

## Known Technical Debt
- Multiple `as any` casts in the evaluate route around `signalSynthesis` — `AnswerLevelDiagnostic` interface in `signalSynthesis.ts` has not been updated to match the new `TurnDiagnostic` shape from stage 2
- `lib/eval-logic.ts` is dead code — not imported anywhere in the main pipeline
- `Pro+` enum still present in TypeScript types — pending cleanup
- `lib/runtime-scenario.ts` still exports `resolveRuntimeScenario` which references the old dimension/level system — this function is not called in any hot path but the file is imported for `normalizeRole`
- SQL migrations are scattered across `sql/`, `supabase/migrations/`, and root-level `.sql` files with no unified ordering

---

## Pending Optional Cleanup (Low Risk, After Stability)
```sql
-- Drop legacy Pro+ DB constraint when ready
ALTER TABLE users DROP CONSTRAINT users_package_tier_check;
ALTER TABLE users ADD CONSTRAINT users_package_tier_check
  CHECK (package_tier IN ('Free', 'Starter', 'Pro'));
```
```typescript
// lib/database.types.ts — update when ready (via CLI, not manually)
export type PackageTier = 'Starter' | 'Pro'
```
