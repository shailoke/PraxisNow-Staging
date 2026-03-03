-- NUCLEAR RESET: SESSIONS TABLE
-- This script completely drops and recreates the sessions table to match the Code exactly.
-- WARNING: This deletes all existing session history.

-- 1. DROP EXISTING TABLE
DROP TABLE IF EXISTS public.transcripts; -- Drop dependent if exists
DROP TABLE IF EXISTS public.messages;    -- Drop dependent if exists
DROP TABLE IF EXISTS public.sessions;

-- 2. RECREATE SESSIONS TABLE
CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    
    -- Scenario ID as INTEGER (to match your URL ID 19).
    -- We assume public.scenarios(id) is Integer. 
    -- If this FK fails, remove the "REFERENCES public.scenarios(id)" part.
    scenario_id integer REFERENCES public.scenarios(id),

    transcript text,                 -- Text type for Transcript
    duration_seconds integer,        -- Correct column name
    
    -- Extra columns for future proofing
    confidence_score float,
    created_at timestamptz DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES (Full Access for Owner)
CREATE POLICY "Users can insert own sessions" 
ON public.sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
ON public.sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" 
ON public.sessions FOR SELECT 
USING (auth.uid() = user_id);

-- 5. GRANT PERMISSIONS
GRANT ALL ON TABLE public.sessions TO authenticated;

-- 6. ENSURE USER COLUMNS EXIST (Just in case)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_sessions_used integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available_sessions integer DEFAULT 1;
