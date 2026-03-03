-- VERIFICATION QUERIES FOR ROLE MODEL CLEANUP
-- Run these to verify the migration completed successfully

-- 1. CHECK ROLE DISTRIBUTION (Should show only 5 approved roles)
SELECT role, COUNT(*) as count
FROM public.scenarios
GROUP BY role
ORDER BY role;

-- 2. CHECK FOR UNAPPROVED ROLES (Should return EMPTY)
SELECT DISTINCT role, COUNT(*) as count
FROM public.scenarios
WHERE role NOT IN (
    'Product Manager',
    'Project Manager',
    'Software Development Engineer',
    'Marketer',
    'Data Scientist'
)
GROUP BY role
ORDER BY role;

-- 3. CHECK FRESH GRADUATE CONVERSIONS
SELECT 
    id,
    role,
    applicant_context,
    scenario_title,
    evaluation_dimensions
FROM public.scenarios
WHERE applicant_context = 'fresh_graduate'
ORDER BY role;

-- 4. CHECK MARKETING SCENARIOS (Should all show dimension-based titles)
SELECT 
    id,
    scenario_title,
    evaluation_dimensions
FROM public.scenarios
WHERE role = 'Marketer'
ORDER BY scenario_title;

-- 5. FINAL COUNT BY ROLE
SELECT 
    role,
    COUNT(*) as total_scenarios,
    COUNT(CASE WHEN applicant_context = 'fresh_graduate' THEN 1 END) as fresh_grad_scenarios
FROM public.scenarios
GROUP BY role
ORDER BY role;
