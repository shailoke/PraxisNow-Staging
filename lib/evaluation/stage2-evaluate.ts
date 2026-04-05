import OpenAI from 'openai';
import { Stage1Output } from './stage1-extract';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DimensionScore {
  dimension: string
  score: 1 | 2 | 3 | 4
  band: 'Strong No Hire' | 'Lean No Hire' | 'Lean Hire' | 'Strong Hire'
  weight: number
  weighted_score: number
  evidence: string       // specific quote or behaviour from transcript, never generic
  gap: string | null     // what was missing if score < 4, null if score === 4
}

export interface TellMeAboutYourselfDiagnostic {
  structure_score: number
  hook_present: boolean
  relevance_to_role: string
  improvement: string
}

export interface TurnDiagnostic {
  turn_index: number
  question_context: string
  signal_strength: 'strong' | 'moderate' | 'weak'
  what_worked: string
  what_missed: string
  fix_in_one_sentence: string
}

export interface Strength {
  skill: string
  evidence: string
}

export interface Gap {
  area: string
  severity: 'blocking' | 'significant' | 'minor'
  fix_in_one_sentence: string
}

export interface Stage2Output {
  dimension_scores: DimensionScore[]
  weighted_composite: number
  hire_band: 'Strong No Hire' | 'Lean No Hire' | 'Lean Hire' | 'Strong Hire'
  hiring_signal: string          // keep — backward compat
  hiring_confidence: number      // keep — backward compat
  hireable_level: string         // keep — backward compat
  distance_to_strong_hire: {
    gaps_blocking: number
    primary_blocker: string
  }
  tmay_diagnostic: TellMeAboutYourselfDiagnostic | null
  answer_level_diagnostics: TurnDiagnostic[]
  turn_diagnostics: TurnDiagnostic[]
  dominant_failure_pattern: string | null
  top_strengths: Strength[]
  gaps: Gap[]
}

// ── Dimension definitions ─────────────────────────────────────────────────────

interface DimensionDef {
  dimension: string
  weight: number
}

const PM_DIMENSIONS: DimensionDef[] = [
  { dimension: 'Problem Framing & Structure',       weight: 0.25 },
  { dimension: 'Product Intuition & User Empathy',  weight: 0.25 },
  { dimension: 'Analytical & Metrics Thinking',     weight: 0.20 },
  { dimension: 'Execution & Prioritization',        weight: 0.15 },
  { dimension: 'Communication & Leadership',        weight: 0.15 },
]

const SDE_DIMENSIONS: DimensionDef[] = [
  { dimension: 'Problem Solving & Coding',          weight: 0.35 },
  { dimension: 'System Design',                     weight: 0.30 },
  { dimension: 'Technical Communication',           weight: 0.15 },
  { dimension: 'Code Quality & Engineering Craft',  weight: 0.10 },
  { dimension: 'Behavioral & Ownership',            weight: 0.10 },
]

const DS_DIMENSIONS: DimensionDef[] = [
  { dimension: 'Statistical & ML Foundations',      weight: 0.25 },
  { dimension: 'Modeling Judgment',                 weight: 0.25 },
  { dimension: 'ML System Design',                  weight: 0.25 },
  { dimension: 'Coding & Data Manipulation',        weight: 0.15 },
  { dimension: 'Business & Product Sense',          weight: 0.10 },
]

const AI_ENGINEER_DIMENSIONS: DimensionDef[] = [
  { dimension: 'LLM & Model Architecture Depth',    weight: 0.30 },
  { dimension: 'ML Systems & Production Thinking',  weight: 0.25 },
  { dimension: 'Implementation & Coding',           weight: 0.20 },
  { dimension: 'Research Awareness & Judgment',     weight: 0.15 },
  { dimension: 'AI Safety & Ethics Awareness',      weight: 0.10 },
]

// ── Round-to-dimension mapping ────────────────────────────────────────────────

function getDimensionsForRound(role: string, round: number): DimensionDef[] {
  const r = role.toLowerCase().trim()

  // Round 4 for all roles uses AI Engineer dimensions
  if (round === 4) {
    return AI_ENGINEER_DIMENSIONS
  }

  if (r === 'product manager' || r === 'pm') {
    if (round === 1) return PM_DIMENSIONS.filter(d =>
      d.dimension === 'Problem Framing & Structure' ||
      d.dimension === 'Product Intuition & User Empathy'
    )
    if (round === 2) return PM_DIMENSIONS.filter(d =>
      d.dimension === 'Analytical & Metrics Thinking'
    )
    if (round === 3) return PM_DIMENSIONS.filter(d =>
      d.dimension === 'Execution & Prioritization' ||
      d.dimension === 'Communication & Leadership'
    )
  }

  if (r === 'software development engineer' || r === 'sde' || r === 'software engineer') {
    if (round === 1) return SDE_DIMENSIONS.filter(d =>
      d.dimension === 'System Design' ||
      d.dimension === 'Technical Communication'
    )
    if (round === 2) return SDE_DIMENSIONS.filter(d =>
      d.dimension === 'Problem Solving & Coding' ||
      d.dimension === 'Code Quality & Engineering Craft' ||
      d.dimension === 'Technical Communication'
    )
    if (round === 3) return SDE_DIMENSIONS.filter(d =>
      d.dimension === 'Behavioral & Ownership' ||
      d.dimension === 'Technical Communication'
    )
  }

  if (r === 'data scientist' || r === 'ds') {
    if (round === 1) return DS_DIMENSIONS.filter(d =>
      d.dimension === 'Statistical & ML Foundations' ||
      d.dimension === 'Coding & Data Manipulation'
    )
    if (round === 2) return DS_DIMENSIONS.filter(d =>
      d.dimension === 'ML System Design' ||
      d.dimension === 'Modeling Judgment' ||
      d.dimension === 'Business & Product Sense'
    )
    if (round === 3) return DS_DIMENSIONS.filter(d =>
      d.dimension === 'Modeling Judgment'
    )
  }

  // Fallback: return all dimensions for the role
  if (r === 'product manager' || r === 'pm') return PM_DIMENSIONS
  if (r === 'software development engineer' || r === 'sde' || r === 'software engineer') return SDE_DIMENSIONS
  if (r === 'data scientist' || r === 'ds') return DS_DIMENSIONS
  return PM_DIMENSIONS
}

// Renormalize weights of a subset so they sum to 1.0
function renormalize(dims: DimensionDef[]): DimensionDef[] {
  const total = dims.reduce((sum, d) => sum + d.weight, 0)
  if (total === 0) return dims
  return dims.map(d => ({ ...d, weight: Math.round((d.weight / total) * 10000) / 10000 }))
}

// ── Round type classification ─────────────────────────────────────────────────

function isHypotheticalRound(role: string, round: number): boolean {
  const r = role.toLowerCase().trim()
  if (round === 4) return true // All R4 are AI/hypothetical
  if (r === 'product manager' || r === 'pm') return round === 1 || round === 2
  if (r === 'software development engineer' || r === 'sde' || r === 'software engineer') return round === 1 || round === 2
  if (r === 'data scientist' || r === 'ds') return round === 1 || round === 2
  return false
}

// ── Band helpers ──────────────────────────────────────────────────────────────

function scoreToBand(score: number): 'Strong No Hire' | 'Lean No Hire' | 'Lean Hire' | 'Strong Hire' {
  if (score >= 4) return 'Strong Hire'
  if (score >= 3) return 'Lean Hire'
  if (score >= 2) return 'Lean No Hire'
  return 'Strong No Hire'
}

function compositeToBand(composite: number): 'Strong No Hire' | 'Lean No Hire' | 'Lean Hire' | 'Strong Hire' {
  if (composite >= 3.5) return 'Strong Hire'
  if (composite >= 3.0) return 'Lean Hire'
  if (composite >= 2.0) return 'Lean No Hire'
  return 'Strong No Hire'
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runStage2(
  stage1Output: Stage1Output,
  role: string,
  round: number,
  roundTitle: string
): Promise<Stage2Output> {

  const rawDims = getDimensionsForRound(role, round)
  const activeDims = renormalize(rawDims)
  const roundType = isHypotheticalRound(role, round) ? 'HYPOTHETICAL' : 'BEHAVIORAL'

  const dimensionListJson = JSON.stringify(
    activeDims.map(d => ({ dimension: d.dimension, weight: d.weight })),
    null, 2
  )

  const evaluationCriteria = roundType === 'HYPOTHETICAL'
    ? `Evaluate problem framing (did they clarify before solving), solution breadth (multiple approaches considered), tradeoff reasoning (named unprompted), user or system thinking (edge cases). Do NOT penalize for lack of personal examples. DO penalize for jumping to solution without framing.`
    : `Evaluate ownership (stories use 'I' not 'we'), specificity (outcomes measurable), structure (clear situation/action/result), intellectual honesty (acknowledges failure). DO penalize for vague stories without personal impact. DO penalize for sanitized answers that avoid real failure.`

  const systemPrompt = `You are a MAANG-calibrated interview evaluator for a ${role} candidate, Round ${round}: ${roundTitle}.

ROUND TYPE: ${roundType}

EVALUATION CRITERIA:
${evaluationCriteria}

DIMENSIONS TO SCORE:
You must score EXACTLY these dimensions and no others:
${dimensionListJson}

EVIDENCE REQUIREMENT:
For each dimension, evidence MUST be a specific quote or described behaviour from the transcript.
"Candidate showed good thinking" is rejected. Quote their words or describe the exact moment.

SCORING RUBRIC:
Score 1 (Strong No Hire): Absent or fundamentally wrong
Score 2 (Lean No Hire): Present but shallow, vague, or incomplete
Score 3 (Lean Hire): Solid with minor gaps
Score 4 (Strong Hire): Exceptional, unprompted depth, no gaps

Return ONLY valid JSON. No preamble. No markdown fences. Exactly this schema:
{
  "dimension_scores": [
    {
      "dimension": "<exact name from the list above>",
      "score": <1|2|3|4>,
      "evidence": "<specific quote or behaviour>",
      "gap": "<what was missing, or null if score is 4>"
    }
  ],
  "hiring_signal": "<one sentence verdict>",
  "hiring_confidence": <0.0 to 1.0>,
  "hireable_level": "<Junior|Mid|Senior|Staff|Principal>",
  "distance_to_strong_hire": {
    "gaps_blocking": <integer count of dimensions scored 1 or 2>,
    "primary_blocker": "<the single most important gap>"
  },
  "tmay_diagnostic": <object or null>,
  "turn_diagnostics": [
    {
      "turn_index": <number>,
      "question_context": "<question label>",
      "signal_strength": "<strong|moderate|weak>",
      "what_worked": "<string>",
      "what_missed": "<string>",
      "fix_in_one_sentence": "<string>"
    }
  ],
  "dominant_failure_pattern": "<string or null>",
  "top_strengths": [{"skill": "<string>", "evidence": "<string>"}],
  "gaps": [{"area": "<string>", "severity": "<blocking|significant|minor>", "fix_in_one_sentence": "<string>"}]
}`

  const transcriptText = stage1Output.turns
    .map(t => `[Turn ${t.turn_index}] Q: ${t.question}\nA: ${t.candidate_answer_verbatim}`)
    .join('\n\n')

  const userMessage = `Here is the interview transcript to evaluate:\n\n${transcriptText}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  })

  const rawContent = response.choices[0].message.content || ''
  let raw: any

  try {
    raw = JSON.parse(rawContent)
  } catch (parseErr: any) {
    console.error('[STAGE2] JSON parse failed:', {
      rawLength: rawContent?.length,
      preview: rawContent?.slice(-200),
      error: parseErr.message,
    })
    throw new Error(
      `STAGE2_PARSE_FAILED: Response truncated at ${rawContent?.length} chars. ` +
      `Increase max_tokens if this persists.`
    )
  }

  // ── Post-GPT TypeScript computation ──────────────────────────────────────────

  const weightMap = new Map(activeDims.map(d => [d.dimension, d.weight]))

  const dimensionScores: DimensionScore[] = (raw.dimension_scores ?? []).map((ds: any) => {
    const score = ds.score as 1 | 2 | 3 | 4
    const weight = weightMap.get(ds.dimension) ?? 0
    return {
      dimension: ds.dimension,
      score,
      band: scoreToBand(score),
      weight,
      weighted_score: Math.round(score * weight * 10000) / 10000,
      evidence: ds.evidence ?? '',
      gap: score === 4 ? null : (ds.gap ?? null),
    }
  })

  const weightedComposite = Math.round(
    dimensionScores.reduce((sum, d) => sum + d.weighted_score, 0) * 100
  ) / 100

  const hireBand = compositeToBand(weightedComposite)

  // Normalize turn_diagnostics / answer_level_diagnostics for backward compat
  const turnDiagnostics: TurnDiagnostic[] = raw.turn_diagnostics ?? []

  // Map hiring_signal from hire_band for backward compat if GPT doesn't return it
  const hiringSignal: string = raw.hiring_signal ?? hireBand

  return {
    dimension_scores: dimensionScores,
    weighted_composite: weightedComposite,
    hire_band: hireBand,
    hiring_signal: hiringSignal,
    hiring_confidence: raw.hiring_confidence ?? 0.5,
    hireable_level: raw.hireable_level ?? 'Mid',
    distance_to_strong_hire: raw.distance_to_strong_hire ?? {
      gaps_blocking: dimensionScores.filter(d => d.score <= 2).length,
      primary_blocker: '',
    },
    tmay_diagnostic: raw.tmay_diagnostic ?? null,
    answer_level_diagnostics: turnDiagnostics,
    turn_diagnostics: turnDiagnostics,
    dominant_failure_pattern: raw.dominant_failure_pattern ?? null,
    top_strengths: raw.top_strengths ?? [],
    gaps: raw.gaps ?? [],
  }
}
