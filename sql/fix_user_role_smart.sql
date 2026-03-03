-- 1. Add columns to public.users if they don't exist
alter table public.users add column if not exists primary_role text;
alter table public.users add column if not exists designation text;
alter table public.users add column if not exists current_company text;

-- 2. Try to sync from auth.users (if the user signed up with metadata)
-- This logic looks into the JSON metadata (e.g. Google Auth or Signup Form) 
-- and copies it to the public profile.
update public.users
set 
  primary_role = COALESCE(
    primary_role, -- Keep existing if set
    (select raw_user_meta_data->>'primary_role' from auth.users where auth.users.id = public.users.id),
    (select raw_user_meta_data->>'role' from auth.users where auth.users.id = public.users.id)
  ),
  full_name = COALESCE(
    full_name,
    (select raw_user_meta_data->>'full_name' from auth.users where auth.users.id = public.users.id),
    (select raw_user_meta_data->>'name' from auth.users where auth.users.id = public.users.id)
  );

-- 3. Fallback: Only if STILL null (meaning no profile info existed), default to PM for testing.
-- This ensures we don't overwrite valid data if it was there.
update public.users
set primary_role = 'Product Manager'
where primary_role is null;
