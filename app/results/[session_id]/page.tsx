'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2, DownloadIcon } from 'lucide-react'

// ── Strictly typed local interfaces ──────────────────────────────────────────
// evaluation_data is typed as Json in database.types.ts; cast here for safety.

interface TurnDiagnostic {
  turn_index: number
  signal_strength: 'strong' | 'mixed' | 'weak'
  interviewer_consequence?: string
  impact_on_interviewer?: string
}

interface DimensionScore {
  dimension: string
  score: number
  band: string
  weight: number
  weighted_score: number
  evidence: string
  gap: string | null
}

interface AnswerUpgrade {
  issue: string
  what_to_change_next_time: string
  rewritten_answer?: string
}

interface Gap {
  fix_in_one_sentence?: string
  description?: string
}

interface ImprovementArea {
  description: string
  why_it_matters?: string
  gap_type?: string
}

interface EvaluationData {
  hiring_signal: 'STRONG_HIRE' | 'HIRE' | 'BORDERLINE' | 'NO_HIRE'
  hireable_level: string
  distance_to_strong_hire?: { primary_blocker?: string }
  high_level_assessment?: { barriers_to_next_level?: string }
  // Diagnostics may be stored under either key depending on evaluation version
  transcript_extracts?: TurnDiagnostic[]
  turn_diagnostics?: TurnDiagnostic[]
  answer_upgrades?: AnswerUpgrade[]
  gaps?: Gap[]
  areas_for_improvement?: ImprovementArea[]
  primary_failure_mode?: { label?: string }
  // MAANG dimension scoring — present on sessions evaluated after Phase C
  dimension_scores?: DimensionScore[]
  weighted_composite?: number
  hire_band?: string
}

interface MomentumCard {
  strongest_signal: string
  one_fix: string
  progress_note: string | null
}

interface InterviewTurn {
  id: string
  session_id: string
  turn_index: number
  turn_type: string
  content: string
  answered: boolean | null
  dimension: string | null
}

// ── Signal utilities ──────────────────────────────────────────────────────────

const SIGNAL_SENTENCE: Record<string, string> = {
  STRONG_HIRE: "You're performing at a hire-ready bar.",
  HIRE:        "You're performing at a hire-ready bar.",
  BORDERLINE:  "You're close. One gap is holding you back.",
  NO_HIRE:     "This one was tough. Clear feedback below.",
}

// Inline styles used for the top border because Tailwind cannot construct
// dynamic color classes at runtime from enum values safely.
const SIGNAL_BORDER_COLOR: Record<string, string> = {
  STRONG_HIRE: '#22c55e',              // green-500
  HIRE:        '#a855f7',              // purple-500
  BORDERLINE:  '#eab308',              // yellow-500
  NO_HIRE:     'rgba(239,68,68,0.4)',  // red-500/40
}

const LEVEL_PROGRESSION: Record<string, string> = {
  'Junior':    'Mid-level',
  'Mid-level': 'Senior',
  'Senior':    'Principal',
  'Principal': 'Staff',
  'Staff':     'Director',
}

// Derives "What Senior PM performance looks like here:" from "Mid-level PM"
function deriveNextLevelLabel(hireableLevel: string | undefined, role: string | undefined): string {
  if (!hireableLevel) return 'To strengthen your bar:'
  try {
    const tokens = hireableLevel.split(' ')
    for (const token of tokens) {
      if (LEVEL_PROGRESSION[token]) {
        const nextLevel = LEVEL_PROGRESSION[token]
        const rolePart = role && role.trim().length > 0 ? role : tokens.slice(1).join(' ')
        return `What ${nextLevel} ${rolePart} performance looks like here:`
      }
    }
  } catch {
    console.warn('[ResultsPage] Could not parse hireable_level for next-level label:', hireableLevel)
  }
  return 'To strengthen your bar:'
}

const DIMENSION_DESCRIPTOR: Record<string, string> = {
  'Product Design':  'structured product thinking',
  'Execution':       'analytical rigour',
  'AI Product':      'systems thinking',
  'Strategy':        'strategic clarity',
  'Behavioral':      'self-awareness and ownership',
  'Leadership':      'leadership clarity',
  'Communication':   'communication precision',
  'Technical':       'technical depth',
  'ai_fluency':      'AI systems thinking',
  'System Design':   'systems design thinking',
  'AI Systems':      'AI systems engineering',
  'Campaign':               'campaign execution thinking',
  'Growth':                 'growth and analytical thinking',
  'AI Marketing':           'AI-augmented marketing thinking',
  'Program Management':     'program management thinking',
  'Delivery':               'delivery execution thinking',
  'Stakeholder Management': 'stakeholder clarity',
  'Metrics & Accountability': 'metrics and accountability thinking',
  'Risk Management':        'risk management thinking',
  'AI Delivery':            'AI-aware delivery thinking',
  'Product Sense':          'product sense thinking',
  'Architecture':           'architectural thinking',
  'Technical Depth':        'technical depth',
  'Analytical Thinking':    'analytical thinking',
  'AI Execution':           'AI product execution thinking',
  'AI Technical':           'AI technical depth',
  'LLM Deep Dive':          'LLM architecture thinking',
}
const getDimensionDescriptor = (dimension: string | null): string | null => {
  if (!dimension) return null
  return DIMENSION_DESCRIPTOR[dimension] ?? 'strong thinking'
}

// ── Scorecard colour helpers ──────────────────────────────────────────────────

function bandColour(band: string): { bg: string; text: string; border: string } {
  switch (band) {
    case 'Strong Hire':    return { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-400' }
    case 'Lean Hire':      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' }
    case 'Lean No Hire':   return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' }
    case 'Strong No Hire': return { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400' }
    default:               return { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' }
  }
}

function scoreColour(score: number): string {
  if (score >= 4) return 'bg-green-500'
  if (score >= 3) return 'bg-yellow-400'
  if (score >= 2) return 'bg-orange-400'
  return 'bg-red-500'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.session_id as string

  const [session,      setSession]      = useState<Record<string, unknown> | null>(null)
  const [evaluation,   setEvaluation]   = useState<EvaluationData | null>(null)
  const [momentumCard, setMomentumCard] = useState<MomentumCard | null>(null)
  const [turns,        setTurns]        = useState<InterviewTurn[]>([])
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [pdfLoading,   setPdfLoading]   = useState(false)

  // Memoised session fetcher — called on mount and by the polling interval.
  const fetchSessionRow = useCallback(
    async (supabase: ReturnType<typeof createClient>, userId: string) => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, status, evaluation_data, momentum_card, pdf_url, scenario_id, custom_scenario_id, created_at, evaluation_depth, session_type')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error || !data) return null
      return data as Record<string, unknown>
    },
    [sessionId],
  )

  useEffect(() => {
    const supabase = createClient()
    let intervalId: ReturnType<typeof setInterval> | null = null

    const init = async () => {
      // ── Auth guard (mirrors dashboard pattern) ──────────────────────────
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { router.replace('/dashboard'); return }
      const userId = authSession.user.id

      // ── Parallel initial fetch ──────────────────────────────────────────
      const [sessionRow, { data: turnsData }] = await Promise.all([
        fetchSessionRow(supabase, userId),
        supabase
          .from('interview_turns')
          .select('id, session_id, turn_index, turn_type, content, answered, dimension')
          .eq('session_id', sessionId)
          .order('turn_index', { ascending: true }),
      ])

      if (!sessionRow) { setNotFound(true); setLoading(false); return }

      setSession(sessionRow)
      setTurns((turnsData as InterviewTurn[]) ?? [])
      setEvaluation((sessionRow.evaluation_data as EvaluationData) ?? null)
      setMomentumCard((sessionRow.momentum_card as MomentumCard) ?? null)
      setLoading(false)

      // ── Poll until evaluation completes ────────────────────────────────
      if (sessionRow.status !== 'completed') {
        intervalId = setInterval(async () => {
          const updated = await fetchSessionRow(supabase, userId)
          if (updated) {
            setSession(updated)
            if (updated.evaluation_data) setEvaluation(updated.evaluation_data as EvaluationData)
            if (updated.momentum_card)   setMomentumCard(updated.momentum_card as MomentumCard)
            if (updated.status === 'completed') {
              clearInterval(intervalId!)
              intervalId = null
            }
          }
        }, 3000)
      }
    }

    init()

    // Cleanup: clear interval on unmount so stale setState calls never fire
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [sessionId, fetchSessionRow, router])

  // ── PDF download (mirrors dashboard handleGeneratePDF) ───────────────────
  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const res  = await fetch('/api/pdf/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (data.pdf_url) {
        const link     = document.createElement('a')
        link.href      = data.pdf_url
        link.target    = '_blank'
        link.download  = `PraxisNow-Report-${sessionId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        throw new Error(data.error ?? 'Unknown error')
      }
    } catch (err) {
      console.error('[ResultsPage] PDF generation failed', err)
      alert(`PDF Generation Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  // Section 2 — best diagnostic turn
  // transcript_extracts is the canonical key; turn_diagnostics is the legacy fallback.
  const diagnostics   = evaluation?.transcript_extracts ?? evaluation?.turn_diagnostics ?? []
  const bestDiagnostic = (
    diagnostics.find(d => d.signal_strength === 'strong') ??
    diagnostics.find(d => d.signal_strength === 'mixed') ??
    null
  )
  // Match the diagnostic's turn_index to a question-type turn
  const bestTurn = bestDiagnostic
    ? turns.find(t => t.turn_index === bestDiagnostic.turn_index && t.turn_type === 'question') ?? null
    : null
  const bestDimension = bestTurn?.dimension ?? null
  const bestDimensionDescriptor = getDimensionDescriptor(bestDimension)

  // Section 3 — blocker dimension (weakest turn's dimension)
  const weakestDiagnostic = (
    diagnostics.find((d: any) => d.signal_strength === 'weak') ??
    diagnostics.find((d: any) => d.signal_strength === 'mixed') ??
    null
  )
  const blockerTurn = weakestDiagnostic
    ? turns.find((t: any) => t.turn_index === weakestDiagnostic.turn_index) ?? null
    : null
  const blockerDimension = blockerTurn?.dimension ?? null

  const bestConsequence = bestDiagnostic?.interviewer_consequence ?? bestDiagnostic?.impact_on_interviewer ?? null
  // Only show Section 2 if there is something meaningful to display
  const showStrongestMoment = !!bestDiagnostic && (!!bestTurn || !!bestConsequence)

  // Section 3 — primary blocker
  const primaryBlocker = (
    evaluation?.distance_to_strong_hire?.primary_blocker ??
    evaluation?.high_level_assessment?.barriers_to_next_level ??
    null
  )

  // Section 4 — weakest dimension for next-session nudge
  const weakestDimension = (
    evaluation?.gaps?.[0]?.fix_in_one_sentence ??
    evaluation?.areas_for_improvement?.[0]?.description ??
    evaluation?.primary_failure_mode?.label ??
    'your highest-impact area'
  )

  const hireableLevel = evaluation?.hireable_level ?? ''
  const roleFromLevel = hireableLevel.split(' ').slice(1).join(' ')
  const nextLevelLabel = deriveNextLevelLabel(hireableLevel, roleFromLevel)

  const signal      = evaluation?.hiring_signal ?? 'BORDERLINE'
  const borderColor = SIGNAL_BORDER_COLOR[signal] ?? SIGNAL_BORDER_COLOR.BORDERLINE
  const hasFullEval = !!evaluation?.hiring_signal

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Session not found or access denied.</p>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (session?.status !== 'completed') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-300 animate-pulse">Your evaluation is being prepared...</p>
          <p className="text-gray-500 text-sm">This page will update automatically.</p>
        </div>
      </div>
    )
  }

  // Graceful insufficient-evaluation state — do NOT redirect (user may have bookmarked URL)
  if (!hasFullEval) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="bg-black/30 border border-white/10 rounded-2xl p-8 max-w-md text-center space-y-4">
          <p className="text-gray-300 leading-relaxed">
            This session didn&apos;t generate a full evaluation. Start a new session to see your results.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Main results page ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── SECTION 1: The Verdict ───────────────────────────────────────── */}
        <div
          className="bg-black/30 border border-white/10 rounded-2xl p-8"
          style={{ borderTop: `4px solid ${borderColor}` }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Session Complete</p>
          <p className="text-2xl font-bold text-white">{SIGNAL_SENTENCE[signal]}</p>
          <p className="text-lg text-gray-300 mt-1">Demonstrated level: {hireableLevel}</p>
          {momentumCard?.progress_note && (
            <p className="text-sm text-purple-300 mt-2">↑ {momentumCard.progress_note}</p>
          )}
        </div>

        {/* ── SECTION 1b: Performance Scorecard ───────────────────────────── */}
        {evaluation?.dimension_scores && evaluation.dimension_scores.length > 0 && (() => {
          const composite  = evaluation.weighted_composite
          const hireBand   = evaluation.hire_band ?? ''
          const bandCls    = bandColour(hireBand)
          return (
            <div className="bg-black/30 border border-white/10 rounded-2xl p-6 space-y-5">

              {/* Header row */}
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-widest text-gray-400">Performance Scorecard</p>
                <div className="flex items-center gap-3">
                  {composite !== undefined && (
                    <span className="text-lg font-bold text-white tabular-nums">
                      {composite.toFixed(1)}<span className="text-gray-500 font-normal text-sm"> / 4.0</span>
                    </span>
                  )}
                  {hireBand && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${bandCls.bg} ${bandCls.text} ${bandCls.border}`}>
                      {hireBand}
                    </span>
                  )}
                </div>
              </div>

              {/* Dimension rows */}
              <div className="space-y-4">
                {evaluation.dimension_scores.map((ds) => {
                  const fillCls = scoreColour(ds.score)
                  const pct     = Math.round((ds.score / 4) * 100)
                  const bCls    = bandColour(ds.band)
                  return (
                    <div key={ds.dimension} className="space-y-1.5">

                      {/* Name + bar + score + badge */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-200 w-48 shrink-0 leading-snug">{ds.dimension}</span>

                        {/* Bar */}
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${fillCls} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Numeric */}
                        <span className="text-sm font-mono text-gray-300 tabular-nums shrink-0">
                          {ds.score} / 4
                        </span>

                        {/* Band pill */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${bCls.bg} ${bCls.text} ${bCls.border}`}>
                          {ds.band}
                        </span>
                      </div>

                      {/* Gap note */}
                      {ds.gap && (
                        <p className="text-xs text-gray-400 pl-1 leading-relaxed">
                          ↳ {ds.gap}
                        </p>
                      )}

                      {/* Evidence */}
                      {ds.evidence && (
                        <p className="text-xs text-gray-500 italic pl-1 leading-relaxed">
                          &ldquo;{ds.evidence}&rdquo;
                        </p>
                      )}

                    </div>
                  )
                })}
              </div>

            </div>
          )
        })()}

        {/* ── SECTION 2: Your Strongest Moment ────────────────────────────── */}
        {showStrongestMoment && (
          <div className="bg-black/30 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-xs uppercase tracking-widest text-gray-400">Your Strongest Moment</p>
            {bestDimension && bestDimensionDescriptor && (
              <p className="text-sm text-purple-400 font-medium mb-3">
                You showed {bestDimensionDescriptor} in the {bestDimension} round
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestTurn && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">The Question</p>
                  <p className="text-gray-200 italic text-sm leading-relaxed">{bestTurn.content}</p>
                </div>
              )}
              {bestConsequence && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-widest text-green-400 mb-2">Why It Landed</p>
                  <p className="text-white text-sm leading-relaxed">{bestConsequence}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 3: The One Thing ─────────────────────────────────────── */}
        <div className="bg-black/30 border border-white/10 rounded-2xl p-6 space-y-5">
          <p className="text-xs uppercase tracking-widest text-gray-400">The One Thing to Fix</p>

          {primaryBlocker && (
            <div className="space-y-2">
              <p className="text-xl font-semibold text-white">{primaryBlocker}</p>
              {blockerDimension && (
                <p className="text-sm text-amber-400 font-medium mt-2">
                  Focus area: {blockerDimension} round
                </p>
              )}
              <p className="text-gray-400 text-sm">
                Fixing this one thing is the highest-leverage change you can make to your hiring signal.
              </p>
              <p className="text-sm italic text-gray-500">{nextLevelLabel}</p>
            </div>
          )}

          {evaluation?.answer_upgrades && evaluation.answer_upgrades.length > 0 ? (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest text-purple-400">Answer Upgrade</p>
              <p className="text-gray-300 text-sm">{evaluation.answer_upgrades[0].issue}</p>
              <div className="space-y-1 pt-1">
                <p className="text-xs uppercase tracking-widest text-gray-500">What to Change</p>
                <p className="text-white text-sm leading-relaxed">
                  {evaluation.answer_upgrades[0].what_to_change_next_time}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <p className="text-gray-300 text-sm">
                Answer Upgrades are available on Pro. Upgrade to see AI-rewritten versions of your actual answers.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition-all"
              >
                View Pro Plans
              </Link>
            </div>
          )}
        </div>

        {/* ── SECTION 4: What's Next ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card A — Practice again */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <div className="space-y-2">
                <p className="font-bold text-white">Keep the momentum</p>
                <p className="text-sm text-gray-300">
                  Your next session should target{' '}
                  <span className="text-white font-medium">{weakestDimension}</span>.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="mt-auto block text-center px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition-all"
              >
                Start Next Session
              </Link>
            </div>

            {/* Card B — Full Report */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <div className="space-y-2">
                <p className="font-bold text-white">Download your full report</p>
                <p className="text-sm text-gray-300">
                  Your complete evaluation including all feedback, corrections, and answer rewrites.
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="mt-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {pdfLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <DownloadIcon className="w-4 h-4" />
                }
                {pdfLoading ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
