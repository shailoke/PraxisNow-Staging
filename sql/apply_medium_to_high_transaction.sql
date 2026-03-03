-- TRANSACTION VERSION: All 5 MEDIUM→HIGH updates with explicit COMMIT

BEGIN;

-- PM Scenario 29
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 29;

-- PM Scenario 50
UPDATE scenarios
SET evaluation_dimensions = ARRAY['metrics']
WHERE id = 50;

-- SDE Scenario 25
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 25;

-- SDE Scenario 46
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 46;

-- SDE Scenario 49
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 49;

-- Verify all changes
SELECT 
    id,
    role,
    evaluation_dimensions,
    '✅ UPDATED' as status
FROM scenarios
WHERE id IN (29, 50, 25, 46, 49)
ORDER BY id;

-- If the SELECT above looks correct, the COMMIT below will apply changes
-- If something looks wrong, run ROLLBACK instead

COMMIT;
