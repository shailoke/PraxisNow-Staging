-- ============================================
-- PRAXIS: Add Answer Upgrades Support
-- ============================================
-- Purpose: Enable Pro+ Answer Upgrades and evaluation depth tracking
-- Author: Antigravity AI
-- Date: 2026-01-17

-- Add new columns to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS answer_upgrades JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS evaluation_depth TEXT DEFAULT 'full' CHECK (evaluation_depth IN ('full', 'shallow', 'insufficient'));

-- Add column comments for documentation
COMMENT ON COLUMN public.sessions.answer_upgrades IS 
'Pro+ feature: Array of answer upgrade objects with question_text, user_answer_excerpt, upgraded_answer, why_better, skill_dimension. Generated only for Pro+ users with full-depth sessions (20+ min, 4+ questions).';

COMMENT ON COLUMN public.sessions.evaluation_depth IS 
'Evaluation quality indicator:
- full: Normal evaluation (20+ min, 4+ answered questions)
- shallow: Basic evaluation (<20 min or <4 questions) - no upgrades generated
- insufficient: Silent or near-silent session (0 user turns)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sessions_evaluation_depth 
ON public.sessions(evaluation_depth);

CREATE INDEX IF NOT EXISTS idx_sessions_answer_upgrades 
ON public.sessions USING GIN(answer_upgrades) 
WHERE answer_upgrades IS NOT NULL;

-- Verify schema changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sessions' 
  AND column_name IN ('answer_upgrades', 'evaluation_depth')
ORDER BY column_name;

-- Expected output:
-- answer_upgrades | jsonb | YES | NULL
-- evaluation_depth | text | YES | 'full'::text
