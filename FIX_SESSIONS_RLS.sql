-- FIX SESSIONS RLS
-- Ensure users can create, read, and update their own sessions

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 1. VIEW POLICY
DROP POLICY IF EXISTS "Enable Users to view their own sessions" ON public.sessions;
CREATE POLICY "Enable Users to view their own sessions"
ON public.sessions FOR SELECT
USING (auth.uid() = user_id);

-- 2. INSERT POLICY
DROP POLICY IF EXISTS "Enable Users to create their own sessions" ON public.sessions;
CREATE POLICY "Enable Users to create their own sessions"
ON public.sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE POLICY
DROP POLICY IF EXISTS "Enable Users to update their own sessions" ON public.sessions;
CREATE POLICY "Enable Users to update their own sessions"
ON public.sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions just in case
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.sessions TO service_role;
