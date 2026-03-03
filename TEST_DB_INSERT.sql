-- TEST INSERTION manually to verify DB accepts the new schema
-- Run this in Supabase SQL Editor

INSERT INTO public.sessions (
    user_id, 
    scenario_id, 
    session_type, 
    status, 
    duration_seconds
)
VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Grab any user
    NULL, 
    'negotiation_simulation', 
    'created', 
    1800
)
RETURNING *;
