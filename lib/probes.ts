/**
 * PROBE DEFINITIONS
 * 
 * Probes are evaluation intents that add freshness while preserving deterministic Entry Family calibration.
 * 
 * CRITICAL RULES:
 * - Each probe maps to exactly one Entry family
 * - Probes are randomized per session, not per question
 * - Replay sessions reuse original probe selections
 * - Evaluator calibration binds to (entry_family + probe_id)
 * - No difficulty weighting, no UI exposure
 */

export interface Probe {
    id: string
    entry_family: string
    dimension: string
    intent: string  // Evaluator-facing evaluation intent
}

export const PROBES: Probe[] = [
    // ==========================================
    // PRODUCT MANAGER - JUNIOR - METRICS
    // ==========================================
    {
        id: 'probe_pm_junior_metrics_baseline',
        entry_family: 'entry_pm_junior_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can identify 2-3 relevant success metrics and explain how to measure them using structured thinking.'
    },
    {
        id: 'probe_pm_junior_metrics_tradeoffs',
        entry_family: 'entry_pm_junior_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can recognize when two metrics conflict and articulate a basic prioritization approach.'
    },

    // ==========================================
    // PRODUCT MANAGER - SENIOR - METRICS
    // ==========================================
    {
        id: 'probe_pm_senior_metrics_alignment',
        entry_family: 'entry_pm_senior_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can align product metrics to business outcomes and justify trade-offs between competing goals.'
    },
    {
        id: 'probe_pm_senior_metrics_leading_lagging',
        entry_family: 'entry_pm_senior_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can design a metric framework with both leading and lagging indicators scoped to product ownership.'
    },

    // ==========================================
    // PRODUCT MANAGER - PRINCIPAL - METRICS
    // ==========================================
    {
        id: 'probe_pm_principal_metrics_system',
        entry_family: 'entry_pm_principal_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can design metric frameworks that scale across multiple teams and surface failure modes early.'
    },
    {
        id: 'probe_pm_principal_metrics_instrumentation',
        entry_family: 'entry_pm_principal_metrics',
        dimension: 'metrics',
        intent: 'Evaluate whether the candidate can architect strategic instrumentation that exposes systemic health across product surfaces.'
    },

    // ==========================================
    // PRODUCT MANAGER - JUNIOR - DISCOVERY
    // ==========================================
    {
        id: 'probe_pm_junior_discovery_process',
        entry_family: 'entry_pm_junior_discovery',
        dimension: 'discovery',
        intent: 'Evaluate whether the candidate can articulate a clear research plan and follow structured discovery methods.'
    },
    {
        id: 'probe_pm_junior_discovery_validation',
        entry_family: 'entry_pm_junior_discovery',
        dimension: 'discovery',
        intent: 'Evaluate whether the candidate can design a simple user validation approach to test a stated hypothesis.'
    },

    // ==========================================
    // PRODUCT MANAGER - SENIOR - DISCOVERY
    // ==========================================
    {
        id: 'probe_pm_senior_discovery_signal',
        entry_family: 'entry_pm_senior_discovery',
        dimension: 'discovery',
        intent: 'Evaluate whether the candidate can distinguish signal from noise and prioritize high-impact user pain points with judgment.'
    },
    {
        id: 'probe_pm_senior_discovery_continuous',
        entry_family: 'entry_pm_senior_discovery',
        dimension: 'discovery',
        intent: 'Evaluate whether the candidate can design continuous discovery loops that feed directly into product decisions.'
    },

    // ==========================================
    // SOFTWARE ENGINEER - JUNIOR - WRITE PATH
    // ==========================================
    {
        id: 'probe_sde_junior_write_basic',
        entry_family: 'entry_sde_junior_write_path',
        dimension: 'write_path',
        intent: 'Evaluate whether the candidate can implement a basic data ingestion flow with correct error handling and validation.'
    },
    {
        id: 'probe_sde_junior_write_idempotency',
        entry_family: 'entry_sde_junior_write_path',
        dimension: 'write_path',
        intent: 'Evaluate whether the candidate understands idempotency and can implement basic retry logic for write operations.'
    },

    // ==========================================
    // SOFTWARE ENGINEER - SENIOR - WRITE PATH
    // ==========================================
    {
        id: 'probe_sde_senior_write_scale',
        entry_family: 'entry_sde_senior_write_path',
        dimension: 'write_path',
        intent: 'Evaluate whether the candidate can design high-volume ingestion with proper partitioning, backpressure, and failure modes.'
    },
    {
        id: 'probe_sde_senior_write_consistency',
        entry_family: 'entry_sde_senior_write_path',
        dimension: 'write_path',
        intent: 'Evaluate whether the candidate can reason about consistency guarantees and design appropriate write semantics at scale.'
    },

    // ==========================================
    // SOFTWARE ENGINEER - JUNIOR - READ PATH
    // ==========================================
    {
        id: 'probe_sde_junior_read_query',
        entry_family: 'entry_sde_junior_read_path',
        dimension: 'read_path',
        intent: 'Evaluate whether the candidate can retrieve and aggregate data efficiently for a single user with correct query design.'
    },
    {
        id: 'probe_sde_junior_read_cache',
        entry_family: 'entry_sde_junior_read_path',
        dimension: 'read_path',
        intent: 'Evaluate whether the candidate understands basic caching strategies and can apply them to reduce read latency.'
    },

    // ==========================================
    // SOFTWARE ENGINEER - SENIOR - READ PATH
    // ==========================================
    {
        id: 'probe_sde_senior_read_timeline',
        entry_family: 'entry_sde_senior_read_path',
        dimension: 'read_path',
        intent: 'Evaluate whether the candidate can design timeline construction with caching, denormalization, and latency optimization.'
    },
    {
        id: 'probe_sde_senior_read_fanout',
        entry_family: 'entry_sde_senior_read_path',
        dimension: 'read_path',
        intent: 'Evaluate whether the candidate can design fanout strategies that balance freshness, latency, and resource costs.'
    },

    // ==========================================
    // LEADERSHIP - SENIOR - VISION
    // ==========================================
    {
        id: 'probe_leadership_senior_vision_clarity',
        entry_family: 'entry_leadership_senior_vision',
        dimension: 'vision',
        intent: 'Evaluate whether the candidate can translate business objectives into actionable team direction with strategic clarity.'
    },
    {
        id: 'probe_leadership_senior_vision_alignment',
        entry_family: 'entry_leadership_senior_vision',
        dimension: 'vision',
        intent: 'Evaluate whether the candidate can align cross-functional teams around a shared vision and communicate trade-offs effectively.'
    },

    // ==========================================
    // PM - AI FLUENCY PROBES (Full Taxonomy)
    // ==========================================

    // PM JUNIOR
    {
        id: 'probe_pm_junior_ai_awareness',
        entry_family: 'entry_pm_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can articulate what an AI feature does functionally and distinguish AI-powered features from rule-based systems without making incorrect technical claims.'
    },
    {
        id: 'probe_pm_junior_ai_feature_understanding',
        entry_family: 'entry_pm_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can describe an AI feature they have used or built, explaining its user-facing behavior and basic technical mechanism at a conceptual level.'
    },

    // PM SENIOR
    {
        id: 'probe_pm_senior_ai_evaluation_framework',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands how AI quality is measured beyond surface metrics, can distinguish model output quality from product metrics, and can design evaluation frameworks with offline/online layering.'
    },
    {
        id: 'probe_pm_senior_ai_hallucination_mitigation',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate has a concrete hallucination mitigation strategy including grounding, guardrails, confidence scoring, and fallback flows — not just disclaimers.'
    },

    // PM STAFF
    {
        id: 'probe_pm_staff_ai_architecture_tradeoff',
        entry_family: 'entry_pm_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Justify architectural decisions for AI features, articulate trade-offs between approaches (RAG vs fine-tuning), constraint awareness including context window limits and latency.'
    },
    {
        id: 'probe_pm_staff_ai_cost_scaling',
        entry_family: 'entry_pm_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Reason about AI cost scaling, identify architectural levers (caching, model tiering, token optimization), make prioritized cost reduction decisions.'
    },

    // PM PRINCIPAL
    {
        id: 'probe_pm_principal_ai_drift_detection',
        entry_family: 'entry_pm_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Diagnose model drift vs expectation shift, identify distribution shift signals, apply structured diagnostic reasoning rather than defaulting to retraining.'
    },
    {
        id: 'probe_pm_principal_ai_orchestration',
        entry_family: 'entry_pm_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Understand orchestration beyond single API calls, reason about tool-calling architectures, context management, and multi-step AI pipeline design.'
    },

    // PM LEADER
    {
        id: 'probe_pm_leader_ai_governance_framework',
        entry_family: 'entry_pm_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Design org-level AI governance, frame portfolio-level AI investment trade-offs, articulate build vs buy decisions for AI capabilities with ROI modeling.'
    },
    {
        id: 'probe_pm_leader_ai_risk_governance',
        entry_family: 'entry_pm_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Frame AI risks honestly at org level, articulate which risks were deliberately not mitigated at launch and why, governance maturity including regulatory and bias trade-offs.'
    },

    // ==========================================
    // SDE - AI FLUENCY PROBES
    // ==========================================

    // SDE JUNIOR
    {
        id: 'sde_junior_ai_integration_basics',
        entry_family: 'entry_sde_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can integrate a third-party AI API correctly — do they handle response parsing, error cases, rate limiting, and token limits without being told to.'
    },
    {
        id: 'sde_junior_ai_prompt_design',
        entry_family: 'entry_sde_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands basic prompt design — do they know how to structure a prompt for reliable outputs and can they explain why prompt wording affects model behaviour.'
    },

    // SDE SENIOR
    {
        id: 'sde_ai_reliability_strategy',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design highly available AI services with robust fallback mechanisms, rate limiting, and failure handling when depending on unreliable third-party LLM endpoints.'
    },
    {
        id: 'sde_ai_evaluation_pipeline',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can build comprehensive offline and online model validation pipelines involving automated metrics, human-in-the-loop logic, and safe deployment strategies to prevent silent degradation.'
    },

    // SDE STAFF
    {
        id: 'sde_staff_ai_system_design_tradeoff',
        entry_family: 'entry_sde_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Design system architectures for new ML features, navigating trade-offs between RAG, fine-tuning, and zero-shot while balancing latency constraints against accuracy needs.'
    },
    {
        id: 'sde_staff_ai_orchestration_layer',
        entry_family: 'entry_sde_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Design multi-step LLM workflows and agentic swarms, managing tool-calling logic, state, and parallel execution under strict timeouts.'
    },

    // SDE PRINCIPAL
    {
        id: 'sde_principal_ai_cost_optimization',
        entry_family: 'entry_sde_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Scale expensive AI features by applying token economics, semantic caching, and model routing to manage budget limits and sudden bursts in long-context queries.'
    },
    {
        id: 'sde_principal_ai_drift_diagnosis',
        entry_family: 'entry_sde_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Investigate sudden drops in model quality through observability, data drift detection, and prompt degradation analysis without blindly rolling back without root cause analysis.'
    },

    // SDE LEADER
    {
        id: 'sde_leader_ai_security_surface',
        entry_family: 'entry_sde_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Secure enterprise AI applications by preventing prompt injection, applying PII redaction, and sanitizing outputs to stop data exfiltration instead of relying only on regex filters.'
    },
    {
        id: 'sde_leader_ai_platform_strategy',
        entry_family: 'entry_sde_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate reasons about org-level AI platform strategy — do they think about build vs buy for ML infrastructure, how to staff AI platform teams, and how to govern AI usage across engineering at scale.'
    },

    // ==========================================
    // DATA SCIENTIST - AI FLUENCY PROBES
    // ==========================================

    // DATA JUNIOR
    {
        id: 'probe_data_junior_ai_pipeline',
        entry_family: 'entry_data_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can describe data pipelines for AI systems, explain preprocessing applied, and validate data quality for ML model consumption.'
    },
    {
        id: 'probe_data_junior_ai_feature_engineering',
        entry_family: 'entry_data_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands basic feature engineering for ML — do they identify which data transformations are needed and why, and can they explain the impact of feature quality on model output.'
    },

    // DATA SENIOR
    {
        id: 'probe_data_senior_ai_lifecycle',
        entry_family: 'entry_data_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design end-to-end ML pipelines, implement drift detection, build evaluation frameworks, and reason about model degradation with operational rigor.'
    },
    {
        id: 'probe_data_senior_ai_experimentation',
        entry_family: 'entry_data_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate designs rigorous ML experiments — do they address train/validation/test split discipline, prevent data leakage, and reason about whether offline evaluation results will hold in production.'
    },

    // DATA STAFF
    {
        id: 'probe_data_staff_ai_platform',
        entry_family: 'entry_data_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design ML experimentation infrastructure at scale — do they think about feature stores, experiment tracking, and how to enable multiple teams to run parallel experiments without interference.'
    },
    {
        id: 'probe_data_staff_ai_ab_testing',
        entry_family: 'entry_data_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate designs A/B testing frameworks for ML models — do they address online vs offline evaluation gaps, novelty effects, and how to attribute metric changes to model changes vs other factors.'
    },

    // DATA PRINCIPAL
    {
        id: 'probe_data_principal_ai_platform',
        entry_family: 'entry_data_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can architect organization-wide ML platforms, design cross-team feature sharing, and build governance for model lifecycle management with system-level depth.'
    },
    {
        id: 'probe_data_principal_ai_governance',
        entry_family: 'entry_data_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate reasons about ML governance at org scale — do they address model lineage, audit trails, bias monitoring, and how to operationalise responsible AI as a process rather than a principle.'
    },

    // DATA LEADER
    {
        id: 'probe_data_leader_ai_strategy',
        entry_family: 'entry_data_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can frame AI investment decisions, evaluate build vs buy for ML capabilities, and design org-wide data/AI strategy with ROI modeling.'
    },
    {
        id: 'probe_data_leader_ai_org_design',
        entry_family: 'entry_data_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate thinks about AI org design — do they reason about how to structure data science and ML engineering teams, what capabilities to centralise vs embed in product teams, and how to build AI talent pipelines.'
    },

    // ==========================================
    // MARKETING - AI FLUENCY PROBES
    // ==========================================

    // MARKETING JUNIOR
    {
        id: 'probe_marketing_junior_ai_tools',
        entry_family: 'entry_marketing_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands how AI tools augment marketing workflows and can distinguish AI-powered capabilities from rule-based automation in campaign management.'
    },
    {
        id: 'probe_marketing_junior_ai_content_tools',
        entry_family: 'entry_marketing_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands how AI content generation tools work in practice — do they know what inputs drive quality outputs and can they identify when AI-generated content needs human review.'
    },

    // MARKETING SENIOR
    {
        id: 'probe_marketing_senior_ai_optimization',
        entry_family: 'entry_marketing_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can articulate how AI improves targeting, personalization, and attribution, and can reason about AI-generated content quality and brand safety trade-offs.'
    },
    {
        id: 'probe_marketing_senior_ai_attribution',
        entry_family: 'entry_marketing_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate reasons about AI-driven attribution models — do they understand the assumptions baked into algorithmic attribution, what the model gets wrong, and how to communicate its limitations to stakeholders who want certainty.'
    },

    // MARKETING STAFF
    {
        id: 'probe_marketing_staff_ai_personalisation',
        entry_family: 'entry_marketing_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design AI-driven personalisation systems at scale — do they think about data requirements, model quality thresholds, privacy constraints, and how to measure personalisation quality beyond click rates.'
    },
    {
        id: 'probe_marketing_staff_ai_campaign_intelligence',
        entry_family: 'entry_marketing_staff_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can build AI-powered campaign intelligence systems — do they reason about what signals to feed the model, how to validate model recommendations before acting on them, and how to handle model drift in a fast-moving campaign context.'
    },

    // MARKETING PRINCIPAL
    {
        id: 'probe_marketing_principal_ai_personalization',
        entry_family: 'entry_marketing_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can architect AI-driven personalization systems, design experimentation frameworks for AI marketing, and reason about privacy-AI trade-offs at scale.'
    },
    {
        id: 'probe_marketing_principal_ai_privacy',
        entry_family: 'entry_marketing_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate reasons about privacy-AI tradeoffs in marketing at scale — do they address first-party data strategy, consent frameworks, and how to maintain personalisation quality as third-party data access diminishes.'
    },

    // MARKETING LEADER
    {
        id: 'probe_marketing_leader_ai_transformation',
        entry_family: 'entry_marketing_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can frame org-wide AI marketing strategy, evaluate build vs buy for marketing AI, and model ROI for AI marketing investments with portfolio reasoning.'
    },
    {
        id: 'probe_marketing_leader_ai_capability',
        entry_family: 'entry_marketing_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate thinks about building AI marketing capability org-wide — do they reason about team upskilling, tool selection governance, and how to create a culture of responsible AI experimentation in marketing.'
    },

    // ==========================================
    // PM - SENIOR - PRODUCT DESIGN
    // ==========================================
    {
        id: 'probe_pm_senior_product_design_structure',
        entry_family: 'entry_pm_senior_product_design',
        dimension: 'Product Design',
        intent: 'Evaluate whether the candidate applies a structured design framework unprompted — specifically whether they segment users before defining the problem, and define the problem before proposing solutions.'
    },
    {
        id: 'probe_pm_senior_product_design_tradeoffs',
        entry_family: 'entry_pm_senior_product_design',
        dimension: 'Product Design',
        intent: 'Evaluate whether the candidate proactively surfaces design tradeoffs and can defend a specific design decision against a competing approach — not just describe what they built.'
    },

    // ==========================================
    // PM - PRINCIPAL - PRODUCT DESIGN
    // ==========================================
    {
        id: 'probe_pm_principal_product_design_systems',
        entry_family: 'entry_pm_principal_product_design',
        dimension: 'Product Design',
        intent: 'Evaluate whether the candidate thinks in systems and ecosystems — do they consider how their design decision affects adjacent teams, third-party developers, or platform extensibility.'
    },
    {
        id: 'probe_pm_principal_product_design_sequencing',
        entry_family: 'entry_pm_principal_product_design',
        dimension: 'Product Design',
        intent: 'Evaluate whether the candidate can articulate a deliberate build sequencing strategy — what to ship first, what to defer, and why the order matters for learning and risk reduction.'
    },

    // ==========================================
    // PM - SENIOR - EXECUTION DIAGNOSIS
    // ==========================================
    {
        id: 'probe_pm_senior_execution_hypothesis_tree',
        entry_family: 'entry_pm_senior_execution_diagnosis',
        dimension: 'Execution',
        intent: 'Evaluate whether the candidate builds a structured hypothesis tree before reaching for data — do they systematically separate internal vs external causes before investigating.'
    },
    {
        id: 'probe_pm_senior_execution_data_literacy',
        entry_family: 'entry_pm_senior_execution_diagnosis',
        dimension: 'Execution',
        intent: 'Evaluate data literacy specifically — can the candidate identify exactly which data cuts they need, articulate why, and reason about what a given data pattern would confirm or rule out.'
    },

    // ==========================================
    // PM - SENIOR - AI PRODUCT
    // ==========================================
    {
        id: 'probe_pm_senior_ai_product_failure_modes',
        entry_family: 'entry_pm_senior_ai_product',
        dimension: 'AI Product',
        intent: 'Evaluate whether the candidate reasons about AI failure modes proactively — do they think about what happens when the model is wrong, how users are affected, and how the product recovers.'
    },
    {
        id: 'probe_pm_senior_ai_product_value_vs_hype',
        entry_family: 'entry_pm_senior_ai_product',
        dimension: 'AI Product',
        intent: 'Evaluate whether the candidate can distinguish genuine AI value-add from AI for AI\'s sake — do they apply a clear threshold test for when AI is the right solution vs a simpler deterministic approach.'
    },

    // ==========================================
    // PM - PRINCIPAL - AI STRATEGY
    // ==========================================
    {
        id: 'probe_pm_principal_ai_strategy_reversibility',
        entry_family: 'entry_pm_principal_ai_strategy',
        dimension: 'AI Product',
        intent: 'Evaluate whether the candidate reasons about reversibility and lock-in risk when making AI platform decisions — do they distinguish one-way from two-way doors.'
    },
    {
        id: 'probe_pm_principal_ai_strategy_org_implications',
        entry_family: 'entry_pm_principal_ai_strategy',
        dimension: 'AI Product',
        intent: 'Evaluate whether the candidate thinks through org capability gaps and hiring/build implications of an AI strategy decision — not just the product logic but the execution reality.'
    },

    // ==========================================
    // SDE - SYSTEM DESIGN PROBES
    // ==========================================
    {
        id: 'probe_sde_senior_system_design_requirements',
        entry_family: 'entry_sde_senior_system_design',
        dimension: 'System Design',
        intent: 'Evaluate whether the candidate clarifies requirements and scale before designing — do they ask about DAU, read/write ratio, latency requirements, and consistency needs before drawing components.'
    },
    {
        id: 'probe_sde_senior_system_design_tradeoffs',
        entry_family: 'entry_sde_senior_system_design',
        dimension: 'System Design',
        intent: 'Evaluate whether the candidate proactively reasons about architectural tradeoffs — do they acknowledge what they gave up with each major design decision without being prompted.'
    },
    {
        id: 'probe_sde_principal_system_design_platform',
        entry_family: 'entry_sde_principal_system_design',
        dimension: 'System Design',
        intent: 'Evaluate whether the candidate reasons at platform level — do they think about API contracts, versioning, and how their design affects teams building on top of it.'
    },
    {
        id: 'probe_sde_principal_system_design_operations',
        entry_family: 'entry_sde_principal_system_design',
        dimension: 'System Design',
        intent: 'Evaluate whether the candidate reasons about long-term operational reality — do they address on-call burden, runbooks, and what makes the system easy or hard to operate at scale.'
    },

    // ==========================================
    // SDE - AI SYSTEMS PROBES
    // ==========================================
    {
        id: 'probe_sde_senior_ai_systems_nondeterminism',
        entry_family: 'entry_sde_senior_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate reasons differently about AI components vs deterministic ones — do they proactively address non-determinism, quality degradation, and what correct means for probabilistic output.'
    },
    {
        id: 'probe_sde_senior_ai_systems_fallback',
        entry_family: 'entry_sde_senior_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate has concrete fallback strategies for AI component failure — not just awareness that fallbacks are needed, but specific mechanisms and trigger conditions.'
    },
    {
        id: 'probe_sde_principal_ai_systems_platform',
        entry_family: 'entry_sde_principal_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate thinks about AI infrastructure as a multi-team platform — do they address model versioning, cost attribution, and how the platform enables or constrains dependent teams.'
    },
    {
        id: 'probe_sde_principal_ai_systems_governance',
        entry_family: 'entry_sde_principal_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate addresses data governance, model lineage, and compliance at platform scale — not just as an afterthought but as first-class design constraints.'
    },

    // ==========================================
    // MARKETING - STRATEGY PROBES
    // ==========================================
    {
        id: 'probe_marketing_senior_strategy_positioning',
        entry_family: 'entry_marketing_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate makes deliberate positioning choices — do they explicitly state what they are NOT doing and why, rather than trying to appeal to everyone.'
    },
    {
        id: 'probe_marketing_senior_strategy_tradeoffs',
        entry_family: 'entry_marketing_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate reasons about strategic tradeoffs — do they acknowledge what their strategy gives up, not just what it gains.'
    },
    {
        id: 'probe_marketing_principal_strategy_portfolio',
        entry_family: 'entry_marketing_principal_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate reasons at portfolio level — do they think about where to invest, where to harvest, and where to exit across multiple segments or products.'
    },
    {
        id: 'probe_marketing_principal_strategy_category',
        entry_family: 'entry_marketing_principal_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate thinks about long-term category creation — do they reason about what winning the category looks like in 3 years and what must be true today to get there.'
    },

    // ==========================================
    // MARKETING - CAMPAIGN PROBES
    // ==========================================
    {
        id: 'probe_marketing_senior_campaign_measurement',
        entry_family: 'entry_marketing_senior_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate connects campaign execution to measurable business outcomes — do they design for learning and attribution from the start, not as an afterthought.'
    },
    {
        id: 'probe_marketing_senior_campaign_channels',
        entry_family: 'entry_marketing_senior_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate thinks in channel systems — do they reason about how channels reinforce each other rather than treating each channel as an isolated tactic.'
    },
    {
        id: 'probe_marketing_principal_campaign_scale',
        entry_family: 'entry_marketing_principal_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate designs for scale and repeatability — do they think about what breaks when volume increases 10x and how to build institutional campaign knowledge.'
    },
    {
        id: 'probe_marketing_principal_campaign_governance',
        entry_family: 'entry_marketing_principal_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate reasons about brand governance at scale — do they address how to maintain consistency when multiple teams execute independently.'
    },

    // ==========================================
    // MARKETING - GROWTH PROBES
    // ==========================================
    {
        id: 'probe_marketing_senior_growth_hypothesis',
        entry_family: 'entry_marketing_senior_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate builds a clear hypothesis before reaching for a tactic — do they state what they believe is true and what data would prove it wrong.'
    },
    {
        id: 'probe_marketing_senior_growth_data_limits',
        entry_family: 'entry_marketing_senior_growth',
        dimension: 'Growth',
        intent: 'Evaluate data literacy — do they acknowledge the limits of their measurement approach and identify specifically what their data would overcount, undercount, or miss entirely.'
    },
    {
        id: 'probe_marketing_principal_growth_infrastructure',
        entry_family: 'entry_marketing_principal_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate thinks about measurement as a strategic capability — do they reason about data infrastructure, model assumptions, and org adoption as first-class constraints.'
    },
    {
        id: 'probe_marketing_principal_growth_assumptions',
        entry_family: 'entry_marketing_principal_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate surfaces and challenges the assumptions in their measurement model — do they identify what the model gets wrong and whether that is an acceptable tradeoff.'
    },

    // ==========================================
    // MARKETING - AI MARKETING PROBES
    // ==========================================
    {
        id: 'probe_marketing_senior_ai_brand_safety',
        entry_family: 'entry_marketing_senior_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate reasons about brand safety risk in AI-generated content — do they have concrete quality thresholds and review processes, not just theoretical awareness.'
    },
    {
        id: 'probe_marketing_senior_ai_value_vs_risk',
        entry_family: 'entry_marketing_senior_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate can distinguish genuine AI value-add in marketing from AI for AI\'s sake — do they apply a clear threshold test for when AI creates more risk than value.'
    },
    {
        id: 'probe_marketing_principal_ai_data_strategy',
        entry_family: 'entry_marketing_principal_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate thinks about first-party data as a strategic AI asset — do they reason about data moat, privacy constraints, and what happens when data access changes.'
    },
    {
        id: 'probe_marketing_principal_ai_org_capability',
        entry_family: 'entry_marketing_principal_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate addresses org capability gaps in AI marketing strategy — do they identify what skills and infrastructure they need that they don\'t have today and how that affects sequencing.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - PROGRAM MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_senior_program_dependencies',
        entry_family: 'entry_project_manager_senior_program_management',
        dimension: 'program_management',
        intent: 'Evaluate whether the candidate can proactively surface and resolve cross-team dependencies before they become blockers — do they have a structured process or do they react when dependencies materialise late.'
    },
    {
        id: 'probe_project_manager_senior_program_risk',
        entry_family: 'entry_project_manager_senior_program_management',
        dimension: 'program_management',
        intent: 'Evaluate whether the candidate can distinguish which program-level risks to escalate versus absorb locally — do they have clear escalation criteria or do they default to escalating everything or nothing.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - PROGRAM MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_principal_program_portfolio',
        entry_family: 'entry_project_manager_principal_program_management',
        dimension: 'program_management',
        intent: 'Evaluate whether the candidate can manage a portfolio of programs with competing resource demands — do they have a principled approach to trade-off decisions across programs at the portfolio level, not just within a single program.'
    },
    {
        id: 'probe_project_manager_principal_program_capability',
        entry_family: 'entry_project_manager_principal_program_management',
        dimension: 'program_management',
        intent: 'Evaluate whether the candidate can identify systemic process or capability gaps that cause recurring program failures — do they address root causes at the org level or apply local fixes program by program.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - DELIVERY
    // ==========================================
    {
        id: 'probe_project_manager_senior_delivery_tradeoffs',
        entry_family: 'entry_project_manager_senior_delivery',
        dimension: 'delivery',
        intent: 'Evaluate whether the candidate makes concrete, explicit trade-offs to recover delivery schedule — do they articulate what they asked stakeholders to accept (scope, timeline, quality) and how they drove that decision, or do they describe re-planning without the substance.'
    },
    {
        id: 'probe_project_manager_senior_delivery_communication',
        entry_family: 'entry_project_manager_senior_delivery',
        dimension: 'delivery',
        intent: 'Evaluate whether the candidate communicates delivery risk to stakeholders proactively and with appropriate framing — do they distinguish what leaders need to know versus what teams need to know, and when to surface a risk versus absorb it.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - DELIVERY
    // ==========================================
    {
        id: 'probe_project_manager_principal_delivery_rootcause',
        entry_family: 'entry_project_manager_principal_delivery',
        dimension: 'delivery',
        intent: 'Evaluate whether the candidate investigates root causes of systemic delivery failures — do they identify structural or process causes rather than attributing delivery problems to individual team performance.'
    },
    {
        id: 'probe_project_manager_principal_delivery_culture',
        entry_family: 'entry_project_manager_principal_delivery',
        dimension: 'delivery',
        intent: 'Evaluate whether the candidate has shaped delivery norms and culture across teams — do they describe how they changed team behaviour durably, not just how they intervened in a single delivery crisis.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - STAKEHOLDER MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_senior_stakeholder_interests',
        entry_family: 'entry_project_manager_senior_stakeholder_management',
        dimension: 'stakeholder_management',
        intent: 'Evaluate whether the candidate understands the difference between stakeholder positions and underlying interests — do they diagnose what each stakeholder actually needs before attempting to broker alignment.'
    },
    {
        id: 'probe_project_manager_senior_stakeholder_batna',
        entry_family: 'entry_project_manager_senior_stakeholder_management',
        dimension: 'stakeholder_management',
        intent: 'Evaluate whether the candidate has a strategy for managing the losing party in a stakeholder conflict — do they preserve the relationship and maintain credibility after a stakeholder does not get their priority, or do they treat alignment as a one-shot event.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - STAKEHOLDER MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_principal_stakeholder_power',
        entry_family: 'entry_project_manager_principal_stakeholder_management',
        dimension: 'stakeholder_management',
        intent: 'Evaluate whether the candidate can navigate stakeholder power dynamics at the executive level — do they understand how to influence decisions made above their authority level without overstepping, and how they build the credibility to do so.'
    },
    {
        id: 'probe_project_manager_principal_stakeholder_capital',
        entry_family: 'entry_project_manager_principal_stakeholder_management',
        dimension: 'stakeholder_management',
        intent: 'Evaluate whether the candidate understands stakeholder capital — do they recognise when they are spending political capital, when they are building it, and how they manage the balance across a portfolio of relationships over time.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - METRICS & ACCOUNTABILITY
    // ==========================================
    {
        id: 'probe_project_manager_senior_metrics_leading',
        entry_family: 'entry_project_manager_senior_metrics_accountability',
        dimension: 'metrics_accountability',
        intent: 'Evaluate whether the candidate can identify and act on leading indicators before a delivery or quality problem becomes visible to stakeholders — do they have a clear process for distinguishing signal from noise and changing course based on early data.'
    },
    {
        id: 'probe_project_manager_senior_metrics_accountability_mechanism',
        entry_family: 'entry_project_manager_senior_metrics_accountability',
        dimension: 'metrics_accountability',
        intent: 'Evaluate whether the candidate has a concrete accountability mechanism that holds teams to delivery commitments — do they describe how they create accountability without creating fear-based reporting cultures.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - METRICS & ACCOUNTABILITY
    // ==========================================
    {
        id: 'probe_project_manager_principal_metrics_incentives',
        entry_family: 'entry_project_manager_principal_metrics_accountability',
        dimension: 'metrics_accountability',
        intent: 'Evaluate whether the candidate understands how metrics shape team incentives — do they recognise when a metric is creating perverse behaviour and know how to redesign the accountability system, not just the metric.'
    },
    {
        id: 'probe_project_manager_principal_metrics_blindspots',
        entry_family: 'entry_project_manager_principal_metrics_accountability',
        dimension: 'metrics_accountability',
        intent: 'Evaluate whether the candidate can identify the blindspots in their metrics framework — do they know what their current metrics do not capture and how they manage the risks in that gap.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - RISK MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_senior_risk_mitigation_cost',
        entry_family: 'entry_project_manager_senior_risk_management',
        dimension: 'risk_management',
        intent: 'Evaluate whether the candidate can weigh mitigation cost against risk probability and impact — do they make an explicit decision about how much to spend on mitigation relative to the expected cost of the risk materialising, or do they mitigate every identified risk reflexively.'
    },
    {
        id: 'probe_project_manager_senior_risk_acceptance',
        entry_family: 'entry_project_manager_senior_risk_management',
        dimension: 'risk_management',
        intent: 'Evaluate whether the candidate makes explicit risk acceptance decisions — do they have criteria for deciding what residual risk to accept and how to communicate accepted risk to stakeholders without undermining confidence in the plan.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - RISK MANAGEMENT
    // ==========================================
    {
        id: 'probe_project_manager_principal_risk_correlation',
        entry_family: 'entry_project_manager_principal_risk_management',
        dimension: 'risk_management',
        intent: 'Evaluate whether the candidate can identify correlated risks across a portfolio — do they recognise when risks in multiple programs share a common cause, and how they restructure risk management at the portfolio level when that is the case.'
    },
    {
        id: 'probe_project_manager_principal_risk_appetite',
        entry_family: 'entry_project_manager_principal_risk_management',
        dimension: 'risk_management',
        intent: 'Evaluate whether the candidate can define and communicate the organisation\'s risk appetite — do they have a principled view of how much delivery risk is acceptable in different contexts, and do they use that to make consistent decisions rather than calibrating to stakeholder comfort case by case.'
    },

    // ==========================================
    // PROJECT MANAGER - SENIOR - AI DELIVERY
    // ==========================================
    {
        id: 'probe_project_manager_senior_ai_quality_gates',
        entry_family: 'entry_project_manager_senior_ai_delivery',
        dimension: 'ai_delivery',
        intent: 'Evaluate whether the candidate has concrete quality gates for AI deliverables — do they treat AI output as probabilistic and design acceptance criteria accordingly, rather than applying deterministic software testing standards to AI components.'
    },
    {
        id: 'probe_project_manager_senior_ai_expectations',
        entry_family: 'entry_project_manager_senior_ai_delivery',
        dimension: 'ai_delivery',
        intent: 'Evaluate whether the candidate manages stakeholder expectations about AI capability limitations proactively — do they set realistic expectations before deployment and have a plan for managing the gap when AI performance in production differs from testing.'
    },

    // ==========================================
    // PROJECT MANAGER - PRINCIPAL - AI DELIVERY
    // ==========================================
    {
        id: 'probe_project_manager_principal_ai_governance',
        entry_family: 'entry_project_manager_principal_ai_delivery',
        dimension: 'ai_delivery',
        intent: 'Evaluate whether the candidate has established governance frameworks for AI delivery at the program or portfolio level — do they have processes for managing AI-specific risks (model drift, data quality, explainability) that go beyond standard delivery governance.'
    },
    {
        id: 'probe_project_manager_principal_ai_capability',
        entry_family: 'entry_project_manager_principal_ai_delivery',
        dimension: 'ai_delivery',
        intent: 'Evaluate whether the candidate can build AI delivery capability across teams — do they identify the skills gaps that prevent teams from delivering AI projects reliably and have a structured approach to closing those gaps, rather than solving AI delivery challenges through heroics or workarounds.'
    },

    // ==========================================
    // MARKETING JUNIOR — BRAND / CAMPAIGN / GROWTH
    // ==========================================
    {
        id: 'probe_marketing_junior_brand_audience',
        entry_family: 'entry_marketing_junior_brand',
        dimension: 'Brand',
        intent: 'Evaluate whether the candidate identifies the target audience before writing or evaluating copy — do they define who the message is for and what that audience specifically cares about.'
    },
    {
        id: 'probe_marketing_junior_brand_differentiation',
        entry_family: 'entry_marketing_junior_brand',
        dimension: 'Brand',
        intent: 'Evaluate whether the candidate can differentiate a message from competitors — do they identify what makes the positioning distinct rather than producing generic copy.'
    },
    {
        id: 'probe_marketing_junior_campaign_metrics',
        entry_family: 'entry_marketing_junior_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate defines success metrics before executing — do they specify what number would tell them the campaign worked and how they would measure it.'
    },
    {
        id: 'probe_marketing_junior_campaign_channels',
        entry_family: 'entry_marketing_junior_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate can justify channel selection — do they explain why a specific channel fits the audience and goal rather than defaulting to the most familiar channel.'
    },
    {
        id: 'probe_marketing_junior_growth_interpretation',
        entry_family: 'entry_marketing_junior_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate can interpret marketing data correctly — do they identify what a metric actually means and what would cause it to move before drawing conclusions.'
    },
    {
        id: 'probe_marketing_junior_growth_action',
        entry_family: 'entry_marketing_junior_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate connects data to action — do they specify what they would do differently based on a data finding rather than just describing what the data shows.'
    },

    // ==========================================
    // MARKETING LEADER — STRATEGY / CAMPAIGN / AI MARKETING
    // ==========================================
    {
        id: 'probe_marketing_leader_strategy_business_outcomes',
        entry_family: 'entry_marketing_leader_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate connects marketing strategy to business outcomes — do they articulate specifically how the strategy drives revenue, competitive moat, or org capability.'
    },
    {
        id: 'probe_marketing_leader_strategy_org_capability',
        entry_family: 'entry_marketing_leader_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate identifies org capability gaps in their strategy — do they specify what skills and infrastructure they need that they don\'t have today and how that affects sequencing.'
    },
    {
        id: 'probe_marketing_leader_campaign_governance',
        entry_family: 'entry_marketing_leader_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate designs campaign governance systems — do they think about how to maintain quality and consistency at scale rather than relying on personal oversight.'
    },
    {
        id: 'probe_marketing_leader_campaign_learning',
        entry_family: 'entry_marketing_leader_campaign',
        dimension: 'Campaign',
        intent: 'Evaluate whether the candidate builds institutional learning into campaign operations — do they design systems that capture and apply learnings across campaigns rather than starting from scratch each time.'
    },
    {
        id: 'probe_marketing_leader_ai_investment',
        entry_family: 'entry_marketing_leader_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate reasons about AI marketing as a strategic investment — do they connect AI decisions to competitive advantage and articulate a concrete ROI model for the CFO.'
    },
    {
        id: 'probe_marketing_leader_ai_data_moat',
        entry_family: 'entry_marketing_leader_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate thinks about first-party data as a long-term AI moat — do they reason about how data assets compound over time and what happens if data access is restricted.'
    },

    // ==========================================
    // DATA SCIENTIST — JUNIOR
    // ==========================================
    {
        id: 'probe_data_junior_analytics_question',
        entry_family: 'entry_data_junior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate identifies the right analytical question before writing a query — do they clarify what business question they are answering rather than jumping to SQL.'
    },
    {
        id: 'probe_data_junior_analytics_validation',
        entry_family: 'entry_data_junior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate validates their analytical approach — do they identify what would make their query or analysis return misleading results and how they would catch it.'
    },
    {
        id: 'probe_data_junior_ml_framing',
        entry_family: 'entry_data_junior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate frames the ML problem correctly before proposing a solution — do they identify the right task type, success metric, and baseline before selecting an approach.'
    },
    {
        id: 'probe_data_junior_ml_data_requirements',
        entry_family: 'entry_data_junior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate reasons about training data requirements — do they identify what data they need, whether they have it, and what the consequences of data quality issues are.'
    },
    {
        id: 'probe_data_junior_data_communication',
        entry_family: 'entry_data_junior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate can communicate data findings to non-technical stakeholders — do they translate statistical findings into business implications without jargon.'
    },
    {
        id: 'probe_data_junior_data_quality',
        entry_family: 'entry_data_junior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate identifies data quality issues that could invalidate a finding — do they proactively flag what could make their analysis wrong before being asked.'
    },

    // ==========================================
    // DATA SCIENTIST — SENIOR
    // ==========================================
    {
        id: 'probe_data_senior_analytics_causality',
        entry_family: 'entry_data_senior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate distinguishes correlation from causation — do they identify confounders and propose a causal inference approach rather than drawing causal conclusions from observational data.'
    },
    {
        id: 'probe_data_senior_analytics_experiment_design',
        entry_family: 'entry_data_senior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate designs statistically valid experiments — do they address sample size, statistical power, and multiple comparisons rather than just describing what to test.'
    },
    {
        id: 'probe_data_senior_ml_pipeline',
        entry_family: 'entry_data_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs the full ML pipeline — do they address data ingestion, feature engineering, training, evaluation, serving, and monitoring rather than just the model selection.'
    },
    {
        id: 'probe_data_senior_ml_degradation',
        entry_family: 'entry_data_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs for model degradation — do they specify retraining triggers, monitoring approach, and how they detect silent quality drops in production.'
    },
    {
        id: 'probe_data_senior_data_influence',
        entry_family: 'entry_data_senior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate can influence product and business decisions with data — do they think about how to get stakeholders to act on analysis rather than just producing correct analysis.'
    },
    {
        id: 'probe_data_senior_data_capability',
        entry_family: 'entry_data_senior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate thinks about building data capability — do they identify what analytical infrastructure or skill the org needs and how their work contributes to building it.'
    },

    // ==========================================
    // DATA SCIENTIST — PRINCIPAL
    // ==========================================
    {
        id: 'probe_data_principal_analytics_scale',
        entry_family: 'entry_data_principal_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate designs analytical systems that scale across teams — do they address how their methodology works when many teams are running experiments simultaneously and with varying statistical maturity.'
    },
    {
        id: 'probe_data_principal_analytics_methodology',
        entry_family: 'entry_data_principal_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate identifies what their analytical methodology makes impossible to measure — do they acknowledge the blind spots and tradeoffs of their chosen approach.'
    },
    {
        id: 'probe_data_principal_ml_platform',
        entry_family: 'entry_data_principal_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs ML infrastructure as a multi-team platform — do they address versioning, reproducibility, and how their platform handles breaking changes to shared components.'
    },
    {
        id: 'probe_data_principal_ml_governance',
        entry_family: 'entry_data_principal_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs governance for ML platform usage — do they specify who can ship what to production, how model lineage is tracked, and how the platform evolves as model count grows.'
    },
    {
        id: 'probe_data_principal_data_competitive_moat',
        entry_family: 'entry_data_principal_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate reasons about data as a competitive moat — do they identify what data assets create sustainable advantage and how to protect them as privacy regulation evolves.'
    },
    {
        id: 'probe_data_principal_data_governance_design',
        entry_family: 'entry_data_principal_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate designs data governance operationally — do they specify owners, processes, and enforcement mechanisms rather than treating governance as a principle.'
    },

    // ==========================================
    // DATA SCIENTIST — LEADER
    // ==========================================
    {
        id: 'probe_data_leader_analytics_capability',
        entry_family: 'entry_data_leader_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate thinks about analytics as an org capability to build — do they reason about data literacy, self-service analytics, and how to measure whether the org is becoming more data-driven.'
    },
    {
        id: 'probe_data_leader_analytics_org_design',
        entry_family: 'entry_data_leader_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate can design the right analytical org structure — do they reason about centralised vs embedded analysts and what each model enables or constrains.'
    },
    {
        id: 'probe_data_leader_ml_investment',
        entry_family: 'entry_data_leader_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate reasons about ML as a business capability investment — do they connect ML strategy to competitive advantage and articulate a build vs buy framework with concrete criteria.'
    },
    {
        id: 'probe_data_leader_ml_responsible_ai',
        entry_family: 'entry_data_leader_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate addresses responsible AI deployment at org scale — do they specify governance processes that enable teams to move fast while managing ethical and regulatory risk.'
    },
    {
        id: 'probe_data_leader_data_board_level',
        entry_family: 'entry_data_leader_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate can make the board-level case for data as a strategic asset — do they connect data investments to business value and competitive positioning in language a CFO would act on.'
    },
    {
        id: 'probe_data_leader_data_regulatory',
        entry_family: 'entry_data_leader_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate reasons about regulatory risk in data strategy — do they identify how their strategy needs to adapt as privacy regulation evolves and what they would do if a key data source was restricted.'
    },

    // ==========================================
    // AI PM - SENIOR
    // ==========================================
    {
        id: 'probe_ai_pm_senior_product_sense_ai_constraints',
        entry_family: 'entry_ai_pm_senior_product_sense',
        dimension: 'Product Sense',
        intent: 'Evaluate whether the candidate treats AI constraints as first-class design inputs — do they address hallucination risk, latency, trust, and feedback loops in their product design rather than treating AI as a reliable black box.'
    },
    {
        id: 'probe_ai_pm_senior_product_sense_value_clarity',
        entry_family: 'entry_ai_pm_senior_product_sense',
        dimension: 'Product Sense',
        intent: 'Evaluate whether the candidate can distinguish genuine AI value-add from AI for AI\'s sake — do they articulate specifically what AI enables that a non-AI approach cannot, with concrete user benefit.'
    },
    {
        id: 'probe_ai_pm_senior_ai_execution_quality_gates',
        entry_family: 'entry_ai_pm_senior_ai_execution',
        dimension: 'AI Execution',
        intent: 'Evaluate whether the candidate has concrete quality gates for AI features — do they specify threshold values and go/no-go criteria rather than treating AI quality as a subjective judgment call.'
    },
    {
        id: 'probe_ai_pm_senior_ai_execution_silent_degradation',
        entry_family: 'entry_ai_pm_senior_ai_execution',
        dimension: 'AI Execution',
        intent: 'Evaluate whether the candidate designs for silent AI degradation detection — do they proactively describe monitoring approaches that catch quality drops before users report them.'
    },
    {
        id: 'probe_ai_pm_senior_ai_technical_tradeoffs',
        entry_family: 'entry_ai_pm_senior_ai_technical',
        dimension: 'AI Technical',
        intent: 'Evaluate whether the candidate applies AI technical knowledge to real decisions — do they reason about RAG vs fine-tuning, build vs buy, or latency vs quality with concrete criteria rather than reciting definitions.'
    },
    {
        id: 'probe_ai_pm_senior_ai_technical_when_not_ai',
        entry_family: 'entry_ai_pm_senior_ai_technical',
        dimension: 'AI Technical',
        intent: 'Evaluate whether the candidate knows when NOT to use AI — do they identify situations where a simpler deterministic approach would be better and can articulate why with concrete reasoning.'
    },
    {
        id: 'probe_ai_pm_senior_strategy_moat',
        entry_family: 'entry_ai_pm_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate reasons about sustainable AI competitive advantage — do they identify where the moat comes from (data, workflow, distribution) rather than assuming the AI model itself is the moat.'
    },
    {
        id: 'probe_ai_pm_senior_strategy_data',
        entry_family: 'entry_ai_pm_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate connects data strategy to AI product strategy — do they reason about what proprietary data the product needs and how to build data assets that compound over time.'
    },
    {
        id: 'probe_ai_pm_senior_behavioral_ai_specific',
        entry_family: 'entry_ai_pm_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates AI-specific product judgment — do they articulate what made their experience specifically about AI product development, not generic PM skills applied to an AI context.'
    },
    {
        id: 'probe_ai_pm_senior_behavioral_learning',
        entry_family: 'entry_ai_pm_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates genuine learning about AI product development — do they identify specific insights about building AI products that changed their practice, not generic PM lessons.'
    },

    // ==========================================
    // AI ENGINEER - SENIOR
    // ==========================================
    {
        id: 'probe_ai_engineer_senior_ml_design_full_system',
        entry_family: 'entry_ai_engineer_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs the full ML system — do they address data pipeline, feature engineering, training, evaluation, serving, and monitoring rather than focusing only on model selection and training.'
    },
    {
        id: 'probe_ai_engineer_senior_ml_design_degradation',
        entry_family: 'entry_ai_engineer_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs for model degradation — do they specify retraining triggers, monitoring signals, and recovery procedures that detect and respond to silent quality drops.'
    },
    {
        id: 'probe_ai_engineer_senior_llm_architecture',
        entry_family: 'entry_ai_engineer_senior_llm_deep_dive',
        dimension: 'LLM Deep Dive',
        intent: 'Evaluate whether the candidate reasons about LLM architecture decisions with concrete criteria — do they choose between RAG, fine-tuning, and prompt engineering based on specific requirements rather than defaulting to the most complex approach.'
    },
    {
        id: 'probe_ai_engineer_senior_llm_failure_modes',
        entry_family: 'entry_ai_engineer_senior_llm_deep_dive',
        dimension: 'LLM Deep Dive',
        intent: 'Evaluate whether the candidate addresses LLM-specific failure modes as engineering problems — do they have concrete mitigation strategies for hallucination, context overflow, and prompt injection rather than just acknowledging they exist.'
    },
    {
        id: 'probe_ai_engineer_senior_ai_systems_reliability',
        entry_family: 'entry_ai_engineer_senior_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate designs AI-specific reliability patterns — do they address circuit breakers, fallbacks, and graceful degradation for non-deterministic AI components differently from deterministic services.'
    },
    {
        id: 'probe_ai_engineer_senior_ai_systems_observability',
        entry_family: 'entry_ai_engineer_senior_ai_systems',
        dimension: 'AI Systems',
        intent: 'Evaluate whether the candidate designs AI-specific observability — do they identify metrics that matter for AI systems (output quality distribution, token costs, latency percentiles) that do not exist in traditional monitoring.'
    },
    {
        id: 'probe_ai_engineer_senior_behavioral_ai_specific',
        entry_family: 'entry_ai_engineer_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates AI-specific engineering judgment — do they articulate what made their experience specifically about building AI systems, not generic software engineering applied to an AI context.'
    },
    {
        id: 'probe_ai_engineer_senior_behavioral_production',
        entry_family: 'entry_ai_engineer_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates learning about operating AI in production — do they identify specific insights about AI system reliability that changed their engineering practice.'
    },

    // ==========================================
    // AI MARKETER - SENIOR
    // ==========================================
    {
        id: 'probe_ai_marketer_senior_ai_marketing_quality',
        entry_family: 'entry_ai_marketer_senior_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate has concrete quality thresholds for AI marketing — do they specify review processes, brand safety criteria, and escalation triggers rather than treating AI output quality as subjective.'
    },
    {
        id: 'probe_ai_marketer_senior_ai_marketing_risk',
        entry_family: 'entry_ai_marketer_senior_ai_marketing',
        dimension: 'AI Marketing',
        intent: 'Evaluate whether the candidate reasons about brand risk in AI marketing — do they identify specific failure modes (off-brand content, offensive outputs, trust erosion) and have concrete response plans for each.'
    },
    {
        id: 'probe_ai_marketer_senior_growth_measurement',
        entry_family: 'entry_ai_marketer_senior_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate applies AI-specific measurement thinking — do they identify measurement challenges unique to AI marketing (attribution complexity, model drift affecting metrics) rather than applying standard marketing analytics.'
    },
    {
        id: 'probe_ai_marketer_senior_growth_roi',
        entry_family: 'entry_ai_marketer_senior_growth',
        dimension: 'Growth',
        intent: 'Evaluate whether the candidate can build a credible ROI case for AI marketing investment — do they identify specific efficiency or effectiveness gains attributable to AI with a concrete measurement approach.'
    },
    {
        id: 'probe_ai_marketer_senior_strategy_advantage',
        entry_family: 'entry_ai_marketer_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate identifies sustainable AI marketing advantage — do they distinguish between advantages that compound (data, capability) vs advantages that are easily copied (tool access, prompts).'
    },
    {
        id: 'probe_ai_marketer_senior_strategy_data',
        entry_family: 'entry_ai_marketer_senior_strategy',
        dimension: 'Strategy',
        intent: 'Evaluate whether the candidate connects first-party data strategy to AI marketing capability — do they reason about how data assets enable AI marketing advantages that competitors without that data cannot replicate.'
    },
    {
        id: 'probe_ai_marketer_senior_behavioral_ai_specific',
        entry_family: 'entry_ai_marketer_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates AI-specific marketing judgment — do they articulate what made their experience specifically about AI-augmented marketing, not generic marketing with AI mentioned.'
    },
    {
        id: 'probe_ai_marketer_senior_behavioral_trust',
        entry_family: 'entry_ai_marketer_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates mature judgment about AI brand and trust risk — do they show they can balance AI efficiency gains against the specific brand risks AI creates in customer-facing contexts.'
    },

    // ==========================================
    // AI PROJECT MANAGER - SENIOR
    // ==========================================
    {
        id: 'probe_ai_project_manager_senior_ai_delivery_quality_gates',
        entry_family: 'entry_ai_project_manager_senior_ai_delivery',
        dimension: 'AI Delivery',
        intent: 'Evaluate whether the candidate has concrete AI quality gates — do they specify threshold values and escalation triggers for AI delivery rather than applying binary done/not-done criteria from traditional software delivery.'
    },
    {
        id: 'probe_ai_project_manager_senior_ai_delivery_expectations',
        entry_family: 'entry_ai_project_manager_senior_ai_delivery',
        dimension: 'AI Delivery',
        intent: 'Evaluate whether the candidate manages AI-specific stakeholder expectations — do they have a concrete communication approach for explaining probabilistic AI quality to business stakeholders who want certainty.'
    },
    {
        id: 'probe_ai_project_manager_senior_program_uncertainty',
        entry_family: 'entry_ai_project_manager_senior_program_management',
        dimension: 'Program Management',
        intent: 'Evaluate whether the candidate builds AI uncertainty into program planning — do they create plans that accommodate model iteration cycles and experiment failures rather than treating AI development like deterministic software development.'
    },
    {
        id: 'probe_ai_project_manager_senior_program_handoff',
        entry_family: 'entry_ai_project_manager_senior_program_management',
        dimension: 'Program Management',
        intent: 'Evaluate whether the candidate manages the research-to-production handoff explicitly — do they identify the specific coordination challenges between data science and engineering teams in AI projects.'
    },
    {
        id: 'probe_ai_project_manager_senior_stakeholder_expectations',
        entry_family: 'entry_ai_project_manager_senior_stakeholder_management',
        dimension: 'Stakeholder Management',
        intent: 'Evaluate whether the candidate proactively manages AI expectation gaps — do they identify AI-specific expectation mismatches (deterministic vs probabilistic, demo vs production) and address them before they become crises.'
    },
    {
        id: 'probe_ai_project_manager_senior_stakeholder_translation',
        entry_family: 'entry_ai_project_manager_senior_stakeholder_management',
        dimension: 'Stakeholder Management',
        intent: 'Evaluate whether the candidate can translate AI technical constraints into business language — do they bridge the gap between what the AI team understands and what business stakeholders need to hear without losing accuracy.'
    },
    {
        id: 'probe_ai_project_manager_senior_behavioral_ai_specific',
        entry_family: 'entry_ai_project_manager_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates AI-specific delivery judgment — do they articulate what made their delivery challenge specifically about AI, not generic project management applied to an AI project.'
    },
    {
        id: 'probe_ai_project_manager_senior_behavioral_hard_calls',
        entry_family: 'entry_ai_project_manager_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates the ability to make hard go/no-go decisions under AI uncertainty — do they show they can make and defend quality threshold decisions when AI outputs are probabilistic.'
    },

    // ==========================================
    // AI SCIENTIST - SENIOR
    // ==========================================
    {
        id: 'probe_ai_scientist_senior_ml_research_production',
        entry_family: 'entry_ai_scientist_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate reasons about the research-to-production gap — do they identify what typically breaks when moving from experiment to production and design the system to minimise that gap.'
    },
    {
        id: 'probe_ai_scientist_senior_ml_evaluation',
        entry_family: 'entry_ai_scientist_senior_ml_design',
        dimension: 'ML System Design',
        intent: 'Evaluate whether the candidate designs rigorous ML evaluation — do they address what offline evaluation tells them vs what it does not tell them about production performance, and how they close that gap.'
    },
    {
        id: 'probe_ai_scientist_senior_analytics_ai_specific',
        entry_family: 'entry_ai_scientist_senior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate applies analytical rigour to AI-specific measurement challenges — do they identify confounders and statistical challenges unique to evaluating non-deterministic AI systems.'
    },
    {
        id: 'probe_ai_scientist_senior_analytics_unintended',
        entry_family: 'entry_ai_scientist_senior_analytics',
        dimension: 'Analytics',
        intent: 'Evaluate whether the candidate designs to detect unintended consequences of model changes — do they think beyond the target metric to identify what else a model update might be degrading.'
    },
    {
        id: 'probe_ai_scientist_senior_data_flywheel',
        entry_family: 'entry_ai_scientist_senior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate thinks about data as a compounding strategic asset — do they design data strategies where more usage creates better models creates more usage, rather than treating data as a static training input.'
    },
    {
        id: 'probe_ai_scientist_senior_data_responsibility',
        entry_family: 'entry_ai_scientist_senior_data_strategy',
        dimension: 'Data Strategy',
        intent: 'Evaluate whether the candidate addresses bias, fairness, and governance in training data as first-class research concerns — not afterthoughts or compliance checkboxes.'
    },
    {
        id: 'probe_ai_scientist_senior_behavioral_ai_specific',
        entry_family: 'entry_ai_scientist_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates AI research judgment — do they articulate what made their experience specifically about AI research and deployment, showing awareness of the unique responsibilities of deploying probabilistic systems.'
    },
    {
        id: 'probe_ai_scientist_senior_behavioral_responsibility',
        entry_family: 'entry_ai_scientist_senior_behavioral',
        dimension: 'Behavioral',
        intent: 'Evaluate whether the candidate demonstrates ethical reasoning about AI deployment — do they show they can navigate the tension between research excellence and responsible deployment, making principled tradeoffs when they conflict.'
    }
]

/**
 * Get all probes for a specific Entry family
 */
export function getProbesForEntryFamily(entryFamilyId: string): Probe[] {
    return PROBES.filter(p => p.entry_family === entryFamilyId)
}

/**
 * Select a random probe for the given Entry family and dimension
 * Returns null if no probes are defined (null > guessing)
 */
export function selectProbe(entryFamilyId: string, dimension: string): Probe | null {
    const candidates = PROBES.filter(p =>
        p.entry_family === entryFamilyId &&
        p.dimension === dimension
    )

    if (candidates.length === 0) {
        console.warn(`⚠️ [PROBE_NOT_FOUND] No probes for entry_family: ${entryFamilyId}, dimension: ${dimension}`)
        return null
    }

    // Random selection (freshness source)
    const selected = candidates[Math.floor(Math.random() * candidates.length)]

    console.log(`✅ [PROBE_SELECTED]`, {
        entry_family: entryFamilyId,
        dimension,
        selected_probe: selected.id,
        available_count: candidates.length
    })

    return selected
}
