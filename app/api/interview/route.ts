import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { generateInterviewerPrompt } from '@/app/config/interview-prompts'
import { INTERVIEW_SCENARIOS } from '@/lib/runtime-scenario'
import type { Database } from '@/lib/database.types'

// No-op on Hobby plan; required when Vercel Pro is activated.
export const maxDuration = 60

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// =========================================================
// DIMENSION STATE: Pure function — no side effects
// =========================================================
interface DimensionState {
    currentDimension: string | null
    turnsUsedInDimension: number
    turnsPerDimension: number
    turnsRemainingInDimension: number
    nextDimension: string | null
    isClamped: boolean
}

function computeDimensionState(
    turnIndex: number,            // nextIndex — the turn about to be inserted
    dimensionOrder: string[],     // from session.dimension_order
    sessionDurationMinutes: number
): DimensionState {
    if (!dimensionOrder || dimensionOrder.length === 0) {
        return { currentDimension: null, turnsUsedInDimension: 0, turnsPerDimension: 2, turnsRemainingInDimension: 0, nextDimension: null, isClamped: false }
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { scenarioId, messages, userMessage, sessionStartTime, targetDuration = 45, session_id, turn_authority, is_first_question, pending_system_messages } = body

        // =========================================================
        // INVARIANT C: TURN ADVANCEMENT RULES
        // =========================================================
        // 1. TMAY is PRE-SEEDED by session/start. We must NEVER generate it here.
        // 2. We must ALWAYS have a user message (answer) to proceed.

        if (!messages || messages.length === 0) {
            console.error('❌ [INVARIANT_VIOLATION] Attempt to generate Turn 0 (TMAY) via API.', { session_id })
            throw new Error("Invariant violation: TMAY must be auto-created at session start. API must not generate it.")
        }

        if (!userMessage || userMessage.trim().length === 0) {
            console.error('❌ [INVARIANT_VIOLATION] Attempt to advance turn without user answer.', { session_id })
            throw new Error("Invariant violation: Turn advancement requires explicit user input/answer.")
        }

        console.log('[/api/interview] Request received & Validated:', {
            scenarioId,
            session_id,
            turn_authority,
            is_first_question,
            messageCount: messages?.length,
            userMessageLength: userMessage?.length
        })

        // Initialize Supabase Client (Moved up for Session Access)
        // CRITICAL FIX: Use service role client to read JSONB fields properly
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // FETCH SESSION DATA (CRITICAL for Entry Families AND Dimension Order)
        let familySelections: Record<string, string> = {}
        let probeSelections: Record<string, string | null> = {}  // Probe selections for freshness
        let dimensionOrder: string[] = []
        let userId: string | null = null  // NEW: required for user-scoped anti-convergence
        let entryProbeIntent: string | null = null  // NEW: probe intent for entry family freshness
        let dbFamilySelectionsCache: Record<string, string> | null = null

        // ===================================
        // REPLAY DETERMINISM: Detect Replay Mode
        // ===================================
        let isReplaySession = false
        let originalSessionId: string | null = null
        let originalTurns: any[] = []
        let sessionScenarioId: number | null = null  // fallback when scenarioId absent from request body

        if (session_id) {
            // Fetch session metadata to check if this is a replay
            // NOTE: user_id added here (first fetch only). Do NOT add to the hydration-fix fetch below.
            const { data: sessionData, error: sessionFetchError } = await supabase
                .from('sessions')
                .select('replay_of_session_id, family_selections, dimension_order, user_id, scenario_id')
                .eq('id', session_id)
                .single()

            // DIAGNOSTIC: Full session fetch response
            console.log(`🔍🔍🔍 [SESSION_FETCH_RAW]`, {
                session_id,
                hasData: !!sessionData,
                hasError: !!sessionFetchError,
                error: sessionFetchError,
                family_selections_raw: (sessionData as any)?.family_selections,
                family_selections_type: typeof (sessionData as any)?.family_selections,
                family_selections_keys: (sessionData as any)?.family_selections ? Object.keys((sessionData as any).family_selections) : [],
                has_entry: (sessionData as any)?.family_selections?.['Entry'],
                dimension_order_raw: (sessionData as any)?.dimension_order
            })

            if ((sessionData as any)?.replay_of_session_id) {
                isReplaySession = true
                originalSessionId = (sessionData as any).replay_of_session_id
                console.log(`🔁 [REPLAY_MODE] Session ${session_id} is replaying original session ${originalSessionId}`)

                // Fetch all interview turns from the original session
                const { data: turns, error: turnsError } = await supabase
                    .from('interview_turns')
                    .select('*')
                    .eq('session_id', originalSessionId!)
                    .order('turn_index', { ascending: true })

                if (turnsError || !turns || turns.length === 0) {
                    console.error('❌ [REPLAY_ERROR] Failed to fetch original session turns:', turnsError)
                    return NextResponse.json({
                        error: 'REPLAY_FAILURE: Original session questions not found'
                    }, { status: 500 })
                }

                originalTurns = turns
                console.log(`✅ [REPLAY_LOADED] Loaded ${originalTurns.length} turns from original session`)
            }

            // Extract userId for anti-convergence scoping
            userId = (sessionData as any)?.user_id ?? null
            // Critical diagnostic: if null, history inserts will be skipped and blocklist disabled
            console.log(`[USER_ID_RESOLVED] userId: ${userId ?? 'NULL — history insert will be skipped'}, isReplay: ${isReplaySession}`)

            // CRITICAL FIX: Hydrate familySelections from DB with strict validation
            const dbFamilySelections = (sessionData as any)?.family_selections
            dbFamilySelectionsCache = dbFamilySelections ?? null
            const dbProbeSelections = (sessionData as any)?.probe_selections

            if (dbFamilySelections && typeof dbFamilySelections === 'object' && Object.keys(dbFamilySelections).length > 0) {
                familySelections = dbFamilySelections as Record<string, string>
                console.log(`✅ [FAMILY_SELECTIONS_LOADED] Keys: ${Object.keys(familySelections)}, Entry: ${familySelections['Entry'] || 'MISSING'}`)
            } else {
                console.warn(`⚠️ [FAMILY_SELECTIONS_NULL] No family_selections in session ${session_id}`, {
                    dbValue: dbFamilySelections,
                    type: typeof dbFamilySelections
                })
            }

            if (dbProbeSelections && typeof dbProbeSelections === 'object') {
                probeSelections = dbProbeSelections as Record<string, string | null>
                console.log(`✅ [PROBE_SELECTIONS_LOADED] Keys: ${Object.keys(probeSelections)}, Entry: ${probeSelections['Entry'] || 'MISSING'}`)
            } else {
                console.warn(`⚠️ [PROBE_SELECTIONS_NULL] No probe_selections in session ${session_id} (OK for old sessions)`)
            }

            // NEW: Load entry probe intent for prompt injection (skip for replay sessions)
            // Replay sessions must reproduce the original probe intent verbatim via stored probe_selections.
            const entryProbeId = probeSelections['Entry']
            if (entryProbeId && !isReplaySession) {
                const { PROBES } = await import('@/lib/probes')
                const entryProbe = PROBES.find((p: any) => p.id === entryProbeId)
                entryProbeIntent = entryProbe?.intent || null
                console.log(`[PROBE_INTENT_LOADED] probe: ${entryProbeId}, intent: ${entryProbeIntent?.substring(0, 60)}...`)
            }

            if ((sessionData as any)?.dimension_order && Array.isArray((sessionData as any).dimension_order)) {
                dimensionOrder = (sessionData as any).dimension_order as string[]
                console.log(`✅ [DIMENSION_ORDER_LOADED] ${isReplaySession ? 'Replay' : 'Fresh'} session order: ${dimensionOrder.join(' → ')}`)
            }

            // Capture scenario_id from session row as fallback for callers that omit it
            sessionScenarioId = (sessionData as any)?.scenario_id ?? null
        }

        // Resolve scenarioId: prefer request body value, fall back to session row
        const resolvedScenarioId = scenarioId ?? sessionScenarioId
        console.log('[/api/interview] resolvedScenarioId:', resolvedScenarioId, '(body:', scenarioId, ', session row:', sessionScenarioId, ')')

        // FIX HYDRATION BUG: Merge DB into runtime BEFORE validation
        if (session_id && dbFamilySelectionsCache) {
            familySelections = {
                ...familySelections,
                ...dbFamilySelectionsCache
            }

            console.log(`🔍 [FAMILY_HYDRATION_FIX]`, {
                db: dbFamilySelectionsCache,
                runtime_after_merge: familySelections,
                has_entry: !!familySelections['Entry']
            })
        }

        // REGRESSION GUARD: Detect if DB has Entry but runtime lost it
        // This MUST NEVER happen - it means we have a hydration bug
        if (session_id) {
            const dbHasEntry = !!(dbFamilySelectionsCache?.['Entry'])
            const runtimeHasEntry = !!familySelections['Entry']

            if (dbHasEntry && !runtimeHasEntry) {
                console.error('❌ ENTRY_FAMILY_DROPPED_AT_RUNTIME', {
                    session_id,
                    db_family_selections: dbFamilySelectionsCache,
                    runtime_familySelections: familySelections,
                    db_has_entry: dbHasEntry,
                    runtime_has_entry: runtimeHasEntry
                })
                throw new Error('ENTRY_FAMILY_RUNTIME_DROP: DB contains Entry Family but runtime lost it')
            }
        }

        // (Entry Family Check moved to post-scenario resolution)

        let scenarioConfig: any = null

        // Check if resolvedScenarioId is a hardcoded key (e.g., 'sde-l5-system-design')
        const isHardcodedKey = resolvedScenarioId && INTERVIEW_SCENARIOS[resolvedScenarioId]

        if (isHardcodedKey) {
            console.log('[/api/interview] Scenario type: HARDCODED')
            // SHALLOW COPY to avoid mutating the global constant when we strip questions
            scenarioConfig = { ...INTERVIEW_SCENARIOS[resolvedScenarioId] }
        } else {
            console.log('[/api/interview] Scenario type: DATABASE')

            const { data: dbScenario, error } = await supabase
                .from('scenarios')
                .select('*')
                .eq('id', resolvedScenarioId)
                .single()

            if (error || !dbScenario) {
                console.error('[/api/interview] Database scenario not found:', resolvedScenarioId, error)
                return NextResponse.json(
                    { error: 'Scenario not found' },
                    { status: 404 }
                )
            }

            // Map database scenario to expected format
            scenarioConfig = {
                role: dbScenario.role,
                level: dbScenario.level,
                interview_type: 'Behavioral Interview',
                interviewer_persona: dbScenario.persona || 'Professional and thorough',
                scenario_title: `${dbScenario.role} ${dbScenario.level} Interview`,
                base_system_prompt: dbScenario.prompt || '',
                evaluation_dimensions: dbScenario.evaluation_dimensions || ['Communication', 'Technical Depth', 'Problem Solving'],
                seeded_questions: [] // Default for DB
            }
        }

        // Validate scenarioConfig
        if (!scenarioConfig) {
            throw new Error('Failed to resolve scenario configuration')
        }

        // =========================================================
        // KILL SWITCH: PERMANENTLY DISABLE SCENARIO OPENINGS
        // =========================================================

        // 1. Force Clear (The Enforcement)
        // We actively strip any legacy opening questions from the config
        if (scenarioConfig.seeded_questions && scenarioConfig.seeded_questions.length > 0) {
            console.log(`[KILL_SWITCH] Stripping ${scenarioConfig.seeded_questions.length} legacy seeded questions.`)
            scenarioConfig.seeded_questions = []
        }

        // 2. HARD ENFORCEMENT: Entry Family Required for Turn 1
        if (is_first_question) {

            // CHECK 1: Scenario Opening Questions Must Be Dead
            if (scenarioConfig.seeded_questions && scenarioConfig.seeded_questions.length > 0) {
                console.error('❌ [INVARIANT_VIOLATION] Scenario seeded questions exist after clear', { session_id })
                throw new Error("INVARIANT_VIOLATION: Scenario opening questions forbidden after TMAY")
            }

            // DIAGNOSTIC: Log complete state before Entry Family check
            console.log(`🔍 [ENTRY_FAMILY_CHECK] Turn 1 generation - complete state:`, {
                session_id,
                is_first_question,
                runtime_familySelections: familySelections,
                runtime_has_entry: !!familySelections['Entry'],
                runtime_entry_value: familySelections['Entry'],
                runtime_keys: Object.keys(familySelections)
            })

            // CHECK 2: Entry Family MUST Exist  
            // This checks RUNTIME state which should have been hydrated from DB
            if (!familySelections['Entry']) {
                // Fetch DB state one more time for diagnostic purposes
                const { data: dbSession } = await supabase
                    .from('sessions')
                    .select('family_selections')
                    .eq('id', session_id)
                    .single()

                console.error('❌ [ENTRY_FAMILY_MISSING] No Entry Family for Turn 1', {
                    session_id,
                    runtime_familySelections: familySelections,
                    runtime_keys: Object.keys(familySelections),
                    db_family_selections: (dbSession as any)?.family_selections,
                    db_has_entry: !!((dbSession as any)?.family_selections?.['Entry']),
                    diagnosis: (dbSession as any)?.family_selections?.['Entry']
                        ? 'DB has Entry but runtime lost it - HYDRATION BUG'
                        : 'DB missing Entry - SESSION CREATION BUG'
                })
                throw new Error("ENTRY_FAMILY_MISSING_AFTER_TMAY: Entry Family required for first post-TMAY question")
            }

            console.log(`✅ [ENTRY_ENFORCEMENT] Entry Family validated: ${familySelections['Entry']}`)

            // CHECK 3: Entry Family MUST Match Role + Level Pattern
            // Validates that level-scoped resolution is working correctly
            if (scenarioConfig?.role && scenarioConfig?.level) {
                const { normalizeRole, normalizeLevel } = await import('@/lib/runtime-scenario')
                const normalizedRole = normalizeRole(scenarioConfig.role)
                const normalizedLevel = normalizeLevel(scenarioConfig.level)
                const expectedPrefix = `entry_${normalizedRole}_${normalizedLevel}`
                const actualFamily = familySelections['Entry']

                if (!actualFamily.startsWith(expectedPrefix)) {
                    console.error(`❌ [ENTRY_FAMILY_MISMATCH]`, {
                        session_id,
                        role: scenarioConfig.role,
                        level: scenarioConfig.level,
                        normalized_role: normalizedRole,
                        normalized_level: normalizedLevel,
                        expected_prefix: expectedPrefix,
                        actual_family: actualFamily,
                        diagnosis: 'Entry family does not match role+level pattern - RESOLUTION BUG'
                    })
                    throw new Error(`ENTRY_FAMILY_MISMATCH: Expected family matching "${expectedPrefix}_*" but got "${actualFamily}"`)
                }

                console.log(`✅ [ENTRY_PATTERN_VALID] Entry family matches pattern: ${expectedPrefix}_*`)
            }
        }

        // Build conversation history from messages
        const sessionHistory = messages
            .map((msg: any) => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
            .join('\n\n')

        // ===================================
        // TURN 1 ENFORCEMENT (Post-TMAY)
        // ===================================

        let questionSource = 'scenario' // Default assumption

        // Detect if we are at Turn 1 (Immediately after TMAY)
        // Logic: TMAY has been asked, we are generating the NEXT response
        const messagesCount = messages.length
        let isPostTMAY = false

        if (messagesCount >= 2) {
            const lastAssistantMsg = messages
                .filter((m: any) => m.role === 'assistant')
                .pop()

            if (lastAssistantMsg && lastAssistantMsg.content.toLowerCase().includes('tell me about yourself')) {
                isPostTMAY = true
            }
        }

        if (isPostTMAY) {
            // HARD INVARIANT: Entry Family Required
            if (!familySelections['Entry']) {
                console.error('❌ [ENTRY_FAMILY_VIOLATION] Post-TMAY without Entry Family', { session_id, familySelections })
                throw new Error("ENTRY_FAMILY_VIOLATION: First post-TMAY question MUST come from Entry Family")
            }

            questionSource = 'entry_family'
            console.log(`✅ [POST_TMAY_VALIDATED] Turn 1 using Entry Family: ${familySelections['Entry']}`)
        }

        // ===================================
        // DIMENSION ORDER VALIDATION (WARN-ONLY)
        // ===================================
        if (!dimensionOrder || dimensionOrder.length === 0) {
            console.warn('⚠️ [DIMENSION_ORDER_MISSING] No dimension_order found in session - falling back to scenario dimensions')
            console.warn('  This should only happen during migration period. Will be HARD ERROR later.')

            // SOFT FALLBACK: Use scenario dimensions (already unshuffled)
            dimensionOrder = scenarioConfig.evaluation_dimensions || []

            if (dimensionOrder.length === 0) {
                console.error('❌ [DIMENSION_ORDER_CRITICAL] No dimensions available from scenario or session')
            }
        } else {
            console.log(`✅ [DIMENSION_ORDER] ${isReplaySession ? 'Replay' : 'Fresh'} session using order: ${dimensionOrder.join(' → ')}`)
        }

        // ===================================
        // ANTI-CONVERGENCE: Fetch Recent Questions (User-Scoped)
        // ===================================
        let recentQuestions: string[] = []

        console.log(`[ANTI_CONVERGENCE_TIER] role=${scenarioConfig.role}, isReplay=${isReplaySession}, blocklistActive=${!isReplaySession}`)

        if (isReplaySession) {
            // Replay sessions must reproduce original questions exactly — no blocklist.
            recentQuestions = []
            console.log('[ANTI_CONVERGENCE] Replay session — blocklist cleared')
        } else if (session_id && userId && scenarioConfig.role && scenarioConfig.level) {
            try {
                const ninetyDaysAgo = new Date(
                    Date.now() - 90 * 24 * 60 * 60 * 1000
                ).toISOString()

                const { data: historyRows } = await (supabase as any)
                    .from('user_question_history')
                    .select('question_text')
                    .eq('user_id', userId)
                    .eq('role', scenarioConfig.role)
                    .eq('level', scenarioConfig.level)
                    // NOTE: intentionally NO .neq('session_id') filter.
                    // Including current-session rows gives GPT-4o two dedup layers:
                    //   1. Conversation history (flow control)
                    //   2. Explicit blocklist (semantic dedup, cross AND within session)
                    .gte('created_at', ninetyDaysAgo)
                    .order('created_at', { ascending: false })
                    .limit(50)  // raised from 30 to cover within-session rows too

                if (historyRows && historyRows.length > 0) {
                    recentQuestions = historyRows.map((r: any) => r.question_text)
                    console.log(`[ANTI_CONVERGENCE] Loaded ${recentQuestions.length} past questions for user ${userId} (${scenarioConfig.role} ${scenarioConfig.level})`)
                }

                /* OLD QUERY — removed (global, 10 turns, no user scope):
                const { data: recentTurns } = await supabase
                    .from('interview_turns')
                    .select('content, sessions!inner(scenario_id, scenarios!inner(role, level))')
                    .eq('turn_type', 'question')
                    .neq('turn_index', 0)
                    .order('created_at', { ascending: false })
                    .limit(10)
                */
            } catch (error) {
                console.error('[ANTI_CONVERGENCE] History query failed:', error)
                // Non-critical — continue without blocklist
            }
        }

        // =========================================================
        // DIMENSION TRACKING: Resolve next turn index for dimension state
        // =========================================================
        // is_first_question → nextTurnIndex is always 1 (no DB call needed)
        // Otherwise → query the current max turn_index so we know which dimension we're in
        let nextTurnIndex = 1
        if (session_id && !is_first_question) {
            const { data: currentMaxTurn } = await supabase
                .from('interview_turns')
                .select('turn_index')
                .eq('session_id', session_id)
                .order('turn_index', { ascending: false })
                .limit(1)
                .single()
            nextTurnIndex = currentMaxTurn ? (currentMaxTurn as any).turn_index + 1 : 1
        }

        const dimState = computeDimensionState(
            nextTurnIndex,
            dimensionOrder,
            scenarioConfig.session_duration_minutes ?? 30
        )

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

        console.log(`[DIMENSION_STATE] turn ${nextTurnIndex}:`, {
            currentDimension: dimState.currentDimension,
            turnsUsedInDimension: dimState.turnsUsedInDimension,
            turnsPerDimension: dimState.turnsPerDimension,
            turnsRemainingInDimension: dimState.turnsRemainingInDimension,
            nextDimension: dimState.nextDimension,
            isClamped: dimState.isClamped
        })

        // Generate the system prompt with dimension order, family selections, and recent questions
        const systemPrompt = generateInterviewerPrompt({
            ...scenarioConfig,
            role: scenarioConfig.role!,
            level: scenarioConfig.level!,
            interview_type: scenarioConfig.interview_type!,
            interviewer_persona: scenarioConfig.interviewer_persona!,
            scenario_title: scenarioConfig.scenario_title!,
            base_system_prompt: scenarioConfig.base_system_prompt!,
            evaluation_dimensions: scenarioConfig.evaluation_dimensions!,
            dimension_order: dimensionOrder,     // DIMENSION SEQUENCING
            seeded_questions: [],                // FORCE EMPTY to disable legacy opening
            session_history: sessionHistory,
            selected_families: familySelections, // Inject Entry Guidance
            recent_questions: recentQuestions,   // Anti-convergence blocklist
            entry_probe_intent: entryProbeIntent ?? null, // Probe intent for freshness
            dimensionProgressBlock               // Dimension-aware pacing signal
        })

        // Build messages array for OpenAI
        // pending_system_messages are buffered time-checkpoint injections from the batch voice hook.
        // They are prepended immediately before the user message so GPT sees them in recency order.
        const systemOverrides: OpenAI.Chat.ChatCompletionMessageParam[] =
            Array.isArray(pending_system_messages) && pending_system_messages.length > 0
                ? pending_system_messages.map((msg: string) => ({ role: 'system' as const, content: msg }))
                : []

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt
            },
            ...messages.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            })),
            ...systemOverrides,
        ]

        // Only append user message if present
        if (userMessage && userMessage.trim()) {
            openaiMessages.push({
                role: 'user',
                content: userMessage
            })
        }

        // Define time status function tool
        const tools: OpenAI.Chat.ChatCompletionTool[] = [
            {
                type: "function",
                function: {
                    name: "interview_time_status",
                    description: "Get current interview elapsed and remaining time. MUST call this at the start, after every 2 questions, and before attempting to wrap up.",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            }
        ]

        // HARD GATE: Block OpenAI call if authority not granted
        // CONTRACT: The AI never decides when to speak
        const hasSpeechAuthority = is_first_question === true || turn_authority === true

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

        // ===================================================================
        // TRANSACTIONAL TURN SYSTEM: Content First, Insert Second
        // ===================================================================
        // Goal: Atomic turn creation with no null content
        // Invariant: NO DB mutations occur before assistantMessage validation passes
        // ===================================================================

        const hasTurnAuthority = is_first_question === true || turn_authority === true
        let newTurnId: string | null = null
        let turnStatus: 'pending' | 'completed' | 'failed' = 'pending'

        console.log('[TURN_GENERATION_START]', { session_id })

        let completion: OpenAI.Chat.ChatCompletion
        let assistantMessage: string

        try {
            // STEP 1: Generate AI response FIRST
            completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: openaiMessages,
                temperature: 0.7,
                max_tokens: 500,
                tools: tools,
                tool_choice: "auto"
            })

            let choice = completion.choices[0]

            // Handle tool calls
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0] as any

                if (toolCall.function.name === "interview_time_status") {
                    const elapsed = sessionStartTime ? (Date.now() - sessionStartTime) / (1000 * 60) : 0
                    const remaining = Math.max(0, targetDuration - Math.floor(elapsed))

                    const timeStatus = {
                        elapsed_minutes: Math.floor(elapsed),
                        remaining_minutes: remaining
                    }

                    console.log(`⏱️ [TOOL_EXEC] Time Status: ${timeStatus.elapsed_minutes}m elapsed, ${timeStatus.remaining_minutes}m remaining`)

                    openaiMessages.push(choice.message)
                    openaiMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(timeStatus)
                    })

                    completion = await openai.chat.completions.create({
                        model: 'gpt-4o',
                        messages: openaiMessages,
                        temperature: 0.7,
                        max_tokens: 500,
                        tools: tools,
                        tool_choice: "auto"
                    })

                    choice = completion.choices[0]
                }
            }

            assistantMessage = choice.message.content || ''

            // =========================================================
            // CONTENT VALIDATION GUARDS (Before any DB writes)
            // =========================================================
            if (!assistantMessage || assistantMessage.trim().length === 0) {
                throw new Error("Generated empty question content")
            }

            if (typeof assistantMessage !== 'string') {
                throw new Error('Invalid question content type')
            }

            // =========================================================
            // INVARIANT B: CANDIDATE SPEECH SOURCE GUARD
            // =========================================================
            // The AI must NEVER generate text for the Candidate.
            // If it does, it indicates a serious prompt leak or model collapse.
            if (assistantMessage.includes('Candidate:') || assistantMessage.startsWith('Candidate:')) {
                console.error('❌ [INVARIANT_VIOLATION] System generated candidate speech:', assistantMessage)
                throw new Error("Invariant violation: System generated candidate speech.")
            }

            console.log('[TURN_GENERATION_SUCCESS]', { session_id })

            // =========================================================
            // PERSISTENCE & CLEANUP (Atomic DB Writes)
            // =========================================================
            if (session_id && hasTurnAuthority) {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )

                try {
                    // STEP 2A: Mark PREVIOUS turn as answered if authority is claimed
                    // This is moved here to ensure no mutation runs before generation validation passes
                    if (turn_authority === true) {
                        const { data: latestTurns } = await supabaseClient
                            .from('interview_turns')
                            .select('id, turn_index')
                            .eq('session_id', session_id)
                            .order('turn_index', { ascending: false })
                            .limit(1)

                        if (latestTurns && latestTurns.length > 0) {
                            const latestTurn = latestTurns[0]

                            // ATOMIC PERSISTENCE: Mark turn as answered
                            const { error: updateError } = await supabaseClient
                                .from('interview_turns')
                                .update({ answered: true } as any)
                                .eq('id', latestTurn.id)

                            if (updateError) {
                                console.error('❌ [PERSISTENCE_FAILURE] Failed to mark turn answered:', updateError)
                                throw new Error(`Answer persistence failed: ${updateError.message}`)
                            }

                            console.log(`✅ [TURN_ANSWERED] Marked turn #${latestTurn.turn_index} as answered (id: ${latestTurn.id})`)
                        }
                    }

                    // STEP 2B: Obtain next index and INSERT new turn
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
                        console.error('⚠️ Failed to insert fully-formed interview_turn:', insertError)
                        throw insertError
                    }

                    newTurnId = (insertedTurn as any)?.id
                    console.log(`✅ [TURN_CREATED] Populated turn #${nextIndex} created (id: ${newTurnId})`)
                    turnStatus = 'completed'

                    // NEW: Fire-and-forget insert into user_question_history
                    // REPLAY GUARD: never write history for replay sessions
                    // INVARIANT: This must NEVER be awaited and must NEVER throw into the outer catch.
                    if (!isReplaySession && userId && scenarioConfig.role && scenarioConfig.level) {
                        // Wrap in try-catch so a synchronous client error cannot propagate
                        try {
                            ; (supabaseClient as any)
                                .from('user_question_history')
                                .insert({
                                    user_id: userId,
                                    role: scenarioConfig.role,
                                    level: scenarioConfig.level,
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
                            // Synchronous client-level error (e.g. invalid argument) — log and swallow
                            console.warn('[QUESTION_HISTORY] Insert threw synchronously:', historyInitErr)
                            // NEVER rethrow — this must not affect the turn response
                        }
                    } else if (!isReplaySession) {
                        console.warn(`[QUESTION_HISTORY] Skipped insert — userId: ${userId}, role: ${scenarioConfig.role}, level: ${scenarioConfig.level}`)
                    }

                } catch (dbError) {
                    console.error('Database transaction error:', dbError)
                    // Content generation succeeded, but DB failed. Client can retry.
                    turnStatus = 'failed'
                }
            } else if (session_id && assistantMessage && !hasTurnAuthority) {
                // Log suppression for observability
                console.log(`ℹ️ Suppressed turn creation (no authority): session=${session_id}, is_first=${is_first_question}, authority=${turn_authority}`)
                turnStatus = 'completed'
            } else {
                turnStatus = 'completed'
            }

            // SUCCESS: Return with turn_status
            return NextResponse.json({
                message: assistantMessage.trim(),
                usage: completion.usage,
                tool_call: false,
                turn_status: turnStatus,
                turn_id: newTurnId
            })

        } catch (gptError: any) {
            // =========================================================
            // ERROR CLASSIFICATION: Determine if retryable
            // =========================================================
            console.error('[TURN_GENERATION_FAILED]', {
                session_id,
                error: gptError,
                message: gptError?.message,
                status: gptError?.status
            })

            // Classify error type
            const isRetryable =
                gptError?.status >= 500 || // 5xx server errors
                gptError?.code === 'ECONNRESET' ||
                gptError?.code === 'ETIMEDOUT' ||
                gptError?.message?.includes('timeout')

            if (isRetryable) {
                // RETRYABLE ERROR: Trigger retry flow (no explicit turnId reserved anymore)
                console.log(`🔄 [RETRYABLE_ERROR] Triggering retry flow (no explicit turnId reserved anymore)`)
                return NextResponse.json({
                    error: 'GPT generation failed - retryable',
                    turn_status: 'failed',
                    retryable: true
                }, { status: 500 })
            } else {
                // TERMINAL ERROR: End session cleanly
                console.error(`❌ [TERMINAL_ERROR] Non-retryable error, ending session`)
                return NextResponse.json({
                    error: 'Interview generation failed',
                    turn_status: 'failed',
                    terminal: true
                }, { status: 500 })
            }
        }

    } catch (error) {
        // Outer catch for non-GPT errors (validation, DB, etc.)
        console.error('Interview API error:', error)
        return NextResponse.json(
            { error: 'Failed to process interview turn' },
            { status: 500 }
        )
    }
}
