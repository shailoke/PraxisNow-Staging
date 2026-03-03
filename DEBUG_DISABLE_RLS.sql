-- DEBUG: Temporarily Disable Security to isolate the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify the row exists (Any user can now see this, confirming existence)
SELECT * FROM public.users WHERE email = 'oke.shailesh@gmail.com';
