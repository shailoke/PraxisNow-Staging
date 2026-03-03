-- 1. Create Free Tier Support
alter table public.users drop constraint if exists users_package_tier_check;
alter table public.users add constraint users_package_tier_check 
  check (package_tier in ('Free', 'Starter', 'Pro', 'Pro+'));

-- 2. Migrate existing 'Starter' (Default) users to 'Free'
-- We assume if available_sessions <= 1, they are essentially Free users.
update public.users 
set package_tier = 'Free' 
where package_tier = 'Starter' and available_sessions <= 1;

-- 3. Ensure defaults use 'Free'
alter table public.users alter column package_tier set default 'Free';

-- 4. Update the Trigger to use 'Free'
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
    primary_role
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    'Free',  -- New Default
    1, 
    new.raw_user_meta_data->>'primary_role'
  );
  return new;
end;
$$ language plpgsql security definer;
