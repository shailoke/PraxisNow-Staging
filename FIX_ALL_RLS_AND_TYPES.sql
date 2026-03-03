-- FIX ALL RLS AND TYPES
-- This script ensures robust permissions and type compatibility.

-- 1. FIX SESSIONS TABLE TYPES
-- Allow transcript to be text (if not already)
ALTER TABLE public.sessions 
ALTER COLUMN transcript TYPE text 
USING transcript::text;

-- Allow scenario_id to be TEXT (to support both Integer IDs "19" and UUIDs)
-- First drop the constraint if it exists (name might vary, so we try generic approach or specific name if known)
-- We assume standard naming: sessions_scenario_id_fkey
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_scenario_id_fkey;

ALTER TABLE public.sessions 
ALTER COLUMN scenario_id TYPE text 
USING scenario_id::text;

-- 2. USERS RLS (Balance Updates)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 3. SESSIONS RLS (Session Creation)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions" 
ON public.sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions" 
ON public.sessions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" 
ON public.sessions FOR SELECT 
USING (auth.uid() = user_id);

-- 4. GRANT PERMISSIONS
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.scenarios TO authenticated;
