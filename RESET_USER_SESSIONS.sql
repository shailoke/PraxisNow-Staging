-- RESET USER SESSIONS
-- This script resets the current user's available sessions to 5 and ensures they are on the 'Starter' tier.

-- Update the user's profile
-- Note: 'auth.uid()' works when running in the context of the user (e.g., via RLS-aware query).
-- But since you are running this in the SQL Editor (Admin), we target ALL users or specific email?
-- Targeting all users is easiest for Dev, or you can find your specific ID.
-- Here we apply it to ALL users for simplicity in dev environment.

UPDATE public.users
SET 
  available_sessions = 5,
  package_tier = 'Starter',
  total_sessions_used = 0 -- Optional: Reset usage stats too?
WHERE true;

-- If you want to target a specific user, uncomment and use:
-- UPDATE public.users SET available_sessions = 5 WHERE email = 'your_email@example.com';
