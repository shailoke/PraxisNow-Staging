import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface AnswerUpgrade {
  issue: string
  why_it_matters: string
  what_to_change_next_time: string
}

interface GenerateUpgradesParams {
  transcript: string
  evaluation: {
    clarity: number
    structure: number
    recovery: number
    signal_noise: number
    improvement_priorities: string[]
  }
  role: string
  level: string
  evaluation_dimensions: string[]
}

export async function generateAnswerUpgrades(params: GenerateUpgradesParams): Promise<AnswerUpgrade[]> {
  const { transcript, evaluation, role, level, evaluation_dimensions } = params

  const prompt = `PRAXISNOW — ANSWER UPGRADES CONTRACT v2

SYSTEM ROLE

You are an Answer Upgrade Analyst for PraxisNow.

You did NOT conduct the interview.
You are NOT the evaluator.
You are NOT a coach.

Your purpose: Provide structural delta suggestions for paid users to apply in their next interview.

––––––––––––
CONTEXT
––––––––––––
Role: ${role}
Level: ${level}
Evaluation Dimensions: ${evaluation_dimensions.join(', ')}

TRANSCRIPT:
${transcript}

––––––––––––
ACTIVATION CONDITIONS (STRICT)
––––––––––––
This function is ONLY called when:
• tier ∈ { Pro, Pro+ }
• evaluation_depth = "full"
• Session contains ≥ 4 answered questions

You MUST return between 1 and 3 answer upgrade objects.
You MAY NOT return an empty array.

If you cannot confidently generate even one structural upgrade:
Return a generic structural feedback item focused on context/action/outcome separation.

––––––––––––
HARD GUARDRAILS (NON-NEGOTIABLE)
––––––––––––
FORBIDDEN — You MUST NOT:
❌ Write sample or "ideal" answers
❌ Rewrite the user's answer
❌ Invent experience, metrics, or outcomes
❌ Claim what the user "should have done"
❌ Use interviewer voice ("what I was looking for")
❌ Use coaching/motivational tone
❌ Provide phrases like:
   • "A strong candidate would say…"
   • "The correct answer is…"
   • "You should mention X metric…"
❌ Teach frameworks (STAR, PREP, etc.)
❌ Predict success or outcomes

REQUIRED — You MUST:
✅ Operate only on what the user actually said
✅ Address structure, clarity, evidence framing, or completeness
✅ Phrase as changes to apply next time
✅ Be independent of outcome quality
✅ Stay tactical and structural

––––––––––––
ALLOWED CATEGORIES (EXAMPLES)
––––––––––––
Safe structural improvements:
• Missing structure (context → action → outcome)
• Unstated decision criteria
• Metrics mentioned but not anchored
• Scope too broad / multiple examples mixed
• Timeline implied but not stated
• Ownership unclear
• Trade-offs not articulated

These are always safe, even with weak evidence.

––––––––––––
REQUIRED OUTPUT STRUCTURE (STRICT)
––––––––––––
Each Answer Upgrade must follow this exact shape:

{
  "issue": "<What structural weakness was observed>",
  "why_it_matters": "<Why this matters for interviewer signal-seeking>",
  "what_to_change_next_time": "<Actionable but non-inventive structural change>"
}

Return as JSON array: [{ issue, why_it_matters, what_to_change_next_time }, ...]

CONSTRAINTS:
• "why_it_matters" must tie to interviewer signal-seeking
• "what_to_change_next_time" must be actionable but non-inventive
• If evidence is weak, acknowledge the weakness in the guidance

EXAMPLE (allowed):
{
  "issue": "Your answer references impact, but does not anchor it to a concrete metric",
  "why_it_matters": "Interviewers rely on metrics to assess scale and business impact",
  "what_to_change_next_time": "Explicitly state at least one measurable outcome, even if approximate (e.g., '~30% reduction' or 'saved 10 hours per week')"
}

––––––––––––
QUALITY BAR
––––––––––––
Each upgrade should make the user think:
"I see exactly what structural element was missing — and why that weakened my answer."

Avoid vague advice like "be more specific."
Depth > quantity.

––––––––––––
FINAL CHECK BEFORE RETURNING
––––––––––––
Before responding, verify:
☑ At least 1 upgrade object exists
☑ No sample answers, rewrites, or invented content
☑ All claims grounded in transcript
☑ Tone is analytical, not instructional
☑ JSON is valid and uses correct field names

Only then return the JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)

    // Handle both array and object with "upgrades" key
    let upgrades = Array.isArray(parsed) ? parsed : (parsed.upgrades || parsed.answer_upgrades || [])

    // v2 CONTRACT ENFORCEMENT: Mandatory minimum of 1 upgrade
    if (upgrades.length === 0) {
      console.error('[ANSWER_UPGRADES_ERROR] Pro tier requires at least one upgrade');
      console.error('[ANSWER_UPGRADES_ERROR] AI returned empty array, using fallback');

      // Return fallback upgrade instead of throwing
      return [{
        issue: "Insufficient structural detail in answers",
        why_it_matters: "Interviewers rely on clear separation of context, actions, and outcomes to assess decision-making and impact",
        what_to_change_next_time: "In your next session, ensure each answer explicitly states: what the situation was, what you did, and what the result was"
      }];
    }

    if (upgrades.length > 3) {
      console.log(`ℹ️ Answer Upgrades returned ${upgrades.length} items, trimming to 3`);
      upgrades = upgrades.slice(0, 3);
    }

    // Map to v2 structure
    return upgrades.map((u: any) => ({
      issue: u.issue || 'Structural weakness observed',
      why_it_matters: u.why_it_matters || 'Impacts interviewer confidence',
      what_to_change_next_time: u.what_to_change_next_time || 'Apply structural improvements'
    }))
  } catch (err) {
    console.error('Answer Upgrades generation failed:', err)
    throw err
  }
}
