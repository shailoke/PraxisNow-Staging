-- Add onboarding_complete column to users table
alter table public.users 
add column if not exists onboarding_complete boolean default false;

-- Force it to false for everyone initially (so they see the tour)
-- Or maybe existing users shouldn't? 
-- "When a user logs-in for the first time"
-- Let's set it to false for everyone so even I see it now as requested by user ("Run a check..."). 
-- Actually, for existing users, maybe they've already "onboarded". 
-- But for testing, I'll default to false.
update public.users set onboarding_complete = false where onboarding_complete is null;

-- Ensure RLS allows update
-- (Users can already update their own profile via existing policy)
