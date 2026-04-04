import { Database } from './database.types'

// DIMENSION ALLOWLIST (Authoritative)
// Prevents tier labels (Starter, Pro, Pro+) or scenario slugs from leaking as dimensions
export const VALID_EVALUATION_DIMENSIONS = [
    'metrics',
    'discovery',
    'risks',
    'tradeoffs',
    'write_path',
    'read_path',
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
    'ai_fluency',
    // PM dimensions
    'product_design',
    'execution_diagnosis',
    'ai_product',
    'ai_strategy',
    // SDE dimensions
    'system_design',
    'ai_systems',
    // Marketing dimensions
    'campaign',
    'growth',
    'ai_marketing',
    // Project Manager dimensions
    'delivery',
    'stakeholder_management',
    'risk',
    'program_management',
    'ai_delivery',
    'metrics_accountability',
    'risk_management',
    // Marketing + Data Science dimensions
    'brand',
    'analytics',
    'ml_design',
    'data_strategy',
    // AI-native role dimensions
    'product_sense',
    'ai_execution',
    'ai_technical',
    'llm_deep_dive',
    'behavioral',
] as const

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
 * NORMALIZATION HELPERS
 */
export function normalizeRole(role: string): string {
    const r = role.toLowerCase().trim()
    if (r.includes('ai product manager') || r === 'ai pm') return 'ai_pm'
    if (r.includes('ai engineer') || r.includes('ai ml engineer')) return 'ai_engineer'
    if (r.includes('ai marketer') || r.includes('ai marketing manager')) return 'ai_marketer'
    if (r.includes('ai project manager') || r.includes('ai program manager')) return 'ai_project_manager'
    if (r.includes('ai scientist') || r.includes('ai researcher')) return 'ai_scientist'
    if (r.includes('engineer') || r.includes('developer') || r.includes('sde')) return 'sde'
    if (r.includes('project manager') || r.includes('program manager')) return 'project_manager'
    if (r.includes('product') || r.includes('pm')) return 'pm'
    if (r.includes('design')) return 'designer'
    if (r.includes('data')) return 'data'
    if (r.includes('market')) return 'marketing'
    // Fallback
    return 'leadership'
}
