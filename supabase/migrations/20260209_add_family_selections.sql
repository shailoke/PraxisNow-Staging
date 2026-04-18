-- Add family_selections column to sessions table
-- This enables Entry Family randomization and persistence

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS family_selections JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sessions.family_selections IS 
'Maps dimension names to selected question family IDs for this session. Used for Entry Family tracking and question randomization.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_family_selections ON sessions USING GIN (family_selections);
