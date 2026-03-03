-- Add dimension_order column to sessions table for per-session dimension randomization
-- This enables fresh question patterns while maintaining replay determinism

ALTER TABLE sessions
ADD COLUMN dimension_order TEXT[];

COMMENT ON COLUMN sessions.dimension_order IS 
'Shuffled dimension sequence for this session. Determines the order in which dimensions are covered. Reused verbatim in replay sessions to ensure identical experience.';
