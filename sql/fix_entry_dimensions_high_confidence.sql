-- HIGH CONFIDENCE SCENARIO DIMENSION FIXES
-- These fixes have been validated against Entry Family canonicals
-- Only HIGH-confidence mappings are applied

-- ================================
-- PRODUCT MANAGER FIXES (3)
-- ================================

-- PM Scenario 30: "Product Strategy" → Replace "Execution" with "risks"
-- Intent: Product strategy with execution focus → PM canonical "risks" (delivery/execution)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['risks', 'discovery']
WHERE id = 30
  AND role = 'Product Manager';

-- PM Scenario 31: "Leadership" → Replace with "discovery"
-- Intent: Leadership interview for PM → PM canonical "discovery" (stakeholder/vision work)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 31
  AND role = 'Product Manager';

-- PM Scenario 32: "Org Design" → Replace with "discovery"
-- Intent: Organizational leadership for PM → PM canonical "discovery" (vision alignment)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 32
  AND role = 'Product Manager';

-- ================================
-- DATA SCIENTIST ROLE CHANGE (1)
-- ================================

-- Data Scenario 39: "Data Strategy" → ROLE CHANGE to Leadership
-- Intent: Strategic/ethics focus is NOT technical Data work → Leadership role with "vision"
UPDATE scenarios
SET 
    role = 'Leadership',
    evaluation_dimensions = ARRAY['vision']
WHERE id = 39
  AND role = 'Data Scientist';

-- ================================
-- VERIFICATION
-- ================================

-- Verify changes
SELECT 
    id,
    role,
    scenario_title,
    evaluation_dimensions,
    '✅ FIXED' as status
FROM scenarios
WHERE id IN (30, 31, 32, 39)
ORDER BY id;
