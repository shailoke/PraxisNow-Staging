
-- Create support_issues table
CREATE TABLE IF NOT EXISTS public.support_issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT NULL,
    issue_type TEXT NOT NULL,
    description TEXT,
    browser_info TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can report issues" ON public.support_issues;
DROP POLICY IF EXISTS "Users can view own issues" ON public.support_issues;

-- Allow authenticated users to insert (report issues)
CREATE POLICY "Users can report issues" 
ON public.support_issues FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own issues (optional but good for history if we add it later)
CREATE POLICY "Users can view own issues" 
ON public.support_issues FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Notify pgrst to refresh cache
NOTIFY pgrst, 'reload config';
