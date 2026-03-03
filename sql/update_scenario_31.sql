-- SIMPLIFIED: Run each UPDATE individually
-- Execute these one at a time to ensure they work

-- UPDATE 2/4: PM Scenario 31
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 31;

-- Verify #31 changed
SELECT id, role, evaluation_dimensions FROM scenarios WHERE id = 31;
