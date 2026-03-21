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
- **AI:** OpenAI GPT-4o (interviewer + evaluator)
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

## Critical Invariants — Never Break These

### 1. TMAY is Always Turn 0, Pre-Seeded
- "Tell me about yourself." is inserted into `interview_turns` at `turn_index: 0` during session creation (`app/api/session/start/route.ts`)
- The interview API (`app/api/interview/route.ts`) **must never generate TMAY**
- A hard kill-switch actively strips any legacy `seeded_questions` from scenario config at runtime

### 2. Entry Family Required for First Post-TMAY Question
- The very first behavioral question after TMAY **must** come from the Entry Family
- Entry Family is resolved at session creation and stored in `sessions.family_selections['Entry']`
- The Entry Family key must match the pattern: `entry_{normalizedRole}_{normalizedLevel}_*`
- If Entry Family is missing at Turn 1, the API throws a hard error: `ENTRY_FAMILY_MISSING_AFTER_TMAY`
- Three sequential checks enforce this: family exists in runtime state → matches role+level pattern → scenario seeded questions are dead

### 3. Turn Authority — AI Never Speaks Without User Input
- The interview API validates that GPT-4o did not hallucinate a candidate response
- AI questions are only written to DB **after** the previous turn is marked `answered = true`
- DB writes are atomic: mark previous turn answered + insert new AI question in one transaction

### 4. Anti-Convergence Blocklist
- Recent questions from past sessions are passed to GPT-4o as a blocklist to prevent repetition
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
| `app/api/interview/route.ts` | Core interview loop — ~400 lines |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → momentum card → PDF generation |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, Entry Family resolution, credit deduction, null guard |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `app/results/[session_id]/page.tsx` | **Results Screen** — primary post-session experience. 4 sections: Verdict, Strongest Moment, The One Thing, What's Next. Replaces in-simulator eval rendering for standard interviews. |
| `app/dashboard/page.tsx` | Main user dashboard — Practice tab shows `CurrentBarCard`, History tab shows `↑ [change]` progression notes |
| `app/scenarios/builder/page.tsx` | Custom scenario builder (Pro only, 3–4 dimensions) |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — reads duration from scenario row, redirects to Results Screen on eval complete |
| `components/CurrentBarCard.tsx` | Persistent dashboard card showing `hireable_level` + gap to next level from most recent evaluated session |
| `lib/entry-families.ts` | Entry Family definitions per role + level |
| `lib/runtime-scenario.ts` | Scenario resolution, persona derivation, `normalizeRole`, `normalizeLevel`, `session_duration_minutes` |
| `lib/probes.ts` | Probe question logic |
| `lib/eval-logic.ts` | Evaluator prompt generation (tier-gated) |
| `lib/signalSynthesis.ts` | Post-evaluation signal processing before PDF |
| `lib/pdfGenerator.ts` | PDF generation — areas_for_improvement rendered with level-unlock header |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation |
| `lib/database.types.ts` | Supabase-generated TypeScript types — **do not edit manually** |
| `lib/replay-comparison.ts` | `compareReplayAttempts` — used by both replay block and progression comparison |

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
- `interview_turns` — canonical source of truth for all turns:
  - `turn_index`, `turn_type`, `content`, `answered`
  - `user_answer` — verbatim candidate voice answer. **Canonical field for evaluation.** Written by `/api/turns/answer` before `answered = true`
  - `user_answer_word_count`, `user_answer_captured_at`
- `scenarios` — pre-defined roles + levels with `evaluation_dimensions`, `prompt`, and `duration_minutes INTEGER DEFAULT 30`
- `custom_scenarios` — user-created overrides with `focus_dimensions` and `company_context`
- `question_families` — question families mapped to dimensions
- `user_family_usage` — tracks used families per user (Pro/Pro+ only) for freshness
- `purchases` — payment records; insert triggers session credit addition

**After any migration, regenerate types:**
```
supabase gen types typescript --project-id [project-id] > lib/database.types.ts
```
Do NOT edit `lib/database.types.ts` manually.

---

## Evaluation Pipeline (`app/api/evaluate/route.ts`)

### Stage flow (do not modify without explicit approval)
1. **Stage 1 — Extract** (`lib/evaluation/stage1-extract.ts`): Parses `interview_turns` into structured turn objects
2. **Stage 2 — Evaluate** (`lib/evaluation/stage2-evaluate.ts`): Produces `hiring_signal`, `hireable_level`, `top_strengths`, `gaps`, `distance_to_strong_hire`, `turn_diagnostics`
3. **Stage 3 — Rewrite** (`lib/evaluation/stage3-rewrite.ts`): Generates grounded answer upgrades (Pro/Pro+, full depth only). Validated by `lib/grounding-check.ts`
4. **Stage 4 — Rules** (`lib/evaluation/stage4-rules.ts`): Generates session-specific personal answer rules (Pro/Pro+, full depth only)

### Post-stage derived fields (no new AI calls)
- **`momentum_card`** — derived after stage2, before PDF. Three fields:
  - `strongest_signal`: `stage2.top_strengths[0].skill` truncated to 6 words, fallback to `dimensionNames[0]`
  - `one_fix`: `stage2.gaps[0].fix_in_one_sentence` → first sentence of `primary_blocker` → hardcoded fallback
  - `progress_note`: hiring signal delta vs prior session in same role/level (see `signalRank`). `null` if no prior session.
- **`progression_comparison`** — runs `compareReplayAttempts` for non-replay full-depth sessions only. Guard: `!session.replay_of_session_id && evaluationDepth === 'full'`. Reuses `priorSessionData` from shared helper.
- **`getPriorSessionForRoleLevel(adminClient, userId, role, level, excludeSessionId)`** — shared async helper defined above the POST handler. Fetches up to 10 prior completed sessions with `evaluation_data`, filters in JS for matching role+level to avoid PostgREST join-column filtering issues. Returns single row or `null`. Used by both `momentum_card` and `progression_comparison` — one DB round-trip for both.

### Idempotency path (line ~97)
If `session.status === 'completed'` and `session.evaluation_data` exists, the route returns immediately with existing data + fresh signed URL + `momentum_card` from the persisted session record. **No re-evaluation.** This is the X4 fix — the idempotency path must always return `momentum_card`.

### Evaluation depth abort rules
- `insufficient` → returns `noDataEval` immediately, no AI calls
- Data quality guard: aborts if < 50% of answered turns have `user_answer` content
- `shallow` → skips stage3 (answer upgrades) and stage4 (personal rules)
- `progression_comparison` only runs on `full` depth

---

## Simulator & Session Flow

### Session duration
- Duration is read from `scenario.session_duration_minutes`, which flows from `scenarios.duration_minutes` DB column (added in `20260322_add_scenario_duration.sql`)
- Default: `30` minutes for all scenarios
- In `lib/runtime-scenario.ts`: `session_duration_minutes: base.duration_minutes ?? 30`
- In simulator: `const mins = uiScenario.session_duration_minutes ?? 30`, then `setDuration(mins * 60)` and `setTargetDuration(mins)`
- **Do NOT hardcode `45` or any other duration value anywhere in the simulator**

### Post-evaluation redirect
- `handleEnd()` in `app/simulator/[scenarioId]/page.tsx` calls `/api/evaluate` then:
  - If `result.summary` exists → **negotiation simulation** → `setEvalResult(result.summary)` and stay in-page
  - Otherwise → **standard interview** → `router.push('/results/[session_id]')` immediately. **Do NOT call `setEvalResult` before the push** — the in-page results view will attempt to `.map()` undefined fields on the new evaluation shape and crash.
- Any other special session types with their own post-eval flows must be guarded before the default `router.push` branch.

### Session start null guard
- After `insert().select().single()` in `app/api/session/start/route.ts`, check **both** `insertError` AND `!session`
- The `data: null, error: null` silent failure (caused by RLS blocking the RETURNING clause or a DB trigger) is distinct from a PostgREST error
- Both failure cases must run credit compensation (refund `available_sessions` and `total_sessions_used`)
- The null case logs `[SESSION_START] Insert returned null data with no error` with `user_id` and `session_payload_keys` for Vercel visibility

---

## PDF Generation (`lib/pdfGenerator.ts`)

### Level-unlock reframe in `areas_for_improvement`
- Before the improvements loop, derive `nextLevelLabel` from `evaluation.hireable_level`:
  ```
  const levelProgression = { Junior→Mid-level, Mid-level→Senior, Senior→Principal, Principal→Staff, Staff→Director }
  ```
  Split `hireable_level` on `" "`, match each token against `levelProgression` keys.
  - Match → `"To perform at [nextLevel] [metadata.role] bar:"`
  - No match → `"To strengthen your bar:"`
  - Parse failure → `console.warn` with raw `hireable_level`, use fallback
- `nextLevelLabel` is rendered **once** in gray italic (font size 9, color `#7a6991`) above the **first** improvement item only
- For each improvement item, `"To reach the next level: "` is prepended to `imp.why_it_matters` in rendered text only — **the data object is never mutated**

---

## Results Screen (`app/results/[session_id]/page.tsx`)

### Data contract — what the page depends on
| Field | Source | Required |
|-------|--------|----------|
| `session.evaluation_data.hiring_signal` | `sessions.evaluation_data` | Yes — gates `hasFullEval` |
| `session.evaluation_data.hireable_level` | `sessions.evaluation_data` | Yes |
| `session.evaluation_data.distance_to_strong_hire.primary_blocker` | `sessions.evaluation_data` | Preferred for Section 3 |
| `session.evaluation_data.high_level_assessment.barriers_to_next_level` | `sessions.evaluation_data` | Fallback for Section 3 |
| `session.evaluation_data.transcript_extracts` | `sessions.evaluation_data` | Primary for Section 2 (Strongest Moment) |
| `session.evaluation_data.turn_diagnostics` | `sessions.evaluation_data` | Legacy fallback for Section 2 |
| `session.evaluation_data.answer_upgrades` | `sessions.evaluation_data` | Section 3 upgrade block (Pro/Pro+ only) |
| `session.momentum_card` | `sessions.momentum_card` | `progress_note` for Section 1 |
| `interview_turns` (turn_type === 'question') | `interview_turns` table | Section 2 question text |

### Graceful states (none of these redirect)
- **Loading** — pulse skeleton (4 dark bars)
- **Polling** — `session.status !== 'completed'` — spinner + "Your evaluation is being prepared..." — auto-refreshes every 3s, interval cleared on unmount
- **Not found / unauthorized** — `notFound` state — plain message + dashboard link
- **Insufficient eval** — `hasFullEval === false` — in-page message + "Go to Dashboard" CTA. **Do NOT redirect** — user may have bookmarked the URL.

### Section structure
1. **Verdict** — hiring signal as human sentence, `hireable_level`, coloured top border, `progress_note` from `momentum_card`
2. **Strongest Moment** — best `signal_strength === 'strong'` diagnostic (fallback to `'mixed'`), matched to `turn_type === 'question'` turn. Hidden entirely if no diagnostics exist.
3. **The One Thing** — `primary_blocker`, `nextLevelLabel` (same derivation as PDF), first `answer_upgrades[0]` or Starter upsell
4. **What's Next** — next-session nudge (weakest gap), PDF download card, back-to-dashboard link

---

## Interviewer Personas (Derived in runtime-scenario.ts)
Personas are statically mapped by Role + Level:
- Entry/Junior → Neutral/Concise (values correctness)
- Mid/Senior → Structured/Direct (probes for specifics)
- Principal → Skeptical/Analytical (probes for tradeoffs and failure modes)
- Executive → Strategic/Challenging (probes for systems thinking)

---

## Evaluator Tiers
- **Starter:** Awareness + truth. Evaluates TMAY, 3 strengths, 3 areas for improvement (no gap typing), NO answer upgrades
- **Pro:** Skill repair. Re-writes TMAY, gap-types improvements (Fundamental vs Polish), 3 rewritten Answer Upgrades, replay comparison block if applicable, pressure failure mode analysis, interruption-resistant variants, custom personal answer rules

---

## Known Technical Debt
- Multiple `@ts-ignore` and `as any` casts throughout the session and evaluation flow
- SQL migrations are scattered across `sql/`, `supabase/migrations/`, and root-level `.sql` files with no unified ordering
- `Pro+` enum still present in TypeScript types — pending cleanup after 7–14 days of stability
- Dimension order falls back softly if `dimension_order` is missing from session — should become a hard error
- Negotiation tier check in `session/start` still references `Pro+` string directly — must be updated when Pro+ is fully retired

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
