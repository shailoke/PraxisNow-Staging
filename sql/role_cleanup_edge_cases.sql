-- ROLE MODEL CLEANUP - HANDLE REMAINING EDGE CASES
-- Converts Fresh Engineering Grad, Fresh MBA Grad to context modifiers
-- Handles Negotiation Coach (separate from interview scenarios)

-- ===================================================================
-- FRESH ENGINEERING GRAD → Software Development Engineer + fresh_graduate context
-- ===================================================================

UPDATE public.scenarios
SET 
    role = 'Software Development Engineer',
    applicant_context = 'fresh_graduate',
    scenario_title = COALESCE(scenario_title, 'Engineering Interview — Core Skills')
WHERE role = 'Fresh Engineering Grad';

-- ===================================================================
-- FRESH MBA GRAD → Product Manager + fresh_graduate context
-- ===================================================================

UPDATE public.scenarios
SET 
    role = 'Product Manager',
    applicant_context = 'fresh_graduate',
    scenario_title = COALESCE(scenario_title, 'Product Interview — Core Skills')
WHERE role = 'Fresh MBA Grad';

-- ===================================================================
-- NEGOTIATION COACH - Keep as separate entity
-- This is for the negotiation simulation feature, not interview scenarios
-- We'll leave it as-is for now since it's a different feature
-- ===================================================================

-- No action needed for Negotiation Coach - it's a separate feature

-- ===================================================================
-- VERIFICATION: Check only approved roles remain
-- ===================================================================

SELECT 
    role,
    COUNT(*) as total_scenarios,
    COUNT(CASE WHEN applicant_context = 'fresh_graduate' THEN 1 END) as fresh_grad_scenarios
FROM public.scenarios
GROUP BY role
ORDER BY role;

-- Check for any remaining unapproved roles (excluding Negotiation Coach)
SELECT DISTINCT role, COUNT(*) as count
FROM public.scenarios
WHERE role NOT IN (
    'Product Manager',
    'Project Manager',
    'Software Development Engineer',
    'Marketer',
    'Data Scientist',
    'Negotiation Coach'  -- Exclude this since it's a separate feature
)
GROUP BY role
ORDER BY role;
