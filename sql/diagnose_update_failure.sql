-- DIAGNOSTIC: Check exact current state of scenarios 30, 31, 32, 39
-- This will show us exactly what's in the database to debug why UPDATEs didn't work

SELECT 
    id,
    role,
    scenario_title,
    evaluation_dimensions,
    created_at
FROM scenarios
WHERE id IN (30, 31, 32, 39)
ORDER BY id;

-- Check row count to ensure these scenarios exist
SELECT COUNT(*) as scenario_count
FROM scenarios
WHERE id IN (30, 31, 32, 39);
