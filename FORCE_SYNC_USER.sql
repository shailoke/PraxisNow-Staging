-- FORCE SYNC AND UPGRADE USER
-- This script fixes RLS visibility issues by ensuring the ID matches Auth exactly.

-- 1. Remove potentially mismatched public profile
DELETE FROM public.users WHERE email = 'oke.shailesh@gmail.com';

-- 2. Insert fresh row using the CORRECT Auth ID
INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    available_sessions, 
    package_tier
)
SELECT 
    id,                         -- The vital Auth ID
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'avatar_url',
    5,                          -- Set sessions to 5
    'Starter'                   -- Set tier to Starter
FROM auth.users
WHERE email = 'oke.shailesh@gmail.com';

-- 3. Verify visibility (This should return 1 row now)
SELECT * FROM public.users WHERE email = 'oke.shailesh@gmail.com';
