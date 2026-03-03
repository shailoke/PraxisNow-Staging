-- Verify that the 4 fixed scenarios now pass Entry Family validation
-- These should no longer appear in the invalid scenarios list

WITH canonical_mappings AS (
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'PM', ARRAY['metrics', 'discovery', 'risks']::text[]
    UNION ALL SELECT 'Leadership', ARRAY['vision']::text[]
    UNION ALL SELECT 'Data Scientist', ARRAY['vision']::text[]
    UNION ALL SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'SDE', ARRAY['write_path', 'read_path', 'discovery']::text[]
)
SELECT 
    s.id,
    s.role,
    s.scenario_title,
    s.evaluation_dimensions,
    c.canonicals as role_canonical_dimensions,
    CASE 
        WHEN s.evaluation_dimensions <@ c.canonicals THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as validation_status
FROM scenarios s
LEFT JOIN canonical_mappings c ON s.role = c.role
WHERE s.id IN (30, 31, 32, 39)
ORDER BY s.id;
