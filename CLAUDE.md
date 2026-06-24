# PraxisNow — Claude Code Context

## Last Audited

2026-06-24. Full codebase audit completed after a 2-3 month gap. State: core architecture (voice batch pipeline, 4-stage evaluation, tier gating) is intact and matches this document. Key risks found: pricing page displays different prices/session counts than the backend actually charges, `signalSynthesis.ts` silently produces empty output on every session due to a field-mapping bug, the `sessions.status` CHECK constraint in `supabase/hardening.sql` may not allow the `'evaluating'` value the app writes, and ~40 stale scratch files clutter the repo root with no way to tell from the repo alone whether their one-off SQL patches were ever applied to the live database. See **Known Issues** and **Go-Live Blockers** below.

## What This App Does

PraxisNow is an AI interview simulation platform that replicates high-stakes, high-pressure interviews to help professionals prepare for real-life hiring decisions. A GPT-4o-powered interviewer conducts realistic behavioral and technical interviews across multiple rounds; an o4-mini evaluation pipeline then produces a structured competency assessment and generates a PDF coaching report. Built for Product Managers, Software Development Engineers, Data Scientists, and fresh graduates applying for those roles.

---

## Stack

| Layer | Technology |
|---|---|
| **Frontend/Backend** | Next.js 16.1.1 App Router (TypeScript) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **AI — Interviewer** | OpenAI `gpt-4o` (non-streaming, `max_tokens: 500`, `temperature: 0.7`) |
| **AI — Evaluator** | OpenAI `o4-mini` (`max_completion_tokens: 8000`) |
| **AI — STT** | OpenAI `whisper-1` |
| **AI — TTS** | OpenAI `tts-1` (voice: `onyx`) |
| **Payments** | Razorpay (INR, session credit packs) |
| **File Storage** | Supabase Storage (signed URLs for PDF reports) |
| **Deployment** | Vercel |

---

## Environment Variables

No `.env.example` exists in the repo as of the 2026-06-24 audit. Create one at repo root with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
DATABASE_URL=   # only used by scripts/execute_sql.js, not by the Next.js app
```

All vars except `DATABASE_URL` are required for the app to function. `NEXT_PUBLIC_*` vars are exposed to the browser — never put secrets in a `NEXT_PUBLIC_*` var.

---

## Admin Panel

`app/admin/` is an internal management UI, gated by `checkAdmin()` in `lib/admin-server.ts` (checks `users.is_admin`). Routes:

- `/admin` — overview
- `/admin/scenarios` — scenario CRUD (system prompts, evaluation guidance, dimensions)
- `/admin/users/[id]` — user tier management
- `/admin/sessions` — session viewer
- `/admin/dev-interview` — dev interview harness for testing without consuming credits

Auth model: `app/admin/layout.tsx` calls `checkAdmin()` server-side and redirects to `/` if the signed-in user's `users.is_admin` is not true — this protects all `/admin/**` pages. The corresponding API routes (`/api/admin/scenarios`, `/api/admin/dev-interview/start`, `/api/admin/dev-interview/control`) independently call `checkAdmin()` at the top of their handlers — confirmed by reading the route bodies, not just `process.env` references. **No auth gap found here** — middleware (`middleware.ts`) does NOT cover `/admin` or `/api/admin/**` (its matcher is `/simulator/:path*` only), so the protection is entirely the `checkAdmin()` calls in the layout and each route; do not remove those calls without replacing them with an equivalent check.

---

## Pricing & Packages (No Tiers)

**Pricing redesign, 2026-06-24: tiers are gone.** Every paid session — Single, Practice Pack, or Full Prep — delivers the identical full evaluation experience (all 4 stages, answer upgrades, personal answer rules, PDF). Packs differ only in how many sessions they include. The anchor price is ₹499/session; pack prices are discounts off that anchor.

| Pack | Price | Sessions | Notes |
|---|---|---|---|
| **Free session** | ₹0 | 1 | Auto-granted to new users. Any round except AI (R4). |
| **Single** | ₹499 | 1 | |
| **Practice Pack** | ₹1,399 | 3 | "Save ₹98" vs ₹499×3 |
| **Full Prep** | ₹2,199 | 5 | "Save ₹296" vs ₹499×5 |

Payment SKUs in `app/api/razorpay/route.ts` and `app/api/razorpay/verify/route.ts`:
- `single` → 1 session
- `practice_pack` → 3 sessions
- `full_prep` → 5 sessions
- `pro_plus` → legacy SKU, kept in `verify/route.ts` only for backward compatibility with old purchase records. Not surfaced anywhere in the UI. Old `starter`/`pro` SKU keys were removed from `razorpay/route.ts`'s amount map.

**All paid purchases set `users.package_tier = 'Pro'` unconditionally.** This is backward-compat plumbing only, for the negotiation gate in `session/start` (untouched — still checks `package_tier === 'Pro' || 'Pro+'`). `package_tier` is no longer used anywhere to gate evaluation features — see "Tier & Feature Gates" below, now keyed on paid-vs-free instead.

The salary negotiation simulation is treated as post-launch and was **hidden from the UI** as of 2026-06-24 (see Known Issues) — its tier-check plumbing is left in place but is effectively dead code now that there's no user-facing path to it.

---

## Voice Architecture (Current — Batch Pipeline)

The voice layer uses `hooks/useBatchVoice.ts`. `hooks/useRealtimeVoice.ts` is legacy and no longer used in production.

**No WebRTC, no DataChannel, no OpenAI Realtime API.**

### Turn flow

```
User speaks → MediaRecorder (250ms chunks) → blob collected on stop
  → POST blob → /api/voice/stt (whisper-1)        → TRANSCRIBING state
  → POST transcript → /api/turns/answer             (write user_answer BEFORE answered=true)
  → POST → /api/interview (gpt-4o, non-streaming)  → THINKING state
  → Response returned immediately (DB writes fire in background IIFE)
  → POST text → /api/voice/tts (tts-1, 'onyx')    → ASSISTANT_SPEAKING state
  → ttsRes.blob() → URL.createObjectURL() → new Audio(blobUrl)
  → audioEl.play()
  → audioEl.onended: revokeObjectURL, reset state, startRecording()
  → WAITING_FOR_USER state
```

### Audio playback mechanism

TTS audio is played via an `HTMLAudioElement` with a blob URL — **not** `AudioContext` + `AudioBufferSourceNode`. This eliminates the 3–4 second `decodeAudioData()` gap.

```typescript
const blob = await ttsRes.blob()
const blobUrl = URL.createObjectURL(blob)
const audioEl = new Audio(blobUrl)
audioEl.onended = () => { URL.revokeObjectURL(blobUrl); /* reset state, startRecording */ }
audioEl.onerror = (err) => { console.error('[AUDIO_PLAYBACK_ERROR]', err); URL.revokeObjectURL(blobUrl); /* same reset */ }
audioElRef.current = audioEl
blobUrlRef.current = blobUrl
audioEl.play()
```

`audioContextRef` and `audioSourceRef` remain declared as no-op refs for abort compatibility but are never set during playback.

### DB write pattern (interview route)

After GPT responds and the message is validated, STEP 12 (mark turn answered + insert new turn) fires as a background IIFE — the response is returned to the client immediately. STEP 13 (`user_question_history`) was already fire-and-forget.

```typescript
// DB writes fire in background — message returned to client immediately
;(async () => {
    try { /* Write A: mark answered; Write B: insert new turn */ }
    catch (err) { console.error('[INTERVIEW_DB_WRITE_ERROR] ...') }
})()
return NextResponse.json({ message: assistantMessage })
```

This saves ~1,200–1,400ms per turn.

### Voice API routes

| Route | Runtime | Purpose |
|---|---|---|
| `POST /api/voice/stt` | Node.js | Whisper-1 transcription. Accepts `multipart/form-data` with `audio` (Blob) + `session_id`. Returns `{ transcript }`. |
| `POST /api/voice/tts` | **Edge** | TTS-1 synthesis. Accepts `{ text, voice? }`. Pipes `ReadableStream<Uint8Array>` directly. Voice defaults to `'onyx'`. Edge runtime avoids Vercel 30s timeout. |
| `POST /api/voice/opening` | Node.js | Fetches Turn 0 content from `interview_turns` for TMAY playback on session start. Returns `{ content }`. |

### InterviewState machine

`'ASSISTANT_SPEAKING' | 'WAITING_FOR_USER' | 'READY_FOR_NEXT' | 'SESSION_ENDING' | 'TRANSCRIBING' | 'THINKING'`

### Critical voice invariants

- `isStartingRef` guard prevents double `startSession()` calls
- 5KB blob guard in `askNextQuestion()` rejects near-empty recordings
- `user_answer` is written by `/api/turns/answer` **before** `/api/interview` is called — enforced in `useBatchVoice.ts`
- All post-turn side effects (`assistantTurnCount++`, `startRecording()`) live in `audioEl.onended` — never before
- **Do NOT call `setEvalResult` before `router.push`** in `handleEnd()` for standard interviews

---

## Interview System

### System prompts

System prompts live in the `scenarios.system_prompt` column in Supabase. There are no prompt config files — `app/config/interview-prompts.ts`, `lib/question-families.ts`, and `lib/entry-families.ts` have been deleted.

Each scenario row's `system_prompt` contains two runtime placeholders substituted in `app/api/interview/route.ts` before the GPT call:

- `{{BLOCKLIST}}` — numbered list of recent questions asked to this user for this role + round
- `{{TRANSCRIPT}}` — full conversation history formatted as `Interviewer: ... / Candidate: ...`

### Calibration banks

Each `system_prompt` includes calibration example banks (positive style examples). These were reduced from 50 examples per bank to **5 examples per bank** across all 12 scenario rows, reducing GPT-4o input token count from ~2,200 to ~1,040 tokens per call. Interview quality is unchanged — banks are style examples, not logic.

### GPT-4o call parameters

```typescript
openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,   // [system, ...history, user]
    temperature: 0.7,
    max_tokens: 500,
    // stream is NOT set — full response awaited
})
```

### Turn authority

The interview API requires `is_first_question === true || turn_authority === true` to generate a response. Calls without authority return `{ message: null, suppressed: true }`. The API throws if `messages.length === 0` — it must never generate TMAY.

### Anti-convergence blocklist

Fetched from `user_question_history` table. Scoped by `user_id` + `role` + `round`. Limited to the 50 most recent questions. Injected as `{{BLOCKLIST}}`.

---

## Evaluation Pipeline (`app/api/evaluate/route.ts`)

`export const maxDuration = 120` — Vercel function timeout.

### Depth rules

| Answered turns | Depth | Behaviour |
|---|---|---|
| < 2 | Insufficient | No evaluation — in-page message shown |
| 2–3 | Shallow | Stages 1–2 only; answer upgrades and rules skipped |
| ≥ 4 | Full | All stages run for every paid session — no tier gate (pricing redesign, 2026-06-24) |

### Stage flow

1. **Stage 1 — Extract** (`lib/evaluation/stage1-extract.ts`): Parses `interview_turns` into `Stage1Output` (array of `TurnExtraction`). `max_tokens: 8000`.
2. **Stage 2 — Evaluate** (`lib/evaluation/stage2-evaluate.ts`): Competency scoring on 1–5 scale using `o4-mini`. Produces `CompetencyScore[]`, `overall_score`, `recommendation`, `narrative`, `turn_diagnostics`, `top_strengths`, `gaps`. All backward-compat fields (`hiring_signal`, `hireable_level`, `weighted_composite`, `hire_band`) computed in TypeScript — GPT never computes weighted scores. `max_completion_tokens: 8000`.
3. **Stage 3 — Rewrite** (`lib/evaluation/stage3-rewrite.ts`): Grounded answer rewrites for the 3 weakest turns. **Full depth only — no tier gate.** `runStage3(stage1, stage2)` no longer takes a tier argument. Behavioral upgrades must add named context and quantified outcomes; hypothetical upgrades must add structural reasoning. `max_tokens: 3000`.
4. **Stage 4 — Rules** (`lib/evaluation/stage4-rules.ts`): 3–5 session-specific personal answer rules grounded to a specific `turn_index` and verbatim quote. **Full depth only — no tier gate.** The tier gate that used to wrap the `runStage4` call site in `evaluate/route.ts` was removed; `stage4-rules.ts` itself never had a tier check. `max_tokens: 1000`.

### Stage 2 competency scoring

- **Score scale:** 1–5 (not 1–4)
- **Gap field:** Required for scores 1–4. Null only at score 5 (exceptional, no gaps). Score 4 = strong with minor gaps — the gap must name the specific minor gap.
- **`runStage2` signature:** `(stage1Output, role, round, roundTitle, evaluationGuidance)` — 5 args. `evaluationGuidance` comes from `scenarios.evaluation_guidance`.

### Post-stage derived fields (no new AI calls)

- **`momentum_card`**: `strongest_signal` (top strength, max 6 words) + `one_fix` (from `gaps_structured[0].fix_in_one_sentence`) + `progress_note` (delta vs prior session in same role)
- **`overall_score`**: Written to `sessions.overall_score NUMERIC(3,1)` after evaluate
- **Star Interviewer**: After evaluate, checks if all 4 rounds have a completed session with `overall_score >= 4.0`. If true, writes `star_interviewer: true` to `users` table. Non-critical try/catch.

### Idempotency

If `session.status === 'completed'` and `session.evaluation_data` exists, the route returns immediately with existing data + fresh signed URL. No re-evaluation.

### Signal synthesis

`lib/signalSynthesis.ts` runs after stage 2 via `synthesizePreparationSignals()`. **Currently broken for the new pipeline** — see Known Issues. Wrapped in try/catch; failure is non-critical and logged.

### PDF generation

`lib/pdfGenerator.ts` produces:
1. Cover page
2. TMAY analysis + High-Level Assessment
3. Performance Scorecard (1–5 competency bars) + Core Strengths + Areas for Improvement
4. Answer Upgrades (all paid sessions — no tier gate)
5. Annotated Transcript (turn-by-turn with signal annotations)
6. Personal Answer Rules (all paid sessions — `isExtendedEval` tier gate removed 2026-06-24, see Pricing & Packages)

PDF stored as a path in `sessions.pdf_url`. Signed URL generated on demand (1hr expiry). PDFKit requires ASCII-only output — no unicode characters.

---

## Tier & Feature Gates

Pricing redesign, 2026-06-24: feature gating is no longer tier-based. The table below is keyed on free-vs-paid and on evaluation depth, not on `package_tier`.

| Feature | Free Session | Paid Session (Single / Practice Pack / Full Prep) |
|---|---|---|
| Basic evaluation (stages 1–2) | ✓ | ✓ |
| Answer upgrades (stage 3) | ✓ (if full depth) | ✓ (if full depth) |
| Personal answer rules (stage 4) | ✓ (if full depth) | ✓ (if full depth) |
| AI Fluency round (Round 4) | — | ✓ |
| Salary negotiation simulation | — | Hidden from UI as of 2026-06-24 — see Known Issues |
| `overall_score` written to DB | ✓ | ✓ |
| Star Interviewer check | ✓ | ✓ |

Round 4 (AI Fluency) gate is enforced in `app/api/session/start/route.ts` before credit deduction — this is a session-start gate, not an evaluation-depth gate, and was explicitly left untouched by the pricing redesign. Answer upgrades and personal answer rules are now gated purely on evaluation depth (`evaluationDepth === 'full'`, i.e. ≥ 4 answered turns) — see Evaluation Pipeline above.

---

## Critical Invariants — Never Break These

### 1. TMAY is Always Turn 0, Pre-Seeded

`interview_turns` gets `turn_index: 0`, `content: 'Tell me about yourself.'` inserted at session creation in `app/api/session/start/route.ts`. The interview API throws if `messages.length === 0` — it must never generate TMAY.

### 2. Turn Authority — AI Never Speaks Without User Input

The interview API gates all GPT calls on `is_first_question === true || turn_authority === true`. Without authority it returns `{ message: null, suppressed: true }`.

### 3. `user_answer` Must Never Be Null on Answered Turns

`/api/turns/answer` writes `user_answer` **before** `/api/interview` marks the turn `answered = true`. `useBatchVoice.ts` enforces this ordering. The evaluate route aborts if fewer than 50% of answered turns have `user_answer` content.

### 4. DB Write Ordering in the Client

`useBatchVoice.ts` calls `/api/turns/answer` and **awaits it** before calling `/api/interview`. Do not make these concurrent.

### 5. Fire-and-Forget Race Condition (Accepted)

STEP 12 (mark answered + insert new turn) runs in a background IIFE. STEP 13 (`user_question_history`) also runs as a background IIFE. `nextIndex` in STEP 13 will read `1` (initial value) rather than the computed turn index because STEP 12 computes it asynchronously. This affects only the `turn_index` metadata column in `user_question_history` — the anti-convergence blocklist does not filter by turn_index. Accepted trade-off for ~1.2–1.4s response time saving.

### 6. RLS Must Never Be Bypassed Casually

Use `adminClient` (service role) only for session creation and internal operations. User-facing queries must use the standard Supabase client with RLS enforced. Never use the anon client for cross-user queries.

### 7. Evaluation Depth Governs What Runs

`< 2` → Insufficient (no eval). `2–3` → Shallow (stages 1–2 only). `≥ 4` → Full (all stages run for every paid session). As of the 2026-06-24 pricing redesign, answer upgrades and personal answer rules run for ALL sessions at full depth — there is no tier gate anymore. Depth is about data quality, not entitlement.

### 8. Weighted Scores Are Always Computed in TypeScript

GPT returns `score` (1–5) + `evidence` + `gap` per competency only. `band`, `weighted_composite`, `hire_band`, and all backward-compat fields are computed in TypeScript after parsing. Never ask GPT to compute these.

### 9. PostgREST Join-Column Filtering Is Unreliable

Filter joined data in JavaScript after fetching, not in the query. See `getPriorSessionForRoleLevel` in `app/api/evaluate/route.ts` for the approved pattern.

### 10. Do NOT Add New OpenAI Calls in the Evaluate Pipeline

All new evaluation fields must be derived deterministically from already-computed output. Requires explicit approval.

### 11. Do NOT Edit `lib/database.types.ts` Manually

Always regenerate after migrations:
```
npx supabase gen types typescript --project-id wlfseesoezrtviexpawn --schema public > lib/database.types.ts
```

`wlfseesoezrtviexpawn` is **Praxis MVP** — confirm this is still the correct source-of-truth project before running; there is a second linked project, **PraxisNow Staging** (`ebwmaauvtlrdksunvbui`), and this repo has no `supabase link` set, so the project ID isn't implicit. See Known Issue 16.

### 12. Do NOT Hardcode Session Duration

Always read from `scenario.session_duration_minutes` with `?? 30` fallback. Never hardcode any duration value in the simulator.

---

## Known Issues / Technical Debt

1. **Signal synthesis silently broken — produces empty/garbage output on every session, including paid Pro sessions.** Upgraded severity as of 2026-06-24 audit: this is not just "non-critical and skipped," it runs without crashing but produces structurally empty synthesis on every single evaluation. Root cause, confirmed by reading `app/api/evaluate/route.ts:368`: `const gaps: any[] = stage2.gaps ?? []` binds `gaps` to `stage2.gaps`, which is `string[]`. Lines 437–450 then access `gaps[0].gap_type`, `g.limit`, `g.impact_scope`, `g.why_it_matters`, `g.fix_in_one_sentence` on what are plain strings — all `undefined`, no crash because `gaps` is typed `any[]`. The correct field, `stage2.gaps_structured: Gap[]` (an actual object array), exists on `Stage2Output` and is never used here. Additionally, lines 459–460 pass `stage2.answer_level_diagnostics` and `stage2.tmay_diagnostic` into the synthesis input, but **neither field exists on `Stage2Output`** (verified against `lib/evaluation/stage2-evaluate.ts`) — both are always `undefined`. Root fix is two lines: change `stage2.gaps` to `stage2.gaps_structured` at `evaluate/route.ts:368`, and correct the two undefined field references. The earlier "null-guard" commit prevented crashes but did not fix this.

2. **`nextIndex` in `user_question_history` always writes `1`** — STEP 13 reads `nextIndex` before the background IIFE for STEP 12 has computed it. `turn_index` in that table is metadata only; the anti-convergence blocklist is unaffected. Accepted race condition. Confirmed unchanged as of 2026-06-24 audit (`app/api/interview/route.ts:129-197`).

3. **`Pro+` is active branching logic in ~10 files, not a type-cleanup item.** Upgraded severity as of 2026-06-24 audit. `Pro+` drives real runtime behavior, not just TypeScript types: `app/admin/users/[id]/page.tsx` (tier dropdown), `app/dashboard/page.tsx` (gates negotiation upsell), `app/api/evaluate/route.ts` (×2, gates extended eval + PDF param), `app/api/session/start/route.ts` (×2, gates Round 4), `app/api/razorpay/verify/route.ts` (legacy SKU mapping), `lib/eval-logic.ts`, `lib/pdfGenerator.ts`, `lib/evaluation/stage3-rewrite.ts`, `lib/signalSynthesis.ts` (behavioral branch: `tier === 'Pro+' ? 5 : 3` observation count), `app/api/negotiation/end/route.ts`. **Do not remove `Pro+` without a full audit of all ~10 sites** — this is a parallel tier, not dead enum plumbing.

4. **`lib/eval-logic.ts` is NOT dead code — correcting a prior error in this doc.** It is actively imported by `app/admin/actions.ts` (`BUILD_PROMPT`, used by admin scenario generation) and `app/simulator/[scenarioId]/page.tsx` (`EvalResult` type). Do NOT delete.

5. **Star Interviewer not read from DB** — The dashboard computes the Star Interviewer callout as a frontend-only calculation. The `star_interviewer` column on `users` is written by the evaluate route but the dashboard does not read it — it recomputes from session history.

6. **Session history grows unbounded** — The full `messages` array is passed in by the client on every call and appended to the OpenAI message list. No trimming. This will grow the prompt over long sessions.

7. **`lib/signalSynthesis.ts` null guards added but root cause not fixed** — `?? ''` and `?? []` guards were added to prevent crashes, but the data shape mismatch (string[] vs object[]) is the root issue. See item 1 above for the full corrected root cause.

8. ✅ **Fixed (2026-06-24) — Pricing page / backend mismatch.** `app/pricing/page.tsx` previously displayed Starter = ₹999 / 2 sessions, Pro = ₹2499 / 5 sessions while the backend charged different amounts entirely. Resolved as part of the no-tiers pricing redesign: the pricing page was rewritten from scratch with four cards (Free session, Single ₹499, Practice Pack ₹1,399, Full Prep ₹2,199) whose `packId`s and displayed prices now match `app/api/razorpay/route.ts`'s `amountMap` exactly — there is a single source of truth for each price, not two independently-maintained ones. See Pricing & Packages section above.

14. **Negotiation simulation is hidden from UI as of 2026-06-24.** Backend intact at `app/negotiator/page.tsx`, `app/api/negotiation/**`, `lib/negotiation-coach.ts` — not deleted, feature may be revisited. UI changes made: removed the negotiation upsell card from `app/dashboard/page.tsx` (the "BONUS NEGOTIATION CARD" block that linked to `/simulator/negotiation`); the new `app/pricing/page.tsx` never mentions negotiation as a feature/perk; `app/negotiator/page.tsx` now redirects to `/dashboard` via `router.replace()` in a `useEffect` for anyone who navigates there directly (the existing `checkingAccess` loading state means they see a brief "Checking Access..." screen, not the negotiation UI, before being redirected). Not touched: `app/simulator/[scenarioId]/page.tsx`'s `scenarioId === 'negotiation'` branch (handles direct navigation to `/simulator/negotiation` — its only discovery path, the dashboard card, is now gone, so it's an unreachable dead end rather than a redirect target); the `package_tier === 'Pro' || 'Pro+'` negotiation gate in `session/start` (harmless dead code now); any database columns or `/api/negotiation/**` route logic.

15. ✅ **Fixed (2026-06-24) — Free session gate.** Live Supabase confirmed `users.free_session_used` exists (default `false`) — this column was real but unused anywhere in the repo, the same "live DB ahead of repo" pattern as the `status` CHECK constraint below. **Confirmed live contract:** `handle_new_user()` gives new users `package_tier = 'Free'`, `available_sessions = 0`, `free_session_used = false` (relies on the column default for the last one — the trigger does not insert it explicitly, and that's intentional, not a gap to fix from code). Fixed in `middleware.ts` (the `/simulator` page-level gate) and `app/api/session/start/route.ts`: STEP 5's gate now allows a `package_tier === 'Free'` user through when `free_session_used === false`, and — critical correction from an earlier pass — STEP 5's `available_sessions < 1` check is now skipped entirely for the free-session path, since a brand-new free user's `available_sessions` is `0` by design, not `1`. STEP 8's deduction now branches explicitly: a free session only flips `free_session_used = true` (atomically guarded by `.eq('free_session_used', false)`, mirroring the paid path's `.gt('available_sessions', 0)` guard) and never touches `available_sessions`; a paid session decrements `available_sessions` exactly as before. Decrementing `available_sessions` on a free session would have taken it from 0 to -1 — that was the bug in the immediately prior pass, caught before merge. STEP 9's rollback-on-insert-failure mirrors the same branch (resets `free_session_used` to `false` for a free session, restores `available_sessions` for a paid one — never both). The AI Round (4) gate in STEP 7 was already correctly excluding Free tier and needed no change. Middleware does **not** duplicate the round-4 check — it only decides whether the user can reach `/simulator` at all; the authoritative per-scenario round decision stays in `session/start`.

9. ✅ **Not a blocker — confirmed via live Supabase schema, 2026-06-24.** The `sessions.status` CHECK constraint on the live database DOES include `'evaluating'`. `supabase/hardening.sql`'s narrower constraint (`CHECK (status IN ('created', 'active', 'completed', 'failed'))`) was never applied to prod — it's stale repo content, same pattern as the pricing-page mismatch and the free-session gap above: code/SQL in this repo lagging behind what's actually deployed. No action needed, but `hardening.sql` itself remains misleading documentation — see item 12 (stale scratch files) for the broader cleanup this points to.

16. ✅ **Fixed (2026-06-24) — `lib/database.types.ts` was stale, missing `free_session_used`.** Regenerated via `npx supabase gen types typescript --project-id wlfseesoezrtviexpawn --schema public > lib/database.types.ts` against the **Praxis MVP** project (`wlfseesoezrtviexpawn`, Mumbai) — the project this session's live-DB confirmations (`free_session_used`, the `status` CHECK constraint) were checked against. Note there are two Supabase projects linked to this account: **Praxis MVP** (`wlfseesoezrtviexpawn`) and **PraxisNow Staging** (`ebwmaauvtlrdksunvbui`, Singapore) — this repo has no `supabase link` set, so the project ID must be passed explicitly every time this command is run. Confirm which project is the source of truth before regenerating again; running it against the wrong project will silently reintroduce drift. The `as any` workaround that had been added to `app/api/session/start/route.ts`'s STEP 5 query (to work around the missing `free_session_used` type) was removed now that the real types include it.

10. **No `.env.example` existed before this audit** — see new "Environment Variables" section above. Required env vars were previously undocumented anywhere in the repo.

11. **RLS gaps — verify live DB RLS state before launch.** `supabase/hardening.sql` only defines RLS for `sessions`, `custom_scenarios`, and `users`. No RLS policy was found anywhere in the repo for `interview_turns`, `user_question_history`, or `purchases` — tables holding answer transcripts, question history, and payment records respectively. Cannot confirm from the repo whether RLS was added directly in the Supabase dashboard; check the live schema.

12. **~40 stale scratch files at repo root** — `discovery-report.md`, `REBUILD_HANDOFF.md`, `PART2_HANDOFF.md`, `PRO_PLUS_MERGE_*.md`, `TEST_EVALUATION.md`, `LANDING_PAGE_*.md`, `LINKEDIN_AUTH_*.md`, one-off SQL patches (`FIX_*.sql`, `ADD_*.sql`, `SETUP_*.sql`, `DEBUG_DISABLE_RLS.sql`, `RECREATE_SESSIONS_TABLE.sql`, etc.), and loose scripts (`check_schema.js`, `debug_braces.js`, `diagnose_syntax.js`, `insert_scenarios.js`). None are imported by the app. Some of the SQL files may or may not have been applied to the live database — there is no way to tell from the repo alone. Recommend moving to `/scratch` or `/docs/archive` and noting they are not production-tracked, rather than deleting outright (some may document real past migrations not captured in `supabase/migrations/`).

13. **Dead npm scripts** — `package.json` references `scripts/seed-question-families.ts` and `scripts/seed-entry-families.ts`, neither of which exists (only `scripts/seed-evaluation-guidance.ts`, `scripts/audit_session.js`, `scripts/execute_sql.js` exist). Running `npm run seed-families` or `npm run seed-entry` will fail. Remove or update these `package.json` entries.

---

## Go-Live Blockers

Summary only — see the standalone Go-Live Readiness Report for the full assessment table and fix-order list.

- ✅ **Pricing page mismatch** (Known Issue 8) — Fixed 2026-06-24. `app/pricing/page.tsx` now shares the exact same `packId`/price values as `/api/razorpay`'s `amountMap`.
- ✅ **Free session gate** (Known Issue 15) — Fixed 2026-06-24. `middleware.ts` and `session/start/route.ts` now gate Free-tier access on `free_session_used` instead of blocking the tier outright.
- 🔴 **`signalSynthesis.ts` silent failure** (Known Issue 1) — every paid session's PDF is missing synthesis output; root cause is a 2-line fix in `app/api/evaluate/route.ts:368` plus two field-name corrections.
- ✅ **`sessions.status` CHECK constraint** (Known Issue 9) — confirmed NOT a blocker via live Supabase schema; `'evaluating'` is already a valid value in prod. `hardening.sql`'s narrower constraint in the repo was stale and never applied.
- 🟡 **RLS coverage** (Known Issue 11) — `interview_turns`, `user_question_history`, `purchases` have no RLS in the repo; must be checked against the live Supabase schema.
- 🟡 **`pg_cron` stale-session cleanup** — no cron job found anywhere in the repo; either it lives only in the Supabase dashboard or was never set up. Verify directly in Supabase.
- 🟢 **Admin route auth** — re-checked during this audit and confirmed NOT a blocker: `checkAdmin()` gates both `/admin/**` pages (via `app/admin/layout.tsx`) and the `/api/admin/**` route handlers independently.

---

## Key Files

| File | Purpose |
|---|---|
| `app/api/interview/route.ts` | Core interview loop — gpt-4o question generation, fire-and-forget DB writes, anti-convergence blocklist, latency instrumentation |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → momentum card → PDF → signed URL. `maxDuration = 120`. |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, credit deduction, round stored on session row, tier gate for R4 |
| `app/api/voice/stt/route.ts` | Whisper-1 STT — accepts audio blob, returns transcript |
| `app/api/voice/tts/route.ts` | TTS-1 synthesis — pipes `ReadableStream<audio/mpeg>`. **Edge runtime.** |
| `app/api/voice/opening/route.ts` | Fetches Turn 0 content for TMAY playback |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `app/results/[session_id]/page.tsx` | Results screen — Verdict, Performance Scorecard, Strongest Moment, The One Thing, What's Next |
| `app/dashboard/page.tsx` | Dashboard — Practice tab (role selector, scenario grid, score history), History tab |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — evaluation progress UI, redirects on eval complete |
| `hooks/useBatchVoice.ts` | **Primary voice hook** — STT→LLM→TTS batch pipeline, blob URL audio playback |
| `hooks/useRealtimeVoice.ts` | Legacy voice hook — WebRTC/Realtime API. Not used in production. |
| `lib/evaluation/stage1-extract.ts` | Stage 1 — parses `interview_turns` into `Stage1Output` |
| `lib/evaluation/stage2-evaluate.ts` | Stage 2 — o4-mini competency scoring (1–5), 5-arg `runStage2` |
| `lib/evaluation/stage3-rewrite.ts` | Stage 3 — grounded answer rewrites; behavioral vs hypothetical rules |
| `lib/evaluation/stage4-rules.ts` | Stage 4 — session-specific personal answer rules with verbatim quote grounding |
| `lib/evaluation-progress.ts` | `getEvaluationSteps(role, round)` — step labels for simulator progress UI |
| `lib/pdfGenerator.ts` | PDF generation — 1–5 scorecard, strengths, improvements, answer upgrades, annotated transcript |
| `lib/signalSynthesis.ts` | Post-evaluation signal processing — broken for new pipeline (see Known Issues) |
| `lib/grounding-check.ts` | Validates answer upgrades — passes through when source turn cannot be matched |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation |
| `lib/runtime-scenario.ts` | `normalizeRole`, `derivePersona`. `normalizeRole` imported by session/start. |
| `lib/replay-comparison.ts` | `compareReplayAttempts` — used by the replay block in the evaluate route |
| `lib/database.types.ts` | Supabase-generated TypeScript types — **do not edit manually** |
| `app/admin/**` | Admin panel — scenarios CRUD, users CRUD, sessions viewer, dev-interview harness. Gated by `checkAdmin()`, see Admin Panel section. |
| `app/scenarios/builder/page.tsx` | Custom scenario builder UI |
| `app/onboarding/page.tsx` | Onboarding flow |
| `app/profile/page.tsx` | User profile page |
| `app/test-interview/page.tsx` | Dev/test interview harness (non-production) |
| `app/pricing/page.tsx` | Pricing + payment buttons. ⚠️ Prices displayed do not match backend charges — see Known Issue 8 / Go-Live Blockers |
| `app/api/admin/scenarios/route.ts` | Admin scenarios CRUD API. Gated by `checkAdmin()`. |
| `app/api/admin/dev-interview/start/route.ts` | Dev interview start route. Gated by `checkAdmin()`. |
| `app/api/admin/dev-interview/control/route.ts` | Dev interview control route. Gated by `checkAdmin()`. |
| `app/api/negotiation/end/route.ts` | Ends negotiation session, triggers evaluation |
| `app/api/pdf/generate/route.ts` | On-demand PDF generation route |
| `app/api/session/route.ts` | Activates a session (`status: 'created' → 'active'`) when `useBatchVoice.startSession()` calls it. Repurposed from the old OpenAI Realtime ephemeral-token route — no Realtime API calls remain in the batch flow. Not called by the legacy `useRealtimeVoice.ts` path. |
| `app/api/support/route.ts` | Support request handler |
| `app/api/turns/create/route.ts` | Turn creation route |
| `hooks/useWakeLock.ts` | Prevents screen sleep during active interview sessions |
| `lib/admin-server.ts` | Server-side admin utilities — `checkAdmin()`, `getAdminSupabase()`, `logAdminAction()` |
| `lib/negotiation-coach.ts` | Negotiation coaching logic — exports `NEGOTIATION_COACH_PROMPT`, used by `/api/session` for negotiation-type sessions |
| `lib/shuffle.ts` | Fisher-Yates shuffle utility — `fisherYatesShuffle()`, unbiased array randomization (e.g. question order) |

---

## Database Tables (Core)

### `users`
| Column | Notes |
|---|---|
| `package_tier` | `'Free' \| 'Starter' \| 'Pro' \| 'Pro+'`. **All new purchases set this to `'Pro'` for backward compat with the negotiation gate. Do not use this field to gate evaluation features — it is no longer meaningful for that purpose** (pricing redesign, 2026-06-24; see Pricing & Packages). `'Starter'` is now a dead value nothing writes anymore. |
| `available_sessions` | Credits remaining |
| `total_sessions_used` | Lifetime count |
| `star_interviewer` | Written by evaluate route when all 4 rounds ≥ 4.0 |

### `sessions`
| Column | Notes |
|---|---|
| `round` | Which round (1–4). Written at session creation from `scenario.round`. |
| `evaluation_data` | Full evaluator output: `competencies`, `dimension_scores`, `weighted_composite`, `hire_band`, `hiring_signal`, `hireable_level`, `turn_diagnostics`, `top_strengths`, `gaps`, `strengths`, `areas_for_improvement` |
| `overall_score` | `NUMERIC(3,1)`. Written after stage 2. Range 1.0–5.0. |
| `dimension_scores` | Backward-compat array mapped from `competencies`. |
| `momentum_card` | `{ strongest_signal, one_fix, progress_note }`. Derived after stage 2. |
| `pdf_url` | Storage path (not signed URL). Signed URL generated on demand. |
| `replay_of_session_id` | Links to original session for replay sessions. |
| `status` | `'created' \| 'active' \| 'evaluating' \| 'completed' \| 'failed'` |

### `interview_turns`
| Column | Notes |
|---|---|
| `turn_index` | 0 = TMAY, 1+ = interview turns |
| `turn_type` | `'question'` (interviewer turns) |
| `content` | Interviewer question text |
| `answered` | True once user has answered and next question inserted |
| `user_answer` | **Canonical field for evaluation.** Written by `/api/turns/answer` before `answered = true`. |
| `user_answer_word_count` | — |
| `user_answer_captured_at` | — |

### `scenarios`
| Column | Notes |
|---|---|
| `role` | e.g. `'Product Manager'` |
| `round` | 1–4 |
| `round_title` | e.g. `'Product Sense & Design'` |
| `evaluation_dimensions` | Dimensions scored in this round |
| `system_prompt` | Full GPT system prompt with `{{BLOCKLIST}}` and `{{TRANSCRIPT}}` placeholders. Contains calibration banks (5 examples per bank). |
| `evaluation_guidance` | Injected into stage2 prompt as `evaluationGuidance` argument |
| `duration_minutes` | Default 30. Read by simulator — never hardcode. |
| `is_active` | — |

### `user_question_history`
Anti-convergence store. Keyed by `user_id` + `role` + `round`. Queried with `.limit(50)`. `turn_index` column may always read `1` due to background IIFE timing (metadata only, non-critical).

### `purchases`
Payment records. Insert triggers session credit addition.

---

## Scenario Architecture

12 seeded scenarios in `supabase/seed/scenarios.sql`:
- **Product Manager** — R1: Product Sense & Design, R2: Metrics & Execution, R3: Behavioral & Leadership, R4: AI Fluency
- **Software Development Engineer** — R1: System Design, R2: Coding & Problem Solving, R3: Behavioral & Ownership, R4: AI/ML Systems
- **Data Scientist** — R1: Statistics & Foundations, R2: ML System Design, R3: Behavioral, R4: AI Fluency

Round 4 (AI Fluency) requires Pro tier — enforced in `session/start`. The `system_prompt` for each scenario row is the complete GPT interviewer prompt. There is no separate prompt-builder.
