-- Fix PM scenarios to use only valid PM Entry Family dimensions
-- PM Entry Families support ONLY: metrics, discovery, risks

-- Step 1: Find all PM scenarios with invalid dimensions
SELECT 
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions,
    CASE 
        WHEN evaluation_dimensions && ARRAY['Leadership', 'Strategy', 'Communication', 'Execution']::text[] 
        THEN 'INVALID - Contains non-PM dimensions'
        ELSE 'VALID'
    END as status
FROM scenarios
WHERE role = 'Product Manager'
ORDER BY id;

-- Step 2: Fix PM scenarios by replacing invalid dimensions with valid ones

-- For PM Leadership scenarios, use 'discovery' (fits stakeholder/vision work)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery', 'risks']
WHERE role = 'Product Manager'
  AND evaluation_dimensions @> ARRAY['Leadership']::text[];

-- For PM Strategy scenarios, use 'metrics' (fits strategic decision-making)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['metrics', 'discovery']
WHERE role = 'Product Manager'
  AND evaluation_dimensions @> ARRAY['Strategy']::text[]
  AND NOT (evaluation_dimensions @> ARRAY['Leadership']::text[]);

-- For PM Communication scenarios, use 'discovery' (fits stakeholder communication)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery', 'metrics']
WHERE role = 'Product Manager'
  AND evaluation_dimensions @> ARRAY['Communication']::text[]
  AND NOT (evaluation_dimensions @> ARRAY['Leadership', 'Strategy']::text[]);

-- For PM Execution scenarios, use 'risks' (fits delivery/execution work)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['risks', 'metrics']
WHERE role = 'Product Manager'
  AND evaluation_dimensions @> ARRAY['Execution']::text[]
  AND NOT (evaluation_dimensions @> ARRAY['Leadership', 'Strategy', 'Communication']::text[]);

-- Step 3: Verify all PM scenarios now have valid dimensions only
SELECT 
    id, 
    role, 
    level, 
    scenario_title,
    evaluation_dimensions,
    CASE 
        WHEN evaluation_dimensions <@ ARRAY['metrics', 'discovery', 'risks']::text[] 
        THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as validation_status
FROM scenarios
WHERE role = 'Product Manager'
ORDER BY id;
