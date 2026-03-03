-- Fix Transcript Column Type
-- It was defined as JSONB but we are treating it as TEXT in the application logic.

ALTER TABLE public.sessions 
ALTER COLUMN transcript TYPE text 
USING transcript::text;
