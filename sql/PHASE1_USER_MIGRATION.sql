-- ============================================
-- PHASE 1: USER & DATA MIGRATION
-- Pro+ → Pro Tier Migration (REVERSIBLE)
-- ============================================

-- PRECHECK RESULTS:
-- - Pro+ users: 1
-- - Total sessions used: 29
-- - Available sessions: 1
-- ============================================

-- STEP 1: Backup current state (for rollback)
-- Create a temporary backup table
CREATE TABLE IF NOT EXISTS users_pro_plus_backup AS
SELECT id, email, package_tier, available_sessions, total_sessions_used, created_at
FROM public.users
WHERE package_tier = 'Pro+';

-- Verify backup created
SELECT COUNT(*) as backed_up_users FROM users_pro_plus_backup;

-- STEP 2: Migrate Pro+ users to Pro
UPDATE public.users
SET package_tier = 'Pro'
WHERE package_tier = 'Pro+';

-- STEP 3: Verification queries
-- 3a. Confirm no Pro+ users remain
SELECT 
    'Pro+ users remaining' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS'
        ELSE '❌ FAIL - Migration incomplete'
    END as status
FROM public.users 
WHERE package_tier = 'Pro+';

-- 3b. Verify migrated users are now Pro
SELECT 
    'Migrated to Pro' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ PASS - Expected 1 user'
        ELSE '❌ FAIL - Expected 1 user migrated'
    END as status
FROM public.users u
WHERE u.id IN (SELECT id FROM users_pro_plus_backup)
  AND u.package_tier = 'Pro';

-- 3c. Current tier distribution
SELECT 
    package_tier,
    COUNT(*) as user_count,
    SUM(available_sessions) as total_available,
    SUM(total_sessions_used) as total_used
FROM public.users
GROUP BY package_tier
ORDER BY 
    CASE package_tier
        WHEN 'Pro' THEN 3
        WHEN 'Starter' THEN 2
        WHEN 'Free' THEN 1
    END DESC;

-- ============================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================
-- To revert migration:
-- UPDATE public.users u
-- SET package_tier = b.package_tier
-- FROM users_pro_plus_backup b
-- WHERE u.id = b.id;
-- ============================================

-- EXPECTED RESULTS:
-- ✅ Check 3a: 0 Pro+ users
-- ✅ Check 3b: 1 user migrated to Pro
-- ✅ Check 3c: Pro count increased by 1
-- ============================================
