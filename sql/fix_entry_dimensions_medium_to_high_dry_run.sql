-- DRY RUN: MEDIUM → HIGH CONFIDENCE SCENARIO DIMENSION FIXES
-- Preview of changes before applying
-- Run this first to verify intent

SELECT 
    id as scenario_id,
    role,
    scenario_title,
    evaluation_dimensions as current_dimensions,
    CASE 
        WHEN id = 29 THEN ARRAY['discovery']::text[]
        WHEN id = 50 THEN ARRAY['metrics']::text[]
        WHEN id = 25 THEN ARRAY['write_path']::text[]
        WHEN id = 46 THEN ARRAY['write_path']::text[]
        WHEN id = 49 THEN ARRAY['write_path']::text[]
    END as new_dimensions,
    CASE 
        WHEN id = 29 THEN 'PM: Product Sense/User Empathy → discovery (user research capability)'
        WHEN id = 50 THEN 'PM: Guesstimation/Structured Thinking → metrics (analytical decomposition)'
        WHEN id = 25 THEN 'SDE: Technical Depth → write_path (implementation quality)'
        WHEN id = 46 THEN 'SDE: Automation/CI-CD → write_path (automated system implementation)'
        WHEN id = 49 THEN 'SDE: CS Fundamentals/Coding → write_path (algorithm implementation)'
    END as change_rationale,
    CASE role
        WHEN 'Product Manager' THEN 'entry_pm_{level}_{discovery|metrics}'
        WHEN 'Software Development Engineer' THEN 'entry_sde_{level}_write_path'
        ELSE 'UNKNOWN'
    END as target_entry_family_pattern
FROM scenarios
WHERE id IN (29, 50, 25, 46, 49)
ORDER BY 
    CASE role 
        WHEN 'Product Manager' THEN 1
        WHEN 'Software Development Engineer' THEN 2
        ELSE 3
    END,
    id;
