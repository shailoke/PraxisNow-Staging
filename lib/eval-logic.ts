import { Database } from './database.types'

export type PackageTier = Database['public']['Tables']['users']['Row']['package_tier']

export interface EvalResult {
  // Scores (All Tiers)
  clarity: number
  structure: number
  recovery: number
  signal_noise: number

  // Insights (All Tiers)
  key_insight: string
  improvement_priorities: string[]

  // Pro+ Only
  alternative_approaches?: string[] | null
  pattern_analysis?: string | null
  risk_projection?: string | null
  readiness_assessment?: string | null
  framework_contrast?: string | null
}

export function generateEvalPrompt(transcript: string, tier: PackageTier): string {
  // PHASE 3: Pro+ merged into Pro - both get extended evaluation
  // Only Starter gets basic evaluation
  const isExtendedEval = tier === 'Pro' || tier === 'Pro+'

  // Pro gets simpler extended evaluation (Maybe?) - For now keeping binary as per current logic
  // The requirement was:
  // Free/Starter: Basic
  // Pro: ?
  // Pro+: Extended

  return `
You are a Staff Engineer / Bar Raiser at a top tech company.
Evaluate the following interview transcript.

TRANSCRIPT:
${transcript}

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include markdown formatting or "json" tags.

JSON STRUCTURE:
{
  "clarity": number (0-100),
  "structure": number (0-100),
  "recovery": number (0-100, how well they handled hints/mistakes),
  "signal_noise": number (0-100, information density),
  "key_insight": "string (One powerful observation about their performance)",
  "improvement_priorities": ["string", "string", "string"] (Top 3 specific areas to fix),
  ${isExtendedEval ? `
  "alternative_approaches": ["string", "string"] (What architectural/design alternatives did they miss?),
  "pattern_analysis": "string (Did they rely on specific patterns vs first principles?)",
  "risk_projection": "string (If hired, what is the biggest risk?)",
  "readiness_assessment": "string (Hire/No Hire recommendation with nuance)",
  "framework_contrast": "string (How breaks/follows standard frameworks)"
  ` : `
  "alternative_approaches": null,
  "pattern_analysis": null,
  "risk_projection": null,
  "readiness_assessment": null,
  "framework_contrast": null
  `}
}
`
}

// Alias for route.ts compatibility if needed, or ensuring route.ts uses this.
export const BUILD_PROMPT = (params: {
  role: string,
  level: string,
  interview_type: string,
  scenario_title: string,
  role_specific_dimensions: string,
  package_tier: string,
  full_transcript: string,
  prior_session_summaries: string,
  evaluationDepth: 'full' | 'shallow' | 'insufficient'
}) => {
  // Immutable prompt construction
  return `You are a senior ${params.role} ${params.level} interviewer conducting a ${params.interview_type}.

Scenario:
${params.scenario_title}

This is a post-interview evaluation.
This is NOT coaching.
This is NOT a tutorial.

Maintain an evaluator’s tone throughout.
Do NOT praise.
Do NOT teach.
Do NOT provide ideal answers.

––––––––––––
CONTEXT
––––––––––––
Package Tier: ${params.package_tier}

Calibrate expectations using:
${params.role_specific_dimensions}

––––––––––––
INPUT
––––––––––––
Full Transcript:
${params.full_transcript}

Prior Sessions (only if provided):
${params.prior_session_summaries}

––––––––––––
TIER RULES (CRITICAL)
––––––––––––
• ALL tiers must return the same JSON keys.
• Fields not applicable to the user’s tier MUST be null.
• NEVER include Pro or Pro+ content for Starter users.
• NEVER include Pro+ content unless tier is exactly "Pro+".

––––––––––––
OUTPUT FORMAT — JSON ONLY
––––––––––––
Return a SINGLE valid JSON object with EXACTLY these keys:

{
  "clarity": number (0-100),
  "structure": number (0-100),
  "recovery": number (0-100),
  "signal_noise": number (0-100),

  "key_insight": string,
  "improvement_priorities": [string, string, string],

  "alternative_approaches": string | null,

  "pattern_analysis": string | null,
  "risk_projection": string | null,
  "readiness_assessment": "Not ready" | "Borderline" | "Interview-ready" | null,

  "framework_contrast": string | null
}

––––––––––––
CONTENT RULES BY TIER
––––––––––––

IF tier = "Starter":
• Set alternative_approaches = null
• Set pattern_analysis = null
• Set risk_projection = null
• Set readiness_assessment = null
• Set framework_contrast = null

IF tier = "Pro":
• Populate alternative_approaches
• All Pro+ fields MUST be null

IF tier = "Pro+":
• Populate alternative_approaches
• Populate pattern_analysis
• Populate risk_projection
• Populate readiness_assessment
• Populate framework_contrast

––––––––––––
FINAL RULES
––––––––––––
• Do NOT include markdown.
• Do NOT include explanations outside JSON.
• Do NOT add extra keys.
• Output MUST be valid JSON.`;
}
