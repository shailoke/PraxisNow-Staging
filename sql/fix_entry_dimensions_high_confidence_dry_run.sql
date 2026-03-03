-- DRY RUN: HIGH CONFIDENCE SCENARIO DIMENSION FIXES
-- This shows what WOULD be changed without actually applying changes
-- Run this first to verify intent before applying fixes

-- ================================
-- PREVIEW CHANGES
-- ================================

SELECT 
    id as scenario_id,
    role as current_role,
    scenario_title,
    evaluation_dimensions as current_dimensions,
    CASE 
        WHEN id = 30 THEN 'Product Manager'
        WHEN id = 31 THEN 'Product Manager'
        WHEN id = 32 THEN 'Product Manager'
        WHEN id = 39 THEN 'Leadership'
    END as new_role,
    CASE 
        WHEN id = 30 THEN ARRAY['risks', 'discovery']::text[]
        WHEN id = 31 THEN ARRAY['discovery']::text[]
        WHEN id = 32 THEN ARRAY['discovery']::text[]
        WHEN id = 39 THEN ARRAY['vision']::text[]
    END as new_dimensions,
    CASE 
        WHEN id = 30 THEN 'Replace "Execution" with PM canonical "risks"'
        WHEN id = 31 THEN 'Replace "Leadership" with PM canonical "discovery"'
        WHEN id = 32 THEN 'Replace "Leadership/Org Design" with PM canonical "discovery"'
        WHEN id = 39 THEN 'ROLE CHANGE: Data strategy → Leadership with "vision"'
    END as change_rationale
FROM scenarios
WHERE id IN (30, 31, 32, 39)
ORDER BY 
    CASE role 
        WHEN 'Product Manager' THEN 1
        WHEN 'Data Scientist' THEN 2
        ELSE 3
    END,
    id;
