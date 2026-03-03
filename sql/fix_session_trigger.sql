-- Trigger to prevent double counting of sessions
-- The issue is that the trigger fires ON INSERT and updates the balance.
-- If the API ALSO manually increments, we get double.
-- In `app/api/razorpay/verify/route.ts`, the code inserts the purchase.
-- The trigger `on_purchase_completed` (lines 188-204 in schema.sql) automatically adds sessions.
-- However, we don't see manual increment logic in the verify route shown in step 468.
-- It only inserts into `purchases`.

-- HYPOTHESIS: The trigger might be firing multiple times or the user triggered it multiple times?
-- OR: The user previously had sessions?
-- "Sessions left: 20". Pro+ gives 7. 
-- 20 = 4 (completed) + 16 (remaining)? No.
-- If they bought Pro+ (7 sessions) and somehow got ~20 total.
-- Maybe they bought it twice? Or the trigger fired twice?
-- Or they had existing sessions.

-- Let's check if the trigger is duplicated.

DROP TRIGGER IF EXISTS on_purchase_completed ON public.purchases;
DROP FUNCTION IF EXISTS public.increment_sessions();

CREATE OR REPLACE FUNCTION public.increment_sessions() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if condition is met (handled by trigger WHEN, but safety check here)
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.users 
    SET available_sessions = COALESCE(available_sessions, 0) + NEW.sessions_added 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_purchase_completed
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW 
  EXECUTE PROCEDURE public.increment_sessions();
