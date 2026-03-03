-- Query to extract all invalid PM and Data Scientist scenarios with diagnostic information
-- This generates the analysis table for role × dimension modeling issues

WITH entry_family_dimensions AS (
    -- Define what dimensions each role supports based on entry-families.ts
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as supported_dimensions
    UNION ALL
    SELECT 'PM', ARRAY['metrics', 'discovery', 'risks']::text[]
    UNION ALL
    SELECT 'Data Scientist', ARRAY['vision']::text[] -- Uses leadership fallback
    UNION ALL
    SELECT 'Data', ARRAY['vision']::text[]
    UNION ALL
    SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL
    SELECT 'SDE', ARRAY['write_path', 'read_path', 'discovery']::text[]
),
scenario_analysis AS (
    SELECT 
        s.id,
        s.role,
        s.level,
        s.scenario_title,
        s.evaluation_dimensions,
        ef.supported_dimensions,
        -- Check if all scenario dimensions are supported
        s.evaluation_dimensions <@ ef.supported_dimensions as is_valid,
        -- Find invalid dimensions
        ARRAY(
            SELECT unnest(s.evaluation_dimensions)
            EXCEPT
            SELECT unnest(ef.supported_dimensions)
        ) as invalid_dimensions,
        -- Determine why invalid
        CASE 
            WHEN s.evaluation_dimensions && ARRAY['Leadership', 'Strategy', 'Communication', 'Execution', 'Analytical Thinking']::text[]
            THEN 'UX/competency labels used instead of canonical evaluation dimensions'
            WHEN s.evaluation_dimensions && ARRAY['Data Strategy', 'Ethics/Privacy', 'Productionization']::text[]
            THEN 'Domain-specific labels not mapped to canonical dimensions'
            ELSE 'Dimensions not supported by role Entry Families'
        END as why_invalid
    FROM scenarios s
    LEFT JOIN entry_family_dimensions ef ON s.role = ef.role
    WHERE ef.supported_dimensions IS NOT NULL
)
SELECT 
    id as scenario_id,
    role,
    level,
    scenario_title,
    evaluation_dimensions as current_evaluation_dimensions,
    invalid_dimensions,
    why_invalid,
    supported_dimensions as candidate_canonical_dimensions,
    CASE 
        WHEN is_valid THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as status
FROM scenario_analysis
WHERE NOT is_valid
ORDER BY role, id;
