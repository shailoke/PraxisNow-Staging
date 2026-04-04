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
- **Starter** — Deterministic question sets, 3 sessions per pack (₹599), awareness-focused evaluation
- **Pro** — Randomized families, 5 sessions per pack (₹899), full skill-repair evaluation with answer upgrades, custom scenarios, replay sessions, salary negotiation simulation, AI Fluency round
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
- The interview API (`app/api/interview/route.ts`) **must never generate TMAY**
- A hard kill-switch actively strips any legacy `seeded_questions` from scenario config at runtime

### 2. Entry Family — Warn-Only (No Longer Hard)
- Entry Family is selected at session creation and stored in `sessions.family_selections['Entry']`
- If Entry Family is missing, the system logs a warning and continues — the session proceeds using dimension `prompt_guidance` for Turn 1
- **The hard throws `ENTRY_FAMILY_MISSING_AFTER_TMAY` and `ENTRY_FAMILY_VIOLATION` have been replaced with `console.warn`**
- Pattern validation (CHECK 3) is also warn-only and skipped entirely if Entry family is absent

### 3. Turn Authority — AI Never Speaks Without User Input
- The interview API validates that GPT-4o did not hallucinate a candidate response
- AI questions are only written to DB **after** the previous turn is marked `answered = true`
- DB writes are atomic: mark previous turn answered + insert new AI question in one transaction

### 4. Anti-Convergence Blocklist
- Recent questions from past sessions are passed to GPT-4o as a blocklist to prevent repetition
- Also includes SCENARIO FRESHNESS REQUIREMENT: GPT must avoid the same scenario *type*, not just exact questions
- Replay sessions **bypass** the blocklist intentionally to reproduce original questions exactly

### 5. RLS Must Never Be Bypassed Casually
- Use the service role client (`adminClient`) only for session creation and internal operations
- User-facing queries must go through the standard Supabase client with RLS enforced
- **NEVER use the anon Supabase client for cross-user queries.** Use `adminClient` (service role) for any query that crosses RLS boundaries.

### 6. Evaluation Depth Rules
- `< 2 answered turns` → Insufficient (no evaluation)
- `< 4 answered turns` → Shallow (skips answer upgrades)
- `>= 4 answered turns` → Full evaluation
- Answer upgrades only available on Pro tier

### 7. Progression Architecture Hard Rules
- **NEVER add new OpenAI API calls in the evaluate pipeline without explicit approval.** All new fields must be derived deterministically from already-computed evaluation output.
- **NEVER edit `lib/database.types.ts` manually.** Always regenerate from Supabase CLI after running migrations: `supabase gen types typescript --project-id [project-id] > lib/database.types.ts`
- **NEVER modify the stage1→stage2→stage3→stage4 pipeline files** (`lib/evaluation/stage1-extract.ts`, `stage2-evaluate.ts`, `stage3-rewrite.ts`, `stage4-rules.ts`) without explicit approval.
- **NEVER hardcode duration values in the simulator.** Always read from `scenario.session_duration_minutes` with `?? 30` fallback.
- **NEVER call `setEvalResult` before `router.push` in simulator `handleEnd()`** for standard interviews — causes `.map()` crash on undefined fields in the in-page results view.
- **`interview_turns.user_answer` must never be null on a turn marked `answered = true`.** Evaluate route aborts if < 50% of answered turns have `user_answer` content.
- **PostgREST join-column filtering is unreliable.** Filter joined data in JavaScript after fetching, not in the query. See `getPriorSessionForRoleLevel` for the approved pattern.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/api/interview/route.ts` | Core interview loop — GPT-4o question generation, dimension tracking, anti-convergence |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → momentum card → PDF generation |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, Entry Family resolution, credit deduction, null guard |
| `app/api/voice/stt/route.ts` | Whisper-1 STT endpoint — accepts audio blob, returns transcript |
| `app/api/voice/tts/route.ts` | TTS-1 synthesis endpoint — returns audio/mpeg stream (Edge runtime) |
| `app/api/voice/opening/route.ts` | Fetches Turn 0 content for initial TMAY playback |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `app/results/[session_id]/page.tsx` | **Results Screen** — primary post-session experience. 4 sections: Verdict, Strongest Moment, The One Thing, What's Next. |
| `app/dashboard/page.tsx` | Main user dashboard — Practice tab shows `CurrentBarCard`, History tab shows progression notes |
| `app/scenarios/builder/page.tsx` | Custom scenario builder (Pro only, 3–4 dimensions) |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — reads duration from scenario row, redirects to Results Screen on eval complete |
| `hooks/useBatchVoice.ts` | **Primary voice hook** — STT→LLM→TTS batch pipeline. Drop-in replacement for useRealtimeVoice. |
| `hooks/useRealtimeVoice.ts` | Legacy voice hook — WebRTC/Realtime API. No longer used in production. |
| `components/CurrentBarCard.tsx` | Persistent dashboard card showing `hireable_level` + gap to next level |
| `lib/entry-families.ts` | Entry Family definitions per role + level (to be dropped in rebuild) |
| `lib/question-families.ts` | Question family pool per dimension (to be dropped in rebuild) |
| `lib/runtime-scenario.ts` | Scenario resolution, persona derivation, `normalizeRole`, `normalizeLevel`, `selectQuestionFamilies`, `selectEntryFamily` |
| `lib/probes.ts` | Probe question logic — **deprecated, probe_selections removed from session flow** |
| `lib/eval-logic.ts` | Evaluator prompt generation (tier-gated) |
| `lib/signalSynthesis.ts` | Post-evaluation signal processing before PDF |
| `lib/pdfGenerator.ts` | PDF generation — areas_for_improvement rendered with level-unlock header |
| `lib/grounding-check.ts` | Validates answer upgrades contain phrases from original — currently rejecting all upgrades |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation |
| `lib/database.types.ts` | Supabase-generated TypeScript types — **do not edit manually** |
| `lib/replay-comparison.ts` | `compareReplayAttempts` — used by both replay block and progression comparison |
| `app/config/interview-prompts.ts` | Master GPT system prompt builder — all prompt_guidance wrapped with suppression markers |

---

## Database Tables (Core)
- `users` — profile, `package_tier`, `available_sessions`, `total_sessions_used`
- `sessions` — interview sessions. Key JSONB columns:
  - `family_selections` — maps dimension → family_id. Entry Family stored under key `'Entry'`
  - `dimension_order` — shuffled dimension sequence for this session (`TEXT[]`)
  - `evaluation_data` — single JSONB container for all evaluator output
  - `momentum_card` — 3-field structured summary (`strongest_signal`, `one_fix`, `progress_note`). Derived deterministically after stage2. `DEFAULT NULL`
  - `progression_comparison` — delta vs prior session in same role/level. Shape: `{ observed_changes: string[], unchanged_areas: string[] }`. `DEFAULT NULL`
  - `replay_of_session_id` — links to original session for replay sessions
  - `probe_selections` — **deprecated. Column still exists in DB but always null in new sessions. probe_selections logic removed from codebase.**
- `interview_turns` — canonical source of truth for all turns:
  - `turn_index`, `turn_type`, `content`, `answered`
  - `user_answer` — verbatim candidate voice answer. **Canonical field for evaluation.** Written by `/api/turns/answer` before `answered = true`
  - `user_answer_word_count`, `user_answer_captured_at`
- `scenarios` — pre-defined roles + levels with `evaluation_dimensions`, `prompt`, and `duration_minutes INTEGER DEFAULT 30`
- `custom_scenarios` — user-created overrides with `focus_dimensions` and `company_context`
- `question_families` — question families mapped to dimensions (to be dropped in rebuild)
- `user_family_usage` — tracks used families per user for Pro freshness. **FK constraint dropped. Uses upsert with ignoreDuplicates to handle duplicate Entry family entries.** (to be dropped in rebuild)
- `purchases` — payment records; insert triggers session credit addition

### Recent DB constraint changes
- `sessions_status_check` — now includes `'evaluating'` as a valid status
- `user_family_usage` FK constraint — dropped to unblock bulk inserts
- `probe_selections` column — exists but always null in new sessions

**After any migration, regenerate types:**
```
supabase gen types typescript --project-id [project-id] > lib/database.types.ts
```
Do NOT edit `lib/database.types.ts` manually.

---

## Evaluation Pipeline (`app/api/evaluate/route.ts`)

### Stage flow (do not modify without explicit approval)
1. **Stage 1 — Extract** (`lib/evaluation/stage1-extract.ts`): Parses `interview_turns` into structured turn objects. `max_tokens: 8000` (supports 25-turn sessions).
2. **Stage 2 — Evaluate** (`lib/evaluation/stage2-evaluate.ts`): Produces `hiring_signal`, `hireable_level`, `top_strengths`, `gaps`, `distance_to_strong_hire`, `turn_diagnostics`. `max_tokens: 4000`.
3. **Stage 3 — Rewrite** (`lib/evaluation/stage3-rewrite.ts`): Generates grounded answer upgrades (Pro/Pro+, full depth only). Validated by `lib/grounding-check.ts`. `max_tokens: 3000`. **Currently broken — grounding check rejects all upgrades.**
4. **Stage 4 — Rules** (`lib/evaluation/stage4-rules.ts`): Generates session-specific personal answer rules (Pro/Pro+, full depth only). `max_tokens: 1000`.

All stages have JSON parse safety wrappers — on parse failure, logs `rawLength`, last 200 chars, and throws `STAGE{N}_PARSE_FAILED` with char count.

### Post-stage derived fields (no new AI calls)
- **`momentum_card`** — derived after stage2, before PDF. Three fields:
  - `strongest_signal`: `stage2.top_strengths[0].skill` truncated to 6 words, fallback to `dimensionNames[0]`
  - `one_fix`: `stage2.gaps[0].fix_in_one_sentence` → first sentence of `primary_blocker` → hardcoded fallback
  - `progress_note`: hiring signal delta vs prior session in same role/level (see `signalRank`). `null` if no prior session.
- **`progression_comparison`** — runs `compareReplayAttempts` for non-replay full-depth sessions only.
- **`getPriorSessionForRoleLevel`** — shared async helper. Fetches up to 10 prior completed sessions with `evaluation_data`, filters in JS for matching role+level. Used by both `momentum_card` and `progression_comparison`.

### Idempotency path
If `session.status === 'completed'` and `session.evaluation_data` exists, the route returns immediately with existing data + fresh signed URL + `momentum_card`. **No re-evaluation.**

---

## Simulator & Session Flow

### Session duration
- Duration is read from `scenario.session_duration_minutes`, which flows from `scenarios.duration_minutes` DB column
- Default: `30` minutes for all scenarios
- **Do NOT hardcode `45` or any other duration value anywhere in the simulator**

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

## Question Family System (Current — Partially Deprecated)

### How it works today
- `QUESTION_FAMILIES` constant in `lib/question-families.ts` — in-memory pool of families per dimension
- `ENTRY_FAMILIES` constant in `lib/entry-families.ts` — level-scoped entry point families
- At session creation: `selectQuestionFamilies()` picks one family per dimension (Starter: deterministic first; Pro: randomized from unused)
- `user_family_usage` table tracks used families per user to drive rotation for Pro
- `family_selections` JSONB stored in session — passed to `generateInterviewerPrompt()` which wraps each `prompt_guidance` with `[PRIVATE INTERVIEWER INSTRUCTION]` suppression markers
- Entry family key format: `entry_{normalizedRole}_{normalizedLevel}_{dimension}`

### What changed (Phase 1 simplification)
- `probe_selections` fully removed from session creation and interview route
- Entry family failure is now non-fatal (warn and continue)
- `prompt_guidance` injections wrapped with suppression markers to prevent verbatim reading
- `user_family_usage` now uses upsert + Entry dimension filtered out from tracking
- SCENARIO FRESHNESS REQUIREMENT added after each prompt_guidance block — forces GPT to vary scenario types, not just rephrase

### What is broken
- Answer Upgrades (Stage 3) always rejected by grounding check. Root cause: `validateAnswerUpgrades` checks against `longestAnswer` (longest answer across all turns) rather than the specific turn's own answer. Trigram overlap fails because it's comparing the wrong source text.

---

## PDF Generation (`lib/pdfGenerator.ts`)

### Level-unlock reframe in `areas_for_improvement`
- Before the improvements loop, derive `nextLevelLabel` from `evaluation.hireable_level`
- `nextLevelLabel` is rendered **once** in gray italic above the **first** improvement item only
- For each improvement item, `"To reach the next level: "` is prepended to `imp.why_it_matters` in rendered text only — **the data object is never mutated**

---

## Results Screen (`app/results/[session_id]/page.tsx`)

### Section structure
1. **Verdict** — hiring signal as human sentence, `hireable_level`, coloured top border, `progress_note` from `momentum_card`
2. **Strongest Moment** — best `signal_strength === 'strong'` diagnostic, matched to `turn_type === 'question'` turn
3. **The One Thing** — `primary_blocker`, `nextLevelLabel`, first `answer_upgrades[0]` or Starter upsell
4. **What's Next** — next-session nudge, PDF download card, back-to-dashboard link

### Graceful states
- **Loading** — pulse skeleton
- **Polling** — `session.status !== 'completed'` — auto-refreshes every 3s
- **Not found / unauthorized** — plain message + dashboard link
- **Insufficient eval** — in-page message + "Go to Dashboard" CTA. **Do NOT redirect.**

---

## Known Issues (Open)

1. **Answer Upgrades empty in PDF** — `validateAnswerUpgrades` compares rewrite against `longestAnswer` (wrong reference). All upgrades fail the trigram grounding check. Fix: match each upgrade against its own turn's `user_answer`, not the longest answer in the session.

2. **Question freshness limited** — small `QUESTION_FAMILIES` pool means rotation exhausts quickly; same families repeat after ~5 sessions per dimension. Addressed by SCENARIO FRESHNESS REQUIREMENT in prompt but root cause is pool size.

3. **14–16 second latency** — between user finishing answer and interviewer speaking. Bottleneck is GPT-4o (~8–10s). Reducing system prompt size is the primary lever.

4. **`Pro+` enum still present** — TypeScript types still reference Pro+. Cleanup pending after stability period.

5. **Negotiation tier check references `'Pro+'` string** — must be updated when Pro+ is fully retired.

---

## Architecture Simplification — In Progress

**Planned rebuild:** 3 roles × 4 rounds, no question family system, level fixed at Senior/Staff bar.

Changes in scope:
- `question_families` and `user_family_usage` tables to be dropped
- `ENTRY_FAMILIES`, `QUESTION_FAMILIES` constants deleted
- `lib/probes.ts` deleted (already deprecated)
- `lib/entry-families.ts` deleted
- `user_family_usage` tracking removed entirely
- Level no longer a user-facing dimension — fixed bar per role
- `selectQuestionFamilies`, `selectEntryFamily`, `dimensionToEntryProbe` logic removed
- `family_selections` and `probe_selections` columns to be dropped from `sessions`

---

## Known Technical Debt
- Multiple `@ts-ignore` and `as any` casts throughout the session and evaluation flow
- SQL migrations are scattered across `sql/`, `supabase/migrations/`, and root-level `.sql` files with no unified ordering
- `Pro+` enum still present in TypeScript types — pending cleanup
- Dimension order falls back softly if `dimension_order` is missing from session — should become a hard error

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
