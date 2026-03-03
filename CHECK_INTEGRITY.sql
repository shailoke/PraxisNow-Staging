-- CHECK DATA INTEGRITY
-- This query shows if your Auth User matches your Public Profile

SELECT 
  au.id as auth_id, 
  au.email as auth_email,
  pu.id as public_id,
  pu.email as public_email,
  pu.available_sessions,
  pu.package_tier
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'oke.shailesh@gmail.com' OR pu.email = 'oke.shailesh@gmail.com';
