Perfect! Now I have enough information. Let me compile the comprehensive discovery report.

---

# COMPREHENSIVE DISCOVERY REPORT: PRAXIS INTERVIEW SYSTEM

## EXECUTIVE SUMMARY

The Praxis system is a sophisticated interview simulation platform with intricate dependencies on role/level/dimension configurations. **`level` is currently sourced exclusively from the database scenario row** and threaded throughout the system. The codebase contains multiple invariants, guards, and a complex family selection system that would break if level sourcing changes.

---

## A. SESSION CREATION FLOW

### 1. DATABASE QUERIES AT ENTRY

**session/start/route.ts lines 53â€“58:**
```typescript
const { data: activeSessionsData } = await adminClient
    .from('sessions')
    .select('*') // Fetch full object to allow return/resume
    .eq('user_id', user.id)
    .in('status', ['created', 'active'])
```

**Columns read from sessions table:**
- `id`, `user_id`, `status`, `session_type`, `scenario_id`, `custom_scenario_id`, `family_selections`, `probe_selections`, `dimension_order`, `duration_seconds`, `replay_of_session_id`

**session/start/route.ts lines 274â€“293:**
```typescript
// FROM SCENARIOS TABLE (if scenario_id exists):
const { data: scenario } = await adminClient
    .from('scenarios')
    .select('evaluation_dimensions')
    .eq('id', scenario_id)
    .single()

// FROM CUSTOM_SCENARIOS TABLE (if custom_scenario_id exists):
const { data: customScenario } = await adminClient
    .from('custom_scenarios')
    .select('focus_dimensions')
    .eq('id', custom_scenario_id)
    .single()
```

**Columns selected:**
- `scenarios`: `id`, `evaluation_dimensions`, `role`, `level`, `prompt`
- `custom_scenarios`: `id`, `focus_dimensions`, `base_scenario_id`, `company_context`

### 2. DIMENSION RESOLUTION

**session/start/route.ts lines 296â€“301 (Hardcoded Scenario Fallback):**
```typescript
const { INTERVIEW_SCENARIOS } = await import('@/lib/runtime-scenario')

// Dimension Resolution Fallback for Hardcoded Scenarios
if (dimensionNames.length === 0 && scenario_id && INTERVIEW_SCENARIOS[scenario_id as string]) {
    dimensionNames = (INTERVIEW_SCENARIOS[scenario_id as string].evaluation_dimensions || []) as string[]
}
```

**Flow:**
1. Query DB scenarios table â†’ get `evaluation_dimensions`
2. If empty, check INTERVIEW_SCENARIOS (hardcoded) â†’ fallback to hardcoded dimensions
3. Custom scenarios override via `focus_dimensions` (lines 290â€“292)
4. Final: `dimensionNames` array passed to `selectQuestionFamilies()`

### 3. ENTRY FAMILY SELECTION

**session/start/route.ts lines 331â€“486 (Complete Entry Family Workflow)**

**Step 1: Role/Level Resolution (lines 335â€“380)**
```typescript
let roleForEntry = 'Generic'
let levelForEntry = 'Senior'  // Default level â€” LINE 336

if (scenario_id) {
    const hardcodedScenario = INTERVIEW_SCENARIOS[scenario_id as string]
    if (hardcodedScenario) {
        roleForEntry = hardcodedScenario.role!
        levelForEntry = hardcodedScenario.level!  // LINE 344: FROM HARDCODED SCENARIO
        console.log(`[SESSION_START] Resolved hardcoded role: ${roleForEntry}, level: ${levelForEntry}...`)
    }
    else if (typeof scenario_id === 'number' || !isNaN(Number(scenario_id))) {
        const { data: s } = await adminClient
            .from('scenarios')
            .select('role, level')  // LINE 351: FETCH FROM DB
            .eq('id', scenario_id)
            .single()

        if (s) {
            roleForEntry = s.role ?? roleForEntry
            levelForEntry = s.level ?? levelForEntry  // LINE 357: USE DB VALUE
        }
    }
} else if (custom_scenario_id) {
    const { data: c } = await adminClient
        .from('custom_scenarios')
        .select('base_scenario_id')
        .eq('id', custom_scenario_id)
        .single()

    if (c) {
        const { data: b } = await adminClient
            .from('scenarios')
            .select('role, level')  // LINE 371: FETCH BASE VIA FK
            .eq('id', c.base_scenario_id)
            .single()

        if (b) {
            roleForEntry = b.role ?? roleForEntry
            levelForEntry = b.level ?? levelForEntry  // LINE 377: USE BASE DB VALUE
        }
    }
}
```

**Key Point:** `levelForEntry` comes **entirely from the database** â€” hardcoded scenarios or the scenarios table via custom_scenarios FK.

**Step 2: Entry Family Selection (lines 465â€“485)**
```typescript
const entryFamilyId = await selectEntryFamily(
    roleForEntry,
    levelForEntry,
    entryProbe  // Dimension-scoped probe type
)

// LINE 471â€“481: HARD REQUIREMENT
if (!entryFamilyId) {
    console.error(`âŒ [SESSION_START_ERROR] No Entry Family found`, { ... })
    throw new Error(`SESSION_START_ERROR: No Entry Family available for role "${roleForEntry}" at level "${levelForEntry}" with dimension "${entryProbe}". Cannot start session.`)
}

familySelections['Entry'] = entryFamilyId
console.log(`âœ… [ENTRY_GUARANTEED] Entry Family selected: ${entryFamilyId} (role: ${roleForEntry}, level: ${levelForEntry}, dimension: ${entryProbe})`)
```

**selectEntryFamily() implementation (lib/runtime-scenario.ts lines 416â€“486):**
```typescript
export async function selectEntryFamily(
    role: string,
    level: string,
    dimension: string
): Promise<string | null> {
    const { ENTRY_FAMILIES } = await import('./entry-families')

    // GUARD: Enforce dimension allowlist (line 426)
    const isValidDimension = VALID_EVALUATION_DIMENSIONS.some(
        d => d.toLowerCase() === normalizedForCheck
    )
    if (!isValidDimension) {
        throw new Error(...)  // LINE 437â€“440
    }

    // Normalize for matching
    const normalizedRole = normalizeRole(role)      // LINE 444
    const normalizedLevel = normalizeLevel(level)   // LINE 445
    const normalizedDimension = dimension.toLowerCase().trim()

    // Build deterministic key
    const targetFamilyKey = `entry_${normalizedRole}_${normalizedLevel}_${normalizedDimension}`  // LINE 449

    // Find exact match (deterministic, no randomization)
    const match = ENTRY_FAMILIES.find(f => f.id === targetFamilyKey)  // LINE 462

    if (!match) {
        console.warn(`âš ï¸ [ENTRY_FAMILY_NOT_FOUND]...`, {
            target_family_key: targetFamilyKey,
            available_families: ENTRY_FAMILIES.filter(f =>
                f.id.startsWith(`entry_${normalizedRole}_${normalizedLevel}`)  // LINE 471
            ).map(f => f.id)
        })
        return null  // LINE 474
    }

    return match.id  // LINE 485
}
```

**normalizeLevel() (lib/runtime-scenario.ts lines 383â€“391):**
```typescript
export function normalizeLevel(level: string): string {
    const l = level.toLowerCase().trim()
    if (l.includes('junior') || l.includes('associate') || l.includes('entry')) return 'junior'
    if (l.includes('senior') || l.includes('sr')) return 'senior'
    if (l.includes('staff')) return 'staff'
    if (l.includes('principal')) return 'principal'
    if (l.includes('leader') || l.includes('director') || l.includes('vp') || l.includes('head')) return 'leader'
    return 'senior'  // FALLBACK
}
```

### 4. NON-ENTRY FAMILY SELECTION

**session/start/route.ts lines 410â€“414:**
```typescript
const familySelections = await selectQuestionFamilies(
    dimensionNames,
    user.id,
    profile.package_tier as any
)
```

**selectQuestionFamilies() (lib/runtime-scenario.ts lines 269â€“360):**

**Starter Tier (lines 280â€“293):**
```typescript
if (userTier === 'Starter') {
    for (const dimension of dimensions) {
        const defaultFamily = QUESTION_FAMILIES.find(
            f => f.dimension === dimension
        )
        if (defaultFamily) {
            selections[dimension] = defaultFamily.id
            console.log(`[FAMILY_SELECT] Starter: ${dimension} -> ${defaultFamily.id} (deterministic)`)
        }
    }
    return selections
}
```

**Pro/Pro+ Tier (lines 299â€“359):**
```typescript
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient<Database>(...)

const { data: usedFamilies, error } = await supabase
    .from('user_family_usage')
    .select('dimension, family_id')
    .eq('user_id', userId)

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
        // All families exhausted â€” reset and pick from all
        const familyAfterReset = allFamilies[Math.floor(Math.random() * allFamilies.length)]
        selections[dimension] = familyAfterReset.id
    } else {
        // Pick randomly from unused
        const selected = availableFamilies[Math.floor(Math.random() * availableFamilies.length)]
        selections[dimension] = selected.id
    }
}
```

### 5. FAMILY_SELECTIONS STORED IN SESSIONS TABLE

**session/start/route.ts lines 524â€“535:**
```typescript
const sessionPayload: any = {
    user_id: user.id,
    scenario_id: scenario_id,
    custom_scenario_id: custom_scenario_id || null,
    duration_seconds: duration_seconds,
    status: 'created',
    transcript: '',
    session_type: 'interview',
    family_selections: familySelections,      // Entry + non-entry families
    dimension_order: dimensionOrder,          // Shuffled dimensions
    probe_selections: probeSelections         // Probe IDs for Entry family
}
```

**Shape of family_selections example:**
```json
{
  "Entry": "entry_sde_senior_write_path",
  "Execution": "family_core_execution_001",
  "Communication": "family_behavioral_comms_002",
  "Technical Depth": "family_technical_depth_003"
}
```

**Key Invariant:** `family_selections['Entry']` MUST exist and match pattern `entry_{normalized_role}_{normalized_level}_{dimension}`.

### 6. PROBE_SELECTIONS STORED IN SESSIONS TABLE

**session/start/route.ts lines 490â€“510:**
```typescript
const { selectProbe } = await import('@/lib/probes')

// Select probe for Entry dimension (Turn 1)
const probeSelections: Record<string, string | null> = {}
const entryProbeObj = selectProbe(entryFamilyId, entryProbe)

if (entryProbeObj) {
    probeSelections['Entry'] = entryProbeObj.id  // LINE 497
    console.log(`âœ… [PROBE_FOR_ENTRY]`, {
        entry_family: entryFamilyId,
        dimension: entryProbe,
        probe_id: entryProbeObj.id,
        intent_preview: entryProbeObj.intent.substring(0, 80) + '...'
    })
} else {
    probeSelections['Entry'] = null  // LINE 505
    console.warn(`âš ï¸ [PROBE_MISSING_FOR_ENTRY] No probe available...`)
}
```

**selectProbe() from probes.ts (line 1442):**
Selects a single probe object containing:
- `id`: probe identifier
- `intent`: natural language intent string (e.g., "Probe for trade-off analysis under time constraints")

**Shape of probe_selections:**
```json
{
  "Entry": "probe_sde_senior_write_path_001"
}
```

**Downstream Usage in interview/route.ts:**
- Line 182: `const entryProbeId = probeSelections['Entry']` â€” loads probe ID
- Line 186: `entryProbeIntent = entryProbe?.intent || null` â€” extracts intent text
- Line 527: `entry_probe_intent: entryProbeIntent ?? null` â€” passes to prompt generator

**NOT used downstream in interview-prompts.ts** â€” prompt only receives the `entry_probe_intent` string directly (no probe_selections object).

### 7. DIMENSION_ORDER STORED IN SESSIONS TABLE

**session/start/route.ts lines 516â€“521:**
```typescript
const { fisherYatesShuffle } = await import('@/lib/shuffle')

// Shuffle dimensions once per session for unpredictable question order
const dimensionOrder = fisherYatesShuffle(dimensionNames)

console.log(`âœ… [DIMENSION_SHUFFLE] Fresh session dimension order: ${dimensionOrder.join(' â†’ ')}`)
```

**Stored as:**
```json
{
  "dimension_order": ["Execution", "Technical Depth", "Communication"]
}
```

### 8. TMAY (TURN 0) PRE-SEEDING

**session/start/route.ts lines 621â€“645:**
```typescript
if (session.session_type === 'interview' && !session.replay_of_session_id) {
    console.log(`[TMAY_TRIGGER] Auto-creating Turn 0 for session ${session.id}`)

    const { error: tmayError } = await adminClient
        .from('interview_turns')
        .insert({
            session_id: session.id,
            turn_index: 0,
            turn_type: 'question',
            content: 'Tell me about yourself.',  // MANDATORY OPENING â€” LINE 635
            answered: false
        } as any)

    if (tmayError) {
        console.error('âŒ [TMAY_FAILURE] Failed to create opening turn:', tmayError)
        throw new Error("Invariant violation: TMAY must be auto-asked on session start. Turn creation failed.")  // LINE 641
    }

    console.log(`âœ… [TMAY_SUCCESS] Turn 0 created.`)
}
```

**Invariant:** TMAY is **inserted directly in session/start**, never generated via GPT. This is enforced in interview/route.ts lines 62â€“68:
```typescript
if (!messages || messages.length === 0) {
    console.error('âŒ [INVARIANT_VIOLATION] Attempt to generate Turn 0 (TMAY) via API.', { session_id })
    throw new Error("Invariant violation: TMAY must be auto-created at session start. API must not generate it.")
}
```

### 9. CREDITS & TIER CHECKS

**session/start/route.ts lines 252â€“314:**

**Tier Enforcement for AI-Only Round (lines 306â€“310):**
```typescript
const isAIOnlyRound = dimensionNames.length === 1 && dimensionNames[0] === 'ai_fluency'

if (isAIOnlyRound && profile.package_tier !== 'Pro' && profile.package_tier !== 'Pro+') {
    return NextResponse.json({ error: 'AI Fluency Round requires Pro tier' }, { status: 403 })
}
```

**Credit Deduction (lines 317â€“328):**
```typescript
const { error: updateError } = await adminClient
    .from('users')
    .update({
        available_sessions: remainingSessions - 1,
        total_sessions_used: (profile.total_sessions_used || 0) + 1
    })
    .eq('id', user.id)

if (updateError) {
    throw new Error(`Failed to deduct credit: ${updateError.message}`)
}
```

**Compensation on Failure (lines 565â€“575):**
```typescript
if (insertError) {
    await adminClient
        .from('users')
        .update({
            available_sessions: profile.available_sessions,  // RESET to original
            total_sessions_used: profile.total_sessions_used
        })
        .eq('id', user.id)

    throw new Error(`Failed to create session: ${insertError.message}`)
}
```

---

## B. INTERVIEW TURN FLOW

### 1. REQUEST BODY FROM USEBATCHVOICE

**useBatchVoice.ts lines 322â€“335 (askNextQuestion):**
```typescript
const interviewRes = await fetch('/api/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        session_id: sessionId,
        messages: historySnapshot,                    // [{role, content}, ...]
        userMessage: sttTranscript.trim(),            // User's spoken answer
        is_first_question: isFirstQuestionPending.current,  // Boolean
        turn_authority: true,                         // Always true in batch mode
        sessionStartTime: Date.now(),
        targetDuration: targetDuration,               // Interview duration in minutes
        pending_system_messages: systemMsgsToSend,    // Buffered system overrides
    }),
})
```

### 2. SESSION DATA READ FROM DB

**interview/route.ts lines 100â€“188:**
```typescript
const { data: sessionData, error } = await supabase
    .from('sessions')
    .select('replay_of_session_id, family_selections, dimension_order, user_id, scenario_id')  // LINE 113
    .eq('id', session_id)
    .single()

console.log('[SESSION_DATA_FETCHED]', {
    family_selections_raw: (sessionData as any)?.family_selections,       // LINE 123
    family_selections_type: typeof (sessionData as any)?.family_selections,
    family_selections_keys: (sessionData as any)?.family_selections ? Object.keys((sessionData as any).family_selections) : [],
    has_entry: (sessionData as any)?.family_selections?.['Entry'],
})

// CRITICAL FIX: Hydrate familySelections from DB with strict validation
const dbFamilySelections = (sessionData as any)?.family_selections       // LINE 159
if (dbFamilySelections) {
    familySelections = dbFamilySelections as Record<string, string>      // LINE 164
    console.log(`âœ… [FAMILY_SELECTIONS_LOADED] Keys: ${Object.keys(familySelections)}, Entry: ${familySelections['Entry'] || 'MISSING'}`)
} else {
    console.warn(`âš ï¸ [FAMILY_SELECTIONS_NULL] No family_selections in session ${session_id}...`)
}

// Probe selections for freshness (replay sessions reuse original probes)
const dbProbeSelections = (sessionData as any)?.probe_selections         // LINE 161
if (dbProbeSelections) {
    probeSelections = dbProbeSelections as Record<string, string | null> // LINE 174
    console.log(`âœ… [PROBE_SELECTIONS_LOADED] Keys: ${Object.keys(probeSelections)}, Entry: ${probeSelections['Entry'] || 'MISSING'}`)
} else {
    console.warn(`âš ï¸ [PROBE_SELECTIONS_NULL] No probe_selections in session ${session_id}...`)
}

// Replay sessions must reproduce the original probe intent verbatim
const entryProbeId = probeSelections['Entry']                             // LINE 182
if (entryProbeId) {
    const { selectProbe } = await import('@/lib/probes')
    const entryProbe = selectProbe(entryProbeId, firstDimension) // Returns { id, intent, ... }
    entryProbeIntent = entryProbe?.intent || null                         // LINE 186
    console.log(`[PROBE_INTENT_LOADED] probe: ${entryProbeId}, intent: ${entryProbeIntent?.substring(0, 60)}...`)
}
```

### 3. SYSTEM PROMPT CONSTRUCTION

**interview/route.ts lines 513â€“529 (generateInterviewerPrompt call):**
```typescript
const systemPrompt = generateInterviewerPrompt({
    ...scenarioConfig,
    role: scenarioConfig.role!,                    // STRING from DB
    level: scenarioConfig.level!,                  // STRING from DB â€” LINE 516
    interview_type: scenarioConfig.interview_type!,
    interviewer_persona: scenarioConfig.interviewer_persona!,
    scenario_title: scenarioConfig.scenario_title!,
    base_system_prompt: scenarioConfig.base_system_prompt!,
    evaluation_dimensions: scenarioConfig.evaluation_dimensions!,
    dimension_order: dimensionOrder,               // Shuffled dimension sequence
    seeded_questions: [],                          // FORCE EMPTY â€” LINE 523
    session_history: sessionHistory,
    selected_families: familySelections,           // Full Entry + dimension families
    recent_questions: recentQuestions,             // Anti-convergence blocklist
    entry_probe_intent: entryProbeIntent ?? null,  // Probe intent string â€” LINE 527
    dimensionProgressBlock                         // Dimension pacing signal
})
```

### 4. PROMPT GUIDANCE INJECTION

**interview-prompts.ts lines 84â€“147 (familyGuidanceSection construction):**

```typescript
let familyGuidanceSection = ''
let entryFamilyGuidance = ''  // LINE 85

if (Object.keys(selected_families).length > 0) {
    const { QUESTION_FAMILIES } = require('@/lib/question-families')
    const { ENTRY_FAMILIES } = require('@/lib/entry-families')

    const familyInstructions: string[] = []

    for (const [dimension, familyId] of Object.entries(selected_families)) {
        // Special Handling for Entry Family â€” LINE 95
        if (dimension === 'Entry') {
            const family = ENTRY_FAMILIES.find((f: any) => f.id === familyId)
            if (family) {
                entryFamilyGuidance = `
   â€¢ IMMEDIATELY after the candidate answers "Tell me about yourself":
     - You MUST probe the following area (Entry Family: ${family.family_name}):
     - "${family.prompt_guidance}"${entry_probe_intent ? `
     - EVALUATION INTENT FOR THIS SESSION (internal â€” do not state this to the candidate):
       ${entry_probe_intent}                    // LINE 103: PROBE INTENT INJECTED HERE
     - Frame your opening question to specifically test this intent. A different session for
       the same family may test a different intent â€” yours must reflect THIS intent only.` : ''}
     - Do NOT ask a generic opening question.
     - Move strictly to this topic.`
            }
            continue  // Do not add to general dimensions list â€” LINE 109
        }

        // Regular Dimensions â€” LINE 112
        const family = QUESTION_FAMILIES.find((f: any) => f.id === familyId)
        if (family) {
            familyInstructions.push(`
**${dimension}** (Family: ${family.family_name}):
${family.prompt_guidance}
`)
        }
    }

    if (familyInstructions.length > 0) {
        familyGuidanceSection = `
...
QUESTION FAMILY GUIDANCE (CRITICAL)
...
${familyInstructions.join('\n')}
...
`
    }
}
```

**Final Prompt Template Insertion (interview-prompts.ts lines 150â€“193):**
```typescript
return `You are a REAL ${role} ${level} interviewer conducting a high-stakes ${interview_type}.
...
3. MANDATORY OPENING (FIRST SUBSTANTIVE QUESTION):
   â€¢ After a brief greeting, you MUST ask this exact opening question...
     **"Tell me about yourself."**
   
   ...${entryFamilyGuidance}   // LINE 193: ENTRY FAMILY GUIDANCE INJECTED
   
   â€¢ After the candidate answers, proceed to questions from your SELECTED QUESTION FAMILIES ONLY.
...
Evaluation Dimensions:
${dimensionsFormatted}
${familyGuidanceSection}    // LINE 316: FULL FAMILY GUIDANCE SECTION
...
${session_history || '(Session just started. Ask your opening question.)'}
${dimensionProgressBlock ? `\n${dimensionProgressBlock}\n` : ''}
ASK ONE QUESTION NOW.`
}
```

### 5. ENTRY FAMILY ON TURN 1

**interview/route.ts lines 292â€“361 (Entry Family enforcement on Turn 1):**

```typescript
if (is_first_question) {
    // CHECK 1: Scenario Opening Questions Must Be Dead
    if (scenarioConfig.seeded_questions && scenarioConfig.seeded_questions.length > 0) {
        throw new Error("INVARIANT_VIOLATION: Scenario opening questions forbidden after TMAY")
    }

    // DIAGNOSTIC: Log complete state before Entry Family check
    console.log(`ðŸ” [ENTRY_FAMILY_CHECK] Turn 1 generation - complete state:`, {
        runtime_familySelections: familySelections,
        runtime_has_entry: !!familySelections['Entry'],
        runtime_entry_value: familySelections['Entry'],
    })

    // CHECK 2: Entry Family MUST Exist
    if (!familySelections['Entry']) {
        // Fetch DB state for diagnostics
        const { data: dbSession } = await supabase
            .from('sessions')
            .select('family_selections')
            .eq('id', session_id)
            .single()

        console.error('âŒ [ENTRY_FAMILY_MISSING] No Entry Family for Turn 1', {
            db_family_selections: (dbSession as any)?.family_selections,
            db_has_entry: !!((dbSession as any)?.family_selections?.['Entry']),
            diagnosis: (dbSession as any)?.family_selections?.['Entry']
                ? 'DB has Entry but runtime lost it - HYDRATION BUG'
                : 'DB missing Entry - SESSION CREATION BUG'
        })
        throw new Error("ENTRY_FAMILY_MISSING_AFTER_TMAY: Entry Family required for first post-TMAY question")
    }

    console.log(`âœ… [ENTRY_ENFORCEMENT] Entry Family validated: ${familySelections['Entry']}`)

    // CHECK 3: Entry Family MUST Match Role + Level Pattern
    if (scenarioConfig?.role && scenarioConfig?.level) {
        const { normalizeRole, normalizeLevel } = await import('@/lib/runtime-scenario')
        const normalizedRole = normalizeRole(scenarioConfig.role)
        const normalizedLevel = normalizeLevel(scenarioConfig.level)
        const expectedPrefix = `entry_${normalizedRole}_${normalizedLevel}`  // LINE 342: LEVEL USED IN PATTERN VALIDATION
        const actualFamily = familySelections['Entry']

        if (!actualFamily.startsWith(expectedPrefix)) {
            throw new Error(...)
        }
    }
}
```

**On Turn 1, the Entry Family's `prompt_guidance` is injected directly into the prompt**, and the `entry_probe_intent` (from probes table) is appended as an internal instruction (lines 98â€“107 of interview-prompts.ts).

### 6. DIMENSION PROGRESSION

**interview/route.ts lines 26â€“51 (computeDimensionState function):**

```typescript
function computeDimensionState(
    turnIndex: number,            // nextIndex â€” the turn about to be inserted
    dimensionOrder: string[],     // from session.dimension_order
    sessionDurationMinutes: number
): DimensionState {
    if (!dimensionOrder || dimensionOrder.length === 0) {
        return { currentDimension: null, turnsUsedInDimension: 0, ... }
    }

    // Turn 0 is TMAY (pre-seeded); behavioral turns start at index 1
    const behavioralIndex = Math.max(0, turnIndex - 1)

    const availableTurns = Math.floor(sessionDurationMinutes / 3)
    const turnsPerDimension = Math.max(2, Math.floor((availableTurns - 1) / dimensionOrder.length))

    const lastDimIdx = dimensionOrder.length - 1
    const rawDimIdx = Math.floor(behavioralIndex / turnsPerDimension)
    const isClamped = rawDimIdx > lastDimIdx
    const dimIdx = Math.min(rawDimIdx, lastDimIdx)

    const currentDimension = dimensionOrder[dimIdx]
    const turnsUsedInDimension = (behavioralIndex % turnsPerDimension) + 1
    const turnsRemainingInDimension = isClamped ? 0 : Math.max(0, turnsPerDimension - turnsUsedInDimension)
    const nextDimension = dimIdx < lastDimIdx ? dimensionOrder[dimIdx + 1] : null

    return { currentDimension, turnsUsedInDimension, turnsPerDimension, turnsRemainingInDimension, nextDimension, isClamped }
}
```

**Called at interview/route.ts line 485:**
```typescript
const dimState = computeDimensionState(
    nextTurnIndex,
    dimensionOrder,
    scenarioConfig.session_duration_minutes ?? 30
)
```

**Dimension Progress Block (interview/route.ts lines 491â€“510):**
```typescript
let dimensionProgressBlock = ''
if (dimState.currentDimension) {
    const lines = [
        '[DIMENSION PROGRESS]',
        `Current dimension: ${dimState.currentDimension} (turn ${dimState.turnsUsedInDimension} of ${dimState.turnsPerDimension})`,
        `Turns remaining in this dimension: ${dimState.turnsRemainingInDimension}`,
    ]
    if (dimState.nextDimension) lines.push(`Next dimension: ${dimState.nextDimension}`)
    if (dimState.isClamped) lines.push('NOTE: All planned dimensions covered. Continue probing any relevant dimension.')
    dimensionProgressBlock = lines.join('\n')
}
```

This block is injected into the prompt at line 432 of interview-prompts.ts:
```typescript
${dimensionProgressBlock ? `\n${dimensionProgressBlock}\n` : ''}
```

### 7. ANTI-CONVERGENCE BLOCKLIST

**interview/route.ts lines 418â€“466:**

```typescript
let recentQuestions: string[] = []

console.log(`[ANTI_CONVERGENCE_TIER] role=${scenarioConfig.role}, isReplay=${isReplaySession}, blocklistActive=${!isReplaySession}`)

if (isReplaySession) {
    // Replay sessions must reproduce original questions exactly â€” no blocklist.
    recentQuestions = []
    console.log('[ANTI_CONVERGENCE] Replay session â€” blocklist cleared')
} else if (session_id && userId && scenarioConfig.role && scenarioConfig.level) {  // LINE 428: LEVEL USED IN QUERY
    try {
        const ninetyDaysAgo = new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString()

        const { data: historyRows } = await (supabase as any)
            .from('user_question_history')
            .select('question_text')
            .eq('user_id', userId)
            .eq('role', scenarioConfig.role)
            .eq('level', scenarioConfig.level)          // LINE 439: FILTER BY LEVEL
            .gte('created_at', ninetyDaysAgo)
            .order('created_at', { ascending: false })
            .limit(50)

        if (historyRows && historyRows.length > 0) {
            recentQuestions = historyRows.map((r: any) => r.question_text)
            console.log(`[ANTI_CONVERGENCE] Loaded ${recentQuestions.length} past questions for user ${userId} (${scenarioConfig.role} ${scenarioConfig.level})`)
        }
    } catch (error) {
        console.error('[ANTI_CONVERGENCE] History query failed:', error)
    }
}
```

**Query on user_question_history table:**
- Columns: `user_id`, `role`, `level`, `question_text`, `created_at`
- Filters: `user_id = ?`, `role = ?`, `level = ?`, `created_at >= (90 days ago)`
- Result: List of question texts to block

**Injected into prompt (interview-prompts.ts lines 218â€“232):**
```typescript
${recent_questions.length > 0 ? `

    ========================================
   QUESTIONS YOU HAVE ALREADY ASKED THIS USER â€” DO NOT REPEAT
   ========================================
   ...
${recent_questions.map((q, i) => `   ${i + 1}. "${q}"`).join('\n')}
   
   These are BLOCKED. Your new question must test the same capability
   but use completely different framing, context, and wording.
   ========================================` : ''}
```

### 8. DB WRITES AFTER GPT RESPONSE

**interview/route.ts lines 692â€“803 (Transactional Persistence):**

**STEP 2A: Mark previous turn as answered (lines 702â€“726):**
```typescript
if (turn_authority === true) {
    const { data: latestTurns } = await supabaseClient
        .from('interview_turns')
        .select('id, turn_index')
        .eq('session_id', session_id)
        .order('turn_index', { ascending: false })
        .limit(1)

    if (latestTurns && latestTurns.length > 0) {
        const latestTurn = latestTurns[0]

        const { error: updateError } = await supabaseClient
            .from('interview_turns')
            .update({ answered: true } as any)
            .eq('id', latestTurn.id)

        if (updateError) {
            throw new Error(`Answer persistence failed...`)
        }

        console.log(`âœ… [TURN_ANSWERED] Marked turn #${latestTurn.turn_index} as answered...`)
    }
}
```

**STEP 2B: INSERT new turn (lines 728â€“761):**
```typescript
const { data: maxTurn } = await supabaseClient
    .from('interview_turns')
    .select('turn_index')
    .eq('session_id', session_id)
    .order('turn_index', { ascending: false })
    .limit(1)
    .single()

const nextIndex = maxTurn ? (maxTurn as any).turn_index + 1 : 1

const { data: insertedTurn, error: insertError } = await supabaseClient
    .from('interview_turns')
    .insert({
        session_id,
        turn_index: nextIndex,
        turn_type: is_first_question ? 'question' : 'followup',
        content: assistantMessage.trim(),
        answered: false,
        dimension: dimState.currentDimension ?? null,
        turns_in_dimension: dimState.turnsUsedInDimension ?? null
    } as any)
    .select('id')
    .single()

if (insertError) {
    throw insertError
}

newTurnId = (insertedTurn as any)?.id
console.log(`âœ… [TURN_CREATED] Populated turn #${nextIndex} created (id: ${newTurnId})`)
turnStatus = 'completed'
```

**Columns written to interview_turns:**
- `session_id`, `turn_index`, `turn_type`, `content`, `answered`, `dimension`, `turns_in_dimension`

**STEP 2C: Fire-and-forget user_question_history insert (lines 765â€“790):**
```typescript
// REPLAY GUARD: never write history for replay sessions
if (!isReplaySession && userId && scenarioConfig.role && scenarioConfig.level) {
    try {
        ; (supabaseClient as any)
            .from('user_question_history')
            .insert({
                user_id: userId,
                role: scenarioConfig.role,
                level: scenarioConfig.level,            // LINE 773: LEVEL WRITTEN
                session_id,
                turn_index: nextIndex,
                question_text: assistantMessage.trim()
            } as any)
            .then(({ error: historyError }: { error: any }) => {
                if (historyError) {
                    console.warn('[QUESTION_HISTORY] Non-blocking insert failed:', historyError)
                }
            })
    } catch (historyInitErr) {
        console.warn('[QUESTION_HISTORY] Insert threw synchronously:', historyInitErr)
    }
} else if (!isReplaySession) {
    console.warn(`[QUESTION_HISTORY] Skipped insert â€” userId: ${userId}, role: ${scenarioConfig.role}, level: ${scenarioConfig.level}`)
}
```

**Columns written to user_question_history:**
- `user_id`, `role`, `level`, `session_id`, `turn_index`, `question_text`

### 9. TURN AUTHORITY GATING

**interview/route.ts lines 575â€“598:**

```typescript
// HARD GATE: Block OpenAI call if authority not granted
// CONTRACT: The AI never decides when to speak
const hasSpeechAuthority = is_first_question === true || turn_authority === true  // LINE 577

// LOGGING: Verify trigger conditions
console.log('[INTERVIEWER_TRIGGER]', {
    is_first_question,
    turn_authority,
    userMessageLength: userMessage?.length || 0
})

if (!hasSpeechAuthority) {
    console.log('[TURN_BLOCKED] No authority - suppressing OpenAI call', {
        session_id,
        is_first_question,
        turn_authority,
        messageCount: messages?.length
    })
    return NextResponse.json({
        message: null,
        suppressed: true,
        reason: 'No turn authority granted'
    })
}
```

**Turn authority is set by useBatchVoice at line 330:**
```typescript
turn_authority: true,
```

(Always true in batch mode; could be false in other modes.)

---

## C. WHAT LEVEL IS USED AND WHERE

### 1. CURRENT SOURCES OF LEVEL

**Source 1: Scenario Row (Database or Hardcoded)**
- Line 344 (session/start): `levelForEntry = hardcodedScenario.level!`
- Line 357 (session/start): `levelForEntry = s.level ?? roleForEntry`
- Line 377 (session/start): `levelForEntry = b.level ?? levelForEntry` (via FK)

**Source 2: Hardcoded Defaults**
- Line 336 (session/start): `let levelForEntry = 'Senior'` (initial default)

**Source 3: Runtime-Scenario Resolution**
- Line 204 (runtime-scenario): `const safeLevel = level ?? 'senior'`

**Level is NOT sourced from user input, request body, or tier-specific parameters.**

### 2. EVERY REFERENCE TO LEVEL BY FILE

**app/api/session/start/route.ts:**
- Line 336: `let levelForEntry = 'Senior'` (default)
- Line 344: `levelForEntry = hardcodedScenario.level!` (read from INTERVIEW_SCENARIOS)
- Line 351: `.select('role, level')` (query scenarios table)
- Line 357: `levelForEntry = s.level ?? roleForEntry` (assign from DB)
- Line 371: `.select('role, level')` (query via FK)
- Line 377: `levelForEntry = b.level ?? levelForEntry` (assign from base scenario)
- Line 459: `first_eval_dimension:` (diagnostic log)
- Line 461: `all_dimensions:` (diagnostic log)
- Line 467: `selectEntryFamily(roleForEntry, levelForEntry, entryProbe)` (PASS TO ENTRY FAMILY SELECTION)

**app/api/interview/route.ts:**
- Line 266: `level: dbScenario.level,` (read from DB scenario)
- Line 269: `scenario_title: \`${dbScenario.role} ${dbScenario.level} Interview\`,` (string interpolation)
- Line 337: `if (scenarioConfig?.role && scenarioConfig?.level) {` (conditional check)
- Line 341: `const normalizedLevel = normalizeLevel(scenarioConfig.level)` (normalize for pattern validation)
- Line 349: `level: scenarioConfig.level,` (diagnostic log)
- Line 351: `normalized_level: normalizedLevel,` (diagnostic log)
- Line 354: `diagnosis: 'Entry family does not match role+level pattern - RESOLUTION BUG'` (error message)
- Line 428: `} else if (session_id && userId && scenarioConfig.role && scenarioConfig.level) {` (conditional for anti-convergence query)
- Line 439: `.eq('level', scenarioConfig.level)` (filter user_question_history by level)
- Line 450: `(${scenarioConfig.role} ${scenarioConfig.level})` (diagnostic log)
- Line 456: (commented old query with level filter)
- Line 516: `level: scenarioConfig.level!,` (PASS TO PROMPT GENERATOR)
- Line 765: `if (!isReplaySession && userId && scenarioConfig.role && scenarioConfig.level) {` (conditional)
- Line 773: `level: scenarioConfig.level,` (INSERT INTO user_question_history)
- Line 789: `role: ${scenarioConfig.role}, level: ${scenarioConfig.level}` (diagnostic log)

**app/config/interview-prompts.ts:**
- Line 11: `level: string // e.g., 'L4', 'L5', 'Junior', 'Mid', 'Senior'` (interface definition)
- Line 42: `level,` (destructure from variables)
- Line 150: `You are a REAL ${role} ${level} interviewer...` (INJECTED INTO PROMPT)
- Line 204: `...from ANY prior interview question for this role, level, and dimension.` (comment)
- Line 371â€“378: Complete section on level-as-calibration-not-identity
  ```
  11. LEVEL IS CALIBRATION, NOT IDENTITY:
     â€¢ You are interviewing for a ${role} position.
     â€¢ Your bar and expectations are calibrated for ${level} candidates.
     â€¢ You MUST NOT reference the level explicitly in your questions or comments.
     â€¢ NEVER say "for a senior engineer" or "at the L5 level" or similar.
  ```

**lib/runtime-scenario.ts:**
- Line 70: `level: string` (interface property)
- Line 105â€“175: `derivePersona(role: string, level: string)` â€” entire persona derivation logic based on level
  - Line 107: `const normalizedLevel = level.toLowerCase()`
  - Line 111: `if (normalizedRole.includes('fresh') || normalizedLevel.includes('entry')...`
  - Line 127: `if (normalizedLevel.includes('junior')...`
  - Line 140: `if (normalizedLevel.includes('senior')...`
  - Line 153: `if (normalizedLevel.includes('leader')...`
- Line 200: `const level = base.level` (read from base scenario)
- Line 204: `const safeLevel = level ?? 'senior'` (fallback)
- Line 205: `const persona = derivePersona(safeRole, safeLevel)` (DERIVE PERSONA FROM LEVEL)
- Line 231: `level: safeLevel,` (in returned RuntimeScenario)
- Line 383â€“391: `normalizeLevel()` function
- Line 396â€“402: `getEntryFamilyKey(role, level, dimension)` function
- Line 408â€“415: Entry family selection function signature & docstring
- Line 418: `level: string,` (parameter)
- Line 435: `level` (validation diagnostic)
- Line 445: `const normalizedLevel = normalizeLevel(level)` (normalize)
- Line 449: `const targetFamilyKey = \`entry_${normalizedRole}_${normalizedLevel}_${normalizedDimension}\`` (KEY CONSTRUCTION)
- Line 453â€“459: Diagnostic logs with level
- Line 465â€“471: Error diagnostics with level
- Line 479â€“483: Success log with level
- Line 498â€“527: Three INTERVIEW_SCENARIOS with `level: 'L5'`, `level: 'L5'`, `level: 'Mid'`

**lib/eval-logic.ts:**
- Line 74: `level: string,` (BUILD_PROMPT parameter)
- Line 83: `You are a senior ${params.role} ${params.level} interviewer...` (prompt injection)

**app/api/evaluate/route.ts:**
- Line 32: `level: string,` (getPriorSessionForRoleLevel parameter)
- Line 37: `.select('...scenarios:scenario_id(role, level)')` (fetch via FK)
- Line 49: `s.scenarios?.level === level` (filter in JS)
- Line 134â€“135: Extract level from scenario
  ```typescript
  const role = baseScenario?.role || 'User';
  const level = baseScenario?.level || 'Standard';
  ```
- Line 137: `const scenario_title = customScenario?.title || \`${role} ${level} - ...\`;` (title generation)
- Line 334â€“335: Pass to BUILD_PROMPT
- Line 376: `hireable_level: stage2.hireable_level,` (from stage2 evaluation)
- Line 447â€“448: Pass level to getPriorSessionForRoleLevel
- Line 487â€“488: Pass level to synthesizePreparationSignals
- Line 511â€“512: Pass level to comparison function
- Line 573â€“574: Pass level to PDF generation
- Line 611â€“612: Pass level to PDF generation
- Line 625â€“626: Sanitize level for filename
- Line 696: `level: string,` (BUILD_PROMPT_INTERNAL parameter)
- Line 714: `You are an experienced FAANG-level ${params.role} ${params.level} interviewer.` (PROMPT INJECTION)
- Line 758: `Role: ${params.role} ${params.level}` (PROMPT SECTION)
- Line 774â€“787: Multiple references in JSON schema with level context
- Line 803â€“805: Tier-specific rules referencing level

### 3. WHAT BREAKS IF LEVEL IS PASSED AS USER INPUT

**Breakage 1: Entry Family Selection becomes Arbitrary**
- Entry family key format is `entry_{normalized_role}_{normalized_level}_{dimension}`
- If level comes from user input instead of scenario row, the role+level tuple would be user-controlled
- **Risk:** User could request `entry_sde_intern_write_path` which might not exist, causing ENTRY_FAMILY_MISSING error
- **Invariant Violation:** Line 471â€“481 assumes level comes from authoritative scenario data

**Breakage 2: Persona Derivation Mismatch**
- `derivePersona(role, level)` at line 105â€“175 (runtime-scenario.ts) is called during scenario resolution
- If level is later overridden by user input, the interviewer persona would be stale
- **Risk:** Interview might start with "Principal Engineer" persona but user-provided level is "Junior"

**Breakage 3: Anti-Convergence Query Breaks**
- Line 439 (interview/route.ts): `.eq('level', scenarioConfig.level)`
- If level is user-input and not persisted in scenarioConfig, query would filter on undefined/null
- **Risk:** Would return **all** prior questions regardless of level, breaking semantic dedup

**Breakage 4: PDF Generation & Evaluation**
- evaluate/route.ts lines 334â€“335: Extract level from scenario
- If level is not persisted in scenario row, evaluation stage cannot determine correct person
- **Risk:** Evaluation would rate candidate against wrong bar (e.g., "Senior" instead of "Junior")

**Breakage 5: Replay Sessions**
- Replay logic at line 204â€“247 (session/start) relies on storing family_selections, dimension_order, and probe_selections
- These depend on Entry family being deterministic per (role, level, dimension)
- If level changes between original and replay, Entry family would resolve differently
- **Risk:** Replay session would ask different opening question, breaking replay invariant

---

## D. WHAT SCENARIO CARDS ENCODE TODAY

### 1. SCENARIO ROW COLUMNS

**From database.types.ts (lines 246â€“319):**

```typescript
scenarios: {
    Row: {
        applicant_context: string | null
        base_system_prompt: string | null
        company_context: string | null
        created_at: string | null
        created_by: string | null
        difficulty: string | null
        duration_minutes: number | null
        evaluation_dimensions: string[] | null
        id: number
        interviewer_persona: Json | null
        is_active: boolean | null
        level: string | null                         // â† LEVEL COLUMN
        persona: string | null
        prompt: string | null
        role: string | null                          // â† ROLE COLUMN
        scenario_description: string | null
        scenario_title: string | null
        scenario_type: string | null
        seeded_questions: Json | null
    }
}
```

### 2. CARDINALITY (INFERENCE FROM CODE)

**From INTERVIEW_SCENARIOS (lib/runtime-scenario.ts lines 495â€“541):**

Hardcoded scenarios:
- `'sde-l5-system-design'`: `role: 'SDE'`, `level: 'L5'`
- `'pm-l5-product-strategy'`: `role: 'PM'`, `level: 'L5'`
- `'ds-mid-ml-pipeline'`: `role: 'Data Scientist'`, `level: 'Mid'`

**Minimum observed cardinality:** 3 hardcoded scenarios, but likely many more in the database.

**Inferred Cardinality Pattern:**
- Roles: SDE, PM, Data Scientist, (probably: Designer, Marketing, Project Manager, etc.) â€” **~8â€“12 unique roles**
- Levels: L5, Mid, Senior, Junior, Entry, Principal, Staff, Leader, Director â€” **~6â€“9 unique levels per role**
- Combined: **~50â€“100 scenarios in the database**

Each scenario is roleÃ—level specific.

### 3. COLUMNS USED AT RUNTIME

**Used:**
- `role`: Essential for persona derivation, entry family selection, anti-convergence queries, evaluation
- `level`: Essential for persona derivation, entry family selection, anti-convergence queries, evaluation
- `evaluation_dimensions`: Essential for dimension order and family selection
- `prompt`: Used as base_system_prompt in interview generator
- `scenario_title`: Used in system prompt
- `duration_minutes`: Used for time-based pacing calculations
- `interviewer_persona`: Used to override persona (if present)

**Display-Only (rarely used):**
- `scenario_description`, `applicant_context`, `company_context`, `scenario_type`, `difficulty`

### 4. WHAT WOULD BE LOST IF CONSOLIDATED FROM roleÃ—levelÃ—dimensions TO roleÃ—dimensions

**Lost Information:**
1. **Interviewer Persona** â€” Currently derived deterministically from (role, level). Consolidation would either:
   - Force all levels of a role to have the same persona (loses calibration)
   - Require persona to be stored per role only (loses differentiation)

2. **Entry Family Selection** â€” Currently: `entry_{role}_{level}_{dimension}`. Consolidation would require:
   - Either a single entry family per (role, dimension) (loses difficulty calibration)
   - Or entry family selection logic to change entirely (design rework)

3. **Anti-Convergence Scoping** â€” Currently: user_question_history stores (role, level, question) tuples. Without level:
   - Candidate could reuse same questions across different levels (defeats freshness goal)
   - Need to add an explicit "difficulty" or "target_level" column to interview_turns

4. **Evaluation Calibration** â€” Currently: evaluator knows target level. Consolidation would require:
   - Passing target level separately, or
   - Inferring from session data (harder to reason about)

5. **Replay Determinism** â€” Currently: Entry family deterministic per (role, level, dimension). Without level:
   - Would need to store the selected entry family explicitly in session (fine, but more complex)

---

## E. CUSTOM SCENARIOS

### 1. HOW THEY WORK TODAY

**Custom Scenario Creation (app/scenarios/builder/page.tsx lines 87â€“115):**

```typescript
const handleSave = async () => {
    if (!selectedRole || !selectedLevel || !title) return
    setSaving(true)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No user")

        // Find matching base scenario
        const base = baseScenarios.find(s => s.role === selectedRole && s.level === selectedLevel)  // LINE 95
        if (!base) throw new Error("Base scenario not found")

        const { error } = await supabase.from('custom_scenarios').insert({
            user_id: user.id,
            base_scenario_id: base.id,               // FK to scenarios table
            title: title,
            company_context: companyContext,
            focus_dimensions: selectedDimensions    // Override dimensions
        } as any)

        if (error) throw error
        router.push('/dashboard')
    } catch (e: any) {
        console.error(e)
        alert('Failed to save: ' + e.message)
    } finally {
        setSaving(false)
    }
}
```

**Custom Scenario Table (database.types.ts lines 55â€“92):**

```typescript
custom_scenarios: {
    Row: {
        base_scenario_id: number                    // FK to scenarios.id
        company_context: string | null
        created_at: string | null
        focus_dimensions: string[] | null
        id: string
        title: string
        user_id: string
    }
}
```

### 2. WHAT A CUSTOM SCENARIO ROW CONTAINS

- `user_id`: User who created it
- `base_scenario_id`: FK to base scenario (e.g., a "Senior PM" scenario)
- `title`: User-chosen name
- `company_context`: User-injected company constraints
- `focus_dimensions`: Override dimensions (e.g., select only 3-4 of 5 available)
- `created_at`: Timestamp

**Does NOT override:**
- Role (inherited from base)
- Level (inherited from base)
- Persona (derived from role+level of base)

### 3. HOW IT OVERRIDES OR EXTENDS

**Extensions:**
- `company_context` is appended to prompt (runtime-scenario.ts line 226):
  ```typescript
  const context = custom?.company_context ? `\n\nCOMPANY CONTEXT:\n${custom.company_context}` : ''
  ```

**Overrides:**
- `focus_dimensions` replaces the base scenario's evaluation_dimensions (runtime-scenario.ts lines 216â€“223):
  ```typescript
  if (custom?.focus_dimensions && custom.focus_dimensions.length > 0) {
      dimensions = custom.focus_dimensions.map(d => ({
          name: d,
          description: `Focus on ${d}`,
          target_minutes: 15
      }))
  }
  ```

**Inherits (cannot override):**
- Role, Level, Persona (all from base scenario)

### 4. IMPACT OF LEVEL-AS-USER-INPUT CHANGE

**Custom Scenario Builder (builder/page.tsx):**
- Currently: User selects base scenario (which has role+level), then overrides dimensions
- With change: Would need to add explicit level input field
- **UI Impact:** Minor, but new field needed

**Custom Scenario Storage:**
- Would need to add `level` column OR rely on base scenario's level
- **Option A (Better):** Keep relying on base scenario level â€” no DB change needed
- **Option B (Worse):** Add optional level column to custom_scenarios â€” requires migration

**Custom Scenario Session Start:**
- Currently: Resolves level from base_scenario_id FK
- With change: No change needed if custom scenario still depends on base

---

## F. EVALUATION PIPELINE DEPENDENCIES

### 1. WHAT EVALUATE ROUTE READS

**app/api/evaluate/route.ts lines 74â€“83:**

```typescript
const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select('*, scenarios:scenario_id(*), custom_scenarios:custom_scenario_id(*)')
    .eq('id', session_id)
    .single();

const session = sessionData as any;
// Nested objects:
// - session.scenarios = { role, level, evaluation_dimensions, ... }
// - session.custom_scenarios = { title, company_context, focus_dimensions, ... }
```

**Columns read:**
- From sessions: `id`, `transcript`, `evaluation_data`, `scenario_id`, `custom_scenario_id`, `status`
- From scenarios (via FK): `role`, `level`, `evaluation_dimensions`, `prompt`
- From custom_scenarios (via FK): `title`, `company_context`, `focus_dimensions`

### 2. WHAT IT READS FROM SCENARIO

**Scenario Extraction (lines 134â€“137):**
```typescript
const baseScenario = session.scenarios;
const customScenario = session.custom_scenarios;

const role = baseScenario?.role || 'User';
const level = baseScenario?.level || 'Standard';  // LINE 135: LEVEL EXTRACTED FROM BASE SCENARIO
```

### 3. DOES IT USE LEVEL?

**Yes, extensively:**

**Line 334â€“335 (Pass to BUILD_PROMPT):**
```typescript
role,
level,
```

**Line 376 (from stage2.hireable_level):**
```typescript
hireable_level: stage2.hireable_level,
```

**Lines 447â€“448, 487â€“488, 511â€“512, 573â€“574:**
```typescript
// Pass level to helper functions
getPriorSessionForRoleLevel(adminClient, userId, role, level, ...)
synthesizePreparationSignals(..., role, level, ...)
getReplayComparison(..., role, level, ...)
generateSessionPDF(..., role, level, ...)
```

**BUILD_PROMPT (lines 696â€“804):**
```typescript
const BUILD_PROMPT_INTERNAL = (params: {
    role: string,
    level: string,
    ...
}) => {
    return `You are an experienced FAANG-level ${params.role} ${params.level} interviewer.
    ...
    Role: ${params.role} ${params.level}
    ...`
}
```

### 4. WHAT BREAKS IF SCENARIO.LEVEL IS NULL

**Breakage 1: BUILD_PROMPT Becomes Invalid**
- Line 714: `You are an experienced FAANG-level ${params.role} ${params.level} interviewer.`
- If level is null: `You are an experienced FAANG-level PM null interviewer.` â† nonsensical

**Breakage 2: Prior Session Lookup Fails**
- Line 447: `getPriorSessionForRoleLevel(..., level, ...)`
- If level is null or undefined: Query filters fail or return no results

**Breakage 3: PDF Generation Uses Wrong Title**
- Line 625â€“626: Sanitizes level for filename
- If level is null: Filename becomes `evaluation_User_Standard.pdf` (wrong)

**Breakage 4: Stage2 Evaluation Cannot Contextualize**
- Stage2 (stage2-evaluate.ts) uses level to determine "barrier to next level"
- If level is null: Evaluation cannot reason about career progression

---

## G. RISK MATRIX

### CHANGE 1: Level as User Input (Not From Scenario Row)

| Dimension | Risk | Impact | Reversibility |
|-----------|------|--------|---|
| **Files Affected** | 15+ files across API, library, and UI layers | session/start, interview, evaluate, runtime-scenario, entry-families, simulators | Medium |
| **DB Changes** | Add `level` column to sessions table; add optional level to custom_scenarios; ALTER scenarios.level to nullable? | Migration required; backward compat issues with existing sessions | Low (can revert schema) |
| **What Could Break** | Entry family determinism; replay invariant; anti-convergence scope; evaluation calibration | 1. Replay sessions ask different questions 2. Evaluations rated on wrong bar 3. Anti-convergence returns wrong blocklist 4. Custom scenarios need rework | High |
| **Existing Sessions Affected** | All active sessions without explicit level column populated | Sessions would need back-fill; or fallback logic added | Medium (with backfill) |
| **Reversibility** | Schema revert possible; code revert hard (complex interactions) | 6â€“8 weeks to prove-out and test edge cases | Low (operational cost high) |

### CHANGE 2: Simplified Family System (Prompt Guidance Only, No Stored Intent)

| Dimension | Risk | Impact | Reversibility |
|-----------|------|--------|---|
| **Files Affected** | probes.ts, session/start, interview/route.ts, interview-prompts.ts | Remove selectProbe, store probe intent directly in prompt guidance | Low |
| **DB Changes** | Add `intent` column to question_families; remove probe_selections column from sessions | Small migration; probes table could be deprecated | Medium (lose probe structure) |
| **What Could Break** | 1. Probe intent text loses structure 2. Replay sessions cannot re-use exact intent 3. No way to track which probe was used | Replay sessions would regenerate intent each time (non-deterministic) | Medium |
| **Existing Sessions Affected** | Replay sessions would break (cannot load probe_selections); fresh sessions unaffected | Non-fatal but UX regresses | Medium |
| **Reversibility** | Rollback requires adding back probe_selections column; re-running probe selection logic | Possible but tedious | Medium |

### CHANGE 3: Scenario Consolidation (roleÃ—dimensions Instead of roleÃ—levelÃ—dimensions)

| Dimension | Risk | Impact | Reversibility |
|-----------|------|--------|---|
| **Files Affected** | 20+ files (every place level is referenced) | runtime-scenario, session/start, interview, evaluate, all helper functions | Very High |
| **DB Changes** | Remove level column from scenarios; add difficulty/tier column; migrate 50â€“100 rows | Major schema change; all downstream code breaks | Very Low (full rebuild needed) |
| **What Could Break** | 1. No level-based persona derivation 2. Entry family selection impossible 3. Evaluation cannot calibrate 4. Interview bar becomes ambiguous | Complete system redesign; users cannot specify target level; evaluation bar lost | Very High |
| **Existing Sessions Affected** | All existing sessions with level in session row; all evaluation data references level | Must rewrite or re-evaluate all past sessions | Very Low |
| **Reversibility** | Near impossible without full revert of scenarios schema | Requires architectural redesign and months of work | Very Low |

---

## H. CURRENT BROKEN THINGS TO NOT LOSE

### 1. TMAY PRE-SEEDING INVARIANT

**File:** app/api/session/start/route.ts, lines 621â€“645

**Code:**
```typescript
if (session.session_type === 'interview' && !session.replay_of_session_id) {
    console.log(`[TMAY_TRIGGER] Auto-creating Turn 0 for session ${session.id}`)

    const { error: tmayError } = await adminClient
        .from('interview_turns')
        .insert({
            session_id: session.id,
            turn_index: 0,
            turn_type: 'question',
            content: 'Tell me about yourself.',  // MANDATORY EXACT TEXT
            answered: false
        } as any)

    if (tmayError) {
        console.error('âŒ [TMAY_FAILURE] Failed to create opening turn:', tmayError)
        throw new Error("Invariant violation: TMAY must be auto-asked on session start. Turn creation failed.")
    }

    console.log(`âœ… [TMAY_SUCCESS] Turn 0 created.`)
}
```

**Enforcement in interview/route.ts, lines 62â€“68:**
```typescript
if (!messages || messages.length === 0) {
    console.error('âŒ [INVARIANT_VIOLATION] Attempt to generate Turn 0 (TMAY) via API.', { session_id })
    throw new Error("Invariant violation: TMAY must be auto-created at session start. API must not generate it.")
}
```

**Why Critical:** Turn 0 must be deterministic and identical for all sessions. If GPT generates it, bias and variance appear in first question.

---

### 2. TURN AUTHORITY GATING

**File:** app/api/interview/route.ts, lines 575â€“598

**Code:**
```typescript
const hasSpeechAuthority = is_first_question === true || turn_authority === true

console.log('[INTERVIEWER_TRIGGER]', {
    is_first_question,
    turn_authority,
    userMessageLength: userMessage?.length || 0
})

if (!hasSpeechAuthority) {
    console.log('[TURN_BLOCKED] No authority - suppressing OpenAI call', {
        session_id,
        is_first_question,
        turn_authority,
        messageCount: messages?.length
    })
    return NextResponse.json({
        message: null,
        suppressed: true,
        reason: 'No turn authority granted'
    })
}
```

**Why Critical:** Prevents AI from speaking out of turn. Without this, if client bugs occur, interviewer could interrupt or contradict itself mid-response.

---

### 3. ENTRY FAMILY ENFORCEMENT

**File:** app/api/session/start/route.ts, lines 465â€“486; app/api/interview/route.ts, lines 292â€“361

**Code (session/start):**
```typescript
if (!entryFamilyId) {
    console.error(`âŒ [SESSION_START_ERROR] No Entry Family found`, {
        scenario_id,
        custom_scenario_id,
        role: roleForEntry,
        level: levelForEntry,
        dimension: entryProbe,
        first_eval_dimension: firstDimension
    })
    throw new Error(`SESSION_START_ERROR: No Entry Family available for role "${roleForEntry}" at level "${levelForEntry}" with dimension "${entryProbe}". Cannot start session.`)
}

familySelections['Entry'] = entryFamilyId
console.log(`âœ… [ENTRY_GUARANTEED] Entry Family selected: ${entryFamilyId}...`)
```

**Code (interview/route.ts, Turn 1):**
```typescript
if (!familySelections['Entry']) {
    // Fetch DB state one more time for diagnostic purposes
    const { data: dbSession } = await supabase
        .from('sessions')
        .select('family_selections')
        .eq('id', session_id)
        .single()

    console.error('âŒ [ENTRY_FAMILY_MISSING] No Entry Family for Turn 1', {
        session_id,
        runtime_familySelections: familySelections,
        db_family_selections: (dbSession as any)?.family_selections,
        diagnosis: (dbSession as any)?.family_selections?.['Entry']
            ? 'DB has Entry but runtime lost it - HYDRATION BUG'
            : 'DB missing Entry - SESSION CREATION BUG'
    })
    throw new Error("ENTRY_FAMILY_MISSING_AFTER_TMAY: Entry Family required for first post-TMAY question")
}

console.log(`âœ… [ENTRY_ENFORCEMENT] Entry Family validated: ${familySelections['Entry']}`)

// Pattern validation
if (scenarioConfig?.role && scenarioConfig?.level) {
    const { normalizeRole, normalizeLevel } = await import('@/lib/runtime-scenario')
    const normalizedRole = normalizeRole(scenarioConfig.role)
    const normalizedLevel = normalizeLevel(scenarioConfig.level)
    const expectedPrefix = `entry_${normalizedRole}_${normalizedLevel}`
    const actualFamily = familySelections['Entry']

    if (!actualFamily.startsWith(expectedPrefix)) {
        throw new Error(`ENTRY_FAMILY_MISMATCH: Expected family matching "${expectedPrefix}_*" but got "${actualFamily}"`)
    }

    console.log(`âœ… [ENTRY_PATTERN_VALID] Entry family matches pattern: ${expectedPrefix}_*`)
}
```

**Why Critical:** Entry family is the only mechanism for varying opening questions after TMAY. Without this, all candidates see identical "Tell me about yourself" â†’ generic follow-up flow.

---

### 4. CREDIT DEDUCTION + COMPENSATION

**File:** app/api/session/start/route.ts, lines 317â€“328 (deduction), lines 565â€“575 (compensation)

**Deduction Code:**
```typescript
const { error: updateError } = await adminClient
    .from('users')
    .update({
        available_sessions: remainingSessions - 1,
        total_sessions_used: (profile.total_sessions_used || 0) + 1
    })
    .eq('id', user.id)

if (updateError) {
    throw new Error(`Failed to deduct credit: ${updateError.message}`)
}
```

**Compensation Code (if session creation fails):**
```typescript
if (insertError) {
    await adminClient
        .from('users')
        .update({
            available_sessions: profile.available_sessions,
            total_sessions_used: profile.total_sessions_used
        })
        .eq('id', user.id)

    throw new Error(`Failed to create session: ${insertError.message}`)
}
```

**Why Critical:** Prevents double-charging users if session creation fails partway through. Without compensation, user loses credit without getting session.

---

### 5. ANTI-CONVERGENCE BLOCKLIST

**File:** app/api/interview/route.ts, lines 418â€“466

**Code:**
```typescript
if (isReplaySession) {
    recentQuestions = []
    console.log('[ANTI_CONVERGENCE] Replay session â€” blocklist cleared')
} else if (session_id && userId && scenarioConfig.role && scenarioConfig.level) {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

        const { data: historyRows } = await (supabase as any)
            .from('user_question_history')
            .select('question_text')
            .eq('user_id', userId)
            .eq('role', scenarioConfig.role)
            .eq('level', scenarioConfig.level)
            .gte('created_at', ninetyDaysAgo)
            .order('created_at', { ascending: false })
            .limit(50)

        if (historyRows && historyRows.length > 0) {
            recentQuestions = historyRows.map((r: any) => r.question_text)
            console.log(`[ANTI_CONVERGENCE] Loaded ${recentQuestions.length} past questions...`)
        }
    } catch (error) {
        console.error('[ANTI_CONVERGENCE] History query failed:', error)
    }
}
```

**Injection (interview-prompts.ts, lines 218â€“232):**
```typescript
${recent_questions.length > 0 ? `

    ========================================
   QUESTIONS YOU HAVE ALREADY ASKED THIS USER â€” DO NOT REPEAT
   ========================================
   ...
${recent_questions.map((q, i) => `   ${i + 1}. "${q}"`).join('\n')}
   
   These are BLOCKED. Your new question must test the same capability
   but use completely different framing, context, and wording.
   ========================================` : ''}
```

**Why Critical:** Prevents users from re-grinding same questions. Without this, user can memorize answers and replay them.

---

### 6. EVALUATION DEPTH RULES

**File:** app/api/evaluate/route.ts, lines 26â€“49 (prior session lookup), lines 376â€“407 (evaluation structure), lines 696â€“864 (BUILD_PROMPT_INTERNAL with tier-specific rules)

**Key Tier Logic (lines 27â€“28, 149â€“166):**
```typescript
const isExtendedEval = tier === 'Pro' || tier === 'Pro+'

// Starter: Basic (5 keys)
// Pro: Alternative approaches
// Pro+: All 9 keys including pattern_analysis, risk_projection, readiness_assessment, framework_contrast
```

**Starter Tier Prompt (lines 149â€“155):**
```typescript
IF tier = "Starter":
  "Set alternative_approaches = null"
  "Set pattern_analysis = null"
  "Set risk_projection = null"
  "Set readiness_assessment = null"
  "Set framework_contrast = null"
```

**Pro+ Tier Prompt (lines 160â€“165):**
```typescript
IF tier = "Pro+":
  "Populate alternative_approaches"
  "Populate pattern_analysis"
  "Populate risk_projection"
  "Populate readiness_assessment"
  "Populate framework_contrast"
```

**Why Critical:** Different tiers get different evaluation depth. Without this, Starter users get over-served feedback (expensive) or under-served (bad experience).

---

### 7. RLS BOUNDARIES (adminClient vs supabase)

**File:** app/api/session/start/route.ts, lines 46â€“49; app/api/interview/route.ts, lines 86â€“90; app/api/evaluate/route.ts, line 81+

**Session Start (lines 46â€“49):**
```typescript
const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Interview (lines 86â€“90):**
```typescript
const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Why Critical:** Service role key bypasses RLS. Needed for:
- Reading/writing user data on their behalf (credit deduction)
- Accessing other tables user cannot directly query (scenarios, question families)
- Without this, many queries would 403 Forbidden.

---

### 8. IDEMPOTENCY CHECKS

**File:** app/api/evaluate/route.ts, lines 93â€“106

**Code:**
```typescript
// ðŸ›‘ IDEMPOTENCY CHECK
// If session is already completed, do NOT re-run AI.
// Return existing data + Fresh Signed URL.
if (session.status === 'completed' && session.evaluation_data) {
    console.log('Session already completed. Returning existing evaluation.');
    // Regenerate signed URL
    const { data: { publicUrl } } = await adminClient.storage
        .from('evaluation-pdfs')
        .getPublicUrl(...)
    
    return NextResponse.json({
        ...session.evaluation_data,
        pdf_url: publicUrl || null
    })
}
```

**Replay Session Resume (session/start, lines 67â€“73):**
```typescript
if (session_type === 'interview' && existing.session_type === 'interview' && existing.scenario_id === scenario_id) {
    return NextResponse.json(existing)
}
```

**Why Critical:** Prevents:
1. Double-evaluation (expensive GPT calls)
2. Duplicate charge on replay
3. Stale PDF URLs

---

### 9. NULL GUARDS (RECENTLY ADDED)

**File:** app/api/session/start/route.ts, lines 556â€“598

**Code:**
```typescript
// DIAGNOSTIC A2: Session Start - Verify what was actually inserted
if (session) {
    console.log(`ðŸ” [SESSION_CREATED]`, {
        session_id: session.id,
        family_selections_returned: (session as any).family_selections,
        has_entry_returned: !!((session as any).family_selections?.['Entry'])
    })
}

if (insertError) {
    // COMPENSATION: Refund credit
    await adminClient
        .from('users')
        .update({
            available_sessions: profile.available_sessions,
            total_sessions_used: profile.total_sessions_used
        })
        .eq('id', user.id)

    throw new Error(`Failed to create session: ${insertError.message}`)
}

if (!session) {
    // COMPENSATION: Refund credit
    // This guards the data: null, error: null silent failure case â€”
    // distinct from insertError (which is a PostgREST-level error).
    console.error('[SESSION_START] Insert returned null data with no error â€” possible RLS or trigger issue', {
        user_id: user.id,
        session_payload_keys: Object.keys(sessionPayload)
    })
    await adminClient
        .from('users')
        .update({
            available_sessions: profile.available_sessions,
            total_sessions_used: profile.total_sessions_used
        })
        .eq('id', user.id)

    throw new Error('Session creation returned no data. Please try again.')
}
```

**Why Critical:** Catches silent failures where DB returns success but no row. Without this, user is charged for nonexistent session.

---

## SUMMARY TABLE: INVARIANTS

| Invariant | File + Line | Guard | Enforcement | Cost of Breaking |
|-----------|-------------|-------|-------------|-----------------|
| TMAY exists at index 0 | session/start:635, interview:65 | IF insert fails, throw | API refuses !messages[0] | User cannot start interview |
| Turn authority required | interview:577 | IF !authority, suppress | Returns null message | AI speaks without permission |
| Entry family must exist | session/start:471, interview:313 | IF !entryFamilyId, throw | Queries DB, pattern-validates | Opening question is generic |
| Entry family pattern match | interview:338â€“357 | IF !pattern.match, throw | Role+level normalization | Persona misaligned with level |
| Dimension order persisted | session/start:533, interview:403 | IF missing, warn (soft) | Fall back to scenario dims | Pacing metrics wrong |
| Family selections hydrated | interview:159â€“214 | IF mismatch DB, throw | Merge + validate Entry | Hydration bug surfaced |
| Probe selections loaded | interview:161â€“187 | IF missing, warn | Fallback to null intent | Replay intent changes |
| Anti-convergence level-scoped | interview:428â€“450 | Filters by role+level | Query includes .eq('level', ...) | Candidate reuses questions |
| Replay session idempotent | evaluate:93â€“106 | IF completed, return cached | Check status=='completed' && eval_data | Double-charge user |
| Credit deduction atomic | session/start:317â€“328 + 565â€“575 | Deduct first, compensate on failure | Paired update/refund | User charged without session |
| Evaluation tier-appropriate | evaluate:27, 149â€“165 | Tier-specific JSON keys | BUILD_PROMPT conditionals | Starter user over-served |

---

## CONCLUSION

The Praxis system is **highly interdependent on level being a first-class, immutable property of the scenario**. The codebase is not currently architected to handle level as a user input. Changes to this foundation would require:

1. **Schema changes** to sessions and custom_scenarios tables
2. **Logic changes** across 15+ files (session/start, interview, evaluate, runtime-scenario, prompt-generator, builders, etc.)
3. **Backward compatibility** migrations for 1000+ existing sessions
4. **Rigorous testing** of replay determinism, evaluation calibration, and anti-convergence scoping

**Estimated effort for level-as-user-input:** 6â€“8 weeks of development + 2â€“3 weeks of testing and rollout.

**Estimated effort for full scenario consolidation:** 3â€“4 months of architectural redesign + retest entire system.

---

END OF REPORT
