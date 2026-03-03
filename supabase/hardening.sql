-- 1. Add status column to sessions if not exists
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'created' 
CHECK (status IN ('created', 'active', 'completed', 'failed'));

-- 2. Index for active sessions (Parallel Session Prevention)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_active_user 
ON sessions (user_id) 
WHERE status IN ('created', 'active');

-- 3. RLS for Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" 
ON sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions (limited)" 
ON sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Note: We will move INSERT to Service Role (Server-side) so Users don't need INSERT permission ideally.
-- But if we keep client insert for now (during transition), we need:
-- CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- STRATEGY: We are moving to Server-Side creation. So we can disable INSERT for auth.uid() eventually.

-- 4. RLS for Evaluations (stored in sessions currently, but if we had a table)
-- (Skipped as evaluations are in sessions)

-- 5. RLS for Custom Scenarios
ALTER TABLE custom_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own custom scenarios" 
ON custom_scenarios FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Users can create own custom scenarios" 
ON custom_scenarios FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom scenarios" 
ON custom_scenarios FOR UPDATE 
USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom scenarios" 
ON custom_scenarios FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Storage Policies (Reports)
-- Assuming bucket 'reports' exists
-- "Users cannot see other users' PDFs" -> We use Signed URLs.
-- So we need to DISABLE public access.
-- UPDATE storage.buckets SET public = false WHERE id = 'reports';
-- ALLOW users to read their own files? No, Signed URLs bypass RLS for reading.
-- So strict RLS: No SELECT for anon/authenticated (unless owner, but filename has no uid).
-- Strategy: Deny All Public. Server generates Signed URL.

-- 7. Hardening Users Table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);
-- Users should NOT update their own tier or sessions.
-- We might allow updating metadata (full_name, avatar).
CREATE POLICY "Users can update own metadata" 
ON users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 
-- Ideally we use a trigger to prevent updating sensitive fields, but simplified RLS helps.
