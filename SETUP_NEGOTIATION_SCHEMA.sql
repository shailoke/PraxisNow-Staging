-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD OR SQL EDITOR

-- 1. Add session_type to distinguish between standard interviews and negotiation simulations
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('interview', 'negotiation_simulation')) DEFAULT 'interview';

-- 2. Allow scenario_id to be NULL (Negotiation sessions do not link to the static scenarios table)
ALTER TABLE sessions 
ALTER COLUMN scenario_id DROP NOT NULL;

-- 3. Upgrade your user to Pro+ (Replace with your actual User ID if needed, or this targets the latest user)
UPDATE public.users
SET package_tier = 'Pro+',
    available_sessions = 20
WHERE id = (
    SELECT id 
    FROM public.users 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 4. Reload Schema Cache (Fixes 'Could not find column' errors)
NOTIFY pgrst, 'reload schema';
