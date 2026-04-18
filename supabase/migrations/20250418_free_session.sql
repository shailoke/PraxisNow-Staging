-- Add free session tracking to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS free_session_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Add free session flag to sessions table so we can identify
-- which session was the free one
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_free_session BOOLEAN NOT NULL DEFAULT FALSE;
