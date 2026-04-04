# REBUILD_HANDOFF.md — PraxisNow State of System (2026-04-04)

---

## A. Complete File Inventory

### app/ — Pages and API routes

#### app/ (root pages)
| File | Description |
|------|-------------|
| `app/layout.tsx` | Root Next.js layout — sets fonts, global CSS, minimal shell |
| `app/page.tsx` | Landing/marketing page — redirects authenticated users to /dashboard |
| `app/globals.css` | Global Tailwind CSS, dark theme variables |
| `app/favicon.ico` | Site favicon |

#### app/auth/
| File | Description |
|------|-------------|
| `app/auth/page.tsx` | Auth page — Supabase email magic link and OAuth login |
| `app/auth/callback/route.ts` | Supabase auth callback handler — exchanges code for session cookie |

#### app/admin/
| File | Description |
|------|-------------|
| `app/admin/page.tsx` | Admin dashboard root — shows system overview |
| `app/admin/layout.tsx` | Admin layout with admin-only nav |
| `app/admin/actions.ts` | Server actions for admin operations (seed families, manage users) |
| `app/admin/users/page.tsx` | Admin: list all users, show tiers and session counts |
| `app/admin/users/[id]/page.tsx` | Admin: view and edit individual user profile |
| `app/admin/sessions/page.tsx` | Admin: list all sessions with status, scenario, depth |
| `app/admin/sessions/[id]/page.tsx` | Admin: view full session detail including evaluation_data JSON |
| `app/admin/scenarios/page.tsx` | Admin: list all scenarios from DB |
| `app/admin/scenarios/[id]/page.tsx` | Admin: view and edit individual scenario |
| `app/admin/system/page.tsx` | Admin: system settings and kill-switch controls |
| `app/admin/dev-interview/page.tsx` | Admin: developer interview test harness |

#### app/api/ — API routes
| File | Description |
|------|-------------|
| `app/api/session/start/route.ts` | Creates sessions, deducts credits, seeds TMAY turn, resolves question families and entry family, shuffles dimension order |
| `app/api/session/route.ts` | GET session by ID — used by results page polling |
| `app/api/interview/route.ts` | Core interview loop — generates GPT-4o next question, marks previous turn answered, inserts new turn, tracks user_question_history |
| `app/api/evaluate/route.ts` | 4-stage evaluation pipeline + PDF generation + momentum_card + progression_comparison + DB persistence |
| `app/api/turns/answer/route.ts` | Writes user_answer to the most recent open turn in interview_turns — canonical answer capture path |
| `app/api/turns/create/route.ts` | Creates a new interview turn (used in replay or admin flows) |
| `app/api/voice/tts/route.ts` | Text-to-speech: accepts text, calls OpenAI TTS-1 (voice: onyx), returns audio/mpeg stream |
| `app/api/voice/stt/route.ts` | Speech-to-text: accepts audio Blob, calls Whisper-1, returns transcript JSON |
| `app/api/voice/opening/route.ts` | Returns the TMAY (turn_index=0) content for a session — used by useBatchVoice to speak the opening without calling /api/interview |
| `app/api/pdf/generate/route.ts` | On-demand PDF regeneration for a session (re-uses existing evaluation_data; regenerates if PDF missing) |
| `app/api/negotiation/end/route.ts` | Ends negotiation simulation — calls GPT-4o to analyze transcript, generates negotiation PDF, returns summary |
| `app/api/razorpay/route.ts` | Creates Razorpay order (amount, receipt) for checkout |
| `app/api/razorpay/verify/route.ts` | Verifies Razorpay payment signature, inserts purchase record (triggers credit addition via DB trigger or direct update), upgrades tier |
| `app/api/support/route.ts` | Inserts a support_issues row with user message, browser info, session context |
| `app/api/admin/scenarios/route.ts` | Admin: CRUD for scenarios table |
| `app/api/admin/dev-interview/start/route.ts` | Admin: starts a dev interview session bypassing credit checks |
| `app/api/admin/dev-interview/control/route.ts` | Admin: controls dev interview flow (advance turns, inject messages) |

#### app/ (feature pages)
| File | Description |
|------|-------------|
| `app/dashboard/page.tsx` | Main user dashboard — Practice tab (scenarios, CurrentBarCard), History tab (past sessions with replay links, PDF downloads, progression notes) |
| `app/simulator/[scenarioId]/page.tsx` | Interview simulator — loads scenario, starts session, runs useBatchVoice turn loop, handles end → evaluate → redirect to /results |
| `app/results/[session_id]/page.tsx` | Post-session results screen — 4 sections: Verdict, Strongest Moment, The One Thing, What's Next; polls until status=completed |
| `app/scenarios/builder/page.tsx` | Custom scenario builder — Pro only, selects 3–4 dimensions + optional company context |
| `app/negotiator/page.tsx` | Salary negotiation simulation UI — separate flow from main simulator |
| `app/onboarding/page.tsx` | First-time user profile setup — collects name, role, designation |
| `app/profile/page.tsx` | User profile edit page |
| `app/pricing/page.tsx` | Pricing page — Starter/Pro plans with Razorpay checkout |
| `app/test-interview/page.tsx` | Developer test page for interview flow (not used in production) |
| `app/config/interview-prompts.ts` | Master system prompt generator — `generateInterviewerPrompt()` injects all variables (persona, dimensions, families, blocklist, dimension progress) |

---

### hooks/
| File | Description |
|------|-------------|
| `hooks/useBatchVoice.ts` | Main voice hook — implements full STT→/api/interview→TTS turn loop. Exported as `useRealtimeVoice` alias. Manages MediaRecorder, AudioContext, turn state machine (ASSISTANT_SPEAKING / WAITING_FOR_USER / TRANSCRIBING / THINKING) |
| `hooks/useRealtimeVoice.ts` | Legacy Realtime API hook (likely superseded by useBatchVoice — kept for import compatibility) |
| `hooks/useWakeLock.ts` | Browser Wake Lock API wrapper — prevents screen sleep during long interview sessions |

---

### lib/
| File | Description |
|------|-------------|
| `lib/database.types.ts` | Supabase-generated TypeScript types for all tables — DO NOT edit manually |
| `lib/supabase.ts` | Client-side Supabase client factory (`createClient`) |
| `lib/supabase-server.ts` | Server-side Supabase client factory with SSR cookie handling |
| `lib/admin-server.ts` | Service-role Supabase client factory (bypasses RLS) for server-only use |
| `lib/utils.ts` | Utility functions — `cn()` className merger (clsx + tailwind-merge) |
| `lib/runtime-scenario.ts` | Scenario resolution — `resolveRuntimeScenario()`, `normalizeRole()`, `normalizeLevel()`, `selectQuestionFamilies()`, `selectEntryFamily()`, `INTERVIEW_SCENARIOS` hardcoded map, `AI_MANDATORY_ROLE_KEYS` |
| `lib/scenarios.ts` | Legacy static SCENARIOS array (original hardcoded list) — partially superseded by DB scenarios but still imported by simulator |
| `lib/entry-families.ts` | ENTRY_FAMILIES array — all entry question families keyed as `entry_{role}_{level}_{dimension}` |
| `lib/question-families.ts` | QUESTION_FAMILIES array — all dimension-based question families with prompt_guidance strings |
| `lib/probes.ts` | Probe question logic — generates follow-up probe injections (appears partially unused after dynamic probe removal) |
| `lib/shuffle.ts` | Fisher-Yates shuffle implementation — used for dimension_order randomization |
| `lib/eval-logic.ts` | Legacy evaluation prompt generator (`generateEvalPrompt`, `BUILD_PROMPT`) — predates the 4-stage pipeline; still imported for EvalResult type |
| `lib/grounding-check.ts` | Validates answer upgrades — requires minimum 2 trigram overlaps between rewrite and original answer; currently incorrectly compares ALL rewrites against the LONGEST single answer (not per-turn) |
| `lib/signalSynthesis.ts` | Post-evaluation signal processor — ranks corrections by interviewer impact, produces synthesis object for PDF |
| `lib/answer-upgrades.ts` | Legacy answer upgrade generator (direct GPT call) — superseded by stage3-rewrite.ts in the current pipeline but file remains |
| `lib/replay-comparison.ts` | `compareReplayAttempts()` — GPT-4o call comparing original vs replay answer pairs; used by both replay block and progression_comparison |
| `lib/pdfGenerator.ts` | PDFKit PDF generator — renders evaluation into A4 PDF report; tier-gated sections; level-unlock header in areas_for_improvement |
| `lib/negotiation-pdf.ts` | Separate PDF generator for negotiation simulation results |
| `lib/negotiation-coach.ts` | Negotiation session GPT logic — system prompt for negotiation interviewer persona |

#### lib/evaluation/ (4-stage pipeline — DO NOT modify without explicit approval)
| File | Description |
|------|-------------|
| `lib/evaluation/stage1-extract.ts` | GPT-4o extraction pass — pulls verbatim answers, core claims, boolean flags (has_specific_example, has_metric_or_number, has_explicit_outcome) from interview_turns |
| `lib/evaluation/stage2-evaluate.ts` | GPT-4o evaluation pass — produces hiring_signal, hireable_level, top_strengths (with exact quotes), gaps (with fix_in_one_sentence), answer_level_diagnostics, tell_me_about_yourself_diagnostic |
| `lib/evaluation/stage3-rewrite.ts` | GPT-4o rewrite pass (Pro/Pro+, full depth only) — adds structural elements to the 3 weakest turns without inventing facts |
| `lib/evaluation/stage4-rules.ts` | GPT-4o personal rules pass (Pro/Pro+, full depth only) — generates 3–5 session-specific behavioral rules anchored to verbatim quotes |

---

### components/
| File | Description |
|------|-------------|
| `components/AuthForm.tsx` | Email and OAuth login form using Supabase auth |
| `components/CurrentBarCard.tsx` | Dashboard card showing current hireable_level + primary_blocker gap from most recent evaluated session |
| `components/DashboardFilters.tsx` | Filter controls for dashboard history tab (role, level, date range) |
| `components/ProfileForm.tsx` | User profile edit form (first_name, last_name, designation, current_company) |
| `components/ProgressGraph.tsx` | Hiring signal progression chart using Recharts — plots signal over time |
| `components/ScenarioCard.tsx` | Scenario selection card in dashboard — shows role, level, description, dimensions |
| `components/SkillRadar.tsx` | Radar chart for skill dimensions (Recharts) — appears in results or dashboard |
| `components/SupportModal.tsx` | Support ticket submission modal — calls /api/support |
| `components/ui/button.tsx` | Shadcn-style button component (Radix Slot, class variance authority pattern) |

---

### supabase/migrations/
| File | Description |
|------|-------------|
| `20240112000000_update_schema.sql` | Adds session_type column, makes scenario_id nullable (for negotiation sessions) |
| `20260117083000_add_replay_columns.sql` | Adds replay_of_session_id and questions_to_ask to sessions |
| `20260208_add_dimension_order.sql` | Adds dimension_order TEXT[] to sessions |
| `20260208_add_family_selections.sql` | Adds family_selections JSONB to sessions |
| `20260321_add_user_answer_to_turns.sql` | Adds user_answer, user_answer_word_count, user_answer_captured_at to interview_turns |
| `20260321195816_add_dimension_tracking_to_interview_turns.sql` | Adds dimension and turns_in_dimension columns to interview_turns |
| `20260322_add_momentum_card.sql` | Adds momentum_card and progression_comparison JSONB to sessions |
| `20260322_add_scenario_duration.sql` | Adds duration_minutes INTEGER DEFAULT 30 to scenarios |
| `supabase/hardening.sql` | RLS policies and hardening rules (contents: RLS setup for tables) |
| `supabase/upgrade.sql` | One-off upgrade script (tier/session manipulation for testing) |

---

### Root config files
| File | Description |
|------|-------------|
| `middleware.ts` | Next.js middleware — enforces auth on /simulator/* routes; redirects to /pricing if no active pack or zero sessions |
| `next.config.ts` | Next.js config |
| `tsconfig.json` | TypeScript config with path alias `@/` → project root |
| `package.json` | Dependencies: Next.js 16.1.1, React 19, Supabase JS, OpenAI SDK v6, PDFKit, Razorpay, Recharts |
| `.env.local` | Environment variables (not committed — see schema below) |

---

## B. Database Schema Current State

### Table: `users`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes — all queries | Primary key, maps to Supabase auth.users |
| `email` | text | Yes — admin, display | |
| `first_name` | text | Yes — profile | |
| `last_name` | text | Yes — profile | |
| `full_name` | text | Yes — display | |
| `avatar_url` | text | Partial | Set by OAuth; shown in dashboard |
| `display_pic_url` | text | Likely legacy | Duplicate of avatar_url pattern — check if used |
| `phone` | text | Partial | Collected at onboarding; not used in product logic |
| `designation` | text | Yes — onboarding | User's job title |
| `current_company` | text | Yes — onboarding | |
| `primary_role` | text | Partial | Collected; not currently used to gate scenarios |
| `package_tier` | text | Yes — all tier checks | Values: 'Free', 'Starter', 'Pro', 'Pro+' (legacy). Pro+ still in code. |
| `available_sessions` | integer | Yes — credit system | Decremented on session start; refunded on failure |
| `total_sessions_used` | integer | Yes — analytics | Incremented on session start |
| `negotiation_credits` | integer | Probably legacy | Negotiation now tied to package_tier check, not this field |
| `onboarding_complete` | boolean | Yes — onboarding flow | |
| `is_admin` | boolean | Yes — admin routes | |
| `resume_url` | text | Unused | Collected but not used in evaluation or prompts |
| `created_at` | timestamptz | Yes — audit | |

**DROP in rebuild:** `display_pic_url`, `negotiation_credits`, `resume_url`, `primary_role` (if role selection moves to session start)

---

### Table: `sessions`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `scenario_id` | integer | Yes | FK → scenarios; nullable for negotiation |
| `custom_scenario_id` | uuid | Yes | FK → custom_scenarios; nullable |
| `session_type` | text | Yes | 'interview' or 'negotiation_simulation' |
| `status` | text | Yes | 'created' → 'active' → 'evaluating' → 'completed' / 'failed' |
| `transcript` | text | Yes | Reconstructed from interview_turns at evaluate time; also written by simulator on end |
| `evaluation_data` | JSONB | Yes — critical | Single container for all stage 1–4 output |
| `evaluation_depth` | text | Yes | 'full', 'shallow', 'insufficient' |
| `family_selections` | JSONB | Yes | Maps dimension → family_id; Entry key is mandatory |
| `dimension_order` | JSONB | Yes | Shuffled dimension sequence (stored as array) |
| `momentum_card` | JSONB | Yes | {strongest_signal, one_fix, progress_note} |
| `progression_comparison` | JSONB | Yes | {observed_changes[], unchanged_areas[]} |
| `replay_of_session_id` | uuid | Yes | FK → sessions; set for replay sessions |
| `pdf_url` | text | Yes | Storage PATH (not signed URL) |
| `duration_seconds` | integer | Yes | Written by simulator on end |
| `answer_upgrades` | JSONB | Duplicate | Also stored inside evaluation_data; written separately to sessions.answer_upgrades — redundant |
| `replay_comparison` | JSONB | Legacy | Separate from progression_comparison; replay-specific delta. Also inside evaluation_data |
| `evaluation` | JSONB | Legacy | Old evaluation field predating evaluation_data; now unused |
| `clarity` | numeric | Legacy | Old numeric score field; pre-pipeline |
| `structure` | numeric | Legacy | Old numeric score field; pre-pipeline |
| `recovery` | numeric | Legacy | Old numeric score field; pre-pipeline |
| `signal_noise` | numeric | Legacy | Old numeric score field; pre-pipeline |
| `confidence_score` | numeric | Legacy | Old score field; unused |
| `key_insight` | text | Legacy | Old text field; pre-pipeline |
| `improvement_priorities` | text[] | Legacy | Old array field; pre-pipeline |
| `alternative_approaches` | text[] | Legacy | Old array field; pre-pipeline |
| `pattern_analysis` | text | Legacy | Old text field; pre-pipeline |
| `risk_projection` | text | Legacy | Old text field; pre-pipeline |
| `readiness_assessment` | text | Legacy | Old text field; pre-pipeline |
| `framework_contrast` | text | Legacy | Old text field; pre-pipeline |
| `created_at` | timestamptz | Yes | |

**DROP in rebuild:** `evaluation`, `clarity`, `structure`, `recovery`, `signal_noise`, `confidence_score`, `key_insight`, `improvement_priorities`, `alternative_approaches`, `pattern_analysis`, `risk_projection`, `readiness_assessment`, `framework_contrast`. Consolidate `replay_comparison` and `answer_upgrades` inside `evaluation_data` only.

---

### Table: `interview_turns`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `session_id` | uuid | Yes | FK → sessions |
| `turn_index` | integer | Yes | 0 = TMAY; 1+ = behavioral questions |
| `turn_type` | text | Yes | 'question' or 'followup' |
| `content` | text | Yes | Interviewer question text |
| `answered` | boolean | Yes | Set to true by /api/interview before inserting next turn |
| `user_answer` | text | Yes — critical | Verbatim candidate answer; written by /api/turns/answer |
| `user_answer_word_count` | integer | Yes | Pre-computed at write time |
| `user_answer_captured_at` | timestamptz | Yes | Ordering diagnostic |
| `dimension` | text | Yes | Which evaluation dimension this turn covers |
| `turns_in_dimension` | integer | Yes | Turn count within the current dimension |
| `created_at` | timestamptz | Yes | |

All columns actively used. No drops needed.

---

### Table: `scenarios`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | integer | Yes | Primary key |
| `role` | text | Yes | e.g. 'Product Manager', 'SDE' |
| `level` | text | Yes | e.g. 'Junior', 'Senior' |
| `scenario_title` | text | Yes | Display title |
| `scenario_description` | text | Yes | Short description |
| `scenario_type` | text | Partial | Not consistently checked in code |
| `prompt` | text | Yes | Base system prompt context injected into interviewer |
| `base_system_prompt` | text | Partial | Duplicate/alias of prompt; not always populated |
| `evaluation_dimensions` | JSONB | Yes — critical | Array of dimension objects {name, description} or strings |
| `interviewer_persona` | JSONB | Partial | Sometimes used, sometimes overridden by runtime-scenario.ts |
| `persona` | text | Partial | String persona; used as fallback when interviewer_persona JSONB absent |
| `difficulty` | text | Mostly unused | Not currently used in evaluation logic |
| `company_context` | text | Partial | Injected into prompt context |
| `applicant_context` | text | Partial | Less commonly populated |
| `duration_minutes` | integer | Yes | Session timer source; default 30 |
| `seeded_questions` | JSONB | DEAD | Kill switch actively strips this at runtime — legacy |
| `is_active` | boolean | Yes | Dashboard filters to is_active = true |
| `created_by` | uuid | Yes | FK → users (admin who created) |
| `created_at` | timestamptz | Yes | |

**DROP in rebuild:** `seeded_questions`, `scenario_type` (if not used), `difficulty`, `base_system_prompt` (consolidate with `prompt`), `applicant_context`.

---

### Table: `question_families`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | text | Yes | e.g. 'product_sense_problem_discovery' |
| `dimension` | text | Yes | Which evaluation dimension this family covers |
| `family_name` | text | Yes | Human-readable name |
| `prompt_guidance` | text | Yes — injected into system prompt | Tells GPT how to frame questions |
| `created_at` | timestamptz | Yes | |

All columns actively used. Entire table becomes obsolete in rebuild (no question family system planned).

---

### Table: `user_family_usage`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `dimension` | text | Yes | Which dimension |
| `family_id` | text | Yes | FK → question_families.id |
| `used_at` | timestamptz | Yes | Recency tracking for freshness algorithm |

Actively used for anti-repetition. Entire table becomes obsolete in rebuild.

---

### Table: `user_question_history`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `role` | text | Yes | Role at time of question |
| `level` | text | Yes | Level at time of question |
| `session_id` | uuid | Yes | FK → sessions |
| `turn_index` | integer | Yes | Which turn in that session |
| `question_text` | text | Yes | The GPT-generated question verbatim |
| `created_at` | timestamptz | Yes | Used for 90-day recency filter |

Actively used as the anti-convergence blocklist. May become obsolete or simplified in rebuild.

---

### Table: `custom_scenarios`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `base_scenario_id` | integer | Yes | FK → scenarios |
| `title` | text | Yes | Custom title |
| `focus_dimensions` | text[] | Yes | Override dimensions (3–4) |
| `company_context` | text | Yes | Additional context injected into prompt |
| `created_at` | timestamptz | Yes | |

All columns actively used. Fate in rebuild depends on whether custom scenarios survive.

---

### Table: `purchases`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | integer | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `order_id` | text | Yes | Razorpay order ID |
| `amount` | integer | Yes | In paise (INR smallest unit) |
| `sessions_added` | integer | Yes | How many credits added |
| `status` | text | Yes | 'completed' triggers credit addition |
| `created_at` | timestamptz | Yes | |

All columns actively used.

---

### Table: `admin_logs`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `admin_id` | uuid | Yes | FK → users |
| `action` | text | Yes | Action type |
| `target_resource` | text | Yes | What was acted on |
| `target_id` | uuid | Partial | Optional target entity |
| `details` | JSONB | Partial | Action metadata |
| `created_at` | timestamptz | Yes | |

Used in admin routes.

---

### Table: `notifications`
| Column | Type | Used? | Notes |
|--------|------|-------|-------|
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → users |
| `type` | text | Yes | Notification type string |
| `channel` | enum | Yes | 'email' or 'in_app' |
| `status` | enum | Yes | 'pending', 'sent', 'failed' |
| `metadata` | JSONB | Partial | Extra data |
| `created_at` | timestamptz | Yes | |

Present in schema; unclear if actively sent from application code.

---

### Table: `support_issues`
All columns actively used. Inserts from /api/support; visible in admin panel.

### Table: `system_errors`
All columns present; inserted from error handlers in various routes.

### Table: `system_settings`
Present; key-value store for admin-configurable settings (kill switches, feature flags).

### Tables: `scenarios_prompt_backup_pre_variety`, `users_pro_plus_backup`
**LEGACY BACKUP TABLES — DROP in rebuild.** Created during migrations to preserve data; serve no runtime purpose.

---

## C. Active Code Paths

### Flow 1: Starting a Session (Button Click → TMAY Plays)

1. **User clicks "Start Interview"** in `app/simulator/[scenarioId]/page.tsx` → `handleStart()` is called.

2. **Session creation request** — `POST /api/session/start` with `{scenario_id, duration_seconds, session_type, replay_session_id?}`.

3. **Inside `/api/session/start`:**
   - Auth check via Supabase SSR client
   - Check for existing active sessions → resume or auto-fail stuck session
   - Fetch user profile (tier, available_sessions)
   - Fetch scenario evaluation_dimensions (DB or INTERVIEW_SCENARIOS map)
   - Detect AI Fluency eligibility and inject `ai_fluency` dimension if applicable
   - Call `selectQuestionFamilies()` from `lib/runtime-scenario.ts` — picks one question family per dimension based on tier and usage history
   - Call `selectEntryFamily()` — picks the entry family for Turn 1
   - Call `fisherYatesShuffle()` from `lib/shuffle.ts` — randomizes dimension_order
   - Deduct 1 credit from `users.available_sessions`
   - INSERT into `sessions` table with `{family_selections, dimension_order, status: 'created'}`
   - Track family usage in `user_family_usage` (Pro/Pro+ only)
   - INSERT Turn 0 (TMAY) into `interview_turns`: `{turn_index: 0, content: 'Tell me about yourself.', answered: false}`
   - Return session object with `initial_turn` field

4. **Simulator receives session** — `setSessionId(newSessionId)`, `setSessionStarted(true)`

5. **`useEffect` fires** when `sessionStarted && sessionId` — calls `startSession()` from `useBatchVoice`.

6. **`startSession()` inside `useBatchVoice`:**
   - Requests microphone via `navigator.mediaDevices.getUserMedia`
   - Calls `POST /api/voice/opening` with `{session_id}` — returns TMAY content
   - Calls `speakText(tmayContent)` — calls `POST /api/voice/tts` with the TMAY text → receives audio/mpeg → decodes via AudioContext → plays
   - After audio ends (`onended`): resets state, starts MediaRecorder, sets `isConnected = true`
   - Adds TMAY to `messagesRef` and `messages` state

7. **Interviewer is speaking TMAY.** State = `ASSISTANT_SPEAKING`. After audio ends → state = `WAITING_FOR_USER`.

**DB writes in this flow:** `sessions` INSERT, `interview_turns` INSERT (turn 0), `user_family_usage` UPSERT, `users` UPDATE (credit deduction)

---

### Flow 2: An Interview Turn (Ask Next Question → Interviewer Speaks)

1. **User answers** and sees "Ask Next Question" button (shown when `interviewState === 'WAITING_FOR_USER'`).

2. **User clicks button** → `handleAskNextQuestion()` → calls `askNextQuestion()` from `useBatchVoice`.

3. **`askNextQuestion()` inside `useBatchVoice`:**

   a. **Stop recording** — `stopRecording()` stops MediaRecorder and assembles audio Blob.

   b. **STT** — `POST /api/voice/stt` with audio Blob (FormData). Route calls `openai.audio.transcriptions.create({model: 'whisper-1'})`. Returns `{transcript: string}`.

   c. **Persist answer** — `POST /api/turns/answer` with `{session_id, answer_text}`. Route finds the most recent `answered=false` turn for the session, writes `user_answer`, `user_answer_word_count`, `user_answer_captured_at`.

   d. **Generate next question** — `POST /api/interview` with `{session_id, messages, userMessage, turn_authority: true, is_first_question, pending_system_messages, sessionStartTime, targetDuration}`.

4. **Inside `/api/interview`:**
   - Validates: messages not empty, userMessage not empty
   - Fetches session: `family_selections`, `dimension_order`, `user_id`, `replay_of_session_id`
   - If replay session: fetches original turns from DB
   - Loads scenario config (hardcoded or DB)
   - Strips `seeded_questions` (kill switch)
   - Runs Entry Family validation for Turn 1
   - Fetches anti-convergence blocklist from `user_question_history` (last 50 questions, 90 days, same role+level)
   - Queries `interview_turns` for max turn_index → computes `nextTurnIndex`
   - Calls `computeDimensionState()` — determines current dimension based on turn index and session duration
   - Calls `generateInterviewerPrompt()` from `app/config/interview-prompts.ts` — builds full system prompt with all variables
   - Makes `openai.chat.completions.create({model: 'gpt-4o', max_tokens: 500, tools: [interview_time_status]})` call
   - If tool call (time status): resolves tool, makes second GPT call
   - Validates response (not empty, not candidate speech)
   - **DB writes:**
     - UPDATE `interview_turns` SET `answered = true` for the previous turn
     - INSERT new `interview_turns` row with `{content, dimension, turns_in_dimension, answered: false}`
     - Fire-and-forget INSERT into `user_question_history`
   - Returns `{message: assistantText}`

5. **Back in `askNextQuestion()`:**
   - Calls `speakText(llmText)` → `POST /api/voice/tts` → audio/mpeg → AudioContext playback
   - After audio ends: resets state, starts MediaRecorder, sets state = `WAITING_FOR_USER`
   - Updates `messagesRef` and `messages` state

**DB writes in this flow:** `interview_turns` UPDATE (mark answered), `interview_turns` INSERT (new turn), `user_question_history` INSERT

**Latency breakdown (approx 14–16 seconds total):**
- MediaRecorder stop + blob assembly: ~100ms
- Whisper STT (network + model): ~2–4s
- /api/turns/answer write: ~200ms (parallel-ish)
- GPT-4o generation: ~4–8s (sometimes tool call adds another round)
- /api/voice/tts fetch + AudioContext decode: ~2–4s
- Total: ~8–16s from button click to interviewer speaking

---

### Flow 3: Ending a Session (End → PDF Downloaded)

1. **User clicks "End Interview"** (or timer expires) → `handleEnd()` in simulator.

2. **`handleEnd()` sequence:**
   - Guards: idempotency check (`isEnding` flag)
   - `waitForSafeExit(3000)` — in batch voice this is a no-op (all calls are awaited synchronously)
   - `endSession()` — stops MediaRecorder, stops mic stream, stops AudioContext, clears buffers
   - `setShowResults(true)` — shows the evaluating spinner
   - Captures `messagesRef.current` as final transcript
   - `PATCH sessions SET {transcript, duration_seconds, status: 'evaluating'}` via Supabase client

3. **Evaluation triggered** — `POST /api/evaluate` with `{session_id}`.

4. **Inside `/api/evaluate`:**
   - Idempotency check: if `status === 'completed'` and `evaluation_data` exists → return existing data + fresh signed URL
   - Fetches all `interview_turns` for session
   - Reconstructs transcript from turns (writes back to `sessions.transcript`)
   - Data quality guard: aborts if <50% of answered turns have `user_answer`
   - Computes `evaluationDepth`: insufficient / shallow / full
   - **Stage 1** (`lib/evaluation/stage1-extract.ts`): GPT-4o extraction — verbatim answers, boolean flags. Returns `Stage1Output`.
   - **Stage 2** (`lib/evaluation/stage2-evaluate.ts`): GPT-4o evaluation — hiring_signal, hireable_level, top_strengths, gaps, turn_diagnostics. Returns `Stage2Output`.
   - **Stage 3** (`lib/evaluation/stage3-rewrite.ts`): GPT-4o rewrites (Pro/Pro+, full only) — 3 structural rewrites for weakest turns. Raw upgrades validated by `validateAnswerUpgrades()` in `lib/grounding-check.ts`.
   - **Stage 4** (`lib/evaluation/stage4-rules.ts`): GPT-4o personal rules (Pro/Pro+, full only) — 3–5 session-specific rules anchored to verbatim quotes.
   - Signal synthesis (`lib/signalSynthesis.ts`) — deterministic ranking, no AI call
   - Replay comparison (if replay session + full depth) — `compareReplayAttempts()` GPT-4o call
   - Prior session lookup (`getPriorSessionForRoleLevel()`) — used for momentum_card and progression_comparison
   - Momentum card derivation — deterministic from stage2 + prior session
   - Progression comparison (if not replay + full depth) — `compareReplayAttempts()` GPT-4o call
   - **PDF generation** — `generateSessionPDF()` from `lib/pdfGenerator.ts` (PDFKit)
   - PDF upload to Supabase Storage bucket 'reports' — stores PATH in `sessions.pdf_url`
   - Generates signed URL (1 hour expiry)
   - **DB write:** UPDATE `sessions` SET `{evaluation_data, pdf_url, status: 'completed', evaluation_depth, answer_upgrades, replay_comparison, momentum_card, progression_comparison}`
   - Returns evaluation object + `pdf_url` (signed URL) + `momentum_card`

5. **Simulator receives response:**
   - If `result.summary` exists → negotiation flow → `setEvalResult(result.summary)` (stays in-page)
   - Otherwise → `router.push('/results/${sessionId}')` (standard interview)

6. **Results page (`app/results/[session_id]/page.tsx`):**
   - Polls session every 3s until `status === 'completed'`
   - Reads `evaluation_data`, `momentum_card` from session row
   - Fetches `interview_turns` for question text (Section 2)
   - Renders 4 sections: Verdict, Strongest Moment, The One Thing, What's Next
   - PDF download button calls `POST /api/pdf/generate` → returns signed URL → opens in new tab

**DB writes in this flow:** `sessions` UPDATE (transcript+status, then full evaluation), Supabase Storage upload

---

## D. What Works Today

1. **Full interview voice loop** — STT (Whisper) → /api/interview (GPT-4o) → TTS (TTS-1) batch pipeline is functional end-to-end. Turn authority model prevents AI speaking without user input.

2. **TMAY pre-seeding** — Turn 0 is always "Tell me about yourself." inserted at session creation. Client fetches it via /api/voice/opening and speaks it without calling /api/interview.

3. **Session creation with credit deduction and compensation** — Both `insertError` and `!session` (silent null) cases trigger credit refund. Atomic credit deduction before insert.

4. **Entry Family system** — Entry family selected at session start, validated at Turn 1. Checks are now warn-only (not hard errors) to avoid blocking sessions on edge cases.

5. **Dimension order randomization** — Fisher-Yates shuffle of dimensions at session creation; stored in `sessions.dimension_order`; `computeDimensionState()` tracks current dimension per turn.

6. **Anti-convergence blocklist** — Last 50 questions per user per role/level from `user_question_history`, 90-day window, passed to GPT as blocklist. Replay sessions intentionally bypass this.

7. **4-stage evaluation pipeline** — Stage 1 (extract) → Stage 2 (evaluate) → Stage 3 (rewrite, Pro only) → Stage 4 (rules, Pro only). Running end-to-end.

8. **Evaluation depth gating** — insufficient / shallow / full computed from answered turn count. Answer upgrades and personal rules only on full+Pro.

9. **PDF generation and upload** — PDFKit renders A4 report; uploaded to Supabase Storage 'reports' bucket; PATH stored; signed URLs generated on demand with 1-hour expiry. Level-unlock reframe header renders in areas_for_improvement.

10. **Results screen** — Polls for `status === 'completed'`; renders 4 sections; graceful states for loading/polling/insufficient/not-found. No redirect on insufficient eval.

11. **Momentum card** — Deterministic 3-field card (strongest_signal, one_fix, progress_note) derived from stage2 + prior session comparison. Persisted to `sessions.momentum_card`. Returned on idempotency path.

12. **Progression comparison** — GPT-4o comparison of current vs prior session (same role+level), non-replay full sessions only. Stored in `sessions.progression_comparison`.

13. **Replay sessions** — Clone original session questions from `interview_turns`, bypass blocklist, reuse family_selections. Costs 1 credit. Pro/Pro+ only.

14. **Custom scenarios** — Pro users can build 3–4 dimension combos + company context via scenario builder. Sessions use custom_scenario_id.

15. **Razorpay payments** — Order creation, HMAC signature verification, purchase insert, tier upgrade logic. Legacy pro_plus SKU maps to Pro tier.

16. **Wake lock** — Prevents screen sleep during sessions on supported browsers.

17. **Session pause/resume** — Timer freezes, interviewer audio aborted on pause. Resume waits for explicit "Ask Next Question".

18. **Negotiation simulation** — Separate flow through /api/negotiation/end, negotiation PDF generator. Pro+ tier check (currently using 'Pro+' string directly — known debt).

19. **Admin panel** — User management, session inspection, scenario CRUD, system settings.

20. **Time checkpoint injection** — Every 3 minutes of session time, a system message is buffered and sent with the next /api/interview call to control interviewer pacing.

---

## E. What Is Broken or Incomplete

### 1. Answer Upgrades Empty in PDFs (Active Bug)

**Root cause:** `validateAnswerUpgrades()` in `lib/grounding-check.ts` compares every rewrite against the **single longest answer** in the session, not against the turn-specific original answer. The stage3 rewrite prompt asks GPT to incorporate the specific weak turn's original phrasing. When checked against a different (longer) answer, the trigram overlap fails, and upgrades are flagged as fabricated and excluded.

**Evidence in code (`lib/grounding-check.ts` lines 49–52):**
```typescript
const longestAnswer = transcriptTurns
    .map(t => t.user_answer || '')
    .sort((a, b) => b.length - a.length)[0] || '';
```
The fix is to match each upgrade's `turn_index` to the corresponding `user_answer` for that turn.

---

### 2. Question Freshness Limited by Small Family Pool

The family pool per dimension is small (2–4 families per dimension in the DB). Once a Pro user has used all families in a dimension, `selectQuestionFamilies()` falls back to random selection from already-used families. This means question themes repeat after ~4–5 sessions per dimension.

---

### 3. 14–16 Second Latency Between User Answering and Interviewer Speaking

Causes (sequential, not parallel):
- Whisper STT: 2–4s
- GPT-4o generation (sometimes with tool call round-trip): 4–8s
- TTS-1 synthesis + fetch: 2–4s

These are sequential in `askNextQuestion()`. No streaming is used for GPT or TTS. Reducing this would require streaming TTS or running STT and interview prep in parallel.

---

### 4. Negotiation Simulation Tier Check Uses Hardcoded 'Pro+' String

In `app/api/session/start/route.ts` line 94:
```typescript
if (!profile || profile.package_tier !== 'Pro+') {
```
This should be `'Pro'` (or both). After Pro+ was merged into Pro, negotiation simulation is inaccessible to users on the Pro tier. This is a known bug in the codebase.

---

### 5. Session Status Written as 'evaluating' But Not Consistently Polled

The simulator writes `status: 'evaluating'` before calling /api/evaluate. The results page polls for `status !== 'completed'`. If /api/evaluate throws after the status write, the session stays as 'evaluating' forever and the results page spins indefinitely. There is no timeout or error state recovery on the results page.

---

### 6. `sessions.answer_upgrades` Is a Redundant Column

`answer_upgrades` is stored both inside `sessions.evaluation_data` (as part of the full evaluation object) AND as a separate top-level `sessions.answer_upgrades` column. Both are written in `dbPayload` in `/api/evaluate`. This creates a sync risk and wastes storage.

---

### 7. `lib/answer-upgrades.ts` Is Dead Code

This file contains a legacy `generateAnswerUpgrades()` function (GPT call using the old transcript-based approach). It is not called anywhere in the active pipeline. Stage 3 (`stage3-rewrite.ts`) is the active path. The old function remains in the codebase.

---

### 8. `lib/eval-logic.ts` Contains Legacy Evaluation Prompt

`generateEvalPrompt()` and `BUILD_PROMPT` are legacy functions from before the 4-stage pipeline. `EvalResult` interface from this file is still imported by the simulator for type annotation, but the actual evaluation no longer uses numeric scores (clarity, structure, recovery, signal_noise) that this interface defines. The interface mismatch is papered over with `as any`.

---

### 9. Hardcoded 40-Minute Enforcement in Time Checkpoint Messages

The simulator injects time checkpoint messages that say "This interview MUST last 40+ minutes" regardless of the actual `targetDuration`. For a 30-minute session, the AI is told to run 40 minutes, creating a conflict. The checkpoint logic uses `targetDuration` for remaining minutes but the initial injection is hardcoded to 40.

```typescript
// app/simulator/[scenarioId]/page.tsx ~line 325
`CRITICAL INSTRUCTION: This interview MUST last at least 40 minutes.`
```

---

### 10. `lib/scenarios.ts` Is Largely Superseded but Still Imported

The static SCENARIOS array (8 entries) is imported by the simulator page but the actual scenario loading uses the DB. The SCENARIOS import in the simulator (`import { SCENARIOS } from '@/lib/scenarios'`) appears to be unused after the DB-first scenario resolution — but the import remains.

---

### 11. `useRealtimeVoice.ts` Existence Is Unclear

The hook file exists but the simulator imports from `useBatchVoice` with an alias `useRealtimeVoice`. The original `useRealtimeVoice.ts` appears to be the legacy Realtime API implementation. Its current state and whether it compiles is unknown.

---

### 12. `app/api/session/route.ts` Not Deeply Reviewed

This GET route exists but its role in the polling flow is unclear — the results page uses the Supabase client directly, not this route. May be orphaned.

---

## F. What Can Be Deleted in the Rebuild

**New architecture:** 3 roles × 4 rounds, no question family system, level fixed at Senior/Staff bar.

### Entire Files to Delete

| File | Reason |
|------|--------|
| `lib/question-families.ts` | Question family system eliminated |
| `lib/entry-families.ts` | Entry family system eliminated |
| `lib/probes.ts` | Dynamic probe injection system eliminated |
| `lib/shuffle.ts` | Dimension randomization eliminated (fixed 4-round order) |
| `lib/answer-upgrades.ts` | Legacy dead code — superseded by stage3-rewrite.ts |
| `lib/eval-logic.ts` | Legacy evaluation prompt — superseded by 4-stage pipeline |
| `lib/scenarios.ts` | Legacy static SCENARIOS array — superseded by DB |
| `lib/replay-comparison.ts` | Replay feature eliminated (or scope-reduced) |
| `lib/negotiation-coach.ts` | Negotiation feature not in rebuild scope |
| `lib/negotiation-pdf.ts` | Negotiation feature not in rebuild scope |
| `app/api/negotiation/end/route.ts` | Negotiation feature not in rebuild scope |
| `app/negotiator/page.tsx` | Negotiation feature not in rebuild scope |
| `app/scenarios/builder/page.tsx` | Custom scenario builder eliminated (fixed 3 roles) |
| `scripts/seed-question-families.ts` | Question families eliminated |
| `scripts/seed-entry-families.ts` | Entry families eliminated |
| `scripts/verify-entry-logic.ts` | Entry logic eliminated |
| `hooks/useRealtimeVoice.ts` | Legacy hook (if separate from useBatchVoice) |
| `check_schema.js`, `debug_braces.js`, `diagnose_syntax.js` | One-off diagnostic scripts |
| `test-pdf-generation.ts`, `test-signal-synthesis.ignore.ts` | Test scripts not part of build |
| `insert_scenarios.js` | One-off seeding script |

---

### Functions to Delete Within Kept Files

| File | Function/Section to Delete |
|------|---------------------------|
| `app/api/session/start/route.ts` | All family selection logic (`selectQuestionFamilies`, `selectEntryFamily`, `dimensionToEntryProbe` map, family tracking to `user_family_usage`) |
| `app/api/session/start/route.ts` | AI Fluency injection block |
| `app/api/session/start/route.ts` | `fisherYatesShuffle` call and `dimension_order` generation |
| `app/api/session/start/route.ts` | Replay session branch |
| `app/api/session/start/route.ts` | Negotiation simulation branch |
| `app/api/interview/route.ts` | Entry Family validation and enforcement blocks |
| `app/api/interview/route.ts` | Anti-convergence blocklist fetch from `user_question_history` |
| `app/api/interview/route.ts` | Dimension state computation (`computeDimensionState`, `dimensionProgressBlock`) |
| `app/api/interview/route.ts` | Replay session detection and `originalTurns` fetch |
| `app/api/interview/route.ts` | `selected_families` injection into prompt |
| `app/api/evaluate/route.ts` | Replay comparison block |
| `app/api/evaluate/route.ts` | Progression comparison block |
| `app/config/interview-prompts.ts` | `selected_families`, `dimension_order`, `recent_questions`, `dimensionProgressBlock` parameters and rendering |
| `lib/runtime-scenario.ts` | `selectQuestionFamilies()`, `selectEntryFamily()`, `normalizeRole()`, `normalizeLevel()`, `AI_MANDATORY_ROLE_KEYS`, `INTERVIEW_SCENARIOS` map |

---

### Database Tables to Drop

| Table | Reason |
|-------|--------|
| `question_families` | Question family system eliminated |
| `user_family_usage` | Question family system eliminated |
| `user_question_history` | Anti-convergence system eliminated (fixed 3 roles, small question space) |
| `custom_scenarios` | Custom scenario builder eliminated |
| `scenarios_prompt_backup_pre_variety` | Legacy backup — never used at runtime |
| `users_pro_plus_backup` | Legacy backup — never used at runtime |

---

### Database Columns to Drop

**sessions table:**
- `evaluation` (legacy pre-pipeline)
- `clarity`, `structure`, `recovery`, `signal_noise`, `confidence_score` (legacy numeric scores)
- `key_insight`, `improvement_priorities`, `alternative_approaches`, `pattern_analysis`, `risk_projection`, `readiness_assessment`, `framework_contrast` (legacy text fields)
- `replay_of_session_id` (if replay eliminated)
- `replay_comparison` (top-level — kept inside evaluation_data only)
- `family_selections`, `dimension_order` (question family system)
- `answer_upgrades` (top-level duplicate — keep inside evaluation_data only)
- `progression_comparison` (if progression feature not in MVP)

**scenarios table:**
- `seeded_questions` (dead — kill switch strips it)
- `scenario_type`, `difficulty`, `applicant_context`, `base_system_prompt` (mostly unused)

**users table:**
- `negotiation_credits`, `resume_url`, `display_pic_url` (unused)

---

## G. Dependencies and Constraints

### OpenAI
- **Models used:**
  - `gpt-4o` — Interviewer (interview/route.ts, ~500 tokens max output)
  - `gpt-4o` — Stage 1 extraction (8000 tokens max, response_format json_object)
  - `gpt-4o` — Stage 2 evaluation (~3000 tokens estimated output)
  - `gpt-4o` — Stage 3 rewrites (json_object)
  - `gpt-4o` — Stage 4 personal rules (json_object)
  - `gpt-4o` — Replay/progression comparison (json_object)
  - `whisper-1` — STT (audio/webm → transcript)
  - `tts-1` — TTS (text → audio/mpeg, voice: onyx)
- **API key:** `OPENAI_API_KEY` env var
- **SDK:** openai npm package v6.15.0
- **Cost concern:** A single full session evaluation makes 4–6 GPT-4o calls. Total token budget per session: ~15,000–25,000 tokens output. Progression comparison adds another GPT-4o call.
- **Rate limits:** gpt-4o has per-minute token limits. Burst evaluation requests could hit limits.
- **No streaming used:** All completions are buffered. Streaming would improve perceived latency.

### Supabase
- **Version:** @supabase/supabase-js v2.90.1, @supabase/ssr v0.8.0
- **Features used:**
  - PostgreSQL with JSONB (evaluation_data, family_selections, dimension_order, momentum_card)
  - Row Level Security (RLS) — enforced on user-facing queries; service role bypasses for cross-user ops
  - Supabase Auth — email magic link + OAuth; `createServerClient` for SSR
  - Supabase Storage — 'reports' bucket for PDF files; signed URLs with 1-hour expiry
  - `check_session_limit` DB function exists but not called from app code
  - `make_admin` DB function for admin provisioning
- **Service role key:** `SUPABASE_SERVICE_ROLE_KEY` — required for all writes that cross RLS (session creation, evaluation, admin)
- **Constraint:** PostgREST join-column filtering is unreliable — filter joined data in JS after fetch (documented in CLAUDE.md, enforced in `getPriorSessionForRoleLevel`)
- **Storage:** PDF files stored as PATH (not signed URL) in sessions.pdf_url. Signed URLs generated on demand.

### Vercel
- **Deployment:** Vercel (assumed from config and maxDuration usage)
- **Serverless timeout:** 60 seconds (`export const maxDuration = 60` in interview route). Evaluate route does not set maxDuration — on Hobby plan the default is 10s which would cause evaluation to timeout. **This is a critical production constraint.** The evaluate route makes 4–6 OpenAI calls sequentially; total runtime easily exceeds 30s.
- **Edge runtime:** TTS route uses `export const runtime = 'edge'` to prevent the 30-second Node.js timeout from killing audio streams.
- **Environment variables required:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

### Razorpay
- **SDK:** razorpay npm v2.9.6
- **Currency:** INR only (amounts in paise)
- **Payment SKUs:**
  - `starter` → ₹599 (59900 paise), 3 sessions, Starter tier
  - `pro` → ₹899 (89900 paise), 5 sessions, Pro tier
  - `pro_plus` → ₹1199 (119900 paise), 7 sessions, **maps to Pro tier** (legacy SKU)
- **Signature verification:** HMAC-SHA256 of `order_id|payment_id` using `RAZORPAY_KEY_SECRET`
- **Webhook:** No server-side webhook handler detected — payment verification is client-initiated (user posts payment IDs to /api/razorpay/verify). This is a security gap: a malicious user could manipulate packId after successful payment.
- **Purchase insert:** Writes to `purchases` table with `status: 'completed'`. The `available_sessions` increment appears to happen directly in the verify route via user UPDATE — no DB trigger found in migrations. The session start route directly reads `users.available_sessions`.

### PDFKit
- **Version:** pdfkit v0.17.2
- **Usage:** Server-side only (Node.js Buffer). Generates A4 PDFs with custom layout, section headers, gradient covers.
- **Fonts:** Helvetica only (built-in) — no external font loading.
- **Output:** Buffer returned from `generateSessionPDF()` — uploaded directly to Supabase Storage.

### React / Next.js
- **Next.js:** 16.1.1 (App Router)
- **React:** 19.2.3
- **Styling:** Tailwind CSS v4, no component library except custom button.tsx
- **Charts:** Recharts v3.6.0 (ProgressGraph, SkillRadar)
- **Animation:** Framer Motion v12.25.0

### Browser Constraints
- **MediaRecorder API** — required for voice recording. Not available in all browsers. Chunk interval: 250ms. Min blob size guard: 5KB.
- **AudioContext** — required for TTS playback. Must be created after user gesture (browser autoplay policy). TTS returns full audio as ArrayBuffer — decoded via `audioContext.decodeAudioData`.
- **Wake Lock API** — optional; gracefully fails if not supported.
- **HTTPS required** — MediaRecorder and Wake Lock only work on secure origins.

---

*This document reflects the codebase state as of 2026-04-04 on branch `claude/elegant-bohr`.*
