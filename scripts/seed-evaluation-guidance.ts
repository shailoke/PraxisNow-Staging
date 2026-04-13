import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const GUIDANCE: Array<{ id: number; label: string; evaluation_guidance: string }> = [
  {
    id: 1,
    label: 'PM · Product Sense & Design',
    evaluation_guidance:
      'This is a product sense round. Strong candidates clarify the goal and success metric before proposing anything, identify a specific user segment and articulate their underlying pain point, generate more than one solution direction, and connect their recommendation to a business outcome. The most common failure is jumping to a solution without framing the problem first. A candidate who frames well, picks a segment, identifies a real pain point, and proposes a thoughtful solution with a clear rationale is a Lean Hire — even if they do not reach every dimension at full depth.',
  },
  {
    id: 2,
    label: 'PM · Metrics & Analytical Thinking',
    evaluation_guidance:
      'This is a metrics and analytical thinking round. Strong candidates decompose a vague metric question into its components before hypothesising, build a structured diagnostic rather than guessing a single cause, and translate data observations into actionable product decisions. They understand experimentation — when to run a test, how to design it, and what would make a result invalid. The most common failure is naming one hypothesis without a framework for ruling others in or out. A candidate who structures their diagnosis, reasons about the data rigorously, and connects findings to decisions is a Lean Hire.',
  },
  {
    id: 3,
    label: 'PM · Execution & Leadership',
    evaluation_guidance:
      'This is a behavioral round. Strong candidates use "I" not "we", give stories with specific measurable outcomes, demonstrate how they made decisions under constraint or ambiguity, and show they can influence stakeholders without resorting to escalation. They can describe a real failure and what they actually changed as a result. The most common failure is vague stories where the candidate\'s specific contribution is unclear and outcomes are unmeasurable. A candidate with two or three specific, owned stories showing real impact is a Lean Hire.',
  },
  {
    id: 4,
    label: 'PM · AI Product Strategy',
    evaluation_guidance:
      'This is an AI product strategy round. Strong candidates can identify when AI is and is not the right tool, design for model uncertainty and graceful failure, define evaluation frameworks that go beyond model accuracy, and reason about fairness, trust, and transparency as product design problems — not compliance concerns. They understand that AI moats come from data and distribution, not models. The most common failure is treating AI as a vague amplifier without understanding what it actually does or where it breaks. A candidate who shows genuine product judgment about AI tradeoffs is a Lean Hire.',
  },
  {
    id: 5,
    label: 'SDE · System Design & Architecture',
    evaluation_guidance:
      'This is a system design round. Strong candidates clarify scale, consistency requirements, and read/write patterns before drawing anything, produce a coherent high-level architecture with deliberate component choices, identify the specific bottleneck under load rather than applying every scaling technique at once, and reason explicitly about the tradeoffs in their design. They design for failure from the start. The most common failure is jumping into components without establishing requirements, or proposing a generic three-tier architecture without tailoring it to the problem. A candidate who asks the right questions, makes opinionated choices, and defends their tradeoffs is a Lean Hire.',
  },
  {
    id: 6,
    label: 'SDE · Algorithms & Problem Solving',
    evaluation_guidance:
      'This is an algorithms and problem solving round. Strong candidates restate the problem and identify edge cases before writing a line of code, explain their approach and why it fits before implementing, produce a correct solution that handles edge cases, analyse complexity accurately, and trace through their solution to verify it. They can identify where their solution is suboptimal and propose an improvement. The most common failure is starting to code immediately without understanding the problem, or producing a solution that works on the example but fails on edge cases. A candidate who thinks before coding and can reason about correctness is a Lean Hire.',
  },
  {
    id: 7,
    label: 'SDE · Engineering Execution & Leadership',
    evaluation_guidance:
      'This is a behavioral round for engineers. Strong candidates describe specific technical decisions they owned with clear reasoning and outcomes, demonstrate how they shipped under ambiguity by creating clarity rather than waiting for it, show conscious tradeoff thinking about technical debt, walk through a production incident with systematic diagnosis, and describe specific ways they raised the bar for engineers around them. The most common failure is describing team decisions without isolating personal contribution, or handling incidents without showing diagnostic reasoning. A candidate with two or three specific, owned technical stories is a Lean Hire.',
  },
  {
    id: 8,
    label: 'SDE · AI Engineering',
    evaluation_guidance:
      'This is an AI engineering round. Strong candidates understand LLM capabilities and limitations at a level sufficient to build on them, can design a RAG pipeline and reason about its failure modes, think about inference latency, cost, and reliability as real engineering constraints, and can design evaluation pipelines for AI systems beyond manual spot-checking. The most common failure is treating LLMs as magic black boxes or ignoring the operational reality of running AI systems in production. A candidate who shows genuine engineering judgment about building reliable AI-powered systems is a Lean Hire.',
  },
  {
    id: 9,
    label: 'DS · Problem Framing & Analytics',
    evaluation_guidance:
      'This is a problem framing and analytics round. Strong candidates clarify what decision the analysis will inform before choosing a method, apply statistical reasoning correctly without mechanical test application, design rigorous experiments with appropriate randomisation and threat identification, write correct and efficient SQL for analytical queries, and translate findings into actionable insights rather than just reporting numbers. The most common failure is reaching for a method before clarifying the question, or reporting results without drawing conclusions. A candidate who frames well, reasons statistically, and connects analysis to decisions is a Lean Hire.',
  },
  {
    id: 10,
    label: 'DS · ML Design & Evaluation',
    evaluation_guidance:
      'This is an ML design and evaluation round. Strong candidates translate a business problem into a well-specified ML problem, reason about feature predictiveness and leakage risks, argue for the simplest model that could work before proposing complexity, define evaluation methodology appropriate to the problem, and think about production concerns including monitoring, retraining, and graceful degradation. The most common failure is jumping to model selection without establishing what the model is supposed to predict, or using accuracy as the primary metric for an imbalanced problem. A candidate who shows sound ML judgment from problem framing through deployment is a Lean Hire.',
  },
  {
    id: 11,
    label: 'DS · Research Depth & Leadership',
    evaluation_guidance:
      'This is a behavioral round for researchers and senior data scientists. Strong candidates demonstrate genuine intellectual ownership of their research contributions, describe a specific path from research to production impact, show they have elevated the technical quality of the team around them, and demonstrate comfort with prolonged ambiguity and research failure. The most common failure is describing projects at a team level without isolating personal contribution, or only speaking to research metrics without any business outcome. A candidate with specific, owned examples of research impact and team elevation is a Lean Hire.',
  },
  {
    id: 12,
    label: 'DS · AI Research & Alignment',
    evaluation_guidance:
      'This is an AI research and alignment round. Strong candidates have working theoretical understanding of deep learning and can connect theory to practical decisions, are current with the LLM research literature and can reason about open problems, understand RL fundamentals and RLHF failure modes, and engage with alignment as a genuine technical problem — distinguishing inner from outer alignment, reasoning about reward misspecification, and engaging with concrete technical proposals and their limitations. The most common failure is surface familiarity with the field without the depth to reason about why things work or fail. A candidate who can think rigorously about these systems is a Lean Hire.',
  },
]

async function main() {
  console.log(`Seeding evaluation_guidance for ${GUIDANCE.length} scenarios...\n`)

  let succeeded = 0
  let failed = 0

  for (const row of GUIDANCE) {
    const { error } = await supabase
      .from('scenarios')
      .update({ evaluation_guidance: row.evaluation_guidance } as any)
      .eq('id', row.id)

    if (error) {
      console.error(`  ✗ ID ${row.id} (${row.label}): ${error.message}`)
      failed++
    } else {
      console.log(`  ✓ ID ${row.id} (${row.label})`)
      succeeded++
    }
  }

  console.log(`\n── Summary ──────────────────────────────`)
  console.log(`  Succeeded : ${succeeded}`)
  console.log(`  Failed    : ${failed}`)
  console.log(`  Total     : ${GUIDANCE.length}`)

  if (failed > 0) {
    console.error('\nSome rows failed. Check errors above.')
    process.exit(1)
  } else {
    console.log('\nAll rows seeded successfully.')
  }
}

main()
