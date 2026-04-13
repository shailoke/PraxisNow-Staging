import OpenAI from 'openai';
import { Stage1Output } from './stage1-extract';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CompetencyScore {
  name: string
  score: number        // 1-5
  evidence: string     // specific moment or quote from transcript
  gap: string | null   // what was missing, null if score >= 4
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
  competencies: CompetencyScore[]
  overall_score: number
  recommendation: 'Strong Hire' | 'Lean Hire' | 'Lean No Hire' | 'Strong No Hire'
  narrative: string
  strengths: string[]
  gaps: string[]
  // backward compat fields — derived deterministically after parsing
  hiring_signal: string
  hiring_confidence: number
  hireable_level: string
  distance_to_strong_hire: {
    gaps_blocking: number
    primary_blocker: string
  }
  tmay_diagnostic: null
  answer_level_diagnostics: TurnDiagnostic[]
  turn_diagnostics: TurnDiagnostic[]
  dominant_failure_pattern: string | null
  top_strengths: Strength[]
  gaps_structured: Gap[]
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runStage2(
  stage1Output: Stage1Output,
  role: string,
  round: number,
  roundTitle: string,
  evaluationGuidance: string
): Promise<Stage2Output> {

  // Round type classification
  const behavioralRounds = [
    { role: 'pm',  round: 3 },
    { role: 'sde', round: 3 },
    { role: 'ds',  round: 3 },
  ]
  const isBehavioral = behavioralRounds.some(
    r => role.toLowerCase().includes(r.role) && round === r.round
  )
  const roundType = isBehavioral ? 'BEHAVIORAL' : 'HYPOTHETICAL'

  // System prompt
  const systemPrompt = `You are a MAANG interviewer writing a debrief after a ${role} interview, ${roundTitle} round.

Round type: ${roundType}

About this round:
${evaluationGuidance}

Scoring philosophy: Score only the competencies for which you observed clear evidence in the transcript — either positive or negative. If a competency was not tested or not reached, omit it entirely. Do not score a competency 1 simply because it was absent. A candidate who demonstrated strong thinking on the competencies that came up should score well overall even if they did not cover every possible dimension.

Score each competency 1-5:
5 — Exceptional, unprompted depth, no gaps
4 — Strong, minor gaps only
3 — Solid, clear gaps present
2 — Present but shallow or incomplete
1 — Absent or fundamentally wrong

Evidence must be a specific moment, behaviour, or quote from the transcript. "Candidate showed good thinking" is not acceptable evidence — quote what they actually said or describe the exact moment.

Return ONLY valid JSON with no preamble, no explanation, and no markdown code fences. The response must be parseable by JSON.parse() with no preprocessing.

{
  "competencies": [
    {
      "name": "<competency name>",
      "score": <1-5>,
      "evidence": "<specific moment or quote from transcript>",
      "gap": "<what was missing, or null if score >= 4>"
    }
  ],
  "overall_score": <1.0-5.0, one decimal place>,
  "recommendation": "<Strong Hire|Lean Hire|Lean No Hire|Strong No Hire>",
  "narrative": "<3-4 sentences: what cleared the bar, what the primary gap is, what the recommendation means in practice>",
  "strengths": ["<specific strength observed>"],
  "gaps": ["<specific gap observed>"],
  "turn_diagnostics": [
    {
      "turn_index": <number>,
      "question_context": "<brief question summary>",
      "signal_strength": "<strong|moderate|weak>",
      "what_worked": "<what the candidate did well on this turn>",
      "what_missed": "<what was missing or weak on this turn>",
      "fix_in_one_sentence": "<one actionable fix for this specific answer>"
    }
  ],
  "dominant_failure_pattern": "<the single most repeated weakness across the session, or null if none>"
}`

  // Transcript assembly
  const transcript = stage1Output.turns
    .map(t => `Interviewer: ${t.question}\n\nCandidate: ${t.candidate_answer_verbatim}`)
    .join('\n\n')

  const userMessage = `Here is the interview transcript:\n\n${transcript}`

  // OpenAI call
  let response: Awaited<ReturnType<typeof openai.chat.completions.create>>
  try {
    response = await openai.chat.completions.create({
      model: 'o4-mini',
      max_completion_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })
  } catch (err: any) {
    throw new Error(`STAGE2_API_ERROR: ${err.message}`)
  }

  const raw = response.choices[0]?.message?.content ?? ''

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('[STAGE2] Parse failed. rawLength:', raw.length)
    console.error('[STAGE2] Last 200 chars:', raw.slice(-200))
    throw new Error(`STAGE2_PARSE_FAILED: ${raw.length} chars`)
  }

  // ── Post-parse TypeScript computation ────────────────────────────────────────

  // hiring_signal
  const signalMap: Record<string, string> = {
    'Strong Hire':    'Strong hire signal.',
    'Lean Hire':      'Lean hire signal.',
    'Lean No Hire':   'Lean no hire signal.',
    'Strong No Hire': 'Strong no hire signal.',
  }
  const hiring_signal = signalMap[parsed.recommendation] ?? parsed.recommendation

  // hiring_confidence
  const hiring_confidence =
    parsed.overall_score >= 4.5 ? 0.95
    : parsed.overall_score >= 3.5 ? 0.80
    : parsed.overall_score >= 2.5 ? 0.65
    : 0.50

  // hireable_level
  const hireable_level =
    parsed.recommendation === 'Strong Hire' ? 'Senior'
    : parsed.recommendation === 'Lean Hire' ? 'Mid'
    : 'Junior'

  // distance_to_strong_hire
  const gaps_blocking = (parsed.competencies as CompetencyScore[]).filter(c => c.score <= 2).length
  const primary_blocker: string = parsed.gaps[0] ?? parsed.dominant_failure_pattern ?? 'No major blockers identified'

  // top_strengths — map strengths array to Strength[] using competency evidence where available
  const top_strengths: Strength[] = (parsed.strengths as string[]).map(s => {
    const match = (parsed.competencies as CompetencyScore[]).find(c =>
      s.toLowerCase().includes(c.name.toLowerCase())
    )
    return {
      skill: s,
      evidence: match?.evidence ?? s,
    }
  })

  // gaps_structured
  const gaps_structured: Gap[] = (parsed.gaps as string[]).map(g => ({
    area: g,
    severity: 'significant' as const,
    fix_in_one_sentence: g,
  }))

  // turn_diagnostics and answer_level_diagnostics are the same array
  const turn_diagnostics: TurnDiagnostic[] = parsed.turn_diagnostics ?? []
  const answer_level_diagnostics = turn_diagnostics

  return {
    competencies:    parsed.competencies    ?? [],
    overall_score:   parsed.overall_score   ?? 0,
    recommendation:  parsed.recommendation  ?? 'Lean No Hire',
    narrative:       parsed.narrative       ?? '',
    strengths:       parsed.strengths       ?? [],
    gaps:            parsed.gaps            ?? [],
    hiring_signal,
    hiring_confidence,
    hireable_level,
    distance_to_strong_hire: {
      gaps_blocking,
      primary_blocker,
    },
    tmay_diagnostic:         null,
    answer_level_diagnostics,
    turn_diagnostics,
    dominant_failure_pattern: parsed.dominant_failure_pattern ?? null,
    top_strengths,
    gaps_structured,
  }
}
