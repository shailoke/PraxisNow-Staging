-- 1. Add is_admin to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL, -- 'user', 'session', 'system'
  target_id TEXT, -- UUID or other ID
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 4. Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Admin Logs
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
CREATE POLICY "Admins can view logs" ON admin_logs 
  FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

DROP POLICY IF EXISTS "Admins can insert logs" ON admin_logs;
CREATE POLICY "Admins can insert logs" ON admin_logs 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

-- 6. Policies for System Settings
DROP POLICY IF EXISTS "Admins can view settings" ON system_settings;
CREATE POLICY "Admins can view settings" ON system_settings 
  FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings" ON system_settings 
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

DROP POLICY IF EXISTS "Admins can insert settings" ON system_settings;
CREATE POLICY "Admins can insert settings" ON system_settings 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

-- 7. System Errors Table
CREATE TABLE IF NOT EXISTS system_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- 'LLM', 'PDF', 'Storage', 'Auth', 'Lifecycle'
  message TEXT,
  details JSONB,
  user_id UUID REFERENCES users(id),
  session_id TEXT, -- Flexible ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view errors" ON system_errors;
CREATE POLICY "Admins can view errors" ON system_errors 
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

DROP POLICY IF EXISTS "System can insert errors" ON system_errors;
CREATE POLICY "System can insert errors" ON system_errors 
    FOR INSERT WITH CHECK (true);

-- 8. Add is_active to scenarios
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 9. Grant Admin Access Helper
CREATE OR REPLACE FUNCTION make_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET is_admin = true WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
