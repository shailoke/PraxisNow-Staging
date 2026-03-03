-- Audit ALL scenarios to ensure dimensions are compatible with Entry Families
-- Entry Family dimensions by role (from entry-families.ts):

-- PM: metrics, discovery, risks
-- SDE: architecture, scale, technical_depth
-- Data: ml_design, technical_depth, metrics
-- TPM: execution, dependencies, risks
-- Leadership roles: leadership, strategy, communication

-- Check PM scenarios (should only use: metrics, discovery, risks)
SELECT 
    'PM' as role_check,
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions,
    CASE 
        WHEN evaluation_dimensions <@ ARRAY['metrics', 'discovery', 'risks']::text[] 
        THEN '✅ VALID'
        ELSE '❌ INVALID - Use only: metrics, discovery, risks'
    END as status
FROM scenarios
WHERE role IN ('Product Manager', 'PM')
ORDER BY id;

-- Check SDE scenarios (should only use: Architecture, Scale, Technical Depth)
SELECT 
    'SDE' as role_check,
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions,
    CASE 
        WHEN evaluation_dimensions <@ ARRAY['Architecture', 'Scale', 'Technical Depth']::text[] 
        THEN '✅ VALID'
        ELSE '❌ INVALID - Use only: Architecture, Scale, Technical Depth'
    END as status
FROM scenarios
WHERE role IN ('Software Development Engineer', 'SDE', 'Software Engineer')
ORDER BY id;

-- Check Data scenarios (should only use: ML Design, Technical Depth, metrics)
SELECT 
    'Data' as role_check,
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions,
    CASE 
        WHEN evaluation_dimensions <@ ARRAY['ML Design', 'Technical Depth', 'metrics']::text[] 
        THEN '✅ VALID'
        ELSE '❌ INVALID - Use only: ML Design, Technical Depth, metrics'
    END as status
FROM scenarios
WHERE role IN ('Data Scientist', 'Data')
ORDER BY id;

-- Summary: Count invalid scenarios by role
SELECT 
    role,
    COUNT(*) as total_scenarios,
    COUNT(*) FILTER (WHERE 
        (role IN ('Product Manager', 'PM') AND NOT (evaluation_dimensions <@ ARRAY['metrics', 'discovery', 'risks']::text[]))
        OR (role IN ('SDE', 'Software Engineer') AND NOT (evaluation_dimensions <@ ARRAY['Architecture', 'Scale', 'Technical Depth']::text[]))
        OR (role IN ('Data Scientist', 'Data') AND NOT (evaluation_dimensions <@ ARRAY['ML Design', 'Technical Depth', 'metrics']::text[]))
    ) as invalid_count
FROM scenarios
GROUP BY role
ORDER BY role;
