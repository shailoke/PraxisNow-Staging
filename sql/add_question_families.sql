-- ============================================
-- QUESTION RANDOMIZATION INFRASTRUCTURE
-- ============================================
-- Purpose: Enable tier-based question family randomization
-- Tier Behavior:
--   - Starter: Deterministic (always first family)
--   - Pro/Pro+: Randomized from unused families
-- ============================================

-- 1. Create question_families table
-- Stores approved families per dimension
CREATE TABLE IF NOT EXISTS question_families (
    id TEXT PRIMARY KEY,
    dimension TEXT NOT NULL,
    family_name TEXT NOT NULL,
    prompt_guidance TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_families_dimension ON question_families(dimension);

COMMENT ON TABLE question_families IS 'Defines question family types for each evaluation dimension. Used to create structural variation in interviews.';
COMMENT ON COLUMN question_families.id IS 'Unique identifier (e.g., product_sense_tradeoff)';
COMMENT ON COLUMN question_families.dimension IS 'Evaluation dimension this family belongs to';
COMMENT ON COLUMN question_families.family_name IS 'Human-readable family name';
COMMENT ON COLUMN question_families.prompt_guidance IS 'Instructions for AI to generate questions in this family style';

-- 2. Create user_family_usage table
-- Tracks which families a user has already experienced
CREATE TABLE IF NOT EXISTS user_family_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    family_id TEXT NOT NULL REFERENCES question_families(id) ON DELETE CASCADE,
    used_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate tracking
    UNIQUE(user_id, dimension, family_id)
);

CREATE INDEX IF NOT EXISTS idx_user_family_usage_user_dimension 
    ON user_family_usage(user_id, dimension);

COMMENT ON TABLE user_family_usage IS 'Tracks which question families each user has seen to prevent repetition';
COMMENT ON COLUMN user_family_usage.user_id IS 'Reference to user who experienced this family';
COMMENT ON COLUMN user_family_usage.dimension IS 'Dimension for which this family was used';
COMMENT ON COLUMN user_family_usage.family_id IS 'Reference to question family used';

-- 3. Add family_selections column to sessions
-- Stores the selected families for this session (enables replay)
ALTER TABLE sessions 
    ADD COLUMN IF NOT EXISTS family_selections JSONB;

COMMENT ON COLUMN sessions.family_selections IS 'JSON mapping of dimension to family_id used in this session. Format: {"Product Sense": "product_sense_tradeoff"}';

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE 'Question Randomization Schema Created Successfully';
    RAISE NOTICE 'Tables: question_families, user_family_usage';
    RAISE NOTICE 'Sessions column: family_selections (JSONB)';
END $$;
