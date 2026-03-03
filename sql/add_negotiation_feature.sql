-- 1. Ensure 'session_type' column exists
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'interview';

-- 2. Create the "Salary Negotiation" Scenario
-- We insert it with a specific ID if possible, or just look it up later.
-- To make it easier for frontend, let's try to map it to a negative ID or something distinct? 
-- PostgreSQL IDs are auto-increment.
-- Better: Use a UUID if the ID was UUID, but it's INT.
-- Let's just insert it and we'll query it by role/level.

INSERT INTO public.scenarios (role, level, persona, prompt, evaluation_dimensions)
VALUES (
  'Negotiation Coach', 
  'Expert', 
  'Constructive & Tactical', 
  'You are an expert Salary Negotiation Coach. You are role-playing against the user. 
   SCENARIO: The user has just received an offer. You are the Hiring Manager.
   They need to negotiate for higher base or equity.
   
   YOUR GOAL:
   1. Be tough but fair. Do not give in easily.
   2. Use standard objection handling ("This is our best and final", "We are at the top of the band").
   3. Provide feedback ONLY at the end.
   4. During the conversation, stay in character as the Hiring Manager.
   
   If the user makes a strong point (market data, unique value), concede slightly.
   If they are weak/aggressive, shut them down professionally.', 
  ARRAY['Leverage', 'Tone', 'Strategy']
)
ON CONFLICT DO NOTHING;

-- 3. We also need to fix correct scenario_id constraint if we want to allow NULL (optional, but good for flexibility)
-- The user code had "Schema update required: ALTER COLUMN scenario_id DROP NOT NULL"
-- Let's apply that.
ALTER TABLE public.sessions ALTER COLUMN scenario_id DROP NOT NULL;

-- 4. Fix potential RLS for new column
-- (RLS usually applies to the row, so existing policies cover it, but good to check)
