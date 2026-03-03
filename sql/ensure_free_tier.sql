-- 1. Ensure package_tier column exists and has correct default
alter table public.users 
add column if not exists package_tier text default 'Starter';

-- 2. Ensure available_sessions column exists and has correct default
-- (It usually exists, but ensuring the default is 1)
alter table public.users 
alter column available_sessions set default 1;

-- 3. Backfill any existing users who might be missing these values
update public.users 
set package_tier = 'Starter' 
where package_tier is null;

update public.users 
set available_sessions = 1 
where available_sessions is null;

-- 4. Update the Trigger to EXPLICITLY set these on new signups
-- This overrides any database defaults just to be safe and clear in logic.

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    package_tier, 
    available_sessions,
    -- Also sync these metadata fields if available
    primary_role 
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    'Starter',  -- Enforce Free Tier
    1,          -- Enforce 1 Free Session
    new.raw_user_meta_data->>'primary_role' -- Try to sync role if provided at signup
  );
  return new;
end;
$$ language plpgsql security definer;
