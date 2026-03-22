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
    },

    // ==========================================
    // SOFTWARE ENGINEER - SYSTEM DESIGN
    // ==========================================
    {
        id: 'entry_sde_senior_system_design',
        dimension: 'Entry',
        family_name: 'System Design Entry (Senior)',
        prompt_guidance: `Present a system design challenge appropriate for an SDE
    interviewing at the Senior bar. The system must involve real scale and
    real constraints — not a toy problem. Choose a domain that has not already
    appeared in this session. Vary across: distributed data systems, real-time
    processing, API platforms, notification infrastructure, search systems.
    Do not default to the same system type across sessions.
    Senior bar: Does the candidate structure their answer across
    requirements clarification → high-level design → component deep-dive →
    tradeoffs → failure modes?
    Do NOT accept a candidate who jumps straight to components without
    clarifying requirements and scale.
    Probe when steps are skipped:
    - No requirements clarification: "What scale are we designing for —
      DAU, write volume, read/write ratio?"
    - No tradeoffs: "What are you trading off with this approach vs
      an alternative?"
    - No failure modes: "What happens when this component goes down?"
    - No data model: "Walk me through the core data model for this system."
    A candidate who produces a fluent architecture without reasoning about
    tradeoffs and failure modes has not met the Senior bar.`
    },
    {
        id: 'entry_sde_principal_system_design',
        dimension: 'Entry',
        family_name: 'System Design Entry (Principal)',
        prompt_guidance: `Present a system design challenge at platform or
    infrastructure scale appropriate for an SDE at the Principal bar.
    The problem must involve cross-cutting concerns — multi-region consistency,
    platform extensibility, or infrastructure that other systems depend on.
    Choose a domain that has not already appeared in this session.
    Vary across: global data replication, developer platform infrastructure,
    multi-tenant systems, observability platforms, ML serving infrastructure.
    Principal bar: Does the candidate reason about the system as a platform
    designer, not just an implementer?
    Do they reason about: API contracts and versioning, operational complexity
    at scale, build vs buy decisions, and how their design affects teams
    building on top of it?
    Probe on:
    - "How would you version this API without breaking existing clients?"
    - "What does the operational runbook look like for this system at 3am?"
    - "What would make you change this fundamental design decision two years from now?"
    - "How does this design constrain or enable teams building on top of it?"
    Reject candidates who reason at component level without reasoning about
    platform implications and long-term operational reality.`
    },

    // ==========================================
    // SOFTWARE ENGINEER - AI SYSTEMS
    // ==========================================
    {
        id: 'entry_sde_senior_ai_systems',
        dimension: 'Entry',
        family_name: 'AI Systems Entry (Senior)',
        prompt_guidance: `Present a system design challenge where one or more
    components involve an AI or ML model, appropriate for an SDE at the
    Senior bar. The challenge must make the AI integration non-trivial —
    the candidate must reason about what changes when a component is
    non-deterministic. Choose a domain that has not already appeared
    in this session. Vary across: LLM-powered features, recommendation
    systems, content moderation, search ranking, fraud detection.
    Senior bar: Does the candidate reason differently about AI components
    vs deterministic components?
    Key signals:
    - Do they address model serving latency vs quality tradeoffs?
    - Do they design for graceful degradation when the model underperforms?
    - Do they think about evaluation pipelines, not just the serving path?
    - Do they consider what "correct" means for a probabilistic output?
    Probe:
    - "What happens to your system if the model starts returning
      lower quality outputs — how would you detect and respond?"
    - "How do you handle the latency tail when the model is slow?"
    - "What is your fallback when the model service is unavailable?"
    - "How would you A/B test a model update safely?"
    A candidate who designs the AI component like a deterministic API
    with no special handling has not met the Senior bar.`
    },
    {
        id: 'entry_sde_principal_ai_systems',
        dimension: 'Entry',
        family_name: 'AI Systems Entry (Principal)',
        prompt_guidance: `Present an AI infrastructure or platform design challenge
    appropriate for an SDE at the Principal bar. The challenge must involve
    platform-level AI concerns — not a single feature with AI added.
    Choose a domain that has not already appeared in this session.
    Vary across: ML platform design, multi-model serving infrastructure,
    AI evaluation platforms, training pipeline architecture,
    AI gateway and routing systems.
    Principal bar: Does the candidate reason about AI infrastructure as a
    platform that other teams depend on?
    Key signals:
    - Do they address model versioning, rollback, and shadow deployment?
    - Do they think about cost management at platform scale?
    - Do they reason about the organisational implications of their
      infrastructure decisions?
    - Do they address data governance, model lineage, and compliance?
    Probe on:
    - "How do you manage 50 different model versions across 20 product teams?"
    - "What does cost attribution look like across teams using this platform?"
    - "How do you handle a model that is performing well on metrics
      but causing user trust issues?"
    - "What makes this platform easy to deprecate components of
      without breaking dependent teams?"
    Reject candidates who design a single-team AI system and call it
    a platform. Push until they reason about multi-team, multi-model,
    long-term operational reality.`
    },

    // ==========================================
    // MARKETER - STRATEGY
    // ==========================================
    {
        id: 'entry_marketing_senior_strategy',
        dimension: 'Entry',
        family_name: 'Marketing Strategy Entry (Senior)',
        prompt_guidance: `Generate a marketing strategy challenge appropriate for
    a Marketer interviewing at the Senior bar. The challenge must involve
    a genuine strategic decision — positioning, GTM, competitive response,
    or market entry. Choose a domain that has not already appeared in this
    session. Vary across: B2B SaaS, consumer tech, marketplace,
    enterprise software, developer tools.
    Senior bar: Does the candidate structure their answer across
    market sizing → customer segmentation → positioning → GTM motion →
    success metrics?
    Do they make deliberate tradeoffs rather than trying to do everything?
    Probe when steps are missing:
    - No segmentation: "Who specifically are you targeting first and why
      that segment over others?"
    - No positioning: "How does this positioning differ from the top
      two competitors?"
    - No GTM: "What is your acquisition motion — paid, organic,
      partnerships, or product-led?"
    - No metrics: "How would you know in 6 months if this strategy is working?"
    A candidate who describes a strategy without making explicit tradeoffs
    or acknowledging what they are NOT doing has not met the Senior bar.`
    },
    {
        id: 'entry_marketing_principal_strategy',
        dimension: 'Entry',
        family_name: 'Marketing Strategy Entry (Principal)',
        prompt_guidance: `Generate a marketing strategy challenge at portfolio or
    org scale, appropriate for a Marketer interviewing at the Principal bar.
    The challenge must involve multi-product, multi-segment, or multi-market
    complexity — not a single campaign or launch decision.
    Choose a domain that has not already appeared in this session.
    Vary across: platform business marketing, enterprise category creation,
    international expansion, brand architecture decisions.
    Principal bar: Does the candidate reason about portfolio tradeoffs —
    where to invest, where to harvest, where to exit?
    Do they think about brand architecture, channel conflict, and
    long-term category positioning?
    Probe on:
    - "How do you allocate marketing budget across segments when
      they have conflicting needs?"
    - "What does winning this category look like in 3 years and
      what do you need to be true today?"
    - "How does this strategy change if your top competitor responds
      aggressively in the first 90 days?"
    - "What does this decision make harder to do in the future?"
    A candidate who reasons at campaign level rather than portfolio level
    has not met the Principal bar.`
    },

    // ==========================================
    // MARKETER - CAMPAIGN
    // ==========================================
    {
        id: 'entry_marketing_senior_campaign',
        dimension: 'Entry',
        family_name: 'Campaign Execution Entry (Senior)',
        prompt_guidance: `Generate a campaign execution challenge appropriate for
    a Marketer interviewing at the Senior bar. The challenge must involve
    a real execution decision — channel mix, creative strategy,
    launch sequencing, or measurement design. Choose a domain that has
    not already appeared in this session. Do not default to the same
    channel type across sessions — vary across: paid acquisition,
    content/SEO, email/lifecycle, events, partnerships.
    Senior bar: Does the candidate think in systems — how channels
    reinforce each other, how measurement connects back to business outcomes?
    Do they design for learning, not just delivery?
    Probe when shallow:
    - "How do these channels reinforce each other — what does the
      full customer journey look like?"
    - "What does success look like at 30 days vs 90 days —
      are those different metrics?"
    - "What would cause you to kill this campaign mid-flight and
      reallocate budget?"
    - "How do you isolate what actually drove results vs what
      was coincidental?"
    A candidate who lists channels without reasoning about measurement
    or learning has not met the Senior bar.`
    },
    {
        id: 'entry_marketing_principal_campaign',
        dimension: 'Entry',
        family_name: 'Campaign Execution Entry (Principal)',
        prompt_guidance: `Generate a campaign execution challenge at scale,
    appropriate for a Marketer interviewing at the Principal bar.
    The challenge must involve org-level execution complexity —
    multi-team coordination, global campaign localisation,
    brand consistency at scale, or platform-level campaign infrastructure.
    Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate design systems that scale
    beyond their own execution? Do they think about
    repeatability, localisation, and brand governance?
    Probe on:
    - "How do you maintain brand consistency when 12 regional teams
      are executing independently?"
    - "What is the minimum viable centre of excellence for this —
      what must be centralised vs what can be distributed?"
    - "How do you build institutional campaign knowledge so the
      org learns across every execution?"
    - "What breaks first when you 10x the volume of this campaign?"
    A candidate who describes a well-run single campaign without
    reasoning about scale and governance has not met the Principal bar.`
    },

    // ==========================================
    // MARKETER - GROWTH
    // ==========================================
    {
        id: 'entry_marketing_senior_growth',
        dimension: 'Entry',
        family_name: 'Growth & Analytics Entry (Senior)',
        prompt_guidance: `Generate a growth or analytics challenge appropriate for
    a Marketer interviewing at the Senior bar. The challenge must involve
    a real measurement or experimentation decision — not a hypothetical
    framework walkthrough. Choose a domain that has not already appeared
    in this session. Vary across: funnel optimisation, CAC/LTV analysis,
    attribution modelling, retention analysis, experiment design.
    Senior bar: Does the candidate reason from data to decision —
    not just describe metrics but use them to drive a specific action?
    Do they understand the limits of their data?
    Probe:
    - "What is your north star metric for this and why that one
      over the alternatives?"
    - "How do you know if a change in this metric is signal or noise?"
    - "What data would change your recommendation here?"
    - "Walk me through how you would set up the experiment —
      what is your null hypothesis?"
    A candidate who describes metrics without connecting them to
    decisions or acknowledging measurement limitations
    has not met the Senior bar.`
    },
    {
        id: 'entry_marketing_principal_growth',
        dimension: 'Entry',
        family_name: 'Growth & Analytics Entry (Principal)',
        prompt_guidance: `Generate a growth strategy or analytics infrastructure
    challenge at org scale, appropriate for a Marketer interviewing at
    the Principal bar. The challenge must involve building or redesigning
    a measurement system, not just analysing within one.
    Choose a domain that has not already appeared in this session.
    Vary across: attribution model design, marketing data infrastructure,
    experimentation platform, customer data strategy.
    Principal bar: Does the candidate think about measurement as a
    strategic capability, not just a reporting function?
    Do they reason about data quality, model assumptions,
    and org adoption as first-class constraints?
    Probe on:
    - "What assumptions does this attribution model make that
      could be wrong — and how would you know?"
    - "How do you get the sales and finance teams to trust
      and act on this data?"
    - "What does this measurement system make impossible to measure —
      and is that an acceptable tradeoff?"
    - "How does this infrastructure need to change in 2 years
      when the channel mix shifts?"
    A candidate who describes a clean measurement system without
    addressing org adoption and model assumptions has not met
    the Principal bar.`
    },

    // ==========================================
    // MARKETER - AI MARKETING
    // ==========================================
    {
        id: 'entry_marketing_senior_ai_marketing',
        dimension: 'Entry',
        family_name: 'AI Marketing Entry (Senior)',
        prompt_guidance: `Generate an AI marketing scenario appropriate for
    a Marketer interviewing at the Senior bar. The scenario must present
    a genuine decision point about AI in a marketing context — not a
    hypothetical where the answer is obviously yes or no.
    Vary the decision type across sessions: where to apply AI in a
    campaign workflow, how to manage brand safety with AI-generated content,
    how to evaluate AI-driven personalisation quality,
    whether AI attribution is trustworthy enough to act on.
    Senior bar: Can the candidate distinguish genuine AI value-add
    in marketing from AI for AI's sake?
    Do they reason about brand risk, content quality thresholds,
    and what happens when AI gets it wrong in a customer-facing context?
    Probe:
    - "How would you know if the AI-generated content is hurting
      brand perception rather than helping?"
    - "What is the minimum quality bar before you let AI
      generate customer-facing copy without human review?"
    - "What happens to customer trust if this AI feature
      produces a visibly wrong or offensive output?"
    - "What is your non-AI fallback if the model underperforms
      on a live campaign?"
    Reject candidates who treat AI as a pure efficiency gain
    with no brand or trust risk.`
    },
    {
        id: 'entry_marketing_principal_ai_marketing',
        dimension: 'Entry',
        family_name: 'AI Marketing Strategy Entry (Principal)',
        prompt_guidance: `Generate a strategic AI marketing decision at org scale,
    appropriate for a Marketer interviewing at the Principal bar.
    The scenario must involve a genuine strategic tradeoff —
    not a question where the right answer is self-evident.
    Vary the decision type across sessions: build vs buy AI marketing stack,
    AI personalisation at scale vs privacy constraints,
    AI content strategy vs brand consistency,
    org-level AI marketing transformation.
    Principal bar: Does the candidate reason about AI marketing strategy
    with concrete, defensible criteria?
    Do they think about competitive moat through first-party data,
    privacy regulation implications, and org capability gaps?
    Probe:
    - "What first-party data advantage does this strategy build
      over time — and what happens if that data becomes restricted?"
    - "How do you make the case for this AI investment to a
      CFO who wants immediate ROI?"
    - "What org capabilities do you need that you don't have today
      and how does that affect your sequencing?"
    - "What does this decision lock you into — and is that
      acceptable given how fast AI is moving?"
    A candidate who produces strong marketing logic without addressing
    data strategy, privacy risk, and org execution reality
    has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - PROGRAM MANAGEMENT
    // ==========================================
    {
        id: 'entry_project_manager_senior_program_management',
        dimension: 'Entry',
        family_name: 'Program Management Entry (Senior)',
        prompt_guidance: `Generate a program management challenge appropriate for
    a Project Manager interviewing at the Senior bar. The challenge must
    involve cross-functional coordination complexity — multiple teams,
    competing priorities, or unclear ownership. Choose a domain that has
    not already appeared in this session. Vary across: product launches,
    platform migrations, org restructures, vendor integrations,
    compliance programs.
    Senior bar: Does the candidate structure their answer across
    scope definition → stakeholder mapping → dependency management →
    risk identification → progress tracking?
    Do they distinguish between what they control and what they influence?
    Probe when steps are missing:
    - No scope definition: "How do you establish what is and isn't
      in scope when multiple teams have different views?"
    - No dependency management: "What are the critical path dependencies
      here and how do you manage them?"
    - No risk identification: "What are the top three things that could
      derail this program and what is your mitigation for each?"
    - No tracking: "How do you give leadership visibility without
      creating reporting overhead?"
    A candidate who describes a program plan without addressing
    cross-team dependencies and risk has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_program_management',
        dimension: 'Entry',
        family_name: 'Program Management Entry (Principal)',
        prompt_guidance: `Generate a program management challenge at portfolio or
    org transformation scale, appropriate for a Project Manager at the
    Principal bar. The challenge must involve multiple concurrent programs,
    resource contention, or strategic alignment complexity.
    Choose a domain that has not already appeared in this session.
    Vary across: multi-year transformation programs, platform standardisation
    across business units, M&A integration, org-wide process change.
    Principal bar: Does the candidate reason about program portfolio
    management — how programs interact, compete for resources,
    and align to strategic outcomes?
    Do they think about building program management capability,
    not just running a single program?
    Probe on:
    - "How do you resolve resource conflicts between two equally
      critical programs competing for the same team?"
    - "How do you maintain strategic alignment when the business
      direction changes mid-program?"
    - "What does good program governance look like at this scale —
      what decisions need escalation vs what should be resolved at program level?"
    - "How do you build the org's program management capability
      so it doesn't depend on you personally?"
    A candidate who reasons at single-program level without addressing
    portfolio complexity has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - DELIVERY
    // ==========================================
    {
        id: 'entry_project_manager_senior_delivery',
        dimension: 'Entry',
        family_name: 'Delivery Execution Entry (Senior)',
        prompt_guidance: `Generate a delivery execution challenge appropriate for
    a Project Manager interviewing at the Senior bar. The challenge must
    involve a real delivery pressure situation — scope creep, timeline
    slippage, team capacity issues, or quality vs speed tradeoffs.
    Choose a domain that has not already appeared in this session.
    Do not default to the same pressure type across sessions.
    Senior bar: Does the candidate make clear-headed tradeoff decisions
    under pressure rather than trying to solve everything at once?
    Do they communicate proactively and escalate at the right threshold?
    Probe when shallow:
    - "What specifically do you cut and what is your criteria
      for deciding what stays vs what goes?"
    - "At what point do you escalate vs absorb the problem yourself?"
    - "How do you maintain team morale when you're telling people
      to do more with less?"
    - "What would you do differently next time to avoid this situation?"
    A candidate who describes a delivery crisis without making
    explicit tradeoff decisions has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_delivery',
        dimension: 'Entry',
        family_name: 'Delivery Execution Entry (Principal)',
        prompt_guidance: `Generate a delivery challenge at org or platform scale,
    appropriate for a Project Manager at the Principal bar.
    The challenge must involve systemic delivery problems —
    not a single project failure but a pattern of delivery issues
    across multiple teams or programs.
    Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate diagnose root causes of systemic
    delivery failure rather than treating symptoms?
    Do they design process changes that scale without creating bureaucracy?
    Probe on:
    - "What is the root cause of the pattern you're seeing —
      is it process, people, tooling, or incentives?"
    - "How do you change delivery culture without mandating compliance
      from the top down?"
    - "What does good delivery look like in 18 months and how do you
      measure progress toward it?"
    - "Where does your proposed fix create new problems —
      what are the second-order effects?"
    A candidate who proposes process improvements without diagnosing
    root cause or addressing adoption has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - STAKEHOLDER MANAGEMENT
    // ==========================================
    {
        id: 'entry_project_manager_senior_stakeholder_management',
        dimension: 'Entry',
        family_name: 'Stakeholder Management Entry (Senior)',
        prompt_guidance: `Generate a stakeholder management challenge appropriate
    for a Project Manager interviewing at the Senior bar. The challenge
    must involve genuine stakeholder conflict or misalignment — not a
    situation where everyone agrees. Choose a domain that has not already
    appeared in this session. Vary across: executive sponsor conflict,
    business unit disagreement, vendor relationship tension,
    cross-functional priority conflict.
    Senior bar: Does the candidate understand the underlying interests
    of each stakeholder before trying to resolve the conflict?
    Do they find solutions that address root interests rather than
    just negotiating positions?
    Probe when shallow:
    - "What does each stakeholder actually care about underneath
      their stated position?"
    - "Who has the most to lose if this isn't resolved and
      how does that affect your approach?"
    - "What is your BATNA if you can't get alignment —
      what do you do if the conflict doesn't resolve?"
    - "How do you maintain the relationship after a difficult
      conversation where someone didn't get what they wanted?"
    A candidate who resolves stakeholder conflict by escalating
    or splitting the difference without addressing root interests
    has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_stakeholder_management',
        dimension: 'Entry',
        family_name: 'Stakeholder Management Entry (Principal)',
        prompt_guidance: `Generate a stakeholder management challenge at executive
    or board level, appropriate for a Project Manager at the Principal bar.
    The challenge must involve senior leadership alignment —
    C-suite conflict, board-level visibility, or cross-org political complexity.
    Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate understand organisational power
    dynamics and navigate them deliberately?
    Do they think about long-term relationship capital, not just
    resolving the immediate conflict?
    Probe on:
    - "Who are the informal power holders here — not just the
      org chart but who actually influences decisions?"
    - "How do you build credibility with a sceptical executive
      who didn't choose to work with you?"
    - "What relationship capital are you spending to resolve this
      and is it worth it?"
    - "How does this interaction affect your ability to get things
      done six months from now?"
    A candidate who manages executive stakeholders the same way
    they manage team-level stakeholders has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - METRICS & ACCOUNTABILITY
    // ==========================================
    {
        id: 'entry_project_manager_senior_metrics_accountability',
        dimension: 'Entry',
        family_name: 'Metrics & Accountability Entry (Senior)',
        prompt_guidance: `Generate a program metrics and accountability challenge
    appropriate for a Project Manager interviewing at the Senior bar.
    The challenge must involve a real measurement problem — not a
    reporting exercise. Choose a domain that has not already appeared
    in this session. Vary across: defining program health metrics,
    tracking team commitments, OKR alignment, velocity measurement,
    accountability when teams miss commitments.
    Senior bar: Does the candidate distinguish between lagging indicators
    (what already happened) and leading indicators (what predicts outcomes)?
    Do they design metrics that drive behaviour, not just measure it?
    Probe when shallow:
    - "What leading indicators would tell you two weeks early that
      this program is going off track?"
    - "How do you hold a team accountable for a missed commitment
      without damaging the relationship?"
    - "What does your weekly program health report tell leadership
      that a RAG status doesn't?"
    - "How do you know if your metrics are causing teams to game
      the system rather than improve delivery?"
    A candidate who describes RAG status and milestone tracking
    without leading indicators or accountability mechanisms
    has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_metrics_accountability',
        dimension: 'Entry',
        family_name: 'Metrics & Accountability Entry (Principal)',
        prompt_guidance: `Generate a program metrics and accountability challenge
    at org scale, appropriate for a Project Manager at the Principal bar.
    The challenge must involve designing a measurement system across
    multiple programs or teams — not tracking a single program.
    Choose a domain that has not already appeared in this session.
    Vary across: portfolio health dashboards, cross-team accountability
    frameworks, OKR cascading, executive reporting systems.
    Principal bar: Does the candidate design measurement systems that
    create genuine accountability without perverse incentives?
    Do they think about what behaviours their metrics will drive
    across the org, not just what they will measure?
    Probe on:
    - "What perverse incentives does this measurement system create —
      what will teams optimise for that you don't actually want?"
    - "How do you get teams to own their metrics rather than
      treating them as something imposed on them?"
    - "What does this system make invisible — what important things
      will you not see in this dashboard?"
    - "How does the measurement system need to evolve as programs
      mature from delivery to run-the-business?"
    A candidate who designs a comprehensive dashboard without
    addressing behavioural incentives and blind spots
    has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - RISK MANAGEMENT
    // ==========================================
    {
        id: 'entry_project_manager_senior_risk_management',
        dimension: 'Entry',
        family_name: 'Risk Management Entry (Senior)',
        prompt_guidance: `Generate a risk management challenge appropriate for
    a Project Manager interviewing at the Senior bar. The challenge must
    involve a real risk decision under uncertainty — not a risk register
    exercise. Choose a domain that has not already appeared in this session.
    Vary across: technical risk in new platform adoption, vendor dependency
    risk, regulatory compliance risk, resource risk, integration risk.
    Senior bar: Does the candidate distinguish between risks they can
    mitigate, risks they can transfer, and risks they must accept?
    Do they make risk-adjusted decisions rather than just identifying risks?
    Probe when shallow:
    - "What is the probability and impact of this risk — how did
      you arrive at those estimates?"
    - "What is your mitigation and what does it cost — is the
      mitigation worth the cost given the probability?"
    - "At what point does this risk become a live issue that
      requires escalation?"
    - "What risks are you NOT mitigating and why — what have
      you consciously decided to accept?"
    A candidate who produces a risk list without probability/impact
    assessment or mitigation cost analysis has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_risk_management',
        dimension: 'Entry',
        family_name: 'Risk Management Entry (Principal)',
        prompt_guidance: `Generate a risk management challenge at portfolio or
    strategic scale, appropriate for a Project Manager at the Principal bar.
    The challenge must involve systemic or strategic risk — not project-level
    operational risk. Choose a domain that has not already appeared in this
    session. Vary across: strategic dependency on a single vendor,
    regulatory change risk across a program portfolio,
    org capability risk for a transformation,
    concentration risk in a technology platform.
    Principal bar: Does the candidate reason about risk at portfolio level —
    how risks correlate and compound across programs?
    Do they think about building risk management capability,
    not just managing individual risks?
    Probe on:
    - "How do these risks correlate — if one materialises,
      which others become more likely?"
    - "What is your risk appetite at portfolio level —
      how much aggregate risk is acceptable?"
    - "How do you make strategic risk visible to the board
      without creating panic or paralysis?"
    - "What early warning system would give you 90 days notice
      that a strategic risk is materialising?"
    A candidate who manages portfolio risks as independent items
    without reasoning about correlation and compounding
    has not met the Principal bar.`
    },

    // ==========================================
    // PROJECT MANAGER - AI DELIVERY
    // ==========================================
    {
        id: 'entry_project_manager_senior_ai_delivery',
        dimension: 'Entry',
        family_name: 'AI Delivery Entry (Senior)',
        prompt_guidance: `Generate an AI project delivery challenge appropriate
    for a Project Manager interviewing at the Senior bar. The challenge
    must involve a delivery situation unique to AI projects — where
    requirements are fuzzy, model quality is probabilistic, or
    stakeholder expectations are misaligned with AI reality.
    Choose a domain that has not already appeared in this session.
    Vary across: LLM feature delivery, ML model integration,
    AI vendor evaluation, data pipeline for AI, AI tool rollout.
    Senior bar: Does the candidate understand what makes AI projects
    fundamentally different from traditional software delivery?
    Do they manage expectations around non-deterministic outputs
    and iterative quality improvement?
    Probe:
    - "How do you set stakeholder expectations when you cannot
      guarantee the model will perform at a specific quality level?"
    - "What does done mean for an AI feature — how do you know
      when it is ready to ship?"
    - "How do you manage a timeline when model training and
      evaluation cycles are unpredictable?"
    - "What is your escalation trigger when model quality is
      not improving despite iteration?"
    A candidate who manages an AI project like a traditional
    software delivery with fixed requirements and binary done/not-done
    has not met the Senior bar.`
    },
    {
        id: 'entry_project_manager_principal_ai_delivery',
        dimension: 'Entry',
        family_name: 'AI Delivery Strategy Entry (Principal)',
        prompt_guidance: `Generate a strategic AI delivery challenge at org scale,
    appropriate for a Project Manager at the Principal bar.
    The challenge must involve building AI delivery capability across
    multiple teams — not managing a single AI project.
    Choose a domain that has not already appeared in this session.
    Vary across: AI delivery governance framework,
    ML engineering and PM collaboration model,
    AI vendor strategy, org-wide AI project portfolio management.
    Principal bar: Does the candidate think about building repeatable
    AI delivery capability, not just delivering one AI project well?
    Do they address the unique governance needs of AI —
    ethics review, bias monitoring, model deprecation?
    Probe on:
    - "How do you standardise AI delivery across teams with
      very different technical maturity levels?"
    - "What governance framework do you put around AI projects
      that doesn't slow teams down unnecessarily?"
    - "How do you build PM capability to work effectively with
      ML engineers — what does that skill development look like?"
    - "What does responsible AI delivery mean operationally —
      not just as a principle but as a process?"
    A candidate who describes good single-project AI delivery
    without addressing org-level AI delivery capability
    has not met the Principal bar.`
    },

    // ==========================================
    // MARKETING — JUNIOR / LEADER GAPS
    // ==========================================
    {
        id: 'entry_marketing_junior_brand',
        dimension: 'Entry',
        family_name: 'Brand & Messaging Entry (Junior)',
        prompt_guidance: `Generate a brand or messaging challenge appropriate for
    a Marketer interviewing at the Junior bar. The challenge must involve
    a real execution decision — writing positioning copy, identifying the
    right audience for a message, or evaluating whether a creative concept
    is on-brand. Choose a domain that has not already appeared in this
    session. Vary across: B2C product launches, SaaS tool messaging,
    social campaign copy, email subject lines, landing page positioning.
    Junior bar: Can the candidate identify the target audience and their
    core need before writing or evaluating copy?
    Do they understand what makes messaging resonate vs fall flat?
    Probe when shallow:
    - "Who specifically is this message for — what do they care about
      and why does this message speak to that?"
    - "What is the one thing you want the reader to do or feel
      after seeing this?"
    - "How does this differ from how a competitor would say the same thing?"
    - "What would you change if this message was underperforming?"
    A candidate who writes copy without first identifying the audience
    and their core need has not met the Junior bar.`
    },
    {
        id: 'entry_marketing_junior_campaign',
        dimension: 'Entry',
        family_name: 'Campaign Execution Entry (Junior)',
        prompt_guidance: `Generate a campaign execution challenge appropriate for
    a Marketer interviewing at the Junior bar. The challenge must involve
    a real tactical decision — channel selection, creative brief,
    launch checklist, or basic campaign measurement. Choose a domain
    that has not already appeared in this session.
    Do not default to the same channel type across sessions.
    Junior bar: Can the candidate describe a complete campaign execution
    plan with clear success criteria?
    Do they think about the audience, the message, the channel,
    and the measurement — all four?
    Probe when incomplete:
    - "What channel are you using and why that one over the alternatives?"
    - "What does success look like — what specific number would tell
      you this campaign worked?"
    - "What would you do differently if the campaign is halfway through
      and not hitting its targets?"
    - "Who needs to approve this before it goes live?"
    A candidate who describes a campaign without defining success
    metrics has not met the Junior bar.`
    },
    {
        id: 'entry_marketing_junior_growth',
        dimension: 'Entry',
        family_name: 'Growth & Analytics Entry (Junior)',
        prompt_guidance: `Generate a growth or analytics challenge appropriate for
    a Marketer interviewing at the Junior bar. The challenge must involve
    basic data interpretation — reading a funnel, identifying a drop-off,
    or explaining what a metric means. Choose a domain that has not
    already appeared in this session.
    Junior bar: Can the candidate read marketing data and draw a simple,
    defensible conclusion from it?
    Do they know what questions to ask when a metric looks wrong?
    Probe when shallow:
    - "What does this number actually tell you — what would cause it
      to go up or down?"
    - "Is this metric good or bad — how do you know without a benchmark?"
    - "What would you look at next to understand why this is happening?"
    - "What action would you take based on this data?"
    A candidate who describes data without connecting it to a
    specific action has not met the Junior bar.`
    },
    {
        id: 'entry_marketing_leader_strategy',
        dimension: 'Entry',
        family_name: 'Marketing Strategy Entry (Leader)',
        prompt_guidance: `Generate a marketing strategy challenge at executive
    scale, appropriate for a Marketer interviewing at the Director/VP bar.
    The challenge must involve org-level strategic decisions —
    category ownership, brand architecture across a portfolio,
    marketing org design, or long-term competitive positioning.
    Choose a domain that has not already appeared in this session.
    Leader bar: Does the candidate reason about marketing as a
    business function, not just a campaign machine?
    Do they connect marketing strategy to revenue, competitive moat,
    and org capability?
    Probe on:
    - "How does this marketing strategy connect to the company's
      revenue model — where specifically does it drive growth?"
    - "What org capability do you need to execute this that
      you don't have today?"
    - "How do you know when to reposition vs double down on
      current positioning?"
    - "What does this strategy make harder to do — what are
      you giving up?"
    A candidate who describes marketing strategy without connecting
    it to business outcomes and org capability
    has not met the Leader bar.`
    },
    {
        id: 'entry_marketing_leader_campaign',
        dimension: 'Entry',
        family_name: 'Campaign Execution Entry (Leader)',
        prompt_guidance: `Generate a campaign execution challenge at org or
    portfolio scale, appropriate for a Marketer interviewing at the
    Director/VP bar. The challenge must involve designing or governing
    a campaign system across multiple teams or markets — not running
    a single campaign.
    Choose a domain that has not already appeared in this session.
    Leader bar: Does the candidate design for scale and governance —
    how do you maintain quality and consistency when you are not
    personally executing?
    Do they think about measurement systems and institutional learning?
    Probe on:
    - "How do you maintain creative quality when 8 agencies are
      executing in parallel?"
    - "What is your governance model — what decisions are centralised
      vs delegated?"
    - "How does the organisation learn from each campaign so the
      next one is better?"
    - "What breaks first when campaign volume doubles?"
    A candidate who describes campaign leadership as hands-on
    execution rather than system design has not met the Leader bar.`
    },
    {
        id: 'entry_marketing_leader_ai_marketing',
        dimension: 'Entry',
        family_name: 'AI Marketing Strategy Entry (Leader)',
        prompt_guidance: `Generate a strategic AI marketing challenge at
    executive scale, appropriate for a Marketer interviewing at the
    Director/VP bar. The challenge must involve org-level AI marketing
    decisions — build vs buy AI marketing stack, AI content strategy
    at scale, privacy and first-party data strategy, or AI marketing
    team capability building.
    Choose a domain that has not already appeared in this session.
    Leader bar: Does the candidate reason about AI marketing strategy
    as an executive — connecting AI investments to competitive advantage,
    revenue impact, and org capability?
    Do they think about what this decision locks them into long-term?
    Probe on:
    - "How do you make the case for this AI investment to the CFO —
      what is the ROI model?"
    - "What first-party data advantage does this build over time
      and how do you protect it?"
    - "How do you build the team capability to execute this —
      what skills do you hire vs develop?"
    - "What does this decision make harder to change in 2 years?"
    A candidate who describes AI marketing tactics without reasoning
    about strategic investment, data moat, and org capability
    has not met the Leader bar.`
    },

    // ==========================================
    // DATA SCIENTIST — ALL LEVELS
    // ==========================================
    {
        id: 'entry_data_junior_analytics',
        dimension: 'Entry',
        family_name: 'Analytics Entry (Junior)',
        prompt_guidance: `Generate a data analytics challenge appropriate for
    a Data Scientist interviewing at the Junior bar. The challenge must
    involve real data analysis work — SQL query design, data interpretation,
    statistical reasoning, or identifying patterns in a dataset.
    Choose a domain that has not already appeared in this session.
    Vary across: user behaviour analysis, product metrics,
    A/B test result interpretation, cohort analysis, funnel analysis.
    Junior bar: Can the candidate write correct SQL or describe the
    right analytical approach for the problem?
    Do they identify the right question before reaching for a query?
    Probe when shallow:
    - "What question are you actually trying to answer with this query?"
    - "What would cause this result to be misleading —
      what are the gotchas?"
    - "How would you validate that your query is returning
      the right data?"
    - "What would you look at next if this result is surprising?"
    A candidate who writes a query without first clarifying
    what question it answers has not met the Junior bar.`
    },
    {
        id: 'entry_data_junior_ml_design',
        dimension: 'Entry',
        family_name: 'ML Design Entry (Junior)',
        prompt_guidance: `Generate an ML problem framing challenge appropriate
    for a Data Scientist interviewing at the Junior bar. The challenge
    must involve selecting the right ML approach for a given problem —
    not implementing it. Choose a domain that has not already appeared
    in this session. Vary across: classification, regression,
    recommendation, anomaly detection, NLP tasks.
    Junior bar: Can the candidate identify whether ML is the right
    tool for the problem and choose a reasonable approach?
    Do they think about the training data requirements before
    proposing a solution?
    Probe when shallow:
    - "What training data do you need and do you have it?"
    - "How would you know if this model is working —
      what metric are you optimising for?"
    - "What is your baseline — what does the system do today
      without ML?"
    - "What are the consequences of a false positive vs
      a false negative here?"
    A candidate who proposes an ML solution without reasoning
    about data requirements and evaluation metrics
    has not met the Junior bar.`
    },
    {
        id: 'entry_data_junior_data_strategy',
        dimension: 'Entry',
        family_name: 'Data Strategy Entry (Junior)',
        prompt_guidance: `Generate a data quality or data communication challenge
    appropriate for a Data Scientist interviewing at the Junior bar.
    The challenge must involve explaining a data finding to a
    non-technical stakeholder or identifying a data quality issue.
    Choose a domain that has not already appeared in this session.
    Junior bar: Can the candidate communicate a data insight clearly
    without jargon? Do they identify the business implication,
    not just the statistical finding?
    Probe when shallow:
    - "How would you explain this finding to a marketing manager
      who doesn't know what a p-value is?"
    - "What is the business decision this finding should inform?"
    - "What data quality issues could make this finding wrong?"
    - "What would you need to be true before you'd act on this?"
    A candidate who communicates data findings in technical terms
    without translating to business impact has not met the Junior bar.`
    },
    {
        id: 'entry_data_senior_analytics',
        dimension: 'Entry',
        family_name: 'Analytics Entry (Senior)',
        prompt_guidance: `Generate a data analytics challenge appropriate for
    a Data Scientist interviewing at the Senior bar. The challenge must
    involve complex analytical reasoning — causal inference, experiment
    design, statistical modelling, or multi-dimensional analysis.
    Choose a domain that has not already appeared in this session.
    Vary across: experimentation platform design, causal analysis,
    segmentation strategy, predictive modelling approach.
    Senior bar: Does the candidate distinguish between correlation
    and causation? Do they design for statistical validity,
    not just analytical convenience?
    Probe when shallow:
    - "How do you establish causality here — not just correlation?"
    - "What confounders could make this analysis misleading?"
    - "How would you design an experiment to validate this finding?"
    - "What sample size do you need and how did you arrive at that?"
    A candidate who draws causal conclusions from observational
    data without addressing confounders has not met the Senior bar.`
    },
    {
        id: 'entry_data_senior_ml_design',
        dimension: 'Entry',
        family_name: 'ML System Design Entry (Senior)',
        prompt_guidance: `Generate an ML system design challenge appropriate
    for a Data Scientist interviewing at the Senior bar. The challenge
    must involve designing an end-to-end ML system — not just the model.
    Choose a domain that has not already appeared in this session.
    Vary across: recommendation systems, fraud detection,
    content ranking, demand forecasting, churn prediction.
    Senior bar: Does the candidate design the full pipeline —
    data ingestion, feature engineering, training, evaluation,
    serving, and monitoring?
    Do they address model degradation and retraining triggers?
    Probe when incomplete:
    - "How does this system handle feature drift over time?"
    - "What is your retraining trigger — how do you know
      when to retrain?"
    - "How do you serve this model at low latency —
      what is your serving architecture?"
    - "What monitoring do you put in place to detect
      silent model degradation?"
    A candidate who designs only the model without the
    surrounding system has not met the Senior bar.`
    },
    {
        id: 'entry_data_senior_data_strategy',
        dimension: 'Entry',
        family_name: 'Data Strategy Entry (Senior)',
        prompt_guidance: `Generate a data strategy challenge appropriate for
    a Data Scientist interviewing at the Senior bar. The challenge must
    involve influencing product or business decisions with data —
    not just analysing data. Choose a domain that has not already
    appeared in this session. Vary across: defining success metrics
    for a new product, making a build vs buy data infrastructure
    decision, designing an experimentation roadmap.
    Senior bar: Does the candidate connect data strategy to
    business outcomes? Do they identify what data capability
    the organisation needs and how to build it?
    Probe when shallow:
    - "How do you get the product team to act on this analysis
      rather than ignore it?"
    - "What data capability are you building here —
      what will be easier to do in 6 months because of this work?"
    - "What is the cost of getting this wrong —
      what is the downside risk?"
    - "How do you measure the impact of your data work itself?"
    A candidate who does excellent analysis but cannot connect
    it to business decisions has not met the Senior bar.`
    },
    {
        id: 'entry_data_principal_analytics',
        dimension: 'Entry',
        family_name: 'Analytics Entry (Principal)',
        prompt_guidance: `Generate an advanced analytics challenge appropriate
    for a Data Scientist interviewing at the Principal bar. The challenge
    must involve methodology design at scale — designing an experimentation
    platform, solving a measurement problem affecting multiple teams,
    or establishing analytical standards across an organisation.
    Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate design analytical systems
    that scale across teams, not just solve a single analysis problem?
    Do they think about how their methodology choices affect
    what the organisation can and cannot learn?
    Probe on:
    - "How does this methodology scale when 20 teams are running
      experiments simultaneously?"
    - "What does this approach make impossible to measure —
      and is that an acceptable tradeoff?"
    - "How do you prevent p-hacking and multiple comparisons
      problems at org scale?"
    - "How do you get teams with different statistical maturity
      to use this correctly?"
    A candidate who designs a sophisticated analysis without
    addressing org adoption and scale has not met the Principal bar.`
    },
    {
        id: 'entry_data_principal_ml_design',
        dimension: 'Entry',
        family_name: 'ML Platform Design Entry (Principal)',
        prompt_guidance: `Generate an ML platform design challenge appropriate
    for a Data Scientist interviewing at the Principal bar. The challenge
    must involve designing infrastructure that multiple teams depend on —
    feature stores, model registries, training pipelines, evaluation
    platforms. Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate reason about ML infrastructure
    as a platform that enables other teams?
    Do they think about versioning, reproducibility, and
    governance as first-class concerns?
    Probe on:
    - "How do you handle breaking changes to shared features
      that multiple models depend on?"
    - "How do you ensure reproducibility — can you retrain a
      model from 6 months ago and get the same result?"
    - "What governance do you put around model deployment —
      who can ship what to production?"
    - "How does this platform need to evolve as the number of
      models grows from 10 to 100?"
    A candidate who designs a single-team ML system and calls
    it a platform has not met the Principal bar.`
    },
    {
        id: 'entry_data_principal_data_strategy',
        dimension: 'Entry',
        family_name: 'Data Strategy Entry (Principal)',
        prompt_guidance: `Generate a data strategy challenge at org scale,
    appropriate for a Data Scientist interviewing at the Principal bar.
    The challenge must involve strategic data decisions — data mesh vs
    centralised data platform, privacy-preserving analytics,
    data monetisation, or cross-org data sharing.
    Choose a domain that has not already appeared in this session.
    Principal bar: Does the candidate reason about data as a
    strategic asset, not just an analytical input?
    Do they address data governance, privacy, and competitive
    moat through data?
    Probe on:
    - "How does this data strategy create competitive advantage —
      what does it enable that competitors cannot easily copy?"
    - "What privacy and regulatory constraints shape this strategy
      and how do you design around them?"
    - "What does centralising vs decentralising this data capability
      cost you — what do you lose with each approach?"
    - "How does this strategy need to evolve as privacy regulation
      tightens over the next 3 years?"
    A candidate who discusses data strategy without addressing
    privacy, governance, and competitive moat
    has not met the Principal bar.`
    },
    {
        id: 'entry_data_leader_analytics',
        dimension: 'Entry',
        family_name: 'Analytics Entry (Leader)',
        prompt_guidance: `Generate an analytics leadership challenge appropriate
    for a Data Scientist interviewing at the Director/VP bar. The challenge
    must involve building org-wide analytical capability — not doing
    analysis personally. Choose a domain that has not already appeared
    in this session. Vary across: data literacy programmes,
    analytical centre of excellence design,
    democratising data access across business units.
    Leader bar: Does the candidate think about analytical capability
    as an organisational muscle to build, not a service to provide?
    Do they address culture change and adoption, not just tooling?
    Probe on:
    - "How do you build data literacy in teams that have always
      made decisions on gut feel?"
    - "What does self-service analytics actually mean in practice —
      what can teams do without coming to you?"
    - "How do you measure whether the organisation is becoming
      more data-driven?"
    - "What is the right size and shape of a centralised data
      team vs embedded analysts?"
    A candidate who describes analytical leadership as doing
    better analysis rather than building capability
    has not met the Leader bar.`
    },
    {
        id: 'entry_data_leader_ml_design',
        dimension: 'Entry',
        family_name: 'ML Strategy Entry (Leader)',
        prompt_guidance: `Generate an ML strategy challenge at executive scale,
    appropriate for a Data Scientist interviewing at the Director/VP bar.
    The challenge must involve org-level ML investment decisions —
    build vs buy ML platform, ML talent strategy,
    responsible AI governance, or ML roadmap prioritisation.
    Choose a domain that has not already appeared in this session.
    Leader bar: Does the candidate reason about ML as a
    business capability investment, not a technical project?
    Do they connect ML strategy to competitive advantage,
    org structure, and responsible deployment?
    Probe on:
    - "How do you decide which ML investments to prioritise
      when everything seems equally important?"
    - "What ML capability do you build vs buy —
      and what makes that the right call for your org?"
    - "How do you govern responsible AI deployment at org scale
      without slowing teams down?"
    - "What does the ML team look like in 3 years and how do
      you build toward that from today?"
    A candidate who discusses ML strategy without addressing
    org structure, talent, and responsible deployment
    has not met the Leader bar.`
    },
    {
        id: 'entry_data_leader_data_strategy',
        dimension: 'Entry',
        family_name: 'Data Strategy Entry (Leader)',
        prompt_guidance: `Generate a data strategy challenge at executive scale,
    appropriate for a Data Scientist interviewing at the Director/VP bar.
    The challenge must involve C-suite level data decisions —
    data as a product, data monetisation, data partnership strategy,
    or org-wide data governance framework.
    Choose a domain that has not already appeared in this session.
    Leader bar: Does the candidate reason about data strategy
    at the board level — connecting data assets to business value,
    regulatory risk, and competitive positioning?
    Do they think about data as something to govern and monetise,
    not just analyse?
    Probe on:
    - "How do you make the case to the board that data is a
      strategic asset worth investing in?"
    - "What data assets does this organisation have that
      competitors don't — and how do you protect them?"
    - "How does your data strategy change if a key regulation
      restricts your ability to use customer data?"
    - "What does data governance mean operationally —
      not as a principle but as a process with owners and teeth?"
    A candidate who discusses data strategy as a technical
    architecture problem rather than a business strategy problem
    has not met the Leader bar.`
    }
]
