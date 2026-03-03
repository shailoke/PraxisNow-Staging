export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string // UUID
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    package_tier: 'Free' | 'Starter' | 'Pro' | 'Pro+'
                    available_sessions: number
                    total_sessions_used: number
                    negotiation_credits: number
                    created_at: string
                    // Extended Profile
                    primary_role: string | null
                    designation: string | null
                    current_company: string | null
                    onboarding_complete: boolean | null
                    is_admin: boolean
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    package_tier?: 'Free' | 'Starter' | 'Pro' | 'Pro+'
                    available_sessions?: number
                    total_sessions_used?: number
                    negotiation_credits?: number
                    created_at?: string
                    primary_role?: string | null
                    designation?: string | null
                    current_company?: string | null
                    onboarding_complete?: boolean | null
                    is_admin?: boolean
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    package_tier?: 'Free' | 'Starter' | 'Pro' | 'Pro+'
                    available_sessions?: number
                    total_sessions_used?: number
                    negotiation_credits?: number
                    created_at?: string
                    primary_role?: string | null
                    designation?: string | null
                    current_company?: string | null
                    onboarding_complete?: boolean | null
                    is_admin?: boolean
                }
            }
            admin_logs: {
                Row: {
                    id: string
                    admin_id: string
                    action: string
                    target_resource: string
                    target_id: string | null
                    details: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    admin_id: string
                    action: string
                    target_resource: string
                    target_id?: string | null
                    details?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    admin_id?: string
                    action?: string
                    target_resource?: string
                    target_id?: string | null
                    details?: Json | null
                    created_at?: string
                }
            }
            system_settings: {
                Row: {
                    key: string
                    value: Json
                    updated_at: string | null
                    updated_by: string | null
                }
                Insert: {
                    key: string
                    value: Json
                    updated_at?: string | null
                    updated_by?: string | null
                }
                Update: {
                    key?: string
                    value?: Json
                    updated_at?: string | null
                    updated_by?: string | null
                }
            }
            scenarios: {
                Row: {
                    id: number // Integer ID
                    role: string
                    level: string
                    persona: string | null
                    prompt: string
                    evaluation_dimensions: string[]
                    scenario_title: string | null // DIMENSION-FIRST: User-facing title (e.g., "System Design & Architecture")
                    created_at: string
                }
                Insert: {
                    id?: number
                    role: string
                    level: string
                    persona?: string | null
                    prompt: string
                    evaluation_dimensions?: string[]
                    scenario_title?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    role?: string
                    level?: string
                    persona?: string | null
                    prompt?: string
                    evaluation_dimensions?: string[]
                    scenario_title?: string | null
                    created_at?: string
                }
            }
            question_families: {
                Row: {
                    id: string
                    dimension: string
                    family_name: string
                    prompt_guidance: string
                    created_at: string
                }
                Insert: {
                    id: string
                    dimension: string
                    family_name: string
                    prompt_guidance: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    dimension?: string
                    family_name?: string
                    prompt_guidance?: string
                    created_at?: string
                }
            }
            user_family_usage: {
                Row: {
                    id: string
                    user_id: string
                    dimension: string
                    family_id: string
                    used_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    dimension: string
                    family_id: string
                    used_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    dimension?: string
                    family_id?: string
                    used_at?: string
                }
            }
            custom_scenarios: {
                Row: {
                    id: string // UUID
                    user_id: string
                    base_scenario_id: number
                    title: string
                    company_context: string | null
                    focus_dimensions: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    base_scenario_id: number
                    title: string
                    company_context?: string | null
                    focus_dimensions?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    base_scenario_id?: number
                    title?: string
                    company_context?: string | null
                    focus_dimensions?: string[] | null
                    created_at?: string
                }
            }
            sessions: {
                Row: {
                    id: number // Integer ID
                    user_id: string // UUID
                    scenario_id: number // Integer ID
                    custom_scenario_id: string | null // NEW UUID
                    transcript: string | null
                    duration_seconds: number
                    created_at: string

                    // Legacy/Base
                    confidence_score: number | null
                    dimensions_covered: Json
                    confidence_scores: Json

                    // Schema Update: Advanced Eval Metrics
                    clarity: number | null // 0-100
                    structure: number | null // 0-100
                    recovery: number | null // 0-100
                    signal_noise: number | null // 0-100

                    key_insight: string | null
                    improvement_priorities: string[] | null // Array

                    // Pro+ Features
                    alternative_approaches: string[] | null
                    pattern_analysis: string | null
                    risk_projection: string | null
                    readiness_assessment: string | null
                    framework_contrast: string | null

                    // New Fields for Reporting Task
                    evaluation_data: Json | null
                    pdf_url: string | null
                    status: 'created' | 'active' | 'completed' | 'failed'
                    session_type: 'interview' | 'negotiation_simulation'
                    replay_of_session_id: number | null
                    questions_to_ask: string[] | null
                    family_selections: Record<string, string> | null // Question randomization

                    // Answer Upgrades & Evaluation Depth (Pro/Pro+ Learning Loop)
                    answer_upgrades: {
                        issue: string
                        why_it_matters: string
                        what_to_change_next_time: string
                    }[] | null
                    evaluation_depth: 'full' | 'shallow' | 'insufficient'
                }
                Insert: {
                    id?: number
                    user_id: string
                    scenario_id: number
                    custom_scenario_id?: string | null
                    transcript?: string | null
                    duration_seconds?: number
                    created_at?: string
                    confidence_score?: number | null
                    dimensions_covered?: Json
                    confidence_scores?: Json

                    clarity?: number | null
                    structure?: number | null
                    recovery?: number | null
                    signal_noise?: number | null
                    key_insight?: string | null
                    improvement_priorities?: string[] | null
                    alternative_approaches?: string[] | null
                    pattern_analysis?: string | null
                    risk_projection?: string | null
                    readiness_assessment?: string | null
                    framework_contrast?: string | null
                    evaluation_data?: Json | null
                    pdf_url?: string | null
                    session_type?: 'interview' | 'negotiation_simulation'
                    replay_of_session_id?: number | null
                    questions_to_ask?: string[] | null
                    family_selections?: Record<string, string> | null
                    answer_upgrades?: {
                        issue: string
                        why_it_matters: string
                        what_to_change_next_time: string
                    }[] | null
                    evaluation_depth?: 'full' | 'shallow' | 'insufficient'
                }
                Update: {
                    id?: number
                    user_id?: string
                    scenario_id?: number
                    custom_scenario_id?: string | null
                    transcript?: string | null
                    duration_seconds?: number
                    created_at?: string
                    confidence_score?: number | null
                    dimensions_covered?: Json
                    confidence_scores?: Json

                    clarity?: number | null
                    structure?: number | null
                    recovery?: number | null
                    signal_noise?: number | null
                    key_insight?: string | null
                    improvement_priorities?: string[] | null
                    alternative_approaches?: string[] | null
                    pattern_analysis?: string | null
                    risk_projection?: string | null
                    readiness_assessment?: string | null
                    framework_contrast?: string | null
                    evaluation_data?: Json | null
                    pdf_url?: string | null
                    session_type?: 'interview' | 'negotiation_simulation'
                    replay_of_session_id?: number | null
                    questions_to_ask?: string[] | null
                    answer_upgrades?: {
                        issue: string
                        why_it_matters: string
                        what_to_change_next_time: string
                    }[] | null
                    evaluation_depth?: 'full' | 'shallow' | 'insufficient'
                }
            }
            // ... rest of messages, transcripts, etc from original
            messages: {
                Row: {
                    id: number
                    session_id: number
                    role: string
                    content: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    session_id: number
                    role: string
                    content: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    session_id?: number
                    role?: string
                    content?: string
                    created_at?: string
                }
            }
            transcripts: {
                Row: {
                    id: number
                    session_id: number
                    audio_url: string | null
                    text_content: string | null
                    sentiment_score: number | null
                    clarity_score: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    session_id: number
                    audio_url?: string | null
                    text_content?: string | null
                    sentiment_score?: number | null
                    clarity_score?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    session_id?: number
                    audio_url?: string | null
                    text_content?: string | null
                    sentiment_score?: number | null
                    clarity_score?: number | null
                    created_at?: string
                }
            }
            purchases: {
                Row: {
                    id: number
                    user_id: string
                    order_id: string
                    amount: number
                    sessions_added: number
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    user_id: string
                    order_id: string
                    amount: number
                    sessions_added: number
                    status: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    user_id?: string
                    order_id?: string
                    amount?: number
                    sessions_added?: number
                    status?: string
                    created_at?: string
                }
            }
        }
    }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type Scenario = Database['public']['Tables']['scenarios']['Row']
export type CustomScenario = Database['public']['Tables']['custom_scenarios']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Transcript = Database['public']['Tables']['transcripts']['Row']
export type Purchase = Database['public']['Tables']['purchases']['Row']
export type QuestionFamily = Database['public']['Tables']['question_families']['Row']
export type UserFamilyUsage = Database['public']['Tables']['user_family_usage']['Row']

export type DimensionsCovered = Record<string, boolean>
export type ConfidenceScores = Record<string, number>

export type PackageTier = 'Starter' | 'Pro' | 'Pro+'
