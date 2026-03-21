import { Database } from './database.types'

// DIMENSION ALLOWLIST (Authoritative)
// Prevents tier labels (Starter, Pro, Pro+) or scenario slugs from leaking as dimensions
export const VALID_EVALUATION_DIMENSIONS = [
    'metrics',
    'discovery',
    'risks',
    'tradeoffs',
    'write_path',
    'Product Sense',
    'User Empathy',
    'Leadership',
    'Strategy',
    'Communication',
    'Architecture',
    'Scale',
    'ML Design',
    'Technical Depth',
    'Analytical Thinking',
    'Execution',
    'Culture Fit',
    'Teamwork',
    'Culture',
    'Collaboration',
    'Dependencies',
    'ai_fluency'
] as const

// AI MANDATORY ROLE KEYS (Normalized)
// Roles for which ai_fluency is auto-injected at session creation (Pro tier only)
// Uses normalized keys from normalizeRole() — NEVER raw display strings
export const AI_MANDATORY_ROLE_KEYS = ['pm', 'sde', 'data', 'marketing'] as const

// Data Contract
export interface RuntimeScenario {
    role: string
    level: string
    interview_type: string
    scenario_title: string
    scenario_description: string
    company_context: string

    session_duration_minutes: number

    evaluation_dimensions: {
        name: string
        description: string
        target_minutes: number
    }[]

    interviewer_persona: {
        title: string
        seniority: string
        pressure_style: 'Neutral' | 'Skeptical' | 'Challenging'
        communication_style: 'Concise' | 'Analytical' | 'Direct' | 'Executive'
        biases: string[]
        what_impresses_me: string[]
        what_annoys_me: string[]
    }

    seeded_questions: string[]
    base_system_prompt: string

    // Question Randomization
    selected_families?: Record<string, string>  // dimension -> family_id
}

export type DbScenario = Database['public']['Tables']['scenarios']['Row']
export type DbCustomScenario = Database['public']['Tables']['custom_scenarios']['Row']

// PERSONA SELECTION RULES (NON-NEGOTIABLE)
// Helper to determine persona based on role + level (Deterministic)
export function derivePersona(role: string, level: string): RuntimeScenario['interviewer_persona'] {
    const normalizedLevel = level.toLowerCase()
    const normalizedRole = role.toLowerCase()

    // 1. FRESH / ENTRY LEVEL
    if (normalizedRole.includes('fresh') || normalizedLevel.includes('entry') || normalizedLevel.includes('grad')) {
        let interviewerTitle = `Senior ${role.replace('Fresh ', '').replace(' Grad', '')}`
        if (role.toLowerCase().includes('mba')) interviewerTitle = 'Hiring Manager'

        return {
            title: interviewerTitle,
            seniority: 'Senior / Lead',
            pressure_style: 'Neutral',
            communication_style: 'Concise',
            biases: ['Values potential over experience', 'Looks for coachability', 'Forgives minor syntax errors'],
            what_impresses_me: ['Strong fundamentals', 'Curiosity', 'Honesty about what you don\'t know'],
            what_annoys_me: ['Guessing blindly', 'Lack of enthusiasm', 'Poor listening']
        }
    }

    // 2. JUNIOR
    if (normalizedLevel.includes('junior') || normalizedLevel.includes('associate')) {
        return {
            title: `Senior ${role}`,
            seniority: 'Senior',
            pressure_style: 'Neutral',
            communication_style: 'Concise',
            biases: ['Values clean implementation', 'Dislikes over-engineering'],
            what_impresses_me: ['Code/Logic correctness', 'Clear communication', 'Speed'],
            what_annoys_me: ['Stuck without asking for help', 'Messy structure', 'Ignoring edge cases']
        }
    }

    // 3. SENIOR / PRINCIPAL
    if (normalizedLevel.includes('senior') || normalizedLevel.includes('principal') || normalizedLevel.includes('staff')) {
        return {
            title: `Principal ${role}`,
            seniority: 'Principal / Staff',
            pressure_style: 'Skeptical',
            communication_style: 'Analytical',
            biases: ['Values tradeoffs', 'Skeptical of "silver bullets"', 'Focuses on failure modes'],
            what_impresses_me: ['Deep understanding of internals', 'Justifying decisions with data', 'Proactive communication'],
            what_annoys_me: ['Hand-waving complexity', 'Ignoring constraints', 'Surface-level answers']
        }
    }

    // 4. LEADER / DIRECTOR
    if (normalizedLevel.includes('leader') || normalizedLevel.includes('director') || normalizedLevel.includes('vp') || normalizedLevel.includes('head')) {
        return {
            title: `VP of ${role === 'Product Manager' ? 'Product' : role === 'Software Engineer' ? 'Engineering' : role}`,
            seniority: 'Executive',
            pressure_style: 'Challenging',
            communication_style: 'Executive',
            biases: ['Values outcome over output', 'Focuses on ROI/Business Value', 'Impated by fluff'],
            what_impresses_me: ['Strategic thinking', 'Concise top-down communication', 'Understanding business context'],
            what_annoys_me: ['Getting lost in weeds', 'Lack of opinion', 'Defensiveness']
        }
    }

    // DEFAULT FALLBACK
    return {
        title: `Senior ${role}`,
        seniority: 'Senior',
        pressure_style: 'Neutral',
        communication_style: 'Direct',
        biases: [],
        what_impresses_me: ['Clarity', 'Competence'],
        what_annoys_me: ['Confusion']
    }
}

export function resolveRuntimeScenario(
    base: DbScenario,
    custom?: DbCustomScenario | null,
    userTier: string = 'Starter'
): RuntimeScenario {
    // 1. Core Identity (Immutable from Base unless overridden by specific logic, but per rules user overrides Role/Level in custom builder?)
    // Requirement B2: "User Scenarios (CUSTOM BUILDER)... User chooses: Role, Level..."
    // If the user chooses Role/Level, then the custom scenario actually defines them. 
    // BUT checking the schema, I made `base_scenario_id` mandatory.
    // DOES the user override the role/level of the base scenario? 
    // "Custom scenarios must: Reference a base template... Store only overrides"
    // If I pick "Senior PM" global template, can I change it to "Junior PM"? Probably not.
    // The "User Scenarios" section says: "User chooses: Role, Level". 
    // This implies creating a scratch scenario OR selecting a base that matches?
    // "Reference a base template" might mean "I want a PM interview", thus I base it on the generic PM template.
    // Let's assume the Base Scenario provides the PROMPT backbone, but the User Custom Scenario might override Role/Level if the Base is generic.
    // However, `scenarios` table has specific roles/levels.
    // Let's assume Custom Scenario overrides Context and Dimensions. Role/Level usually come from the selected base, OR the user filters to find a base.
    // Requirement: "User CAN select: Role, Level...".
    // If I select "Senior SDE", I am selecting a base template that IS Senior SDE.
    // So Role/Level come from Base.

    const role = base.role
    const level = base.level

    // 2. Derive Persona (Strict Rule: derived from Role + Level)
    const safeRole = role ?? 'pm'
    const safeLevel = level ?? 'senior'
    const persona = derivePersona(safeRole, safeLevel)

    // 3. Resolve Dimensions
    // "Allowed dimensions must be predefined per role + level."
    // If custom, use custom.focus_dimensions (if valid). Else base.
    let dimensions = (base.evaluation_dimensions || []).map(d => ({
        name: d,
        description: `Evaluate ${d} skills`,
        target_minutes: 10 // Default distribution
    }))

    if (custom?.focus_dimensions && custom.focus_dimensions.length > 0) {
        // We trust the builder validated these against allowed set
        dimensions = custom.focus_dimensions.map(d => ({
            name: d,
            description: `Focus on ${d}`,
            target_minutes: 15 // Tighter focus
        }))
    }

    // 4. Resolve Context
    const context = custom?.company_context ? `\n\nCOMPANY CONTEXT:\n${custom.company_context}` : ''

    // 5. Build Runtime Object
    return {
        role: safeRole,
        level: safeLevel,
        interview_type: 'Technical/Behavioral', // Could be inferred
        scenario_title: custom?.title || base.scenario_title ||
            // Fallback: Generate from dimensions (preserving importance order)
            (dimensions.length >= 2
                ? `${dimensions[0].name} & ${dimensions[1].name}`
                : dimensions.length === 1
                    ? dimensions[0].name
                    : `${safeRole} Interview`),
        scenario_description: base.prompt ?? '', // User explanation
        company_context: custom?.company_context || 'Generic Tech Company',

        // Duration from DB row; defaults to 30 if column absent or null
        session_duration_minutes: base.duration_minutes ?? 30,

        evaluation_dimensions: dimensions,

        interviewer_persona: persona,

        seeded_questions: [], // Would extract from prompt if structured
        base_system_prompt: `${base.prompt}${context}`
    }
}

/**
 * QUESTION FAMILY SELECTION LOGIC
 * 
 * Selects question families for each dimension based on user tier and history.
 * 
 * TIER BEHAVIOR (Authoritative):
 * - Starter: Always first family (deterministic)
 * - Pro/Pro+: Randomized from unused families
 * 
 * @param dimensions - List of dimension names to select families for
 * @param userId - User ID for tracking family usage
 * @param userTier - User's package tier
 * @returns Mapping of dimension to family_id
 */
export async function selectQuestionFamilies(
    dimensions: string[],
    userId: string,
    userTier: 'Starter' | 'Pro' | 'Pro+'
): Promise<Record<string, string>> {
    const { QUESTION_FAMILIES } = await import('./question-families')
    const selections: Record<string, string> = {}

    // ========================================
    // STARTER TIER: Deterministic (No Randomization)
    // ========================================
    if (userTier === 'Starter') {
        for (const dimension of dimensions) {
            // Always select first family for this dimension
            const defaultFamily = QUESTION_FAMILIES.find(
                f => f.dimension === dimension
            )
            if (defaultFamily) {
                selections[dimension] = defaultFamily.id
                console.log(`[FAMILY_SELECT] Starter: ${dimension} -> ${defaultFamily.id} (deterministic)`)
            } else {
                console.warn(`[FAMILY_SELECT] No family found for dimension: ${dimension}`)
            }
        }
        return selections
    }

    // ========================================
    // PRO / PRO+ TIER: Randomized from Unused
    // ========================================
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch user's family usage history
    const { data: usedFamilies, error } = await supabase
        .from('user_family_usage')
        .select('dimension, family_id')
        .eq('user_id', userId)

    if (error) {
        console.error('[FAMILY_SELECT] Error fetching usage history:', error)
        // Fallback to first family if DB error
        for (const dimension of dimensions) {
            const defaultFamily = QUESTION_FAMILIES.find(f => f.dimension === dimension)
            if (defaultFamily) selections[dimension] = defaultFamily.id
        }
        return selections
    }

    // Group used families by dimension
    const usedByDimension = new Map<string, Set<string>>()
    if (usedFamilies) {
        usedFamilies.forEach((record: { dimension: string, family_id: string }) => {
            if (!usedByDimension.has(record.dimension)) {
                usedByDimension.set(record.dimension, new Set())
            }
            usedByDimension.get(record.dimension)!.add(record.family_id)
        })
    }

    // Select one unused family per dimension
    for (const dimension of dimensions) {
        const allFamilies = QUESTION_FAMILIES.filter(f => f.dimension === dimension)
        const usedIds = usedByDimension.get(dimension) || new Set()

        const availableFamilies = allFamilies.filter(f => !usedIds.has(f.id))

        if (availableFamilies.length === 0) {
            // All families exhausted - reset and pick from all
            console.log(`[FAMILY_RESET] All families used for "${dimension}", resetting`)
            const selected = allFamilies[Math.floor(Math.random() * allFamilies.length)]
            selections[dimension] = selected.id
            console.log(`[FAMILY_SELECT] Pro (reset): ${dimension} -> ${selected.id}`)
        } else {
            // Pick randomly from unused
            const selected = availableFamilies[Math.floor(Math.random() * availableFamilies.length)]
            selections[dimension] = selected.id
            console.log(`[FAMILY_SELECT] Pro: ${dimension} -> ${selected.id} (${availableFamilies.length} unused remaining)`)
        }
    }

    return selections
}

/**
 * NORMALIZATION HELPERS
 * Ensures consistent string matching for Entry family resolution
 */
export function normalizeRole(role: string): string {
    const r = role.toLowerCase().trim()
    if (r.includes('engineer') || r.includes('developer') || r.includes('sde')) return 'sde'
    if (r.includes('product') || r.includes('pm')) return 'pm'
    if (r.includes('design')) return 'designer'
    if (r.includes('data')) return 'data'
    if (r.includes('market')) return 'marketing'
    // Fallback
    return 'leadership'
}

export function normalizeLevel(level: string): string {
    const l = level.toLowerCase().trim()
    if (l.includes('junior') || l.includes('associate') || l.includes('entry')) return 'junior'
    if (l.includes('senior') || l.includes('sr')) return 'senior'
    if (l.includes('staff')) return 'staff'
    if (l.includes('principal')) return 'principal'
    if (l.includes('leader') || l.includes('director') || l.includes('vp') || l.includes('head')) return 'leader'
    // Fallback to senior
    return 'senior'
}

/**
 * HELPER: Generate Entry Family Key
 * Format: entry_{role}_{level}_{dimension}
 */
function getEntryFamilyKey(role: string, level: string, dimension: string = 'metrics'): string {
    const normalizedRole = normalizeRole(role)
    const normalizedLevel = normalizeLevel(level)
    const normalizedDimension = dimension.toLowerCase().trim()
    return `entry_${normalizedRole}_${normalizedLevel}_${normalizedDimension}`
}

/**
 * ENTRY FAMILY SELECTION (Deterministic)
 * 
 * Returns the deterministic Entry family for a given (role × level × dimension) tuple.
 * NO RANDOMIZATION - freshness comes from probe variation, not Entry Family rotation.
 * 
 * @param role - Candidate role (e.g., "Product Manager", "Software Engineer")
 * @param level - Candidate level (e.g., "Junior", "Senior", "Principal")
 * @param dimension - Evaluation dimension focus (e.g., "metrics", "discovery", "write_path")
 * @returns Entry family ID or null if no match found
 */
export async function selectEntryFamily(
    role: string,
    level: string,
    dimension: string
): Promise<string | null> {
    const { ENTRY_FAMILIES } = await import('./entry-families')

    // GUARD: Enforce dimension allowlist BEFORE resolution
    // Prevents tier labels ("Starter") or scenario slugs from being used as dimensions
    const normalizedForCheck = dimension.toLowerCase().trim()
    const isValidDimension = VALID_EVALUATION_DIMENSIONS.some(
        d => d.toLowerCase() === normalizedForCheck
    )

    if (!isValidDimension) {
        console.error(`❌ [INVALID_DIMENSION_FOR_ENTRY] "${dimension}" is not a valid evaluation dimension`, {
            provided_dimension: dimension,
            valid_dimensions: VALID_EVALUATION_DIMENSIONS,
            role,
            level
        })
        throw new Error(
            `[INVALID_DIMENSION_FOR_ENTRY] "${dimension}" is not a valid evaluation dimension. ` +
            `Valid dimensions: ${VALID_EVALUATION_DIMENSIONS.join(', ')}`
        )
    }

    // Normalize inputs for consistent matching
    const normalizedRole = normalizeRole(role)
    const normalizedLevel = normalizeLevel(level)
    const normalizedDimension = dimension.toLowerCase().trim()

    // Build deterministic family key
    const targetFamilyKey = `entry_${normalizedRole}_${normalizedLevel}_${normalizedDimension}`

    console.log(`🔍 [ENTRY_FAMILY_DETERMINISTIC_SELECT]`, {
        role,
        level,
        dimension,
        normalized_role: normalizedRole,
        normalized_level: normalizedLevel,
        normalized_dimension: normalizedDimension,
        target_family_key: targetFamilyKey
    })

    // Find exact match (deterministic)
    const match = ENTRY_FAMILIES.find(f => f.id === targetFamilyKey)

    if (!match) {
        console.warn(`⚠️ [ENTRY_FAMILY_NOT_FOUND] No Entry family for (role × level × dimension)`, {
            role,
            level,
            dimension,
            target_family_key: targetFamilyKey,
            available_families: ENTRY_FAMILIES.filter(f =>
                f.id.startsWith(`entry_${normalizedRole}_${normalizedLevel}`)
            ).map(f => f.id)
        })
        return null
    }

    console.log(`✅ [ENTRY_FAMILY_RESOLVED]`, {
        role,
        level,
        dimension,
        resolved_family: match.id,
        selection_method: 'deterministic'
    })

    return match.id
}

// ==========================================
// SCENARIO REGISTRY (Authoritative)
// Contains hardcoded UI scenarios and AI-Only rounds
// Used by session init and API resolver
// ==========================================
import type { InterviewPromptVariables } from '@/app/config/interview-prompts'

export const INTERVIEW_SCENARIOS: Record<string, Partial<InterviewPromptVariables>> = {
    // Standard Hardcoded Scenarios
    'sde-l5-system-design': {
        role: 'SDE',
        level: 'L5',
        interview_type: 'System Design Interview',
        interviewer_persona: 'Skeptical and detail-oriented. You probe for depth in architecture decisions and scalability trade-offs.',
        scenario_title: 'Design a Twitter-scale distributed system',
        base_system_prompt: 'Design a Twitter-scale system that can handle 500M daily active users. Focus on read-heavy workloads, real-time updates, and global distribution.',
        evaluation_dimensions: ['Architecture', 'Scale', 'Leadership'],
        seeded_questions: [
            'Walk me through how you would design the core tweet posting and retrieval system.',
            'How would you handle 500 million daily active users across multiple regions?',
            'What happens when a celebrity with 100 million followers posts a tweet?'
        ]
    },
    'pm-l5-product-strategy': {
        role: 'PM',
        level: 'L5',
        interview_type: 'Product Strategy Interview',
        interviewer_persona: 'Neutral but thorough. You expect data-driven reasoning and clear prioritization frameworks.',
        scenario_title: 'Launch a new engagement feature',
        base_system_prompt: 'Launch a new feature to improve user engagement. Define success metrics, prioritization framework, and execution plan.',
        evaluation_dimensions: ['metrics', 'Execution'],
        seeded_questions: [
            'How would you define success for this feature?',
            'Walk me through your prioritization framework.',
            'What are the biggest risks to this launch?'
        ]
    },
    'ds-mid-ml-pipeline': {
        role: 'Data Scientist',
        level: 'Mid',
        interview_type: 'ML System Design Interview',
        interviewer_persona: 'Encouraging but technically rigorous. You want to see end-to-end thinking.',
        scenario_title: 'Build a fraud detection system',
        base_system_prompt: 'Build a fraud detection model for a fintech platform. Handle class imbalance, feature engineering, and model deployment.',
        evaluation_dimensions: ['ML Design', 'metrics'],
        seeded_questions: [
            'How would you approach the class imbalance problem in fraud detection?',
            'What features would you engineer for this problem?',
            'How would you deploy and monitor this model in production?'
        ]
    },


}
