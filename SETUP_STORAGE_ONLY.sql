-- SETUP STORAGE BUCKETS AND POLICIES
-- Run this to ensure file uploads work

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false) 
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on Storage Objects (Use with caution if existing apps depend on it being off, but usually safe)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies for Avatars
-- Allow public viewing of avatars
DROP POLICY IF EXISTS "Avatar Public View" ON storage.objects;
CREATE POLICY "Avatar Public View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow users to upload their own avatar (path starts with their user ID)
DROP POLICY IF EXISTS "Avatar User Upload" ON storage.objects;
CREATE POLICY "Avatar User Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = SPLIT_PART(name, '-', 1) ); 
-- Note: My code generates files like `${user.id}-random.ext`, so we check prefix.
-- Or easier: just check auth.uid() = owner if the client sets owner. Supabase client sets owner automatically.

DROP POLICY IF EXISTS "Avatar User Update" ON storage.objects;
CREATE POLICY "Avatar User Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid()::uuid = owner );

-- 4. Create Policies for Resumes
-- Users only view their own
DROP POLICY IF EXISTS "Resume User View" ON storage.objects;
CREATE POLICY "Resume User View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'resumes' AND auth.uid()::uuid = owner );

DROP POLICY IF EXISTS "Resume User Upload" ON storage.objects;
CREATE POLICY "Resume User Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'resumes' AND auth.uid()::uuid = owner );

DROP POLICY IF EXISTS "Resume User Update" ON storage.objects;
CREATE POLICY "Resume User Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'resumes' AND auth.uid()::uuid = owner );

-- 5. Grant permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
