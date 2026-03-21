-- Migration: Add Progression Architecture columns to sessions table
-- Part of the Momentum Card + Progression Comparison feature (2026-03-22)
--
-- After running this migration, regenerate TypeScript types:
--   supabase gen types typescript --project-id [project-id] > lib/database.types.ts

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS momentum_card JSONB DEFAULT NULL;

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS progression_comparison JSONB DEFAULT NULL;

COMMENT ON COLUMN public.sessions.momentum_card IS
'Structured 3-field summary for above-the-fold post-session display.
Derived deterministically from evaluation output. See progression architecture.
Fields: strongest_signal (string), one_fix (string), progress_note (string|null).';

COMMENT ON COLUMN public.sessions.progression_comparison IS
'Progression delta vs prior session in same role/level. Runs for all
non-replay consecutive sessions with evaluationDepth=full. Populated by
evaluate route. Shape: { observed_changes: string[], unchanged_areas: string[] }.';
