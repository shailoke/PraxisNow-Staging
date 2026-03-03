-- ROLE MODEL CLEANUP & ALIGNMENT
-- Consolidating to 5 primary roles, removing unapproved roles, converting Marketing sub-roles to dimensions
-- Fresh Graduate becomes a context modifier, not a standalone role

-- ===================================================================
-- PART 1: ADD APPLICANT_CONTEXT COLUMN TO SCENARIOS
-- ===================================================================

ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS applicant_context text; -- 'fresh_graduate' or NULL

COMMENT ON COLUMN public.scenarios.applicant_context IS 'Optional context modifier for calibration (e.g., fresh_graduate). NOT a primary role.';

-- ===================================================================
-- PART 2: ROLE MAPPING - MARKETING CONSOLIDATION
-- ===================================================================

-- Convert all Marketing sub-roles to single "Marketer" role with dimensions

-- Product Marketing → Marketer + "Positioning & Messaging"
UPDATE public.scenarios
SET 
    role = 'Marketer',
    evaluation_dimensions = 
        CASE 
            WHEN 'Positioning & Messaging' = ANY(evaluation_dimensions) THEN evaluation_dimensions
            ELSE array_append(evaluation_dimensions, 'Positioning & Messaging')
        END,
    scenario_title = 'Marketing Interview — Positioning & Messaging'
WHERE role IN ('Product Marketing Manager', 'Product Marketer', 'PMM');

-- Digital Marketing → Marketer + "Demand Generation"
UPDATE public.scenarios
SET 
    role = 'Marketer',
    evaluation_dimensions = 
        CASE 
            WHEN 'Demand Generation' = ANY(evaluation_dimensions) THEN evaluation_dimensions
            ELSE array_append(evaluation_dimensions, 'Demand Generation')
        END,
    scenario_title = 'Marketing Interview — Demand Generation & Performance'
WHERE role IN ('Digital Marketing', 'Digital Marketer', 'Performance Marketing');

-- Brand Marketing → Marketer + "Brand & Narrative"
UPDATE public.scenarios
SET 
    role = 'Marketer',
    evaluation_dimensions = 
        CASE 
            WHEN 'Brand & Narrative' = ANY(evaluation_dimensions) THEN evaluation_dimensions
            ELSE array_append(evaluation_dimensions, 'Brand & Narrative')
        END,
    scenario_title = 'Marketing Interview — Brand Strategy'
WHERE role IN ('Brand Marketing', 'Brand Marketer');

-- ABM / Account Marketing → Marketer + "Account-Based Marketing"
UPDATE public.scenarios
SET 
    role = 'Marketer',
    evaluation_dimensions = 
        CASE 
            WHEN 'Account-Based Marketing' = ANY(evaluation_dimensions) THEN evaluation_dimensions
            ELSE array_append(evaluation_dimensions, 'Account-Based Marketing')
        END,
    scenario_title = 'Marketing Interview — Account-Based Strategy'
WHERE role IN ('ABM', 'Account Marketing', 'Account-Based Marketing');

-- Growth Marketing → Marketer + "Demand Generation"
UPDATE public.scenarios
SET 
    role = 'Marketer',
    evaluation_dimensions = 
        CASE 
            WHEN 'Demand Generation' = ANY(evaluation_dimensions) THEN evaluation_dimensions
            ELSE array_append(evaluation_dimensions, 'Demand Generation')
        END,
    scenario_title = 'Marketing Interview — Growth & Demand Generation'
WHERE role IN ('Growth Marketing', 'Growth Marketer');

-- Generic Marketing → Marketer
UPDATE public.scenarios
SET role = 'Marketer'
WHERE role = 'Marketing';

-- ===================================================================
-- PART 3: SOFTWARE ENGINEER CONSOLIDATION
-- ===================================================================

-- Standardize all engineer roles to "Software Development Engineer"
UPDATE public.scenarios
SET role = 'Software Development Engineer'
WHERE role IN ('Software Engineer', 'SDE', 'Developer', 'Engineer', 'Swe', 'SWE');

-- ===================================================================
-- PART 4: FRESH GRADUATE CONVERSION
-- ===================================================================

-- Convert standalone Fresh Graduate scenarios to context modifier
-- NOTE: These will need manual review for which role to assign

-- Mark all Fresh Graduate scenarios for review
UPDATE public.scenarios
SET 
    applicant_context = 'fresh_graduate',
    -- Assign to most common entry role if no specific role indicated
    role = CASE 
        WHEN evaluation_dimensions && ARRAY['Product Sense', 'Strategy'] THEN 'Product Manager'
        WHEN evaluation_dimensions && ARRAY['Coding', 'System Design', 'Architecture'] THEN 'Software Development Engineer'
        WHEN evaluation_dimensions && ARRAY['Positioning & Messaging', 'Campaign Execution'] THEN 'Marketer'
        WHEN evaluation_dimensions && ARRAY['Data Analysis', 'SQL', 'Statistics'] THEN 'Data Scientist'
        ELSE 'Product Manager' -- Default for generic fresh grad scenarios
    END,
    scenario_title = COALESCE(scenario_title, 'Entry-Level Interview — Core Skills')
WHERE role IN ('Fresh Graduate', 'Entry Level', 'Junior');

-- ===================================================================
-- PART 5: DELETE UNAPPROVED ROLES
-- ===================================================================

-- Delete QA / Tester / SDET scenarios (no mapping possible)
DELETE FROM public.scenarios
WHERE role IN (
    'QA',
    'Quality Assurance',
    'Tester',
    'SDET',
    'Test Engineer',
    'QA Engineer',
    'Quality Engineer'
);

-- Delete Analyst scenarios UNLESS they're clearly Data Scientist
DELETE FROM public.scenarios
WHERE role IN ('Analyst', 'Business Analyst', 'Systems Analyst')
AND NOT (
    evaluation_dimensions && ARRAY['Data Analysis', 'SQL', 'Statistics', 'Machine Learning']
);

-- Convert Data-focused Analysts to Data Scientist
UPDATE public.scenarios
SET role = 'Data Scientist'
WHERE role IN ('Data Analyst', 'Analytics')
OR (
    role IN ('Analyst', 'Business Analyst')
    AND evaluation_dimensions && ARRAY['Data Analysis', 'SQL', 'Statistics']
);

-- ===================================================================
-- PART 6: STANDARDIZE REMAINING ROLES
-- ===================================================================

-- Ensure Product Manager is standardized
UPDATE public.scenarios
SET role = 'Product Manager'
WHERE role IN ('PM', 'Product', 'Product Lead');

-- Ensure Project Manager is distinct
UPDATE public.scenarios
SET role = 'Project Manager'
WHERE role IN ('Project Lead', 'Program Manager', 'TPM');

-- ===================================================================
-- PART 7: UPDATE SCENARIO TITLES (DIMENSION-FIRST, NO LEVELS)
-- ===================================================================

-- Remove level references from scenario titles
UPDATE public.scenarios
SET scenario_title = 
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(scenario_title, 
                '(Senior|Junior|Principal|Staff|Lead|Mid-level|Entry-level)\s*', 
                '', 
                'gi'
            ),
            '\s+',
            ' ',
            'g'
        ),
        '^\s+|\s+$',
        '',
        'g'
    )
WHERE scenario_title IS NOT NULL
AND scenario_title ~ '(Senior|Junior|Principal|Staff|Lead|Mid-level|Entry-level)';

-- ===================================================================
-- PART 8: VERIFICATION QUERIES
-- ===================================================================

-- View current role distribution
SELECT role, COUNT(*) as count
FROM public.scenarios
GROUP BY role
ORDER BY role;

-- View Fresh Graduate conversions
SELECT 
    role,
    applicant_context,
    scenario_title,
    evaluation_dimensions
FROM public.scenarios
WHERE applicant_context = 'fresh_graduate';

-- Verify only approved roles remain
SELECT DISTINCT role
FROM public.scenarios
WHERE role NOT IN (
    'Product Manager',
    'Project Manager',
    'Software Development Engineer',
    'Marketer',
    'Data Scientist'
)
ORDER BY role;

-- View Marketing scenarios with dimensions
SELECT 
    scenario_title,
    evaluation_dimensions
FROM public.scenarios
WHERE role = 'Marketer'
ORDER BY scenario_title;
