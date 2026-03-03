-- ============================================
-- FIX CORRUPT SCENARIO TITLES
-- ============================================
-- This script fixes scenario_title values that were truncated
-- Root cause: "Leadership" was being truncated to "ership"

-- Fix all scenarios with "Leadership" in dimensions
UPDATE public.scenarios
SET scenario_title = CASE 
    -- Product Manager with Leadership
    WHEN role = 'Product Manager' AND evaluation_dimensions && ARRAY['Leadership']
        THEN 'Leadership & Stakeholder Management'
    
    -- Marketer with Leadership    
    WHEN role = 'Marketer' AND evaluation_dimensions && ARRAY['Leadership']
        THEN 'Brand Strategy & Leadership'
    
    -- Data Scientist with Leadership
    WHEN role = 'Data Scientist' AND evaluation_dimensions && ARRAY['Leadership']
        THEN 'Data Culture & Leadership'
    
    -- Software Engineer with Leadership
    WHEN role = 'Software Development Engineer' AND evaluation_dimensions && ARRAY['Leadership']
        THEN 'Technical Leadership & Strategy'
    
    -- Project Manager with Leadership
    WHEN role = 'Project Manager' AND evaluation_dimensions && ARRAY['Leadership']
        THEN 'Leadership & Team Execution'
        
    ELSE scenario_title
END
WHERE scenario_title LIKE '%ership%' 
   OR (evaluation_dimensions && ARRAY['Leadership'] AND scenario_title NOT LIKE '%Leadership%');

-- Verify the fix
SELECT 
    id,
    role,
    scenario_title,
    evaluation_dimensions
FROM public.scenarios
WHERE evaluation_dimensions && ARRAY['Leadership']
ORDER BY role, id;
