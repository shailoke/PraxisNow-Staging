
-- Create Reports Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Public Access to Reports (for download)
DROP POLICY IF EXISTS "Public Access to Reports" ON storage.objects;
CREATE POLICY "Public Access to Reports"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );

-- Service Role/Authenticated Users Upload
-- We allow authenticated users to upload because the server-side action uses the service key or authenticated client?
-- The route uses ADMIN client (Service Role), which BYPASSES RLS.
-- BUT if it falls back to ANON key (which it shouldn't), we might need this.
-- However, standard practice is that Service Role bypasses everything.
-- Just in case, let's allow authenticated inserts.
DROP POLICY IF EXISTS "Authenticated Users Can Upload Reports" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'reports' );
