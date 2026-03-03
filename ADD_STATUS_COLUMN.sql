-- FIX MISSING STATUS COLUMN
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('created', 'active', 'completed', 'failed')) DEFAULT 'created';

-- REFRESH CACHE
NOTIFY pgrst, 'reload schema';
