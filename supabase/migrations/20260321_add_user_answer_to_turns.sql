-- Migration: Add canonical user_answer field to interview_turns
-- Created: 2026-03-21
-- Purpose: Establish a single, canonical column for candidate voice answers.
--          Replaces heuristic field-guessing in evaluate/route.ts which
--          previously tried user_content || user_audio_transcription ||
--          answer_content || user_response in sequence, silently producing
--          empty transcripts when none existed.

ALTER TABLE public.interview_turns
  ADD COLUMN IF NOT EXISTS user_answer text,
  ADD COLUMN IF NOT EXISTS user_answer_word_count integer,
  ADD COLUMN IF NOT EXISTS user_answer_captured_at timestamptz;

COMMENT ON COLUMN public.interview_turns.user_answer
  IS 'Verbatim transcription of the candidate voice answer for this turn. Canonical source of truth for evaluation. Written by /api/turns/answer immediately on transcription.completed event, before the turn is marked answered=true.';

COMMENT ON COLUMN public.interview_turns.user_answer_word_count
  IS 'Word count of user_answer, pre-computed at write time.';

COMMENT ON COLUMN public.interview_turns.user_answer_captured_at
  IS 'Timestamp when the transcription was persisted. Used to diagnose ordering issues between answer capture and turn completion.';
