import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ReplayComparison {
    observed_changes: string[]
    unchanged_areas: string[]
    insufficient_evidence_note?: string
}

interface CompareSessionsParams {
    originalEvaluation: any  // Evaluation output from original session
    currentEvaluation: any   // Evaluation output from current (replay) session
    role: string
    level: string
}

export async function compareReplayAttempts(params: CompareSessionsParams): Promise<ReplayComparison | null> {
    const { originalEvaluation, currentEvaluation, role, level } = params

    // Suppression: If either session lacks diagnostic data, suppress entirely
    if (!originalEvaluation || !currentEvaluation) {
        return null;
    }

    const prompt = `SYSTEM INSTRUCTION — REPLAY COMPARATIVE ANALYSIS

You are comparing two completed interview sessions by the SAME user:
- Session A (earlier): The original attempt
- Session B (replay): The current replay attempt

Your role is to identify observable changes, not to judge readiness.

––––––––––––
CONTEXT
––––––––––––
Role: ${role}
Level: ${level}

ORIGINAL SESSION (Session A):
${JSON.stringify(originalEvaluation, null, 2)}

CURRENT REPLAY SESSION (Session B):
${JSON.stringify(currentEvaluation, null, 2)}

––––––––––––
HARD RULES
––––––––––––
1. COMPARE ONLY WHAT EXISTS
   - Compare only dimensions discussed in BOTH sessions.
   - If a dimension appears in only one session, ignore it.

2. NO MODELED ANSWERS
   - Do NOT show rewritten answers.
   - Do NOT demonstrate "better phrasing."
   - Focus on observable characteristics only.

3. NO SCORING OR RANKING
   - No numeric scores.
   - No "better / worse overall."
   - No hiring conclusions.

4. IMPROVEMENT MUST BE EVIDENCE-BASED
   Improvement may be noted ONLY if:
   - Session B shows clearer structure than Session A
   - OR more concrete examples
   - OR more explicit ownership
   - OR clearer articulation of trade-offs

5. ACCEPT NEUTRAL OUTCOMES
   - If no clear improvement is visible, say so.
   - Neutral is acceptable.
   - Silence is better than fabrication.

6. LANGUAGE CONSTRAINTS
   - Use phrasing like:
     "Compared to your earlier attempt…"
     "In this replay, you more consistently…"
     "One observable change is…"
   - Avoid motivational or prescriptive language.

7. DEPTH RESPECT
   - If evidence is thin in either session, note insufficient_evidence.

––––––––––––
OUTPUT FORMAT (STRICT JSON)
––––––––––––
Return ONLY a JSON object with these keys:

{
  "observed_changes": [
    "<specific observable improvement grounded in both evaluations>",
    "<another change, if any>"
  ],
  "unchanged_areas": [
    "<dimension or pattern that remained consistent>",
    "<another unchanged area>"
  ],
  "insufficient_evidence_note": "<optional: if comparison is not meaningful>"
}

Rules:
• observed_changes may be empty if no clear improvements exist
• unchanged_areas may be empty if everything changed or nothing is comparable
• insufficient_evidence_note should be populated if comparison is not reliable
• Use past tense for Session A, present tense for Session B
• Keep each item concise (1-2 sentences max)

PRIMARY PRINCIPLE:
Only claim improvement when the evaluations prove it.

Do NOT include markdown blocks.
Do NOT include explanations outside JSON.
Output MUST be valid JSON.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.5  // Lower temperature for consistency
        })

        const content = response.choices[0].message.content || '{}'
        const parsed = JSON.parse(content)

        // Validate structure
        const comparison: ReplayComparison = {
            observed_changes: parsed.observed_changes || [],
            unchanged_areas: parsed.unchanged_areas || [],
            insufficient_evidence_note: parsed.insufficient_evidence_note
        }

        // Suppress if insufficient evidence
        if (comparison.insufficient_evidence_note) {
            console.log('ℹ️ Replay comparison suppressed: insufficient evidence');
            return null;
        }

        // Suppress if both arrays empty (nothing to say)
        if (comparison.observed_changes.length === 0 && comparison.unchanged_areas.length === 0) {
            console.log('ℹ️ Replay comparison suppressed: no observable changes or patterns');
            return null;
        }

        return comparison;

    } catch (err) {
        console.error('Replay comparison failed (non-critical):', err)
        // Non-blocking: suppress on error
        return null;
    }
}
