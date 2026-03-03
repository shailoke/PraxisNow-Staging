-- Verify the 4 fixed scenarios now PASS Entry Family validation

WITH canonical_mappings AS (
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'Leadership', ARRAY['vision']::text[]
)
SELECT 
    s.id,
    s.role,
    s.evaluation_dimensions,
    c.canonicals as role_canonical_dimensions,
    CASE 
        WHEN s.evaluation_dimensions <@ c.canonicals THEN '✅ VALID - Entry Family will resolve'
        ELSE '❌ INVALID - Entry Family will fail'
    END as validation_status
FROM scenarios s
LEFT JOIN canonical_mappings c ON s.role = c.role
WHERE s.id IN (30, 31, 32, 39)
ORDER BY s.id;
