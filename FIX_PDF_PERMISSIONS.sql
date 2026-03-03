
-- 1. Create the Reports Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Download of Reports
DROP POLICY IF EXISTS "Public Access to Reports" ON storage.objects;
CREATE POLICY "Public Access to Reports"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );

-- 3. Allow Authenticated Users to Upload Reports
DROP POLICY IF EXISTS "Authenticated Users Can Upload Reports" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'reports' );

-- 4. Allow Authenticated Users to Update their Own Sessions (to save the PDF URL)
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions"
ON public.sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
