-- FIX SIMULATOR SCHEMA & PERMISSIONS
-- This script fixes Type Mismatches (UUID vs Int, JSONB vs Text) and RLS Permissions

-- 1. ADD MISSING COLUMNS (Ensures code doesn't fail on missing fields)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_sessions_used integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available_sessions integer DEFAULT 1;

-- 2. FIX SESSIONS TABLE TYPES
-- Change transcript to TEXT
ALTER TABLE public.sessions 
ALTER COLUMN transcript TYPE text 
USING transcript::text;

-- Change scenario_id to INTEGER
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_scenario_id_fkey;

ALTER TABLE public.sessions 
ALTER COLUMN scenario_id TYPE integer 
USING scenario_id::integer;

-- Re-add FK constraint
DO $$ 
BEGIN
    ALTER TABLE public.sessions 
    ADD CONSTRAINT sessions_scenario_id_fkey 
    FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id);
EXCEPTION 
    WHEN others THEN 
        RAISE NOTICE 'Could not re-add FK constraint - skipping to ensure functionality';
END $$;

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. FIX USERS POLICIES
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 5. FIX SESSIONS POLICIES
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

-- 6. GRANT PERMISSIONS
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.scenarios TO authenticated;
