-- FIX RLS POLICIES for USER PROFILES
-- This script ensures users can INSERT, UPDATE, and SELECT their own data.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. INSERT POLICY (Allows users to create their row if missing)
DROP POLICY IF EXISTS "Enable Users to insert their own data" ON public.users;
CREATE POLICY "Enable Users to insert their own data"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 2. UPDATE POLICY (Allows users to edit their own data)
DROP POLICY IF EXISTS "Enable Users to update their own data" ON public.users;
CREATE POLICY "Enable Users to update their own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. SELECT POLICY (Allows users to view their own data)
DROP POLICY IF EXISTS "Enable Users to view their own data" ON public.users;
CREATE POLICY "Enable Users to view their own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 4. GRANT PERMISSIONS
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
