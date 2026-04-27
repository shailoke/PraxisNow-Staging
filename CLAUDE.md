# PraxisNow — Claude Code Context

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

## Tiers & Packages

Two active tiers (Pro+ is legacy):

| Tier | Price | Sessions | Notes |
|---|---|---|---|
| **Free** | — | 0 | Must purchase a pack |
| **Starter** | ₹599 / pack | 3 | Awareness-focused evaluation |
| **Pro** | ₹899 / pack | 5 | Full evaluation, answer upgrades, salary negotiation, AI Fluency round (R4) |
| **Pro+** | Legacy SKU | 7 | Maps to Pro tier for backward compat; `pro_plus` enum still in TypeScript types |

Payment SKUs in `app/api/razorpay/verify/route.ts`:
- `starter` → Starter tier, 3 sessions
- `pro` → Pro tier, 5 sessions
- `pro_plus` → Legacy SKU → Pro tier, 7 sessions

### User-facing language

All user-facing UI uses session-pack language ("purchase a session pack", "included with every paid session"). Plan/tier names ("Pro plan", "Starter plan") do not appear in rendered UI. The underlying DB column `package_tier` and Razorpay `descriptionMap` strings are internal and unchanged.

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
  → POST text → /api/voice/tts (tts-1, 'onyx')    → still THINKING (no state change yet)
  → MediaSource stream pump (primary) OR blob URL (iOS Safari fallback)
  → audioEl.oncanplay fires → ASSISTANT_SPEAKING state
  → audioEl.play() [primary: inside appendNext() after first appendBuffer]
  → audioEl.onended: cleanup, reset state, startRecording()
  → WAITING_FOR_USER state
```

### Audio playback mechanism

TTS audio uses **MediaSource streaming** as the primary path so audio starts after the first chunk (~300ms) rather than waiting for the full response to buffer. iOS Safari falls back to a blob URL because `MediaSource.isTypeSupported('audio/mpeg')` returns false there.

**Capability check (runs once per TTS call):**
```typescript
const supportsMediaSource = typeof MediaSource !== 'undefined' &&
    MediaSource.isTypeSupported('audio/mpeg')
```

**Primary path — MediaSource stream pump:**
```typescript
const mediaSource = new MediaSource()
const msUrl = URL.createObjectURL(mediaSource)
const audioEl = new Audio(msUrl)
audioEl.oncanplay = () => { setInterviewState('ASSISTANT_SPEAKING'); ... }

mediaSource.addEventListener('sourceopen', () => {
    const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
    let playbackStarted = false
    const appendNext = async () => {
        const { done, value } = await reader.read()
        if (done) { mediaSource.endOfStream(); return }
        sourceBuffer.appendBuffer(value)
        sourceBuffer.addEventListener('updateend', () => {
            if (!playbackStarted) {
                playbackStarted = true
                audioEl.play()   // play fires after FIRST chunk, not before
            }
            appendNext()
        }, { once: true })
    }
    appendNext()
})
```

**Fallback path — blob URL (iOS Safari):**
```typescript
const blob = await ttsRes.blob()
const blobUrl = URL.createObjectURL(blob)
const audioEl = new Audio(blobUrl)
audioEl.oncanplay = () => { setInterviewState('ASSISTANT_SPEAKING'); ... }
audioEl.onended = () => { URL.revokeObjectURL(blobUrl); /* reset state, startRecording */ }
audioEl.onerror = (err) => { URL.revokeObjectURL(blobUrl); /* same reset */ }
audioEl.play()
```

`audioContextRef` and `audioSourceRef` remain declared as no-op refs for abort compatibility but are never set during playback. `readerRef` holds the active `ReadableStreamDefaultReader` so `abortInterviewerAudio()` can cancel it mid-stream.

### Pause / Resume mechanism

Pause/resume mid-speech is handled by three refs in `useBatchVoice.ts`:

- **`interruptedTextRef`** — Set to `llmText` immediately before `await speakText(llmText)` in `askNextQuestion()`. Cleared to `null` after `speakText` resolves cleanly. If the speak is aborted mid-playback, the ref retains the text so resume can replay it.
- **`speakRejectRef`** — Stores the `reject` function of the `speakText` Promise at the moment it is created (both MediaSource and blob URL paths). `abortInterviewerAudio()` calls `speakRejectRef.current?.(new Error('AbortError'))` to unblock a hanging `await speakText(...)` call.
- **`replayInterruptedText`** — Callback exported by the hook. Called by `handleResume()` in the simulator page (after a 500ms delay). Re-runs `speakText(interruptedTextRef.current)`, then appends the message to `messagesRef` and clears `interruptedTextRef`.

`abortInterviewerAudio()` additionally calls `setInterviewState('WAITING_FOR_USER')` after aborting, so the UI does not remain stuck in `ASSISTANT_SPEAKING`.

`askNextQuestion()` wraps `speakText` in a try/catch — if aborted, it returns early without clearing `interruptedTextRef`, leaving the text available for `replayInterruptedText`.

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
- **`ASSISTANT_SPEAKING` state is set inside `audioEl.oncanplay`** — never at the call site. The state stays as `THINKING` until the browser signals it has enough data to play.
- **`audioEl.play()` is called inside `appendNext()` after the first `appendBuffer`** (primary MediaSource path) — calling it before any data is buffered will throw `NotAllowedError` or stall silently.
- **`readerRef` holds the active `ReadableStreamDefaultReader`** — `abortInterviewerAudio()` calls `readerRef.current?.cancel()` to terminate the stream mid-flight.
- **`interruptedTextRef` must be set before `speakText()`** — never after. It is the only mechanism for `replayInterruptedText` to know what to replay after a pause.
- **`speakRejectRef.current` is always nulled after use** — both in `onended`/`onerror` (after normal completion) and in `abortInterviewerAudio()` (after abort). Never call it twice.
- **Do NOT call `setEvalResult` before `router.push`** in `handleEnd()` for standard interviews — it causes a `.map()` crash on undefined fields in the simulator results view.

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
| ≥ 4 | Full | All stages run; answer upgrades and rules gated to Pro |

### Stage flow

1. **Stage 1 — Extract** (`lib/evaluation/stage1-extract.ts`): Parses `interview_turns` into `Stage1Output` (array of `TurnExtraction`). `max_tokens: 8000`.
2. **Stage 2 — Evaluate** (`lib/evaluation/stage2-evaluate.ts`): Competency scoring on 1–5 scale using `o4-mini`. Produces `CompetencyScore[]`, `overall_score`, `recommendation`, `narrative`, `turn_diagnostics`, `top_strengths`, `gaps`. All backward-compat fields (`hiring_signal`, `hireable_level`, `weighted_composite`, `hire_band`) computed in TypeScript — GPT never computes weighted scores. `max_completion_tokens: 8000`.
3. **Stage 3 — Rewrite** (`lib/evaluation/stage3-rewrite.ts`): Grounded answer rewrites for the 3 weakest turns. **Pro only, full depth only.** Behavioral upgrades must add named context and quantified outcomes; hypothetical upgrades must add structural reasoning. `max_tokens: 3000`.
4. **Stage 4 — Rules** (`lib/evaluation/stage4-rules.ts`): 3–5 session-specific personal answer rules grounded to a specific `turn_index` and verbatim quote. **Pro only, full depth only.** `max_tokens: 1000`.

### Stage 2 competency scoring

- **Score scale:** 1–5 (not 1–4)
- **Gap field:** Required for scores 1–4. Null only at score 5 (exceptional, no gaps). Score 4 = strong with minor gaps — the gap must name the specific minor gap.
- **`runStage2` signature:** `(stage1Output, role, round, roundTitle, evaluationGuidance)` — 5 args. `evaluationGuidance` comes from `scenarios.evaluation_guidance`.
- **Verification checklist:** The stage 2 prompt includes a mandatory pre-scoring verification block (inserted before the JSON schema). It enforces score discipline for 4.0+, correct hypothetical-round framing (described intent is not problem framing), behavioral specificity rules, and metrics/guardrail rules. GPT must answer these checks internally before writing any score.

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
4. Answer Upgrades (Pro only)
5. Annotated Transcript (turn-by-turn with signal annotations)
6. Personal Answer Rules (Pro only)

PDF stored as a path in `sessions.pdf_url`. Signed URL generated on demand (1hr expiry). PDFKit requires ASCII-only output — no unicode characters.

---

## Tier & Feature Gates

| Feature | Starter | Pro |
|---|---|---|
| Basic evaluation (stages 1–2) | ✓ | ✓ |
| Answer upgrades (stage 3) | — | ✓ |
| Personal answer rules (stage 4) | — | ✓ |
| AI Fluency round (Round 4) | — | ✓ |
| Salary negotiation simulation | — | ✓ (once only) |
| `overall_score` written to DB | ✓ | ✓ |
| Star Interviewer check | ✓ | ✓ |

Round 4 tier check is enforced in `app/api/session/start/route.ts` before credit deduction.

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

`< 2` → Insufficient (no eval). `2–3` → Shallow (stages 1–2 only). `≥ 4` → Full (all stages, Pro-gated features included). Answer upgrades only run if `tier === 'Pro' || tier === 'Pro+'`.

### 8. Weighted Scores Are Always Computed in TypeScript

GPT returns `score` (1–5) + `evidence` + `gap` per competency only. `band`, `weighted_composite`, `hire_band`, and all backward-compat fields are computed in TypeScript after parsing. Never ask GPT to compute these.

### 9. PostgREST Join-Column Filtering Is Unreliable

Filter joined data in JavaScript after fetching, not in the query. See `getPriorSessionForRoleLevel` in `app/api/evaluate/route.ts` for the approved pattern.

### 10. Do NOT Add New OpenAI Calls in the Evaluate Pipeline

All new evaluation fields must be derived deterministically from already-computed output. Requires explicit approval.

### 11. Do NOT Edit `lib/database.types.ts` Manually

Always regenerate after migrations:
```
npx supabase gen types typescript --project-id [project-id] --schema public > lib/database.types.ts
```

### 12. Do NOT Hardcode Session Duration

Always read from `scenario.session_duration_minutes` with `?? 30` fallback. Never hardcode any duration value in the simulator.

### 13. Simulator Eval Error Screen Is Guarded by `isNavigatingToResults`

In `app/simulator/[scenarioId]/page.tsx`, `setShowResults(true)` is called in Phase 2 of `handleEnd()` — before the evaluate API call. When the evaluate API succeeds, `router.push()` fires, then the `finally` block sets `isEvaluating(false)`. Without a guard this renders the error screen briefly before navigation completes. The `isNavigatingToResults` state is set to `true` immediately before `router.push()` and gates the error screen branch (`!isNavigatingToResults`). Never remove this guard.

---

## Known Issues / Technical Debt

1. **Signal synthesis broken for new pipeline** — `synthesizePreparationSignals()` in `lib/signalSynthesis.ts` accesses `gaps[0].gap_type`, `gaps[0].limit`, etc. but `stage2.gaps` is now `string[]`, not an object array. Wrapped in try/catch so non-critical, but synthesis output is skipped entirely. Needs a rewrite to consume the new stage2 output shape before it produces useful output again.

2. **`nextIndex` in `user_question_history` always writes `1`** — STEP 13 reads `nextIndex` before the background IIFE for STEP 12 has computed it. `turn_index` in that table is metadata only; the anti-convergence blocklist is unaffected. Accepted race condition.

3. **`Pro+` enum still present** — TypeScript types still reference `Pro+` in several places. Cleanup pending. The `session/start` negotiation tier check still reads `profile.package_tier !== 'Pro' && profile.package_tier !== 'Pro+'`.

4. **`lib/eval-logic.ts` is mostly dead code** — The evaluation pipeline no longer uses this file's logic. However, the `EvalResult` type it exports is still imported in `app/simulator/[scenarioId]/page.tsx` for the negotiation results branch. Safe to migrate that type inline and delete the file, but not done yet.

5. **Star Interviewer not read from DB** — The dashboard computes the Star Interviewer callout as a frontend-only calculation. The `star_interviewer` column on `users` is written by the evaluate route but the dashboard does not read it — it recomputes from session history.

6. **Session history grows unbounded** — The full `messages` array is passed in by the client on every call and appended to the OpenAI message list. No trimming. This will grow the prompt over long sessions.

7. **`lib/signalSynthesis.ts` null guards added but root cause not fixed** — `?? ''` and `?? []` guards were added to prevent crashes, but the data shape mismatch (string[] vs object[]) is the root issue.

---

## Key Files

| File | Purpose |
|---|---|
| `app/api/interview/route.ts` | Core interview loop — gpt-4o question generation, fire-and-forget DB writes, anti-convergence blocklist, latency instrumentation |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → momentum card → PDF → signed URL. `maxDuration = 120`. |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, credit deduction, round stored on session row, tier gate for R4 |
| `app/api/session/abandon/route.ts` | sendBeacon target — marks session `abandoned` via service-role client if still in a live status. Always returns 200. |
| `app/api/voice/stt/route.ts` | Whisper-1 STT — accepts audio blob, returns transcript |
| `app/api/voice/tts/route.ts` | TTS-1 synthesis — pipes `ReadableStream<audio/mpeg>`. **Edge runtime.** |
| `app/api/voice/opening/route.ts` | Fetches Turn 0 content for TMAY playback |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `app/results/[session_id]/page.tsx` | Results screen — Verdict, Performance Scorecard, Strongest Moment, The One Thing, What's Next. Answer upgrades upsell links to `/pricing`. |
| `app/dashboard/page.tsx` | Dashboard — Practice tab (role selector, scenario grid, score history), History tab. Sessions badge shows `available_sessions + (free_session_used ? 0 : 1)`. Amber recovery banner appears when sessions are stuck in `evaluating` status (10–90 min old). |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — evaluation progress UI, redirects on eval complete. `isNavigatingToResults` guards the error screen during route transition. `beforeunload` guard fires `navigator.sendBeacon('/api/session/abandon', ...)` when tab is closed mid-session. |
| `app/negotiator/page.tsx` | Salary Negotiation Coach — 30-min role-play simulation. Access gated on `package_tier === 'Pro'`. Paywall upsell links to `/pricing`. |
| `hooks/useBatchVoice.ts` | **Primary voice hook** — STT→LLM→TTS batch pipeline. MediaSource stream pump (primary) + blob URL fallback (iOS Safari). Pause/resume via `interruptedTextRef`, `speakRejectRef`, `replayInterruptedText`. State transitions via `oncanplay`. |
| `hooks/useRealtimeVoice.ts` | Legacy voice hook — WebRTC/Realtime API. Not used in production. |
| `supabase/migrations/20250418_stale_session_cleanup.sql` | pg_cron job (runs hourly) — marks sessions stuck in `created/active/evaluating` for >90 min as `abandoned`. **Must be run via Supabase SQL Editor**, not `db push` (requires superuser for pg_cron). |
| `lib/evaluation/stage1-extract.ts` | Stage 1 — parses `interview_turns` into `Stage1Output` |
| `lib/evaluation/stage2-evaluate.ts` | Stage 2 — o4-mini competency scoring (1–5), 5-arg `runStage2`, verification checklist pre-scoring |
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
| `public/praxisnow-logo-dark.svg` | Primary logo (dark backgrounds) — used on landing, auth, dashboard |
| `public/praxisnow-logo.svg` | Logo variant (light backgrounds) |
| `public/favicon.svg` | SVG favicon — primary; `favicon.ico` is fallback for older browsers |
| `public/praxisnow-icon-512.svg` | Apple touch icon |

---

## Database Tables (Core)

### `users`
| Column | Notes |
|---|---|
| `package_tier` | `'Free' \| 'Starter' \| 'Pro' \| 'Pro+'` (Pro+ legacy) |
| `available_sessions` | Paid credits remaining |
| `free_session_used` | `BOOLEAN`. `true` once the free session has been consumed. `NULL` treated as `false` (available) in middleware and client. |
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
| `status` | `'created' \| 'active' \| 'evaluating' \| 'completed' \| 'failed' \| 'abandoned'` |

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

## Session Lifecycle & Abandonment

Sessions can end in five terminal states: `completed`, `failed`, `abandoned`, and two implicit stuck states covered by the cleanup job.

### How sessions become `abandoned`

| Trigger | Mechanism |
|---|---|
| User closes/navigates away mid-session | `beforeunload` in simulator fires `navigator.sendBeacon('/api/session/abandon', { session_id })` → route marks status `abandoned` if still in a live status |
| Session stuck >90 min in any live status | pg_cron job (`20250418_stale_session_cleanup.sql`) runs hourly, bulk-updates to `abandoned` |

### Dashboard recovery banner

On dashboard load, a query fetches sessions with `status = evaluating` that are between 10 and 90 minutes old (i.e., the evaluate job started but never completed). An amber banner renders above the welcome section with a "Resume Evaluation" button per session. Clicking it re-POSTs to `/api/evaluate` and redirects to `/results/:id` on success. The 10-minute lower bound avoids showing the banner for sessions whose evaluate call is still legitimately in-flight.

### pg_cron cleanup

`supabase/migrations/20250418_stale_session_cleanup.sql` must be run manually in the Supabase Dashboard SQL Editor — pg_cron requires superuser privileges not available to the CLI migration runner. The job also requires the `sessions` table CHECK constraint to include `'abandoned'` (steps documented in the migration file comments).

---

## Scenario Architecture

12 seeded scenarios in `supabase/seed/scenarios.sql`:
- **Product Manager** — R1: Product Sense & Design, R2: Metrics & Execution, R3: Behavioral & Leadership, R4: AI Fluency
- **Software Development Engineer** — R1: System Design, R2: Coding & Problem Solving, R3: Behavioral & Ownership, R4: AI/ML Systems
- **Data Scientist** — R1: Statistics & Foundations, R2: ML System Design, R3: Behavioral, R4: AI Fluency

Round 4 (AI Fluency) requires Pro tier — enforced in `session/start`. The `system_prompt` for each scenario row is the complete GPT interviewer prompt. There is no separate prompt-builder.
