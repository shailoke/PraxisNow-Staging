-- SIMPLIFIED: Run each UPDATE individually
-- Execute these one at a time to ensure they work

-- UPDATE 4/4: Data Scenario 39 → Change role to Leadership
UPDATE scenarios
SET 
    role = 'Leadership',
    evaluation_dimensions = ARRAY['vision']
WHERE id = 39;

-- Verify #39 changed
SELECT id, role, evaluation_dimensions FROM scenarios WHERE id = 39;
