-- 1. DROP and RECREATE the Trigger to be absolutely safe and idempotent
-- This ensures that we only add sessions when a purchase transitions to 'completed'
-- or is inserted as 'completed'.

CREATE OR REPLACE FUNCTION public.increment_sessions() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status is becoming 'completed' (either Insert as completed, or Update to completed)
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.users 
    SET available_sessions = COALESCE(available_sessions, 0) + NEW.sessions_added 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_purchase_completed ON public.purchases;
CREATE TRIGGER on_purchase_completed
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW 
  EXECUTE PROCEDURE public.increment_sessions();

-- 2. RECALCULATE Balances for All Users based on Source of Truth
-- Logic: Balance = (Base Free Sessions) + (Sum of Completed Purchases) - (Count of Created Sessions)
-- Base Free Sessions = 1 (Default)

WITH calculated_balances AS (
  SELECT 
    u.id AS user_id,
    -- Default 1 free session
    1 + 
    -- Add Purchased Sessions
    COALESCE((
      SELECT SUM(p.sessions_added)
      FROM public.purchases p 
      WHERE p.user_id = u.id AND p.status = 'completed'
    ), 0) - 
    -- Subtract Used Sessions (Count of sessions in 'sessions' table)
    (
      SELECT COUNT(*)
      FROM public.sessions s
      WHERE s.user_id = u.id
    ) AS correct_balance
  FROM public.users u
)
UPDATE public.users u
SET available_sessions = cb.correct_balance
FROM calculated_balances cb
WHERE u.id = cb.user_id
AND u.available_sessions != cb.correct_balance; -- Only update if different matches
