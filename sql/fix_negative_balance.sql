-- Emergency Fix for Negative Balances
-- This script detects users with negative session balances (likely due to missing purchase history)
-- and inserts a "Correction" purchase record.
-- This effectively "Backfills" the missing purchase data so that the math work out.

-- Logic:
-- if balance < 0 (e.g. -3), it means (Free(1) + Purchases(0) - Used(4)) = -3.
-- We want them to have, say, 7 sessions available (Pro+ Pack).
-- So Target Balance = 7.
-- Deficit = Target - Current = 7 - (-3) = 10.
-- We need to add 10 sessions.

DO $$
DECLARE 
    r RECORD;
    target_balance INT := 7; -- Default target for affected users
    sessions_to_add INT;
BEGIN
    FOR r IN SELECT id, available_sessions, package_tier FROM public.users WHERE available_sessions < 0
    LOOP
        -- Determine target based on tier if possible, else default to 7
        IF r.package_tier = 'Pro+' THEN target_balance := 7;
        ELSIF r.package_tier = 'Pro' THEN target_balance := 5;
        ELSE target_balance := 3; -- Starter/Free catch-all
        END IF;

        -- Calculate how many to add to reach the target positive balance
        sessions_to_add := target_balance - r.available_sessions; 
        
        -- Insert Correction Purchase
        -- This will trigger the 'increment_sessions' trigger to update the user table
        INSERT INTO public.purchases (user_id, order_id, amount, sessions_added, status)
        VALUES (
            r.id, 
            'fix_' || floor(extract(epoch from now())) || '_' || r.id, -- Unique-ish Order ID
            0, -- Free correction
            sessions_to_add, 
            'completed'
        );
        
        RAISE NOTICE 'Fixed user %: Added % sessions to correct balance from % to %', r.id, sessions_to_add, r.available_sessions, target_balance;
    END LOOP;
END $$;
