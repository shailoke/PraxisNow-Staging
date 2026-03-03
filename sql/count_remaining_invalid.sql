-- Count remaining invalid scenarios after HIGH-confidence fixes
-- Should now be 12 invalid (down from 16)

WITH canonical_mappings AS (
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'PM', ARRAY['metrics', 'discovery', 'risks']::text[]
    UNION ALL SELECT 'Data Scientist', ARRAY['vision']::text[]
    UNION ALL SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'SDE', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'Leadership', ARRAY['vision']::text[]
)
SELECT 
    s.role,
    COUNT(*) as invalid_count,
    array_agg(s.id ORDER BY s.id) as invalid_scenario_ids
FROM scenarios s
LEFT JOIN canonical_mappings c ON s.role = c.role
WHERE c.canonicals IS NOT NULL
  AND NOT (s.evaluation_dimensions <@ c.canonicals)
GROUP BY s.role
ORDER BY s.role;

-- Expected:
-- Product Manager: 2 invalid (29, 50)
-- Data Scientist: 3 invalid (37, 38, 40)
-- SDE: 6 invalid (25, 26, 27, 28, 46, 49)
-- Total: 11 invalid (down from 16)
