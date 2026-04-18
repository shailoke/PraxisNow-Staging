-- ============================================================
-- Stale session cleanup via pg_cron
-- Run in Supabase Dashboard → SQL Editor (not via supabase db push).
-- pg_cron requires superuser privileges not available to the CLI
-- migration runner.
--
-- Prerequisites:
--   Dashboard → Database → Extensions → enable pg_cron
--   if the CREATE EXTENSION line below fails.
-- ============================================================

-- Enable pg_cron extension (superuser required)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to the postgres role so cron jobs can execute
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── Stale session cleanup job ───────────────────────────────
-- Runs every hour on the hour.
-- Marks sessions 'abandoned' if they have been stuck in any
-- live-session status ('created', 'active', 'evaluating') for
-- more than 90 minutes.
--
-- NOTE: 'started' is NOT a valid status in this codebase.
--   Live session statuses are 'created' (pre-connect) and
--   'active' (interview in progress). 'evaluating' is set by
--   the client immediately before calling /api/evaluate; it
--   should transition to 'completed' within ~60 seconds under
--   normal conditions, so 90 minutes is a safe threshold for
--   all three.
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 * * * *',
  $$
    UPDATE sessions
    SET status = 'abandoned'
    WHERE status IN ('created', 'active', 'evaluating')
    AND created_at < NOW() - INTERVAL '90 minutes';
  $$
);

-- ── Status constraint update ────────────────────────────────
-- The original constraint from ADD_STATUS_COLUMN.sql is:
--   CHECK (status IN ('created', 'active', 'completed', 'failed'))
--
-- 'evaluating' is written by the simulator but may not be in
-- the live constraint depending on when it was added. Run the
-- diagnostic query below to see the current constraint, then
-- drop and recreate it with all six values.
--
-- STEP 1: Find the constraint name
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'sessions'::regclass
--   AND contype = 'c';
--
-- STEP 2: Drop and recreate (replace <constraint_name> with
-- the actual name returned above, e.g. sessions_status_check)
--
--   ALTER TABLE sessions DROP CONSTRAINT <constraint_name>;
--
--   ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
--     CHECK (status IN (
--       'created',
--       'active',
--       'evaluating',
--       'completed',
--       'failed',
--       'abandoned'
--     ));
--
-- Run STEP 2 only after confirming the constraint name in STEP 1.
-- ============================================================
