ALTER TABLE public.scenarios
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

COMMENT ON COLUMN public.scenarios.duration_minutes IS
'Interview duration in minutes. Defaults to 30 for all scenarios.';
