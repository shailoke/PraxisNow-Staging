-- CHECK IF COLUMNS EXIST
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'sessions'
    AND column_name IN ('session_type', 'status', 'scenario_id');

-- IF YOU DO NOT SEE 'session_type' AND 'status' IN THE OUTPUT,
-- RUN THIS FIX:

-- 1. ADD COLUMNS
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('interview', 'negotiation_simulation')) DEFAULT 'interview';

ALTER TABLE sessions 
ALTER COLUMN scenario_id DROP NOT NULL;

-- 2. FORCE REFRESH (API CACHE)
NOTIFY pgrst, 'reload schema';
