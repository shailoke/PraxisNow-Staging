-- Re-run the full audit to see remaining invalid scenarios
-- After fixing 4 HIGH-confidence scenarios, we should have 12 remaining

WITH canonical_mappings AS (
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'PM', ARRAY['metrics', 'discovery', 'risks']::text[]
    UNION ALL SELECT 'Data Scientist', ARRAY['vision']::text[]
    UNION ALL SELECT 'Data', ARRAY['vision']::text[]
    UNION ALL SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'SDE', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'Leadership', ARRAY['vision']::text[]
)
SELECT 
    s.id as scenario_id,
    s.role,
    s.evaluation_dimensions as current_dimensions,
    c.canonicals as role_canonicals,
    CASE 
        WHEN s.evaluation_dimensions <@ c.canonicals THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as status
FROM scenarios s
LEFT JOIN canonical_mappings c ON s.role = c.role
WHERE c.canonicals IS NOT NULL
  AND NOT (s.evaluation_dimensions <@ c.canonicals)
ORDER BY 
    CASE s.role 
        WHEN 'Product Manager' THEN 1
        WHEN 'Data Scientist' THEN 2
        WHEN 'Software Development Engineer' THEN 3
        ELSE 4
    END,
    s.id;
