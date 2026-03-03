-- Test if the UPDATE worked by checking row count
-- This tests the WHERE clause matching

-- Test 1: Check how many scenarios match our WHERE conditions BEFORE update
SELECT 
    id,
    role,
    CASE 
        WHEN id = 30 AND role = 'Product Manager' THEN '✅ Would match UPDATE'
        WHEN id = 31 AND role = 'Product Manager' THEN '✅ Would match UPDATE'
        WHEN id = 32 AND role = 'Product Manager' THEN '✅ Would match UPDATE'
        WHEN id = 39 AND role = 'Data Scientist' THEN '✅ Would match UPDATE'
        ELSE '❌ Would NOT match UPDATE'
    END as match_status,
    role as exact_role_value,
    length(role) as role_length,
    evaluation_dimensions
FROM scenarios
WHERE id IN (30, 31, 32, 39)
ORDER BY id;
