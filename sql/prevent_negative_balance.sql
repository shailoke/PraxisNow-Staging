-- 1. Ensure clean state (Backfill any remaining negatives before applying constraint)
DO $$
DECLARE 
    r RECORD;
    target_balance INT := 3;
    sessions_to_add INT;
BEGIN
    FOR r IN SELECT id, available_sessions, package_tier FROM public.users WHERE available_sessions < 0
    LOOP
       IF r.package_tier = 'Pro+' THEN target_balance := 7;
       ELSIF r.package_tier = 'Pro' THEN target_balance := 5;
       ELSE target_balance := 3;
       END IF;
       sessions_to_add := target_balance - r.available_sessions; 
       
       INSERT INTO public.purchases (user_id, order_id, amount, sessions_added, status)
       VALUES (r.id, 'forced_fix_' || floor(extract(epoch from now())) || '_' || r.id, 0, sessions_to_add, 'completed');
    END LOOP;
END $$;

-- 2. Apply Hard Constraint
-- This ensures the database REJECTS any update that would result in a negative balance.
-- If an API bug tries to subtract session from 0, the DB will throw an error.

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS check_positive_sessions;

ALTER TABLE public.users 
ADD CONSTRAINT check_positive_sessions 
CHECK (available_sessions >= 0);

-- 3. (Optional) Audit Logging Trigger
-- If we want to strictly log attempts that *would* have failed or weird states, 
-- we generally rely on the application logs catching the DB constraint violation.
-- But the constraint is the strongest guarantee.
