-- SIMPLIFIED: Run each UPDATE individually
-- Execute these one at a time to ensure they work

-- UPDATE 3/4: PM Scenario 32
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 32;

-- Verify #32 changed
SELECT id, role, evaluation_dimensions FROM scenarios WHERE id = 32;
