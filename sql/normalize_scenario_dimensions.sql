-- Update database scenarios to use canonical dimension keys
-- This fixes display labels that may have been persisted to the database

-- PM Senior: "Strategic Vision" -> "Strategy"
UPDATE scenarios 
SET evaluation_dimensions = ARRAY['Leadership', 'Strategy', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Strategic Vision']);

-- SDE Junior: "Code Correctness" -> "Technical Depth"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Technical Depth', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Code Correctness']);

-- SDE Mid: "Scalability" -> "Scale"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Architecture', 'Scale']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Scalability']);

-- PM Mid: "Root Cause Analysis" -> "Analytical Thinking", "metrics"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Analytical Thinking', 'metrics']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Root Cause Analysis']);

-- TPM: "Risk Management" -> "risks"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['risks', 'Execution', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Risk Management']);

-- TPM: "Dependency Management" -> "Dependencies"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Dependencies', 'Collaboration']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Dependency Management']);

-- Data: "SQL Proficiency" -> "Technical Depth"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Technical Depth', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['SQL Proficiency']);

-- Data: "Feature Engineering" -> "ML Design"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['ML Design', 'Scale']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Feature Engineering']);

-- Data: "Business Strategy" -> "Strategy"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Strategy', 'Leadership']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Business Strategy']);

-- Fresh: "Self-awareness" -> "Culture Fit"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Culture Fit', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Self-awareness']);

-- Fresh: "Logic" -> "Technical Depth"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Technical Depth', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Logic']);

-- Fresh: "Collaboration" -> "Teamwork"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Teamwork', 'Culture', 'Communication']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Collaboration']::text[])
AND NOT (evaluation_dimensions @> ARRAY['Teamwork']);

-- TPM Exec: "Clarity" -> "Communication"
UPDATE scenarios
SET evaluation_dimensions = ARRAY['Communication', 'Leadership']
WHERE id IN (SELECT id FROM scenarios WHERE evaluation_dimensions @> ARRAY['Clarity']);

-- Verify changes
SELECT 
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions
FROM scenarios
ORDER BY id;
