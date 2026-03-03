
-- ADD MISSING COLUMNS TO SESSIONS TABLE
-- The error "Could not find the 'pdf_url' column" happens because these columns are missing in the database.

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS evaluation_data JSONB;

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Refresh the schema cache (Supabase specific)
NOTIFY pgrst, 'reload config';
