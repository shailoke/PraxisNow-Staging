-- Add dimension tracking to interview_turns
-- Both columns nullable — existing rows remain valid, TMAY turns will have NULL
ALTER TABLE interview_turns ADD COLUMN dimension TEXT;
ALTER TABLE interview_turns ADD COLUMN turns_in_dimension INTEGER;
