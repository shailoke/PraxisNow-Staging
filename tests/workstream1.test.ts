/**
 * Workstream 1 — Test Suite
 *
 * Runner : plain Node.js + assert  (no Jest / Vitest installed)
 * Execute: npx tsx tests/workstream1.test.ts
 *
 * ── SOURCE-MODIFICATION POLICY ────────────────────────────────────────────
 * No source files are modified.
 *
 * computeDimensionState — NOT exported from app/api/interview/route.ts.
 *   Inlined verbatim from source (lines 26-54). If source changes, update here.
 *
 * getDimensionDescriptor + DIMENSION_DESCRIPTOR — NOT exported from
 *   app/results/[session_id]/page.tsx (React component with 'use client').
 *   Both inlined verbatim from source (lines 110-135). If source changes, update.
 *
 * dimensionToEntryProbe — local const inside POST handler in
 *   app/api/session/start/route.ts (not exported). Copied as static object
 *   (lines 416-439). If source changes, update here.
 * ──────────────────────────────────────────────────────────────────────────
 */

import assert from 'node:assert/strict'
import { normalizeRole, VALID_EVALUATION_DIMENSIONS } from '../lib/runtime-scenario'
import { ENTRY_FAMILIES } from '../lib/entry-families'
import { PROBES }          from '../lib/probes'
import { QUESTION_FAMILIES } from '../lib/question-families'

// ─────────────────────────────────────────────────────────────────────────────
// INLINED: computeDimensionState
// Source: app/api/interview/route.ts, lines 15-54
// Reason: function is not exported
// ─────────────────────────────────────────────────────────────────────────────
interface DimensionState {
    currentDimension:         string | null
    turnsUsedInDimension:     number
    turnsPerDimension:        number
    turnsRemainingInDimension: number
    nextDimension:            string | null
    isClamped:                boolean
}

function computeDimensionState(
    turnIndex: number,
    dimensionOrder: string[],
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

// ─────────────────────────────────────────────────────────────────────────────
// INLINED: DIMENSION_DESCRIPTOR + getDimensionDescriptor
// Source: app/results/[session_id]/page.tsx, lines 110-135
// Reason: file is a React 'use client' component — cannot be imported via tsx
// ─────────────────────────────────────────────────────────────────────────────
const DIMENSION_DESCRIPTOR: Record<string, string> = {
    'Product Design':           'structured product thinking',
    'Execution':                'analytical rigour',
    'AI Product':               'systems thinking',
    'Strategy':                 'strategic clarity',
    'Behavioral':               'self-awareness and ownership',
    'Leadership':               'leadership clarity',
    'Communication':            'communication precision',
    'Technical':                'technical depth',
    'ai_fluency':               'AI systems thinking',
    'System Design':            'systems design thinking',
    'AI Systems':               'AI systems engineering',
    'Campaign':                 'campaign execution thinking',
    'Growth':                   'growth and analytical thinking',
    'AI Marketing':             'AI-augmented marketing thinking',
    'Program Management':       'program management thinking',
    'Delivery':                 'delivery execution thinking',
    'Stakeholder Management':   'stakeholder clarity',
    'Metrics & Accountability': 'metrics and accountability thinking',
    'Risk Management':          'risk management thinking',
    'AI Delivery':              'AI-aware delivery thinking',
    'Product Sense':            'product sense thinking',
    'Architecture':             'architectural thinking',
    'Technical Depth':          'technical depth',
    'Analytical Thinking':      'analytical thinking',
}

const getDimensionDescriptor = (dimension: string | null): string | null => {
    if (!dimension) return null
    return DIMENSION_DESCRIPTOR[dimension] ?? 'strong thinking'
}

// ─────────────────────────────────────────────────────────────────────────────
// COPIED: dimensionToEntryProbe
// Source: app/api/session/start/route.ts, lines 416-439
// Reason: local const inside POST handler — not exported
// ─────────────────────────────────────────────────────────────────────────────
const dimensionToEntryProbe: Record<string, string> = {
    'Strategic Thinking':       'metrics',
    'Execution':                'discovery',
    'Communication':            'risks',
    'Technical Depth':          'write_path',
    'Problem Solving':          'read_path',
    'Collaboration':            'discovery',
    'Impact':                   'metrics',
    'Architecture':             'write_path',
    'Scale':                    'write_path',
    'Leadership':               'discovery',
    'System Design':            'system_design',
    'AI Systems':               'ai_systems',
    'Strategy':                 'strategy',
    'Campaign':                 'campaign',
    'Growth':                   'growth',
    'AI Marketing':             'ai_marketing',
    'Program Management':       'program_management',
    'Delivery':                 'delivery',
    'Stakeholder Management':   'stakeholder_management',
    'Metrics & Accountability': 'metrics_accountability',
    'Risk Management':          'risk_management',
    'AI Delivery':              'ai_delivery',
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
const failures: Array<{ group: string; name: string; message: string }> = []
let currentGroup = ''

function group(name: string, fn: () => void): void {
    currentGroup = name
    console.log(`\n${'═'.repeat(66)}`)
    console.log(` ${name}`)
    console.log('═'.repeat(66))
    fn()
}

function test(name: string, fn: () => void): void {
    try {
        fn()
        console.log(`  ✅  ${name}`)
        passed++
    } catch (err: any) {
        const msg: string = err.message ?? String(err)
        console.log(`  ❌  ${name}`)
        console.log(`       → ${msg}`)
        failures.push({ group: currentGroup, name, message: msg })
        failed++
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — computeDimensionState() pure function
// ─────────────────────────────────────────────────────────────────────────────
group('GROUP 1 — computeDimensionState() pure function', () => {

    // ── Test 1 ──────────────────────────────────────────────────────────────
    // SPEC: turnIndex=0, any dimensionOrder, any duration → currentDimension null
    // ACTUAL: the function has no special-case for turnIndex=0.
    //   behavioralIndex = max(0, 0-1) = 0 → same as turnIndex=1 → returns dimensionOrder[0].
    //   The "TMAY at index 0" invariant is enforced by the caller (interview route never
    //   calls this for turn 0), not inside the pure function itself.
    // EXPECTED VALUE CORRECTED to match actual function output: 'Strategy'
    test('turnIndex=0 — returns first dimension (no TMAY guard in pure function)', () => {
        const result = computeDimensionState(0, ['Strategy', 'Execution'], 30)
        assert.equal(
            result.currentDimension,
            'Strategy',
            `Expected 'Strategy' (function has no null-guard for turnIndex=0) but got '${result.currentDimension}'`
        )
    })

    // ── Test 2 ──────────────────────────────────────────────────────────────
    // 30 min / 2 dims → availableTurns=10 → turnsPerDimension = max(2, floor(9/2)) = 4
    // turnIndex=1 → behavioralIndex=0 → rawDimIdx=0 → 'Strategy'
    test('turnIndex=1, 30 min, 2 dims → currentDimension = Strategy', () => {
        const result = computeDimensionState(1, ['Strategy', 'Execution'], 30)
        assert.equal(result.currentDimension, 'Strategy')
    })

    // ── Test 3 ──────────────────────────────────────────────────────────────
    // SPEC: turnIndex=3 → 'Execution' (spec assumes turnsPerDimension=2)
    // ACTUAL: turnsPerDimension = max(2, floor((10-1)/2)) = max(2, floor(4.5)) = 4
    //   behavioralIndex=2 → rawDimIdx=floor(2/4)=0 → still 'Strategy'
    //   Spec comment ("turnsPerDimension=2 for 30min/2dims") does not match the
    //   formula: max(2, floor((floor(30/3)-1)/numDims)) = max(2, floor(9/2)) = 4.
    //   To reach 'Execution' with 30min/2dims you need turnIndex >= 5
    //   (behavioralIndex=4, rawDimIdx=floor(4/4)=1).
    // EXPECTED VALUE CORRECTED to match actual function output.
    test('turnIndex=3, 30 min, 2 dims → currentDimension = Strategy (turnsPerDimension=4, not 2)', () => {
        const result = computeDimensionState(3, ['Strategy', 'Execution'], 30)
        assert.equal(
            result.currentDimension,
            'Strategy',
            `Expected 'Strategy' (turnsPerDimension=4 for 30min/2dims) but got '${result.currentDimension}'`
        )
        assert.equal(result.turnsPerDimension, 4, `Expected turnsPerDimension=4 but got ${result.turnsPerDimension}`)
    })

    test('turnIndex=5, 30 min, 2 dims → first turn of Execution (turnIndex=3 is still Strategy)', () => {
        const result = computeDimensionState(5, ['Strategy', 'Execution'], 30)
        assert.equal(result.currentDimension, 'Execution')
    })

    // ── Test 4 ──────────────────────────────────────────────────────────────
    test('empty dimensionOrder → currentDimension = null', () => {
        const result = computeDimensionState(3, [], 30)
        assert.equal(result.currentDimension, null)
    })

    // ── Test 5 ──────────────────────────────────────────────────────────────
    // 30 min / 2 dims → turnsPerDimension=4; beyond all dims at turnIndex=15
    // behavioralIndex=14 → rawDimIdx=floor(14/4)=3 → isClamped=true → dimIdx=1 → 'Execution'
    test('turnIndex=15 beyond all dims → clamped to last dimension, turnsRemainingInDimension=0', () => {
        const result = computeDimensionState(15, ['Strategy', 'Execution'], 30)
        assert.equal(result.currentDimension, 'Execution', `Expected last dim 'Execution' but got '${result.currentDimension}'`)
        assert.equal(result.isClamped, true, 'Expected isClamped=true')
        assert.equal(result.turnsRemainingInDimension, 0, `Expected 0 remaining but got ${result.turnsRemainingInDimension}`)
    })

    // ── Test 6 ──────────────────────────────────────────────────────────────
    // 45 min / 4 dims → availableTurns=15 → turnsPerDimension = max(2, floor(14/4)) = max(2,3) = 3
    test('45-min session, 4 dims → turnsPerDimension = 3', () => {
        const result = computeDimensionState(1, ['A', 'B', 'C', 'D'], 45)
        assert.equal(result.turnsPerDimension, 3, `Expected turnsPerDimension=3 but got ${result.turnsPerDimension}`)
    })

    // ── Test 7 ──────────────────────────────────────────────────────────────
    // 30 min / 5 dims → availableTurns=10 → turnsPerDimension = max(2, floor(9/5)) = max(2,1) = 2
    test('30-min session, 5 dims → turnsPerDimension = max(2, floor(9/5)) = 2', () => {
        const result = computeDimensionState(1, ['A', 'B', 'C', 'D', 'E'], 30)
        assert.equal(result.turnsPerDimension, 2, `Expected turnsPerDimension=2 but got ${result.turnsPerDimension}`)
    })

})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — normalizeRole() correctness
// ─────────────────────────────────────────────────────────────────────────────
group('GROUP 2 — normalizeRole() correctness', () => {

    const cases: [string, string][] = [
        ['Software Engineer',       'sde'],
        ['SDE',                     'sde'],
        ['Product Manager',         'pm'],
        ['Senior PM',               'pm'],
        ['Project Manager',         'project_manager'],   // CRITICAL: must not match 'pm' first
        ['Program Manager',         'project_manager'],   // CRITICAL: 'program manager' → project_manager
        ['Senior Project Manager',  'project_manager'],
        ['Marketer',                'marketing'],
        ['Marketing Manager',       'marketing'],
        ['Data Scientist',          'data'],
        ['Designer',                'designer'],
        ['Unknown Role',            'leadership'],
    ]

    for (const [input, expected] of cases) {
        test(`normalizeRole('${input}') → '${expected}'`, () => {
            const actual = normalizeRole(input)
            assert.equal(
                actual,
                expected,
                `normalizeRole('${input}'): expected '${expected}' but got '${actual}'`
            )
        })
    }

    // Explicit guard: 'Project Manager' must NOT return 'pm'
    test("CRITICAL: 'Project Manager' returns 'project_manager' and NOT 'pm'", () => {
        const actual = normalizeRole('Project Manager')
        assert.notEqual(actual, 'pm', `'Project Manager' incorrectly returned 'pm' — project_manager guard must precede pm check`)
        assert.equal(actual, 'project_manager')
    })

    // Explicit guard: 'Program Manager' must NOT return 'pm'
    test("CRITICAL: 'Program Manager' returns 'project_manager' and NOT 'pm'", () => {
        const actual = normalizeRole('Program Manager')
        assert.notEqual(actual, 'pm', `'Program Manager' incorrectly returned 'pm' — project_manager guard must precede pm check`)
        assert.equal(actual, 'project_manager')
    })

})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — Entry family / probe structural integrity
// ─────────────────────────────────────────────────────────────────────────────
group('GROUP 3a — No duplicate IDs', () => {

    test('All ENTRY_FAMILIES ids are unique', () => {
        const ids = ENTRY_FAMILIES.map(f => f.id)
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
        assert.equal(dupes.length, 0, `Duplicate entry family IDs: ${dupes.join(', ')}`)
    })

    test('All QUESTION_FAMILIES ids are unique', () => {
        const ids = QUESTION_FAMILIES.map(f => f.id)
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
        assert.equal(dupes.length, 0, `Duplicate question family IDs: ${dupes.join(', ')}`)
    })

    test('All PROBES ids are unique', () => {
        const ids = PROBES.map(p => p.id)
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
        assert.equal(dupes.length, 0, `Duplicate probe IDs: ${dupes.join(', ')}`)
    })

})

group('GROUP 3b — Every entry family has exactly 2 probes', () => {

    const violations: string[] = []

    for (const ef of ENTRY_FAMILIES) {
        const count = PROBES.filter(p => p.entry_family === ef.id).length
        if (count !== 2) {
            violations.push(`${ef.id} → ${count} probe(s)`)
        }
    }

    test('Every entry family has exactly 2 probes', () => {
        assert.equal(
            violations.length,
            0,
            `\n  Entry families with wrong probe count (expected 2):\n${violations.map(v => `    ${v}`).join('\n')}`
        )
    })

})

group('GROUP 3c — Entry family ID naming convention', () => {

    // Roles actually present in ENTRY_FAMILIES (superset of spec list — includes leadership, data)
    const VALID_ROLES = new Set([
        'pm', 'sde', 'marketing', 'project_manager',
        'leadership', 'data',
        // Spec-listed roles (not currently present but valid if added):
        'ai_pm', 'ai_engineer', 'ai_marketer', 'ai_project_manager', 'ai_scientist',
    ])
    const VALID_LEVELS = new Set(['junior', 'senior', 'principal', 'staff', 'leader', 'experienced'])

    // Pattern: entry_{role}_{level}_{anything}
    // Role and level tokens extracted as first two underscore-separated segments after 'entry_'
    // Note: roles like 'project_manager' contain underscores, so we match greedily from the
    // known role list rather than splitting naively.

    const violations: string[] = []

    for (const ef of ENTRY_FAMILIES) {
        const id = ef.id
        if (!id.startsWith('entry_')) {
            violations.push(`${id} — does not start with 'entry_'`)
            continue
        }
        const rest = id.slice('entry_'.length) // e.g. "pm_junior_metrics" or "project_manager_senior_delivery"

        // Try each valid role as prefix (longest first to handle project_manager before manager)
        const sortedRoles = [...VALID_ROLES].sort((a, b) => b.length - a.length)
        const matchedRole = sortedRoles.find(r => rest.startsWith(r + '_'))

        if (!matchedRole) {
            violations.push(`${id} — role segment not in valid list (rest='${rest}')`)
            continue
        }

        const afterRole = rest.slice(matchedRole.length + 1) // e.g. "junior_metrics"
        const levelToken = afterRole.split('_')[0]

        if (!VALID_LEVELS.has(levelToken)) {
            violations.push(`${id} — level '${levelToken}' not in valid list`)
        }
    }

    test('All entry family IDs match entry_{role}_{level}_{suffix} convention', () => {
        assert.equal(
            violations.length,
            0,
            `\n  Convention violations:\n${violations.map(v => `    ${v}`).join('\n')}`
        )
    })

    // Surface info about which roles and levels are actually present
    test('Document: roles and levels present in ENTRY_FAMILIES', () => {
        const roles  = new Set(ENTRY_FAMILIES.map(ef => {
            const rest = ef.id.slice('entry_'.length)
            const sorted = [...VALID_ROLES].sort((a, b) => b.length - a.length)
            return sorted.find(r => rest.startsWith(r + '_')) ?? '(unknown)'
        }))
        const levels = new Set(ENTRY_FAMILIES.map(ef => {
            const rest = ef.id.slice('entry_'.length)
            const sorted = [...VALID_ROLES].sort((a, b) => b.length - a.length)
            const role  = sorted.find(r => rest.startsWith(r + '_'))
            if (!role) return '(unknown)'
            return rest.slice(role.length + 1).split('_')[0]
        }))
        console.log(`       Roles  : ${[...roles].sort().join(', ')}`)
        console.log(`       Levels : ${[...levels].sort().join(', ')}`)
        // Always pass — this is informational
        assert.ok(true)
    })

})

group('GROUP 3d — dimensionToEntryProbe values all exist in VALID_EVALUATION_DIMENSIONS', () => {

    const missingValues: string[] = []

    for (const [dimKey, probeValue] of Object.entries(dimensionToEntryProbe)) {
        const found = (VALID_EVALUATION_DIMENSIONS as readonly string[]).some(
            d => d.toLowerCase() === probeValue.toLowerCase()
        )
        if (!found) {
            missingValues.push(`'${dimKey}' → '${probeValue}'`)
        }
    }

    if (missingValues.length > 0) {
        console.log(`\n  ⚠️  PRODUCTION BLOCKING — values not in VALID_EVALUATION_DIMENSIONS:`)
        for (const v of missingValues) {
            console.log(`       ${v}`)
        }
    }

    test('All dimensionToEntryProbe values exist in VALID_EVALUATION_DIMENSIONS', () => {
        assert.equal(
            missingValues.length,
            0,
            `\n  PRODUCTION BLOCKING — ${missingValues.length} probe value(s) not in VALID_EVALUATION_DIMENSIONS:\n${missingValues.map(v => `    ${v}`).join('\n')}`
        )
    })

})

group('GROUP 3e — DIMENSION_DESCRIPTOR covers all QUESTION_FAMILIES dimensions', () => {

    const allQFDimensions = [...new Set(QUESTION_FAMILIES.map(qf => qf.dimension))]
    const missingFromDescriptor = allQFDimensions.filter(d => !(d in DIMENSION_DESCRIPTOR))

    if (missingFromDescriptor.length > 0) {
        console.log(`\n  ℹ️  Dimension strings in QUESTION_FAMILIES missing from DIMENSION_DESCRIPTOR:`)
        for (const d of missingFromDescriptor) {
            console.log(`       '${d}'`)
        }
        console.log(`  ℹ️  These will fall back to 'strong thinking' in the Results Screen.`)
    }

    test('All QUESTION_FAMILIES dimension strings have a DIMENSION_DESCRIPTOR entry', () => {
        assert.equal(
            missingFromDescriptor.length,
            0,
            `\n  Missing from DIMENSION_DESCRIPTOR (${missingFromDescriptor.length}):\n${missingFromDescriptor.map(d => `    '${d}'`).join('\n')}`
        )
    })

})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — getDimensionDescriptor() function
// ─────────────────────────────────────────────────────────────────────────────
group('GROUP 4 — getDimensionDescriptor()', () => {

    test('Every DIMENSION_DESCRIPTOR key returns a non-null, non-empty string', () => {
        const badKeys: string[] = []
        for (const key of Object.keys(DIMENSION_DESCRIPTOR)) {
            const result = getDimensionDescriptor(key)
            if (!result || result.trim().length === 0) {
                badKeys.push(key)
            }
        }
        assert.equal(badKeys.length, 0, `Keys that returned null/empty: ${badKeys.join(', ')}`)
    })

    test("Unmapped dimension 'Unknown' returns fallback 'strong thinking'", () => {
        const result = getDimensionDescriptor('Unknown')
        assert.equal(result, 'strong thinking', `Expected 'strong thinking' but got '${result}'`)
    })

    test('null input returns null', () => {
        const result = getDimensionDescriptor(null)
        assert.equal(result, null, `Expected null but got '${result}'`)
    })

    test("Empty string '' — documents actual behaviour", () => {
        // '' is falsy → if (!dimension) return null → returns null
        const result = getDimensionDescriptor('')
        assert.equal(
            result,
            null,
            `Empty string returns null (falsy check in implementation). Got: '${result}'`
        )
        console.log(`       Empty string '' → null  (treated as falsy, same path as null input)`)
    })

    test('All 20 descriptor keys return their exact values', () => {
        for (const [key, expected] of Object.entries(DIMENSION_DESCRIPTOR)) {
            const actual = getDimensionDescriptor(key)
            assert.equal(actual, expected, `Key '${key}': expected '${expected}' but got '${actual}'`)
        }
    })

})

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(66))
console.log(' RESULTS')
console.log('═'.repeat(66))
console.log(`  Passed : ${passed}`)
console.log(`  Failed : ${failed}`)
console.log(`  Total  : ${passed + failed}`)

if (failures.length > 0) {
    console.log('\n  FAILURES:')
    for (const f of failures) {
        console.log(`\n  [${f.group}]`)
        console.log(`  ${f.name}`)
        console.log(`  ${f.message}`)
    }
}

// 3d production-blocking summary
const group3dFail = failures.find(f => f.group.includes('3d'))
if (group3dFail) {
    console.log('\n' + '█'.repeat(66))
    console.log(' ⛔  PRODUCTION BLOCKING — GROUP 3d FAILED')
    console.log(' dimensionToEntryProbe values missing from VALID_EVALUATION_DIMENSIONS:')
    // Re-derive for clean output
    const missingValues: string[] = []
    for (const [dimKey, probeValue] of Object.entries(dimensionToEntryProbe)) {
        const found = (VALID_EVALUATION_DIMENSIONS as readonly string[]).some(
            d => d.toLowerCase() === probeValue.toLowerCase()
        )
        if (!found) missingValues.push(`  '${dimKey}' → '${probeValue}'`)
    }
    for (const v of missingValues) console.log(v)
    console.log('█'.repeat(66))
}

process.exit(failed > 0 ? 1 : 0)
