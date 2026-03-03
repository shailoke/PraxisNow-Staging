-- Add Replay and Q&A persistence columns to sessions table

ALTER TABLE sessions
ADD COLUMN replay_of_session_id bigint REFERENCES sessions(id),
ADD COLUMN questions_to_ask jsonb;

-- Comment on columns
COMMENT ON COLUMN sessions.replay_of_session_id IS 'If this session is a replay, this references the original session ID';
COMMENT ON COLUMN sessions.questions_to_ask IS 'Array of questions (strings) that must be asked in this session (for replays)';
