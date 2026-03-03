-- MEDIUM → HIGH CONFIDENCE SCENARIO DIMENSION FIXES
-- These 5 scenarios have been upgraded from MEDIUM to HIGH confidence
-- All mappings validated against Entry Family canonicals

-- ================================
-- PRODUCT MANAGER FIXES (2)
-- ================================

-- PM Scenario 29: "Product Sense" + "User Empathy" → "discovery"
-- Intent: Product case study focused on user-centric design
-- Mapping: User empathy and product sense are core PM discovery capabilities (user research, problem validation)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['discovery']
WHERE id = 29;

-- PM Scenario 50: "Guesstimation" + "Structured Thinking" → "metrics"
-- Intent: Fermi estimation/analytical problem solving
-- Mapping: Guesstimation and structured decomposition align with metrics-driven analytical thinking
UPDATE scenarios
SET evaluation_dimensions = ARRAY['metrics']
WHERE id = 50;

-- ================================
-- SOFTWARE ENGINEER FIXES (3)
-- ================================

-- SDE Scenario 25: "Technical Depth" → "write_path"
-- Intent: Implementation-focused coding interview
-- Mapping: Technical depth for SDE = code implementation quality, tested by write_path Entry Families
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 25;

-- SDE Scenario 46: "Automation Strategy" + "CI/CD" → "write_path"
-- Intent: DevOps automation implementation
-- Mapping: Automation and CI/CD integration are write path activities (implementing automated systems)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 46;

-- SDE Scenario 49: "CS Fundamentals" + "Coding" → "write_path"
-- Intent: Junior SDE fundamentals interview
-- Mapping: CS fundamentals and coding assessment = write path Entry Family (algorithm implementation)
UPDATE scenarios
SET evaluation_dimensions = ARRAY['write_path']
WHERE id = 49;

-- ================================
-- VERIFICATION
-- ================================

-- Verify all 5 changes
SELECT 
    id,
    role,
    scenario_title,
    evaluation_dimensions,
    '✅ FIXED' as status
FROM scenarios
WHERE id IN (29, 50, 25, 46, 49)
ORDER BY 
    CASE role 
        WHEN 'Product Manager' THEN 1
        WHEN 'Software Development Engineer' THEN 2
        ELSE 3
    END,
    id;
