-- 1. Update Users Table Schema
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS display_pic_url text,
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- 2. Create Storage Buckets (if they don't exist)
-- Note: This requires the storage extension to be enabled
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false) -- Resumes should be private/authenticated only ideally, but for now we'll match public requirement pattern or handle with RLS
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3. Storage Policies (Standard RLS)
-- AVATARS: Public View, User Upload
CREATE POLICY "Avatar Public View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar User Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

CREATE POLICY "Avatar User Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- RESUMES: User Only View/Upload
CREATE POLICY "Resume User View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'resumes' AND auth.uid() = owner );

CREATE POLICY "Resume User Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'resumes' AND auth.uid() = owner );

CREATE POLICY "Resume User Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'resumes' AND auth.uid() = owner );


-- 4. Update Trigger to handle First/Last Name extraction
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  meta_full_name text;
  meta_first_name text;
  meta_last_name text;
  space_index int;
BEGIN
  -- Extract metadata
  meta_full_name := NEW.raw_user_meta_data->>'full_name';
  meta_first_name := NEW.raw_user_meta_data->>'given_name'; -- Google/LinkedIn often provide this
  meta_last_name := NEW.raw_user_meta_data->>'family_name';

  -- Fallback logic if parsing full_name
  IF meta_first_name IS NULL AND meta_full_name IS NOT NULL THEN
    space_index := position(' ' in meta_full_name);
    IF space_index > 0 THEN
      meta_first_name := substring(meta_full_name from 1 for space_index - 1);
      meta_last_name := substring(meta_full_name from space_index + 1);
    ELSE
      meta_first_name := meta_full_name;
      meta_last_name := '';
    END IF;
  END IF;

  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    first_name, 
    last_name,
    onboarding_complete
    -- available_sessions and package_tier have defaults
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    meta_full_name, 
    NEW.raw_user_meta_data->>'avatar_url',
    meta_first_name,
    meta_last_name,
    false -- Force onboarding
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.users.last_name, EXCLUDED.last_name);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
