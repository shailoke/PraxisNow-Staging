-- FORCE UPDATE (Safety off)
-- This ensures that regardless of headers/metadata, the column is set.
update public.users 
set primary_role = 'Product Manager'
where true; 

-- ALSO: Ensure RLS allows reading this column
-- (Re-applying the select policy just in case it was restrictive)
drop policy if exists "Users can see their own profile" on public.users;
create policy "Users can see their own profile" 
on public.users for select 
using (auth.uid() = id);

-- Just to be super safe, grant permissions (usually not needed for superbase public schema but good practice if roles messed up)
grant select, update on public.users to authenticated;
