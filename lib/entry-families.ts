import { QuestionFamily } from './question-families'

/**
 * ENTRY QUESTION FAMILIES (Level-Scoped)
 * 
 * These families are used ONLY for the first substantive question after "Tell me about yourself."
 * They determine the entry point into the scenario to prevent predictability.
 * 
 * CRITICAL RULES:
 * - ID format: entry_{role}_{level}_{dimension}
 * - Dimension must be 'Entry'
 * - Guidance encodes evaluation BAR, not scripted questions
 * - Different levels have different bars
 * 
 * NORMALIZATION:
 * - Roles: pm, sde, designer, data, marketing, leadership
 * - Levels: junior, senior, staff, principal, leader
 * - Dimensions: metrics, discovery, risks, write_path, read_path, etc.
 */

export const ENTRY_FAMILIES: QuestionFamily[] = [
    // ==========================================
    // PRODUCT MANAGER - JUNIOR
    // ==========================================
    {
        id: 'entry_pm_junior_metrics',
        dimension: 'Entry',
        family_name: 'Metrics Entry (Junior)',
        prompt_guidance: `Probe the candidate's ability to define **success metrics** with execution clarity. Junior bar: Can they identify relevant metrics and explain how to measure them? Focus on structured thinking, not strategic depth.`
    },
    {
        id: 'entry_pm_junior_discovery',
        dimension: 'Entry',
        family_name: 'Problem Discovery Entry (Junior)',
        prompt_guidance: `Probe the candidate's approach to **validating user problems**. Junior bar: Can they articulate a clear research plan and follow structured discovery methods? Focus on process adherence, not insight depth.`
    },
    {
        id: 'entry_pm_junior_risks',
        dimension: 'Entry',
        family_name: 'Risk Identification Entry (Junior)',
        prompt_guidance: `Probe the candidate's ability to identify **obvious risks**. Junior bar: Can they spot clear technical or operational constraints? Focus on risk awareness, not mitigation sophistication.`
    },

    // ==========================================
    // PRODUCT MANAGER - SENIOR
    // ==========================================
    {
        id: 'entry_pm_senior_metrics',
        dimension: 'Entry',
        family_name: 'Metrics Entry (Senior)',
        prompt_guidance: `Probe the candidate's definition of **success metrics** with scoped ownership. Senior bar: Can they align metrics to business outcomes and justify trade-offs? Focus on outcome thinking, not just execution.`
    },
    {
        id: 'entry_pm_senior_discovery',
        dimension: 'Entry',
        family_name: 'Problem Discovery Entry (Senior)',
        prompt_guidance: `Probe the candidate's validation of **user problems** with prioritization depth. Senior bar: Can they distinguish signal from noise and focus on high-impact pain points? Focus on judgment, not just process.`
    },
    {
        id: 'entry_pm_senior_risks',
        dimension: 'Entry',
        family_name: 'Risk-First Entry (Senior)',
        prompt_guidance: `Probe the candidate's identification and mitigation of **critical risks**. Senior bar: Can they proactively address market, technical, and operational constraints with concrete plans? Focus on risk ownership.`
    },

    // ==========================================
    // PRODUCT MANAGER - PRINCIPAL
    // ==========================================
    {
        id: 'entry_pm_principal_metrics',
        dimension: 'Entry',
        family_name: 'Metrics Entry (Principal)',
        prompt_guidance: `Probe the candidate's definition of **success metrics** with system-level thinking. Principal bar: Can they design metric frameworks that scale across teams and surface failure modes early? Focus on strategic instrumentation.`
    },
    {
        id: 'entry_pm_principal_discovery',
        dimension: 'Entry',
        family_name: 'Problem Discovery Entry (Principal)',
        prompt_guidance: `Probe the candidate's validation of **user problems** with cross-functional awareness. Principal bar: Can they identify systemic gaps and coordinate discovery across multiple teams? Focus on organizational leverage.`
    },
    {
        id: 'entry_pm_principal_risks',
        dimension: 'Entry',
        family_name: 'Risk-First Entry (Principal)',
        prompt_guidance: `Probe the candidate's identification of **systemic risks** and organizational dependencies. Principal bar: Can they surface non-obvious constraints and build resilient mitigation strategies? Focus on deep failure mode analysis.`
    },

    // ==========================================
    // PRODUCT MANAGER - LEADER
    // ==========================================
    {
        id: 'entry_pm_leader_metrics',
        dimension: 'Entry',
        family_name: 'Metrics Entry (Leader)',
        prompt_guidance: `Probe the candidate's definition of **success metrics** with organizational trade-offs. Leader bar: Can they balance competing business priorities and communicate metric rationale to executives? Focus on ROI and strategic clarity.`
    },
    {
        id: 'entry_pm_leader_discovery',
        dimension: 'Entry',
        family_name: 'Problem Discovery Entry (Leader)',
        prompt_guidance: `Probe the candidate's validation of **user problems** with market context. Leader bar: Can they align discovery efforts to business strategy and portfolio decisions? Focus on organizational outcomes, not feature-level insights.`
    },
    {
        id: 'entry_pm_leader_risks',
        dimension: 'Entry',
        family_name: 'Risk-First Entry (Leader)',
        prompt_guidance: `Probe the candidate's identification of **strategic risks** and business constraints. Leader bar: Can they navigate competitive, regulatory, and organizational risks at scale? Focus on executive-level judgment.`
    },

    // ==========================================
    // SOFTWARE ENGINEER - JUNIOR
    // ==========================================
    {
        id: 'entry_sde_junior_write_path',
        dimension: 'Entry',
        family_name: 'Write Path Entry (Junior)',
        prompt_guidance: `Probe the candidate's understanding of the **write path** with implementation focus. Junior bar: Can they implement a basic data ingestion flow with correct error handling? Focus on code correctness, not scalability.`
    },
    {
        id: 'entry_sde_junior_read_path',
        dimension: 'Entry',
        family_name: 'Read Path Entry (Junior)',
        prompt_guidance: `Probe the candidate's approach to the **read path** with basic optimization. Junior bar: Can they retrieve and aggregate data efficiently for a single user? Focus on query correctness, not fanout strategies.`
    },
    {
        id: 'entry_sde_junior_discovery',
        dimension: 'Entry',
        family_name: 'Discovery Entry (Junior)',
        prompt_guidance: `Probe the candidate's approach to **search and discovery** with algorithmic clarity. Junior bar: Can they design a basic search index and explain query mechanics? Focus on fundamentals, not real-time complexity.`
    },

    // ==========================================
    // SOFTWARE ENGINEER - SENIOR
    // ==========================================
    {
        id: 'entry_sde_senior_write_path',
        dimension: 'Entry',
        family_name: 'Write Path Entry (Senior)',
        prompt_guidance: `Probe the candidate's understanding of the **write path** with scale considerations. Senior bar: Can they design a high-volume ingestion system with proper partitioning and backpressure? Focus on tradeoffs and failure modes.`
    },
    {
        id: 'entry_sde_senior_read_path',
        dimension: 'Entry',
        family_name: 'Read Path Entry (Senior)',
        prompt_guidance: `Probe the candidate's strategy for the **read path** with latency optimization. Senior bar: Can they design timeline construction with caching and denormalization? Focus on performance tradeoffs.`
    },
    {
        id: 'entry_sde_senior_discovery',
        dimension: 'Entry',
        family_name: 'Discovery Entry (Senior)',
        prompt_guidance: `Probe the candidate's approach to **search and discovery** with ranking complexity. Senior bar: Can they design real-time indexing with relevance tuning? Focus on data freshness vs accuracy tradeoffs.`
    },

    // ==========================================
    // SOFTWARE ENGINEER - PRINCIPAL
    // ==========================================
    {
        id: 'entry_sde_principal_write_path',
        dimension: 'Entry',
        family_name: 'Write Path Entry (Principal)',
        prompt_guidance: `Probe the candidate's design of the **write path** with cross-system thinking. Principal bar: Can they architect global ingestion with multi-region consistency and replay semantics? Focus on distributed systems depth.`
    },
    {
        id: 'entry_sde_principal_read_path',
        dimension: 'Entry',
        family_name: 'Read Path Entry (Principal)',
        prompt_guidance: `Probe the candidate's strategy for the **read path** with system-wide tradeoffs. Principal bar: Can they design fanout at scale with consistency models and operational observability? Focus on architecture resilience.`
    },
    {
        id: 'entry_sde_principal_discovery',
        dimension: 'Entry',
        family_name: 'Discovery Entry (Principal)',
        prompt_guidance: `Probe the candidate's approach to **search and discovery** with infrastructure awareness. Principal bar: Can they design distributed indexing with cross-datacenter replication and query federation? Focus on system-level complexity.`
    },

    // ==========================================
    // GENERIC LEADERSHIP (Fallback for Designer, Data, Marketing, etc.)
    // ==========================================
    {
        id: 'entry_leadership_junior_vision',
        dimension: 'Entry',
        family_name: 'Vision Entry (Junior)',
        prompt_guidance: `Probe the candidate's ability to articulate **team vision** with clarity. Junior bar: Can they communicate project goals and align with immediate team objectives? Focus on clear communication.`
    },
    {
        id: 'entry_leadership_senior_vision',
        dimension: 'Entry',
        family_name: 'Vision Entry (Senior)',
        prompt_guidance: `Probe the candidate's ability to define **strategic vision** with cross-functional alignment. Senior bar: Can they translate business objectives into actionable team direction? Focus on strategic clarity.`
    },
    {
        id: 'entry_leadership_principal_vision',
        dimension: 'Entry',
        family_name: 'Vision Entry (Principal)',
        prompt_guidance: `Probe the candidate's ability to set **organizational vision** with systemic impact. Principal bar: Can they define multi-team strategy and surface critical dependencies? Focus on organizational leverage.`
    },
    {
        id: 'entry_leadership_leader_vision',
        dimension: 'Entry',
        family_name: 'Vision Entry (Leader)',
        prompt_guidance: `Probe the candidate's ability to communicate **executive vision** with business context. Leader bar: Can they align org-wide initiatives to market strategy and ROI? Focus on executive-level strategic thinking.`
    },

    // ==========================================
    // PRODUCT MANAGER - AI FLUENCY (All Levels)
    // ==========================================
    {
        id: 'entry_pm_junior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (PM Junior)',
        prompt_guidance: `Probe the candidate's **conceptual grounding in AI product features**. Junior bar: Can they articulate what an AI feature does functionally without making incorrect technical claims? Focus on awareness, not architecture. Do NOT test definitions or theory. Probe whether they understand what AI features they have used or built, and whether they can distinguish AI from rule-based systems.`
    },
    {
        id: 'entry_pm_senior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (PM Senior)',
        prompt_guidance: `Probe the candidate's **AI architecture decision-making and evaluation rigor**. Senior bar: Can they articulate clear architectural decisions (e.g., RAG vs fine-tuning), explain evaluation methodology beyond surface metrics, and reason about failure modes like hallucination? Focus on trade-off clarity, constraint awareness, and evaluation layering. Penalize buzzword stacking without system flow clarity. Penalize "we used GPT" without architecture justification.`
    },
    {
        id: 'entry_pm_staff_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (PM Staff)',
        prompt_guidance: `Probe the candidate's **system-level AI reasoning and multi-layer mitigation strategy**. Staff bar: Can they reason about cost modeling, drift detection, orchestration layers, and multi-model strategies? Focus on system decomposition, reliability thinking, and economic reasoning. Penalize surface-level AI adoption claims and overconfidence without constraint awareness.`
    },
    {
        id: 'entry_pm_principal_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (PM Principal)',
        prompt_guidance: `Probe the candidate's **system-level AI reasoning, drift modeling, and cost-aware architecture**. Principal bar: Can they design evaluation frameworks that scale, model drift diagnosis strategies, reason about cost optimization at scale, and articulate multi-layer mitigation? Focus on diagnostic structure, root cause separation, and orchestration reasoning. Penalize vague claims and lack of structured diagnosis.`
    },
    {
        id: 'entry_pm_leader_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (PM Leader)',
        prompt_guidance: `Probe the candidate's **org-level AI governance, ROI framing, and portfolio-level AI trade-offs**. Leader bar: Can they frame AI risk responsibly, articulate build vs buy decisions for AI capabilities, model portfolio-level AI investment, and design governance frameworks? Focus on honest risk framing, economic reasoning at org scale, and strategic maturity. Penalize "we handled everything" and lack of governance awareness.`
    },

    // ==========================================
    // SOFTWARE ENGINEER - AI FLUENCY (All Levels)
    // ==========================================
    {
        id: 'entry_sde_junior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (SDE Junior)',
        prompt_guidance: `Probe the candidate's **basic understanding of AI integration in software systems**. Junior bar: Can they explain how they integrated an AI API, handled responses, and dealt with basic error cases? Focus on implementation clarity, not architecture depth. Probe whether they understand prompt design basics, API usage patterns, and basic failure handling.`
    },
    {
        id: 'entry_sde_senior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (SDE Senior)',
        prompt_guidance: `Probe the candidate's **AI system design, RAG vs fine-tuning trade-offs, and evaluation methodology**. Senior bar: Can they design an AI-powered feature end-to-end, reason about model selection, implement evaluation pipelines, and handle reliability concerns? Focus on architecture trade-offs, latency optimization, and failure mode engineering.`
    },
    {
        id: 'entry_sde_staff_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (SDE Staff)',
        prompt_guidance: `Probe the candidate's **ML platform design and orchestration layer engineering**. Staff bar: Can they design multi-step AI orchestration, implement tool-calling architectures, manage context windows at scale, and build evaluation infrastructure? Focus on system decomposition and platform-level thinking.`
    },
    {
        id: 'entry_sde_principal_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (SDE Principal)',
        prompt_guidance: `Probe the candidate's **ML infrastructure at scale, multi-model orchestration, and cost optimization architecture**. Principal bar: Can they architect global AI inference infrastructure, design multi-model routing, implement cost-aware serving strategies, and build drift detection systems? Focus on distributed systems depth applied to AI workloads.`
    },
    {
        id: 'entry_sde_leader_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (SDE Leader)',
        prompt_guidance: `Probe the candidate's **AI platform strategy, build vs buy decisions, and org-level AI roadmap**. Leader bar: Can they articulate org-wide AI infrastructure strategy, evaluate vendor vs in-house trade-offs, and design governance for AI systems at scale? Focus on strategic clarity and portfolio-level technical reasoning.`
    },

    // ==========================================
    // DATA SCIENTIST - AI FLUENCY (All Levels)
    // ==========================================
    {
        id: 'entry_data_junior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Data Junior)',
        prompt_guidance: `Probe the candidate's **data pipeline and feature engineering for AI systems**. Junior bar: Can they describe how data flows into an ML system, what preprocessing they applied, and how they validated data quality? Focus on foundational understanding of ML data requirements, not model architecture.`
    },
    {
        id: 'entry_data_senior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Data Senior)',
        prompt_guidance: `Probe the candidate's **ML lifecycle management, drift detection methodology, and evaluation rigor**. Senior bar: Can they design end-to-end ML pipelines, implement drift detection, build evaluation frameworks, and reason about model degradation over time? Focus on operational ML thinking and diagnostic structure.`
    },
    {
        id: 'entry_data_staff_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Data Staff)',
        prompt_guidance: `Probe the candidate's **ML systems at scale and experimentation platform design**. Staff bar: Can they design A/B testing infrastructure for ML models, build feature stores, and architect experimentation platforms? Focus on system-level ML engineering and cross-team impact.`
    },
    {
        id: 'entry_data_principal_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Data Principal)',
        prompt_guidance: `Probe the candidate's **ML platform architecture and cross-team data strategy**. Principal bar: Can they architect organization-wide ML platforms, design cross-team feature sharing, and build governance for model lifecycle management? Focus on architectural depth and organizational leverage.`
    },
    {
        id: 'entry_data_leader_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Data Leader)',
        prompt_guidance: `Probe the candidate's **data/AI strategy, ROI modeling, and portfolio prioritization for ML investments**. Leader bar: Can they frame AI investment decisions, evaluate build vs buy for ML capabilities, and design org-wide data strategy? Focus on strategic reasoning and business impact.`
    },

    // ==========================================
    // MARKETER - AI FLUENCY (All Levels)
    // ==========================================
    {
        id: 'entry_marketing_junior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Marketing Junior)',
        prompt_guidance: `Probe the candidate's **awareness of AI tools in marketing workflows**. Junior bar: Can they articulate how AI tools augment marketing tasks like content generation, audience targeting, or campaign optimization? Focus on practical awareness, not technical depth. Probe whether they understand what AI-powered tools do differently from rule-based automation.`
    },
    {
        id: 'entry_marketing_senior_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Marketing Senior)',
        prompt_guidance: `Probe the candidate's **AI-driven campaign optimization, measurement, and content generation strategy**. Senior bar: Can they articulate how AI improves targeting, personalization, and attribution? Can they reason about AI-generated content quality and brand safety? Focus on applied reasoning and measurement rigor.`
    },
    {
        id: 'entry_marketing_staff_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Marketing Staff)',
        prompt_guidance: `Probe the candidate's **campaign intelligence and AI-powered attribution modeling**. Staff bar: Can they design AI-driven campaign optimization systems, reason about multi-touch attribution with AI, and evaluate AI content generation at scale? Focus on system thinking and measurement sophistication.`
    },
    {
        id: 'entry_marketing_principal_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Marketing Principal)',
        prompt_guidance: `Probe the candidate's **marketing AI strategy and personalization at scale**. Principal bar: Can they architect AI-driven personalization systems, design experimentation frameworks for AI marketing, and reason about privacy-AI trade-offs? Focus on strategic depth and system-level thinking.`
    },
    {
        id: 'entry_marketing_leader_ai_fluency',
        dimension: 'Entry',
        family_name: 'AI Fluency Entry (Marketing Leader)',
        prompt_guidance: `Probe the candidate's **AI-driven marketing transformation strategy and ROI modeling**. Leader bar: Can they frame org-wide AI marketing strategy, evaluate build vs buy for marketing AI, and model ROI for AI marketing investments? Focus on executive reasoning and portfolio-level trade-offs.`
    },

    // ==========================================
    // PRODUCT MANAGER - SENIOR - PRODUCT DESIGN & EXECUTION
    // ==========================================
    {
        id: 'entry_pm_senior_product_design',
        dimension: 'Entry',
        family_name: 'Product Design Entry (Senior)',
        prompt_guidance: `Generate a concrete product design challenge appropriate for a Product Manager
    interviewing at the Senior bar. Choose a product domain that has not already appeared
    in this session. Vary across consumer, B2B, marketplace, platform, and enterprise
    contexts — do not default to the same domain across sessions.
    Senior bar: Does the candidate structure their answer across user segmentation →
    problem definition → solution space → tradeoffs → success metrics?
    Do NOT move on if the candidate skips a step — probe the missing step directly.
    If they skip user segmentation: "Who specifically are you designing for, and why that segment?"
    If they skip problem definition: "What problem are you actually solving before you get to solutions?"
    If they skip tradeoffs: "What would you cut if engineering capacity was halved?"
    If they skip metrics: "How would you know in 90 days if this was the right call?"
    A candidate who produces a fluent narrative without structure has not met the Senior bar.`
    },
    {
        id: 'entry_pm_senior_execution_diagnosis',
        dimension: 'Entry',
        family_name: 'Execution Diagnosis Entry (Senior)',
        prompt_guidance: `Generate a metric anomaly scenario with specific numbers, appropriate for
    a Product Manager interviewing at the Senior bar. The anomaly must be ambiguous enough
    that multiple hypotheses are plausible — never present a scenario with an obvious single cause.
    Vary the metric type across sessions: engagement, conversion, retention, revenue, quality —
    do not default to the same metric type.
    Senior bar: Does the candidate build a structured hypothesis tree before reaching for data?
    Do they separate internal causes (release, infra, bug, experiment) from
    external causes (seasonality, competitor action, market shift)?
    Do they identify specific data cuts and articulate why each cut tests a specific hypothesis?
    Probe assumptions aggressively:
    - "What if this drop is isolated to one platform or region?"
    - "What if a recent release only partially rolled out?"
    - "What would you look at to rule out a data pipeline issue?"
    A candidate who names a single hypothesis without a structured tree,
    or who reaches for solutions before diagnosing, has not met the Senior bar.`
    },
    {
        id: 'entry_pm_senior_ai_product',
        dimension: 'Entry',
        family_name: 'AI Product Thinking Entry (Senior)',
        prompt_guidance: `Generate an AI product scenario appropriate for a Product Manager
    interviewing at the Senior bar. The scenario must present a genuine decision point —
    not a hypothetical where the answer is obviously yes or no.
    Vary the decision type across sessions: where to apply AI in a workflow,
    how to evaluate AI output quality, how to handle an AI feature that is underperforming,
    whether AI is the right solution at all. Do not default to the same scenario type
    across sessions.
    Senior bar: Can the candidate distinguish genuine AI value-add from AI for AI's sake?
    Do they reason about data requirements, model quality thresholds, failure modes,
    user trust, and how success metrics differ for AI vs deterministic features?
    Probe:
    - "How would you know if this AI feature is making things worse, not better?"
    - "What is the minimum quality bar before you'd ship this?"
    - "What happens when it produces a wrong output — who is accountable and how does the product recover?"
    - "What's your non-AI fallback if the model underperforms in production?"
    Reject candidates who treat AI as a capability layer with no failure modes or
    who cannot articulate a concrete quality threshold.`
    },

    // ==========================================
    // PRODUCT MANAGER - PRINCIPAL - PRODUCT DESIGN & AI STRATEGY
    // ==========================================
    {
        id: 'entry_pm_principal_product_design',
        dimension: 'Entry',
        family_name: 'Product Design Entry (Principal)',
        prompt_guidance: `Generate a product design challenge at platform or ecosystem scale,
    appropriate for a Product Manager interviewing at the Principal bar.
    The challenge must involve multiple stakeholders or system interdependencies —
    not a single-user feature problem. Choose a domain that has not already appeared
    in this session and vary across infrastructure, developer tooling, marketplace,
    and enterprise platform contexts.
    Principal bar: Does the candidate reason about platform vs point-solution tradeoffs,
    ecosystem incentives, and deliberate build sequencing?
    Do they consider what NOT to build as rigorously as what to build?
    Probe on:
    - Validation: "How would you validate this direction without building it?"
    - Abandonment: "What signal would make you stop and change direction entirely?"
    - Sequencing: "If you could only ship one thing in the first 6 months, what is it and why?"
    - Systems thinking: "How does this decision affect teams or products adjacent to yours?"
    Reject surface-level user journey answers. If the candidate does not reason about
    second-order effects unprompted, probe until they do or it becomes clear they cannot.`
    },
    {
        id: 'entry_pm_principal_ai_strategy',
        dimension: 'Entry',
        family_name: 'AI Strategy Entry (Principal)',
        prompt_guidance: `Generate a strategic AI decision scenario at org or platform scale,
    appropriate for a Product Manager interviewing at the Principal bar.
    The scenario must involve a genuine strategic tradeoff —
    not a question where the right answer is self-evident.
    Vary the decision type across sessions: build vs buy vs fine-tune,
    AI platform openness vs control, competitive response to an AI-native entrant,
    data strategy as a moat. Do not default to the same decision type across sessions.
    Principal bar: Does the candidate reason about build vs buy vs fine-tune
    with concrete, defensible criteria?
    Do they think about competitive moat, data network effects, and org capability gaps?
    Do they reason about second-order effects and what this decision locks them into?
    Probe:
    - "How would you make this case to a skeptical CFO with a concrete ROI framing?"
    - "What makes this decision reversible or irreversible — and does that change your recommendation?"
    - "What org capabilities do you need that you don't have today, and how does that affect sequencing?"
    - "What does this decision make harder to do two years from now?"
    A candidate who produces a strong product logic argument without addressing
    org execution reality has not met the Principal bar.`
    }
]
