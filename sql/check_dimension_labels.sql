-- Check for scenarios with display labels in evaluation_dimensions
SELECT 
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions
FROM scenarios
WHERE 
    evaluation_dimensions::text LIKE '%Strategic Vision%'
    OR evaluation_dimensions::text LIKE '%Code Correctness%'
    OR evaluation_dimensions::text LIKE '%Scalability%'
    OR evaluation_dimensions::text LIKE '%Risk Management%'
ORDER BY id;
