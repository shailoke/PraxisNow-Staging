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

### 6. Evaluation Depth Rules
- `< 2 answered turns` → Insufficient (no evaluation)
- `< 4 answered turns` → Shallow (skips answer upgrades)
- `>= 4 answered turns` → Full evaluation
- Answer upgrades only available on Pro tier

---

## Key Files

| File | Purpose |
|------|---------|
| `app/api/interview/route.ts` | Core interview loop — ~400 lines, contains known duplicate `family_selections` DB fetch |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline → PDF generation |
| `app/api/session/start/route.ts` | Session creation, TMAY pre-seeding, Entry Family resolution, credit deduction |
| `app/api/razorpay/route.ts` | Razorpay order creation |
| `app/api/razorpay/verify/route.ts` | Payment verification + tier upgrade logic |
| `lib/entry-families.ts` | Entry Family definitions per role + level |
| `lib/runtime-scenario.ts` | Scenario resolution, persona derivation, `normalizeRole`, `normalizeLevel` |
| `lib/probes.ts` | Probe question logic |
| `lib/eval-logic.ts` | Evaluator prompt generation (tier-gated) |
| `lib/signalSynthesis.ts` | Post-evaluation signal processing before PDF |
| `lib/pdfGenerator.ts` | PDF generation from evaluated data |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation |
| `lib/database.types.ts` | Supabase-generated TypeScript types — source of truth for DB schema |
| `app/dashboard/page.tsx` | Main user dashboard |
| `app/scenarios/builder/page.tsx` | Custom scenario builder (Pro only, 3–4 dimensions) |

---

## Database Tables (Core)
- `users` — profile, `package_tier`, `available_sessions`, `total_sessions_used`
- `sessions` — interview sessions, `family_selections` (JSONB), `dimension_order`, `replay_of_session_id`
- `interview_turns` — canonical source of truth for all turns; fields: `turn_index`, `turn_type`, `content`, `answered`
- `scenarios` — pre-defined roles + levels with `evaluation_dimensions` and `prompt`
- `custom_scenarios` — user-created overrides with `focus_dimensions` and `company_context`
- `question_families` — question families mapped to dimensions
- `user_family_usage` — tracks used families per user (Pro/Pro+ only) for freshness
- `purchases` — payment records; insert triggers session credit addition

---

## Known Technical Debt
- `interview/route.ts` fetches `family_selections` from DB twice in the same request (duplicate fetch)
- Multiple `@ts-ignore` and `as any` casts throughout the session and evaluation flow
- SQL migrations are scattered across `sql/`, `supabase/migrations/`, and root-level `.sql` files with no unified ordering
- `Pro+` enum still present in TypeScript types — pending cleanup after 7–14 days of stability
- Dimension order falls back softly if `dimension_order` is missing from session — should become a hard error

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

## Pending Optional Cleanup (Low Risk, After Stability)
```sql
-- Drop legacy Pro+ DB constraint when ready
ALTER TABLE users DROP CONSTRAINT users_package_tier_check;
ALTER TABLE users ADD CONSTRAINT users_package_tier_check
  CHECK (package_tier IN ('Free', 'Starter', 'Pro'));
```
```typescript
// lib/database.types.ts — update when ready
export type PackageTier = 'Starter' | 'Pro'
```