-- 1. Re-enable Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential duplicate/broken policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own user" ON public.users;

-- 3. Create a clean, standard RLS policy
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 4. Create update policy just in case
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- 5. Grant access to authenticated users (sometimes needed explicitly)
GRANT SELECT, UPDATE ON public.users TO authenticated;
