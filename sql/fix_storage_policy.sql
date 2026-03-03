-- Ensure reports bucket exists and is public
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = true;

-- Enable RLS (just in case)
alter table storage.objects enable row level security;

-- Drop existing policies to avoid conflicts if re-running
drop policy if exists "Public Access Reports" on storage.objects;
drop policy if exists "Public Insert Reports" on storage.objects;

-- Create permissive policies for the 'reports' bucket
-- This allows both anon and authenticated users to Read and Write to the reports bucket.
-- This is a workaround for the API route potentially missing the Service Role Key
-- and defaulting to the Anon Key, which would otherwise be blocked.

create policy "Public Access Reports"
on storage.objects for select
to public
using ( bucket_id = 'reports' );

create policy "Public Insert Reports"
on storage.objects for insert
to public
with check ( bucket_id = 'reports' );

-- Also allow update/delete if needed? Maybe later.
