ALTER TABLE public.scenarios
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 45;

COMMENT ON COLUMN public.scenarios.duration_minutes IS
'Interview duration in minutes. Defaults to 45. Used by simulator
to set countdown timer and AI time awareness.';

UPDATE public.scenarios SET duration_minutes = 30 WHERE id = 31;
