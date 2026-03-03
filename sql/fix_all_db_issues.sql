-- 1. FORCE REMOVE the broken function and its dependent triggers
-- The error showed the trigger is named 'purchases_trigger'. 
-- Using CASCADE will automatically remove that trigger and any others bound to this function.
DROP FUNCTION IF EXISTS public.upgrade_tier_and_sessions() CASCADE;

-- 2. Make sure our CORRECT trigger is in place
-- This part defines the logic we actually want (idempotent session increment)
CREATE OR REPLACE FUNCTION public.increment_sessions() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.users 
    SET available_sessions = COALESCE(available_sessions, 0) + NEW.sessions_added 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the correct trigger
DROP TRIGGER IF EXISTS on_purchase_completed ON public.purchases;
CREATE TRIGGER on_purchase_completed
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW 
  EXECUTE PROCEDURE public.increment_sessions();

-- 3. Emergency Fix for Negative Balances
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
       VALUES (r.id, 'final_fix_v2_' || floor(extract(epoch from now())) || '_' || r.id, 0, sessions_to_add, 'completed');
       
       RAISE NOTICE 'Fixed user %: Added % sessions', r.id, sessions_to_add;
    END LOOP;
END $$;

-- 4. Apply Hard Constraint (So this never happens again)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS check_positive_sessions;

ALTER TABLE public.users 
ADD CONSTRAINT check_positive_sessions 
CHECK (available_sessions >= 0);
