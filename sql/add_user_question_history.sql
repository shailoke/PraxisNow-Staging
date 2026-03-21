-- ============================================================
-- add_user_question_history.sql
-- Question Variety Enforcement — User Question History Table
-- PraxisNow v2.0   2026-03-21
-- ============================================================
-- Stores questions asked per user/role/level.
-- Replaces the global interview_turns anti-convergence query
-- with a user-scoped, durable question history.
--
-- IDEMPOTENT: Safe to run multiple times.
-- RLS: SELECT is user-scoped. All INSERTs use service role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_question_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  level TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uqh_user_role_level
  ON public.user_question_history(user_id, role, level);

CREATE INDEX IF NOT EXISTS idx_uqh_session
  ON public.user_question_history(session_id);

ALTER TABLE public.user_question_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question history"
  ON public.user_question_history FOR SELECT
  USING (auth.uid() = user_id);

-- NOTE: No INSERT policy for authenticated users.
-- All inserts use the service role client and bypass RLS.
-- This is intentional — users cannot write to their own history directly.

-- VERIFY: run this after creation, expect 0
-- SELECT count(*) FROM public.user_question_history;
