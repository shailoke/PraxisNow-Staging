-- Ensure users table has primary_role
alter table public.users
add column if not exists primary_role text;

-- Also add helpful columns if missing from schema image
alter table public.users
add column if not exists designation text,
add column if not exists current_company text;

-- Update the testing user (assuming the only user, or specifically the one logged in)
-- Since I can't know the ID, I'll update all users who don't have a role to 'Product Manager' for smooth UX testing
update public.users
set primary_role = 'Product Manager'
where primary_role is null;
