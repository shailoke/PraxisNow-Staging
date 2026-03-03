-- Verify the 5 newly fixed scenarios now PASS Entry Family validation

WITH canonical_mappings AS (
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
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
WHERE s.id IN (29, 50, 25, 46, 49)
ORDER BY s.id;
