-- ALL 4 UPDATES IN ONE TRANSACTION
-- Run this entire script at once with COMMIT at the end

BEGIN;

-- PM Scenario 30
UPDATE scenarios
SET evaluation_dimensions = ARRAY['risks', 'discovery']
WHERE id = 30;

-- PM Scenario 31
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 31;

-- PM Scenario 32
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 32;

-- Data Scenario 39 → Leadership
UPDATE scenarios
SET 
    role = 'Leadership',
    evaluation_dimensions = ARRAY['vision']
WHERE id = 39;

-- Verify all changes
SELECT 
    id,
    role,
    evaluation_dimensions,
    '✅ UPDATED' as status
FROM scenarios
WHERE id IN (30, 31, 32, 39)
ORDER BY id;

-- If the SELECT above looks correct, run COMMIT
-- If something looks wrong, run ROLLBACK

COMMIT;
