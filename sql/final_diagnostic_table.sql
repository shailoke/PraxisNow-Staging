-- FINAL DIAGNOSTIC TABLE: Scenario Dimension Mismatch Analysis
-- This generates the exact table requested with scenario IDs, dimensions, and recommendations

WITH canonical_mappings AS (
    -- Define Entry Family constraints
    SELECT 'Product Manager' as role, ARRAY['metrics', 'discovery', 'risks']::text[] as canonicals
    UNION ALL SELECT 'PM', ARRAY['metrics', 'discovery', 'risks']::text[]
    UNION ALL SELECT 'Data Scientist', ARRAY['vision']::text[]
    UNION ALL SELECT 'Data', ARRAY['vision']::text[]
    UNION ALL SELECT 'Software Development Engineer', ARRAY['write_path', 'read_path', 'discovery']::text[]
    UNION ALL SELECT 'SDE', ARRAY['write_path', 'read_path', 'discovery']::text[]
),
invalid_scenarios AS (
    SELECT 
        s.id as scenario_id,
        s.role,
        s.level,
        s.scenario_title,
        s.evaluation_dimensions as current_evaluation_dimensions,
        c.canonicals as role_canonical_dimensions,
        -- Determine why invalid
        CASE 
            WHEN s.role LIKE '%Product Manager%' OR s.role = 'PM' THEN
                CASE
                    WHEN s.evaluation_dimensions @> ARRAY['Leadership']::text[] THEN 'UX label "Leadership" - not PM canonical (use discovery)'
                    WHEN s.evaluation_dimensions @> ARRAY['Strategy']::text[] THEN 'UX label "Strategy" - not PM canonical (use discovery)'
                    WHEN s.evaluation_dimensions @> ARRAY['Execution']::text[] THEN 'UX label "Execution" - not PM canonical (use risks)'
                    WHEN s.evaluation_dimensions @> ARRAY['Communication']::text[] THEN 'UX label "Communication" - not PM canonical'
                    WHEN s.evaluation_dimensions @> ARRAY['Analytical Thinking']::text[] THEN 'Competency label - not PM canonical (use metrics)'
                    ELSE 'Domain labels - not PM canonicals'
                END
            WHEN s.role LIKE '%Data%' THEN
                CASE
                    WHEN s.evaluation_dimensions @> ARRAY['Data Strategy']::text[] THEN 'Domain labels - Data role only supports "vision" (or reclassify as Leadership)'
                    WHEN s.evaluation_dimensions @> ARRAY['Leadership']::text[] AND NOT (s.evaluation_dimensions @> ARRAY['vision']::text[]) THEN 'Has Leadership but not vision - should be Leadership role'
                    ELSE 'Domain/UX labels - Data role only supports "vision"'
                END
            ELSE 'Dimensions not in role canonical set'
        END as why_invalid,
        -- Recommend canonical dimensions
        CASE 
            WHEN s.role LIKE '%Product Manager%' OR s.role = 'PM' THEN
                array_remove(ARRAY[
                    CASE WHEN s.evaluation_dimensions && ARRAY['Leadership', 'Strategy', 'Strategic Alignment']::text[] THEN 'discovery' END,
                    CASE WHEN s.evaluation_dimensions && ARRAY['Execution', 'Risk', 'Governance']::text[] THEN 'risks' END,
                    CASE WHEN s.evaluation_dimensions && ARRAY['Tracking', 'Analytical Thinking', 'Metrics', 'Reporting']::text[] THEN 'metrics' END
                ]::text[], NULL)
            WHEN s.role LIKE '%Data%' THEN ARRAY['vision']::text[]
            ELSE c.canonicals
        END as candidate_canonical_dimensions,
        -- Confidence rating
        CASE 
            WHEN s.role LIKE '%Product Manager%' AND s.evaluation_dimensions && ARRAY['Leadership', 'Execution', 'Strategy', 'Analytical Thinking']::text[] THEN 'HIGH'
            WHEN s.role LIKE '%Data%' AND s.evaluation_dimensions @> ARRAY['Leadership']::text[] THEN 'MEDIUM'
            WHEN s.role LIKE '%Data%' AND s.scenario_title LIKE '%Strategy%' THEN 'LOW'
            ELSE 'MEDIUM'
        END as confidence
    FROM scenarios s
    LEFT JOIN canonical_mappings c ON s.role = c.role
    WHERE c.canonicals IS NOT NULL
      AND NOT (s.evaluation_dimensions <@ c.canonicals)
)
SELECT 
    scenario_id,
    role,
    current_evaluation_dimensions,
    why_invalid,
    candidate_canonical_dimensions,
    confidence,
    '→ ' || 
    CASE 
        WHEN confidence = 'LOW' AND role LIKE '%Data%' THEN 'MANUAL REVIEW: Consider role reclassification'
        WHEN confidence = 'MEDIUM' THEN 'REVIEW: Verify mapping intent'
        ELSE 'APPLY: High confidence mapping'
    END as recommendation
FROM invalid_scenarios
ORDER BY 
    CASE role 
        WHEN 'Product Manager' THEN 1
        WHEN 'PM' THEN 1
        WHEN 'Data Scientist' THEN 2
        WHEN 'Data' THEN 2
        ELSE 3
    END,
    scenario_id;
