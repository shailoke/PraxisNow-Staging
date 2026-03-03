-- ============================================
-- PHASE 0: SAFETY PRECHECK
-- Pro+ Merge Implementation
-- ============================================
-- DO NOT PROCEED WITH MIGRATION UNTIL THESE QUERIES ARE VERIFIED

-- 1. Count existing Pro+ users
SELECT 
    'Pro+ Users' as metric,
    COUNT(*) as count
FROM public.users 
WHERE package_tier = 'Pro+';

-- 2. Get detailed Pro+ user info
SELECT 
    id,
    email,
    package_tier,
    available_sessions,
    total_sessions_used,
    created_at
FROM public.users 
WHERE package_tier = 'Pro+'
ORDER BY created_at DESC;

-- 3. Recent Pro+ purchases (last 30 days)
SELECT 
    p.id,
    p.user_id,
    u.email,
    p.order_id,
    p.amount,
    p.sessions_added,
    p.status,
    p.created_at
FROM public.purchases p
JOIN public.users u ON u.id = p.user_id
WHERE u.package_tier = 'Pro+'
  AND p.created_at > NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC;

-- 4. Verify Pro+ sessions have evaluation data
SELECT 
    s.id as session_id,
    u.email as user_email,
    s.pdf_url IS NOT NULL as has_pdf,
    s.evaluation_data IS NOT NULL as has_evaluation,
    s.evaluation_depth,
    s.created_at
FROM public.sessions s
JOIN public.users u ON u.id = s.user_id
WHERE u.package_tier = 'Pro+'
  AND s.evaluation_depth IN ('full', 'shallow')
ORDER BY s.created_at DESC
LIMIT 100;

-- 5. Check for sessions missing critical data (RED FLAG)
SELECT 
    COUNT(*) as sessions_missing_data,
    'CRITICAL: Pro+ sessions without evaluation' as warning
FROM public.sessions s
JOIN public.users u ON u.id = s.user_id
WHERE u.package_tier = 'Pro+'
  AND s.evaluation_depth IN ('full', 'shallow')
  AND s.evaluation_data IS NULL;

-- 6. Distribution of all tiers (before migration)
SELECT 
    package_tier,
    COUNT(*) as user_count,
    SUM(available_sessions) as total_available_sessions,
    SUM(total_sessions_used) as total_used_sessions
FROM public.users
GROUP BY package_tier
ORDER BY 
    CASE package_tier
        WHEN 'Pro+' THEN 4
        WHEN 'Pro' THEN 3
        WHEN 'Starter' THEN 2
        WHEN 'Free' THEN 1
    END DESC;

-- ============================================
-- EXPECTED RESULTS TO VERIFY:
-- ============================================
-- 1. Pro+ user count > 0 (if 0, migration not needed)
-- 2. Recent purchases should have status = 'completed'
-- 3. All Pro+ sessions should have evaluation_data
-- 4. No missing critical data (query 5 should return 0)
-- ============================================
