-- SIMPLIFIED: Run each UPDATE individually
-- Execute these one at a time to ensure they work

-- UPDATE 1/4: PM Scenario 30
UPDATE scenarios
SET evaluation_dimensions = ARRAY['risks', 'discovery']
WHERE id = 30;

-- Verify #30 changed
SELECT id, role, evaluation_dimensions FROM scenarios WHERE id = 30;
