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

    // PM SENIOR — 7 probes matching full taxonomy
    {
        id: 'probe_pm_senior_ai_architecture_tradeoff',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can justify architectural decisions for AI features, articulate trade-offs between approaches (e.g., RAG vs fine-tuning), and demonstrate constraint awareness including context window limits and latency.'
    },
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
    {
        id: 'probe_pm_senior_ai_drift_detection',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can diagnose model drift vs expectation shift, identify distribution shift signals, and apply structured diagnostic reasoning rather than defaulting to retraining.'
    },
    {
        id: 'probe_pm_senior_ai_cost_scaling',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can reason about AI cost scaling, identify architectural levers (caching, model tiering, token optimization), and make prioritized cost reduction decisions.'
    },
    {
        id: 'probe_pm_senior_ai_orchestration',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands orchestration beyond single API calls, can reason about tool-calling architectures, context management, and multi-step AI pipeline design.'
    },
    {
        id: 'probe_pm_senior_ai_risk_governance',
        entry_family: 'entry_pm_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can frame AI risks honestly, articulate which risks were deliberately not mitigated at launch and why, and demonstrate governance maturity including regulatory and bias trade-offs.'
    },

    // PM PRINCIPAL
    {
        id: 'probe_pm_principal_ai_system_design',
        entry_family: 'entry_pm_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design evaluation frameworks that scale across teams, model drift diagnosis strategies, and articulate multi-layer mitigation with cost optimization at scale.'
    },
    {
        id: 'probe_pm_principal_ai_orchestration_depth',
        entry_family: 'entry_pm_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can reason about complex AI orchestration systems, multi-model routing strategies, and cross-team AI infrastructure dependencies at principal-level depth.'
    },

    // PM LEADER
    {
        id: 'probe_pm_leader_ai_governance',
        entry_family: 'entry_pm_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design org-level AI governance, frame portfolio-level AI investment trade-offs, and articulate build vs buy decisions for AI capabilities with ROI modeling.'
    },
    {
        id: 'probe_pm_leader_ai_strategy',
        entry_family: 'entry_pm_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can articulate org-wide AI strategy, reason about competitive AI positioning, and make portfolio-level resource allocation decisions across AI initiatives.'
    },

    // ==========================================
    // SDE - AI FLUENCY PROBES
    // ==========================================
    {
        id: 'sde_ai_system_design_tradeoff',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design system architectures for new ML features, navigating trade-offs between RAG, fine-tuning, and zero-shot approaches while balancing latency constraints against accuracy needs.'
    },
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
    {
        id: 'sde_ai_orchestration_layer',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design multi-step LLM workflows and agentic swarms, managing tool-calling logic, state, and parallel execution while handling complex coordination under strict timeouts.'
    },
    {
        id: 'sde_ai_cost_optimization',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can scale expensive AI features by applying token economics, semantic caching, and model routing to successfully manage budget limits and sudden bursts in long-context queries.'
    },
    {
        id: 'sde_ai_drift_diagnosis',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can investigate sudden drops in model quality through observability, data drift detection, and prompt degradation analysis without blindly rolling back without root cause analysis.'
    },
    {
        id: 'sde_ai_security_surface',
        entry_family: 'entry_sde_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can secure enterprise AI applications by preventing prompt injection, applying PII redaction, and sanitizing outputs to stop data exfiltration instead of relying only on regex filters.'
    },

    // ==========================================
    // DATA SCIENTIST - AI FLUENCY PROBES
    // ==========================================
    {
        id: 'probe_data_junior_ai_pipeline',
        entry_family: 'entry_data_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can describe data pipelines for AI systems, explain preprocessing applied, and validate data quality for ML model consumption.'
    },
    {
        id: 'probe_data_senior_ai_lifecycle',
        entry_family: 'entry_data_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can design end-to-end ML pipelines, implement drift detection, build evaluation frameworks, and reason about model degradation with operational rigor.'
    },
    {
        id: 'probe_data_principal_ai_platform',
        entry_family: 'entry_data_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can architect organization-wide ML platforms, design cross-team feature sharing, and build governance for model lifecycle management with system-level depth.'
    },
    {
        id: 'probe_data_leader_ai_strategy',
        entry_family: 'entry_data_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can frame AI investment decisions, evaluate build vs buy for ML capabilities, and design org-wide data/AI strategy with ROI modeling.'
    },

    // ==========================================
    // MARKETING - AI FLUENCY PROBES
    // ==========================================
    {
        id: 'probe_marketing_junior_ai_tools',
        entry_family: 'entry_marketing_junior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate understands how AI tools augment marketing workflows and can distinguish AI-powered capabilities from rule-based automation in campaign management.'
    },
    {
        id: 'probe_marketing_senior_ai_optimization',
        entry_family: 'entry_marketing_senior_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can articulate how AI improves targeting, personalization, and attribution, and can reason about AI-generated content quality and brand safety trade-offs.'
    },
    {
        id: 'probe_marketing_principal_ai_personalization',
        entry_family: 'entry_marketing_principal_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can architect AI-driven personalization systems, design experimentation frameworks for AI marketing, and reason about privacy-AI trade-offs at scale.'
    },
    {
        id: 'probe_marketing_leader_ai_transformation',
        entry_family: 'entry_marketing_leader_ai_fluency',
        dimension: 'ai_fluency',
        intent: 'Evaluate whether the candidate can frame org-wide AI marketing strategy, evaluate build vs buy for marketing AI, and model ROI for AI marketing investments with portfolio reasoning.'
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
