-- ============================================
-- DIMENSION-FIRST SCENARIO MODEL MIGRATION
-- ============================================
-- This migration adds scenario_title field and populates it with
-- dimension-first naming while preserving role and level for
-- interviewer calibration.

-- Phase 1: Add scenario_title column
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS scenario_title text;

-- Phase 2: Populate scenario_title with dimension-first naming
-- Strategy: Use FIRST TWO evaluation_dimensions (already ordered by importance)
-- Format: "Dimension1 & Dimension2" (NOT role-prefixed, NOT level-referenced)

UPDATE public.scenarios
SET scenario_title = 
    CASE 
        -- Software Engineer scenarios
        WHEN role = 'Software Engineer' AND evaluation_dimensions[1] = 'Code Correctness' 
            THEN 'Coding & Problem Solving'
        WHEN role = 'Software Engineer' AND evaluation_dimensions[1] = 'Architecture'
            THEN 'System Design & Architecture'
        WHEN role = 'Software Engineer' AND evaluation_dimensions[1] = 'Leadership'
            THEN 'Technical Leadership & Strategy'
        
        -- Product Manager scenarios
        WHEN role = 'Product Manager' AND evaluation_dimensions[1] = 'Product Sense'
            THEN 'Product Sense & User Empathy'
        WHEN role = 'Product Manager' AND evaluation_dimensions[1] = 'Analytical Thinking'
            THEN 'Metrics & Root Cause Analysis'
        WHEN role = 'Product Manager' AND evaluation_dimensions[1] = 'Leadership'
            THEN 'Leadership & Stakeholder Management'
        
        -- Data Scientist scenarios
        WHEN role = 'Data Scientist' AND evaluation_dimensions[1] = 'SQL Proficiency'
            THEN 'SQL & Data Analysis'
        WHEN role = 'Data Scientist' AND evaluation_dimensions[1] = 'Feature Engineering'
            THEN 'ML Pipeline & System Design'
        WHEN role = 'Data Scientist' AND evaluation_dimensions[1] = 'Business Strategy'
            THEN 'Data Strategy & Business Impact'
        
        -- Fresh Grad scenarios
        WHEN role = 'Fresh Grad' AND evaluation_dimensions[1] = 'Self-awareness'
            THEN 'Behavioral & Culture Fit'
        WHEN role = 'Fresh Grad' AND evaluation_dimensions[1] = 'Logic'
            THEN 'Coding Foundations & DSA'
        WHEN role = 'Fresh Grad' AND evaluation_dimensions[1] = 'Collaboration'
            THEN 'Teamwork & Collaboration'
        
        -- TPM scenarios
        WHEN role = 'TPM' AND evaluation_dimensions[1] = 'Risk Management'
            THEN 'Execution & Risk Management'
        WHEN role = 'TPM' AND evaluation_dimensions[1] = 'Dependency Management'
            THEN 'Cross-Team Collaboration'
        WHEN role = 'TPM' AND evaluation_dimensions[1] = 'Clarity'
            THEN 'Executive Communication'
        
        -- Generic fallback: Use first two dimensions (preserving order)
        ELSE 
            CASE 
                WHEN array_length(evaluation_dimensions, 1) >= 2 
                    THEN evaluation_dimensions[1] || ' & ' || evaluation_dimensions[2]
                WHEN array_length(evaluation_dimensions, 1) = 1
                    THEN evaluation_dimensions[1]
                ELSE 'Interview Skills'
            END
    END
WHERE scenario_title IS NULL;

-- Phase 3: Verification
-- Show updated scenarios for manual review
SELECT 
    id,
    role,
    level,
    scenario_title,
    evaluation_dimensions,
    created_at
FROM public.scenarios
ORDER BY role, level;

-- Phase 4: Add constraint (optional, for data quality)
-- Ensures all future scenarios have a title
-- ALTER TABLE public.scenarios 
-- ADD CONSTRAINT scenario_title_required CHECK (scenario_title IS NOT NULL AND scenario_title != '');

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- 1. Role and level fields are PRESERVED
-- 2. They continue to power interviewer persona derivation
-- 3. scenario_title is now the ONLY user-facing identifier
-- 4. Dimension ordering from evaluation_dimensions is preserved (importance order)
-- 5. Level is NEVER mentioned in scenario_title
