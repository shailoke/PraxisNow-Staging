-- SETUP STORAGE (v2) - Permission Safe Version
-- We removed the 'ALTER TABLE' command which causes the 42501 error.

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false) 
ON CONFLICT (id) DO NOTHING;

-- 2. Create Policies
-- Note: We use auth.uid() = owner. The Supabase client automatically sets the 'owner' field to the user's ID on upload.

-- AVATARS (Public Read, Owner Write)
DROP POLICY IF EXISTS "Avatar Public View" ON storage.objects;
CREATE POLICY "Avatar Public View" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Avatar User Upload" ON storage.objects;
CREATE POLICY "Avatar User Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Avatar User Update" ON storage.objects;
CREATE POLICY "Avatar User Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- RESUMES (Owner Read, Owner Write)
DROP POLICY IF EXISTS "Resume User View" ON storage.objects;
CREATE POLICY "Resume User View" ON storage.objects FOR SELECT USING ( bucket_id = 'resumes' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Resume User Upload" ON storage.objects;
CREATE POLICY "Resume User Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'resumes' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Resume User Update" ON storage.objects;
CREATE POLICY "Resume User Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'resumes' AND auth.uid() = owner );
