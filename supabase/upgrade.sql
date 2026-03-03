-- 1. Schema Updates for Salary Negotiation Coach
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('interview', 'negotiation_simulation')) DEFAULT 'interview';

ALTER TABLE sessions 
ALTER COLUMN scenario_id DROP NOT NULL;

-- 2. Upgrade the specific user to Pro+
UPDATE public.users
SET package_tier = 'Pro+',
    available_sessions = 20
WHERE id = 'e4fd48ff-4620-4294-a498-1861758bb0d7';
