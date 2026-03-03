-- 1. Ensure the 'package_tier' column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package_tier text DEFAULT 'Free';

-- 2. Upgrade the specific user
-- Replace 'oke.shailesh@gmail.com' with your actual email if different
UPDATE public.users
SET 
    available_sessions = 5,
    package_tier = 'Starter'
WHERE email = 'oke.shailesh@gmail.com';

-- 3. Verify the update
SELECT email, available_sessions, package_tier FROM public.users WHERE email = 'oke.shailesh@gmail.com';
