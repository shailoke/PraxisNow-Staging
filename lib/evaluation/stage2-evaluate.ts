import OpenAI from 'openai';
import { Stage1Output } from './stage1-extract';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CompetencyScore {
  name: string
  score: number        // 1.0-5.0 in 0.5 increments
  evidence: string     // specific moment or quote from transcript
  gap: string | null   // what was missing — required for scores below 5.0, null only if score is 5.0
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

  // ── PART 2 — Round-type calibration block ────────────────────────────────────
  const calibrationBlock = roundType === 'BEHAVIORAL'
    ? `Calibration for behavioral rounds:
A story without a named situation, named product, or quantified outcome \
does not constitute a strong behavioral answer regardless of structure. \
Scores of 4 or above require clear personal ownership with a specific \
measurable outcome. A score of 5 requires the story to be exceptional — \
specific, owned, quantified, and showing genuine insight about what was \
learned. If all answers are hypothetically framed ("I would...") rather \
than experience-based ("I did..."), no competency should score above 2.`
    : `Calibration for hypothetical rounds:
A single clarifying question does not constitute strong problem framing — \
strong candidates return to clarification across multiple turns. Solution \
ideation requires meaningfully different options with explicit tradeoff \
reasoning — one solution direction is not ideation regardless of how well \
it is explained. Scores of 4 or above require the behaviour to be \
demonstrated consistently across multiple turns, not just once. A score \
of 5 is disqualified if the behaviour appeared only once or only when the \
interviewer explicitly invited it. \
A candidate who describes what they would clarify ("First I'd clarify X") \
without actually directing a question at the interviewer has not demonstrated \
problem framing. Describing intent is not evidence of the behaviour. Only \
score problem framing highly if the candidate actually asked the interviewer \
a direct question and waited for a response before proceeding.`

  // ── System prompt ─────────────────────────────────────────────────────────────
  const systemPrompt = `You are a senior interviewer at a top tech company writing a debrief after \
a ${role} interview, ${roundTitle} round.

Round type: ${roundType}

About this round:
${evaluationGuidance}

Read the full transcript carefully. Before scoring anything, reason through \
the session as a whole. Consider the full arc — not just individual answers. \
Look for patterns of strength and weakness across multiple turns. A behaviour \
shown once does not define a competency. A behaviour shown consistently across \
turns does.

${calibrationBlock}

Score each competency on this scale. Half scores are allowed and encouraged \
where the candidate falls between bands:

5.0 — Exceptional throughout the session. Unprompted depth on multiple turns. \
      No meaningful gaps. DISQUALIFIED if the behaviour appeared only once \
      or only when prompted.

4.0 to 4.5 — Strong with minor gaps. The right behaviour shown consistently \
             but not at exceptional depth.

3.0 to 3.5 — Present and correct but shallow or inconsistent. Shown in some \
             turns but not sustained across the session.

2.0 to 2.5 — Attempted but incomplete, surface-level, or only appeared when \
             explicitly prompted by the interviewer.

1.0 to 1.5 — Absent or fundamentally wrong.

Before finalising any score of 4.5 or 5.0, verify: was this behaviour \
demonstrated across multiple turns? If it appeared only once, the score \
must not exceed 3.5.

Evidence must be a specific moment, behaviour, or quote from the transcript. \
"Candidate showed good thinking" is not evidence. Quote what they actually \
said or describe the exact moment.

Gap must name the precise missing element — not "lacked depth" but the \
specific thing that was absent: which option was not considered, which metric \
was not defined, which user behaviour was not addressed, which tradeoff was \
not reasoned through. Gap is required for any score below 5.0.

Before producing your JSON output, write a free-form debrief in plain text. \
This debrief will be used as your reasoning scratchpad — it will not be shown \
to the user but it will improve the quality of your structured output.

In your free-form debrief cover:
- What the candidate did well, with specific transcript evidence
- Where they fell short, with specific transcript evidence
- Your honest assessment of their level and why
- What would need to change for them to perform at the next level
- Any patterns you noticed across multiple turns

Be direct. Be specific. Name moments. Use half scores where appropriate.

After your free-form debrief, output the JSON below and nothing else after it.

Before writing any competency score, answer these verification questions internally. Do not skip this step.

For every score of 4.0 or above:
- On which specific turns did this behaviour appear? If you cannot name at least two distinct turns, the score must not exceed 3.5.
- Was the behaviour unprompted or did the interviewer explicitly invite it? If the interviewer asked for it, reduce the score by 0.5.
- Does the evidence you plan to cite actually demonstrate the competency, or does it merely mention the topic? Mentioning is not demonstrating.

For Problem Framing and Clarifying Questions in hypothetical rounds:
- Did the candidate direct a question at the interviewer and pause for a response before proceeding? If they described intent ("First I'd clarify X") without asking, this is not evidence of the behaviour. Score must not exceed 2.5.
- Did the clarifying behaviour appear on more than one turn? If only at the start and never again, score must not exceed 3.0.
- Did the framing actually shape the direction of their answer? If they clarified and then ignored their own clarification, it does not count.

For Solution Ideation and Solution Breadth in hypothetical rounds:
- Did the candidate name at least two structurally different solution options? Variations of the same idea do not count as multiple options.
- Did they explicitly compare tradeoffs between options before choosing? If they proposed one direction without comparison, score must not exceed 2.5.
- Did the comparison happen unprompted or only after the interviewer pushed? If only after pushing, reduce by 0.5.

For all competencies in behavioral rounds:
- Does the story name a specific real product, company, team, or situation? Generic stories without specifics must score 2.0 or below regardless of structure.
- Does the candidate say "I did" not "I would"? Hypothetically framed answers in a behavioral round must score 2.0 or below.
- Is there a measurable outcome? "Things improved" is not a measurable outcome. A number, a decision reversed, a timeline met is.
- If the same story is reused across multiple competencies, each reuse scores lower than the first — repetition signals a thin story bank.

For Metrics and Analytical competencies:
- Did the candidate define a specific metric, not just name a category? "Engagement metrics" is not a metric. "7-day retention rate" is.
- Did they connect the metric to a decision? Naming metrics without connecting them to action scores 2.5 or below.
- Did they identify at least one guardrail metric or potential unintended consequence of optimising the primary metric?

{
  "competencies": [
    {
      "name": "<competency name — derive from the round type and what actually came up>",
      "score": <1.0 to 5.0 in 0.5 increments>,
      "evidence": "<specific quote or moment from transcript>",
      "gap": "<precise missing element, or null if score is 5.0>"
    }
  ],
  "overall_score": <1.0 to 5.0, one decimal place, your holistic judgment of the session — not an average>,
  "recommendation": "<Strong Hire | Lean Hire | Lean No Hire | Strong No Hire>",
  "narrative": "<4-6 sentences: what cleared the bar, what the primary gap is, honest level calibration, what would push them to the next level>",
  "strengths": ["<specific strength with evidence>"],
  "gaps": ["<specific gap with the precise missing element>"],
  "turn_diagnostics": [
    {
      "turn_index": <number>,
      "question_context": "<brief question summary>",
      "signal_strength": "<strong | moderate | weak>",
      "what_worked": "<specific behaviour that worked>",
      "what_missed": "<specific behaviour that was missing>",
      "fix_in_one_sentence": "<one actionable fix>"
    }
  ],
  "dominant_failure_pattern": "<the single most repeated weakness across the session, or null if none>"
}

Score only competencies for which you observed clear evidence. Omit \
competencies that did not come up. Do not score a competency 1 simply \
because it was absent.

Only score what you saw. A missing competency is not a failed one.

Return the free-form debrief first, then the JSON. The JSON must be valid \
and parseable. Do not wrap it in markdown code fences.`

  // ── Transcript assembly ───────────────────────────────────────────────────────
  const transcript = stage1Output.turns
    .map(t => `Interviewer: ${t.question}\n\nCandidate: ${t.candidate_answer_verbatim}`)
    .join('\n\n')

  const userMessage = `Here is the interview transcript:\n\n${transcript}`

  // ── OpenAI call ───────────────────────────────────────────────────────────────
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

  // Find the JSON portion — it starts after the free-form debrief.
  // The new prompt instructs the model to write free-form text first, then JSON.
  // Use lastIndexOf('\n{') to find the final top-level object rather than the first '{'.
  const jsonStart = raw.lastIndexOf('\n{')
  const jsonString = jsonStart !== -1
    ? raw.slice(jsonStart).trim()
    : raw.trim()

  let parsed: any
  try {
    parsed = JSON.parse(jsonString)
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
    overall_score:   Math.round((parsed.overall_score ?? 0) * 10) / 10,
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
