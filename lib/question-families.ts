/**
 * QUESTION FAMILY DEFINITIONS
 * 
 * Defines question families for each evaluation dimension.
 * Each family represents a structurally different way of testing the same dimension.
 * 
 * IMPORTANT:
 * - Families are NOT paraphrases - they test different aspects/framings
 * - Starter users always get the first family (deterministic)
 * - Pro/Pro+ users get randomized selection from unused families
 */

export interface QuestionFamily {
    id: string
    dimension: string
    family_name: string
    prompt_guidance: string
}

/**
 * Master list of all question families
 * Used for seeding database and runtime selection
 */
export const QUESTION_FAMILIES: QuestionFamily[] = [
    // ==========================================
    // PRODUCT SENSE FAMILIES
    // ==========================================
    {
        id: 'product_sense_problem_discovery',
        dimension: 'Product Sense',
        family_name: 'Problem Discovery Framing',
        prompt_guidance: `Frame questions that probe how the candidate identifies and validates user problems BEFORE jumping to solutions.

Focus areas:
- User research and discovery methods
- Problem-space exploration techniques
- Pain point validation and prioritization
- Understanding the "why" behind feature requests
- Distinguishing symptoms from root causes

Example question types:
- "How would you identify the most critical user pain points for [product]?"
- "Walk me through how you'd validate whether this is a real problem worth solving."
- "Tell me about a time you discovered a user problem that wasn't obvious from the data."

Avoid: Solution-first framing, metric-driven questions, trade-off discussions until problem is established.`
    },
    {
        id: 'product_sense_tradeoff',
        dimension: 'Product Sense',
        family_name: 'Trade-off Framing',
        prompt_guidance: `Frame questions that force the candidate to navigate competing priorities and make explicit trade-offs.

Focus areas:
- User experience vs. business metrics
- Short-term wins vs. long-term vision
- Multiple user segments with conflicting needs
- Feature completeness vs. speed to market
- Technical constraints vs. ideal UX

Example question types:
- "Power users want feature depth, casual users want simplicity. How do you decide?"
- "You have 2 weeks to launch. What do you cut?"
- "This feature will delight 10% of users but confuse 40%. What's your call?"

Avoid: Open-ended product design, problem discovery, failure/recovery framing.`
    },
    {
        id: 'product_sense_failure_recovery',
        dimension: 'Product Sense',
        family_name: 'Failure & Recovery Framing',
        prompt_guidance: `Frame questions about handling failed launches, pivots, or unexpected user rejection.

Focus areas:
- Diagnosing why a feature/product failed
- Recovery strategies after a bad launch
- Pivoting based on contradictory feedback
- Learning from mistakes without blame
- Deciding when to kill vs. iterate

Example question types:
- "A feature you shipped isn't being used. Walk me through your diagnosis process."
- "Tell me about a product you launched that failed. What did you do?"
- "Usage dropped 30% after a redesign. How do you respond?"

Avoid: Trade-off questions, green-field product design, metric definition.`
    },
    {
        id: 'product_sense_constraint_driven',
        dimension: 'Product Sense',
        family_name: 'Constraint-Driven Framing',
        prompt_guidance: `Frame questions with explicit, artificial constraints that force ruthless prioritization.

Constraints to impose:
- Limited engineering resources (1 engineer, 2 weeks)
- Tight regulatory or compliance requirements
- Budget restrictions or cost considerations
- Legacy system constraints
- Sudden competitive pressure

Example question types:
- "You have 1 engineer for 3 weeks. What do you build?"
- "This feature must comply with GDPR and launch in 30 days. How do you scope it?"
- "A competitor just launched your planned feature. What changes?"

Avoid: Unconstrained brainstorming, failure scenarios, open-ended trade-offs.`
    },

    // ==========================================
    // ARCHITECTURE / SYSTEM DESIGN FAMILIES
    // ==========================================
    {
        id: 'architecture_scale',
        dimension: 'Architecture',
        family_name: 'Scale & Performance',
        prompt_guidance: `Frame questions about designing systems that handle massive scale and optimize for performance.

Focus areas:
- Handling 100M+ daily active users
- High throughput (10K+ requests/second)
- Global distribution and latency optimization
- Read-heavy vs write-heavy workload optimization
- Caching strategies and CDN usage

Example question types:
- "Design a system to handle 500M daily active users."
- "How would you optimize read latency for a global user base?"
- "The system needs to handle 50K writes/sec during peak. Walk me through your approach."

Avoid: Reliability, security, data consistency unless directly tied to scale.`
    },
    {
        id: 'architecture_reliability',
        dimension: 'Architecture',
        family_name: 'Reliability & Resilience',
        prompt_guidance: `Frame questions about building fault-tolerant systems that gracefully handle failures.

Focus areas:
- Handling component failures without downtime
- Disaster recovery and backup strategies
- Multi-region redundancy
- Chaos engineering and failure injection
- SLA/SLO design and monitoring

Example question types:
- "A critical service goes down. How does your system stay available?"
- "Design a disaster recovery plan for [system]."
- "How would you ensure 99.99% uptime across multiple regions?"

Avoid: Scale-only discussions, security, data consistency unless tied to fault tolerance.`
    },
    {
        id: 'architecture_data_consistency',
        dimension: 'Architecture',
        family_name: 'Data Consistency & Integrity',
        prompt_guidance: `Frame questions about managing distributed data, consistency models, and transactions.

Focus areas:
- CAP theorem trade-offs (consistency vs availability)
- Eventual consistency vs strong consistency
- Distributed transactions and 2PC
- Data migration and schema evolution
- Conflict resolution strategies

Example question types:
- "How do you ensure data consistency across multiple data centers?"
- "Design a system where reads must always reflect the latest write."
- "Two users edit the same document simultaneously. How do you resolve conflicts?"

Avoid: Scale-only, reliability-only, security unless directly tied to data integrity.`
    },
    {
        id: 'architecture_security',
        dimension: 'Architecture',
        family_name: 'Security & Compliance',
        prompt_guidance: `Frame questions about securing systems, protecting data, and meeting compliance requirements.

Focus areas:
- Authentication and authorization at scale
- Data encryption (at rest and in transit)
- Compliance requirements (GDPR, HIPAA, SOC2)
- Threat modeling and attack surface reduction
- Audit logging and access control

Example question types:
- "Design an authentication system for 100M users."
- "How would you secure user data to meet GDPR requirements?"
- "Walk me through how you'd protect against [specific threat]."

Avoid: Scale-only, reliability-only unless tied to security constraints.`
    },

    // ==========================================
    // LEADERSHIP FAMILIES
    // ==========================================
    {
        id: 'leadership_conflict_resolution',
        dimension: 'Leadership',
        family_name: 'Conflict Resolution',
        prompt_guidance: `Frame questions about navigating interpersonal or organizational conflicts.

Focus areas:
- Disagreements between team members
- Scope disputes with stakeholders
- Conflicting technical opinions among engineers
- Managing underperformers without alienating them
- Resolving cross-team friction

Example question types:
- "Two senior engineers disagree on architecture. How do you resolve it?"
- "Tell me about a time you had to mediate a conflict between team members."
- "A stakeholder and your team disagree on priorities. What do you do?"

Avoid: Crisis management, influence, team building unless conflict is central.`
    },
    {
        id: 'leadership_influence_no_authority',
        dimension: 'Leadership',
        family_name: 'Influence Without Authority',
        prompt_guidance: `Frame questions about leading and influencing outcomes without direct reporting relationships.

Focus areas:
- Cross-team collaboration without mandate
- Convincing skeptical stakeholders
- Building consensus across organizational boundaries
- Leading through credibility and trust
- Persuasion without positional power

Example question types:
- "You need another team's help but they have different priorities. How do you get buy-in?"
- "Tell me about a time you influenced a decision outside your direct control."
- "How do you lead a project when you're not the manager?"

Avoid: Conflict resolution, crisis management, team building unless influence is central.`
    },
    {
        id: 'leadership_crisis_management',
        dimension: 'Leadership',
        family_name: 'Crisis Management',
        prompt_guidance: `Frame questions about leading during high-pressure, time-sensitive crises.

Focus areas:
- Production outages affecting customers
- Urgent security vulnerabilities
- Team member sudden departure mid-project
- PR disasters or customer escalations
- Critical deadline failures

Example question types:
- "The system is down and customers are affected. Walk me through your response."
- "You discover a critical security vulnerability in production. What do you do?"
- "Tell me about a time you led through a crisis."

Avoid: Conflict resolution, influence, team building unless crisis is central.`
    },
    {
        id: 'leadership_team_building',
        dimension: 'Leadership',
        family_name: 'Team Building & Culture',
        prompt_guidance: `Frame questions about growing teams, mentoring, and establishing culture.

Focus areas:
- Hiring and onboarding new team members
- Mentoring and developing junior engineers
- Establishing team norms and culture
- Retaining top talent and preventing burnout
- Building psychological safety

Example question types:
- "How do you build a high-performing team from scratch?"
- "Tell me about a time you mentored someone who was struggling."
- "How do you establish culture on a new team?"

Avoid: Conflict resolution, crisis management, influence unless team-building is central.`
    },

    // ==========================================
    // COMMUNICATION FAMILIES
    // ==========================================
    {
        id: 'communication_technical_to_nontechnical',
        dimension: 'Communication',
        family_name: 'Technical to Non-Technical Translation',
        prompt_guidance: `Frame questions that test the candidate's ability to explain technical concepts to non-engineers.

Focus areas:
- Simplifying complex technical decisions for executives
- Explaining trade-offs without jargon
- Translating engineering constraints to business impact
- Making technical risks understandable

Example question types:
- "Explain [technical concept] to a non-technical stakeholder."
- "How would you communicate a 2-month delay to leadership?"
- "Tell me about a time you had to explain a technical failure to customers."

Avoid: Conciseness, executive presence, written communication unless translation is central.`
    },
    {
        id: 'communication_executive_presence',
        dimension: 'Communication',
        family_name: 'Executive Presence & Conciseness',
        prompt_guidance: `Frame questions that test top-down, summarized communication under time pressure.

Focus areas:
- Delivering 2-minute executive summaries
- Communicating under pressure of senior leadership
- Leading with the conclusion, not the details
- Handling interruptions and tough questions

Example question types:
- "You have 2 minutes with the CEO. Give a status update on [project]."
- "The CTO asks: 'Why is this taking so long?' What do you say?"
- "Tell me about a time you presented to senior leadership."

Avoid: Technical translation, written/async communication unless executive context is central.`
    },
    {
        id: 'communication_written_async',
        dimension: 'Communication',
        family_name: 'Written & Asynchronous Communication',
        prompt_guidance: `Frame questions about communicating effectively in writing or asynchronously.

Focus areas:
- Writing clear design docs or RFCs
- Communicating decisions via email or Slack
- Documenting systems for future maintainers
- Managing remote/distributed team communication

Example question types:
- "How would you write a design doc for [system]?"
- "You need to communicate a major change to 50 stakeholders. How do you do it?"
- "Tell me about a time written communication prevented a major issue."

Avoid: Executive presence, technical translation unless async/written is central.`
    },

    // ==========================================
    // TECHNICAL DEPTH FAMILIES
    // ==========================================
    {
        id: 'technical_depth_internals',
        dimension: 'Technical Depth',
        family_name: 'Internals & Low-Level Understanding',
        prompt_guidance: `Frame questions that probe deep understanding of how systems work under the hood.

Focus areas:
- Database internals (indexes, query optimization, storage engines)
- Network protocols and layer understanding
- Memory management and garbage collection
- Compiler or runtime internals
- Operating system concepts

Example question types:
- "Explain how a B-tree index works and when you'd use it."
- "What happens when you type a URL into a browser?"
- "How does garbage collection work in [language]?"

Avoid: Debugging, optimization, code quality unless internals are central.`
    },
    {
        id: 'technical_depth_debugging',
        dimension: 'Technical Depth',
        family_name: 'Debugging & Root Cause Analysis',
        prompt_guidance: `Frame questions about diagnosing and fixing complex technical issues.

Focus areas:
- Systematic debugging approaches
- Root cause analysis methodologies
- Using profiling and monitoring tools
- Reproducing rare or intermittent bugs
- Debugging distributed systems

Example question types:
- "The API is slow. Walk me through how you'd diagnose it."
- "Tell me about a time you debugged a really hard issue."
- "A bug only happens in production, not locally. How do you approach it?"

Avoid: Internals, optimization, code quality unless debugging is central.`
    },
    {
        id: 'technical_depth_optimization',
        dimension: 'Technical Depth',
        family_name: 'Performance Optimization',
        prompt_guidance: `Frame questions about identifying and fixing performance bottlenecks.

Focus areas:
- Profiling and identifying bottlenecks
- Algorithm and data structure optimization
- Database query optimization
- Frontend performance (rendering, bundle size)
- Memory and CPU optimization

Example question types:
- "This query takes 10 seconds. How do you optimize it?"
- "The app is slow on mobile. How do you diagnose and fix it?"
- "Tell me about a time you improved performance significantly."

Avoid: Debugging, internals, code quality unless performance is central.`
    },

    // ==========================================
    // ANALYTICAL THINKING FAMILIES
    // ==========================================
    {
        id: 'analytical_thinking_root_cause',
        dimension: 'Analytical Thinking',
        family_name: 'Root Cause Analysis',
        prompt_guidance: `Frame questions that test systematic root cause identification.

Focus areas:
- Distinguishing symptoms from causes
- Using frameworks like "5 Whys"
- Isolating variables in complex systems
- Avoiding jumping to conclusions

Example question types:
- "User engagement dropped 15%. How do you diagnose the root cause?"
- "Tell me about a time you had to find the root cause of a complex issue."
- "Walk me through how you'd diagnose why [metric] changed."

Avoid: Metric definition, data interpretation, hypothesis testing unless root cause is central.`
    },
    {
        id: 'analytical_thinking_data_interpretation',
        dimension: 'Analytical Thinking',
        family_name: 'Data Interpretation & Pattern Recognition',
        prompt_guidance: `Frame questions about interpreting data, identifying patterns, and drawing conclusions.

Focus areas:
- Reading charts and identifying trends
- Distinguishing correlation from causation
- Detecting anomalies in data
- Making data-driven decisions

Example question types:
- "Here's a graph showing [metric]. What do you see?"
- "How would you interpret this A/B test result?"
- "Tell me about a time data revealed something unexpected."

Avoid: Root cause analysis, hypothesis testing, metric definition unless interpretation is central.`
    },
    {
        id: 'analytical_thinking_hypothesis_testing',
        dimension: 'Analytical Thinking',
        family_name: 'Hypothesis Formation & Testing',
        prompt_guidance: `Frame questions about forming testable hypotheses and designing experiments.

Focus areas:
- Formulating clear, testable hypotheses
- Designing experiments to validate hypotheses
- Determining what data to collect
- Avoiding confirmation bias

Example question types:
- "How would you test whether [feature] increases engagement?"
- "Walk me through how you'd validate this hypothesis."
- "Tell me about a time you designed an experiment to test an assumption."

Avoid: Data interpretation, root cause analysis, metric definition unless hypothesis testing is central.`
    },

    // ==========================================
    // EXECUTION FAMILIES
    // ==========================================
    {
        id: 'execution_deadline_pressure',
        dimension: 'Execution',
        family_name: 'Deadline Pressure & Prioritization',
        prompt_guidance: `Frame questions about delivering under tight deadlines and prioritizing ruthlessly.

Focus areas:
- Managing immutable deadlines
- Deciding what to cut or defer
- Communicating trade-offs under pressure
- Preventing burnout while pushing hard

Example question types:
- "Launch is in 2 weeks and you're behind. What do you do?"
- "Tell me about a time you had to deliver under intense deadline pressure."
- "How do you decide what to cut when time is tight?"

Avoid: Project recovery, dependency management, planning unless deadline pressure is central.`
    },
    {
        id: 'execution_project_recovery',
        dimension: 'Execution',
        family_name: 'Project Recovery & Course Correction',
        prompt_guidance: `Frame questions about rescuing failing projects or correcting course mid-execution.

Focus areas:
- Diagnosing why a project is failing
- Re-scoping or pivoting mid-execution
- Communicating bad news upward
- Recovering team morale

Example question types:
- "A project is 2 months behind. How do you recover?"
- "Tell me about a time you had to rescue a failing project."
- "Halfway through, you realize the approach won't work. What do you do?"

Avoid: Deadline pressure, dependency management, planning unless recovery is central.`
    },
    {
        id: 'execution_dependency_management',
        dimension: 'Execution',
        family_name: 'Dependency Management & Unblocking',
        prompt_guidance: `Frame questions about managing dependencies and unblocking teams.

Focus areas:
- Identifying and tracking dependencies
- Escalating blockers effectively
- Working around or through blocked paths
- Coordinating across teams

Example question types:
- "Your team is blocked by another team. How do you unblock?"
- "Tell me about a time you managed complex dependencies."
- "How do you ensure dependencies don't derail your project?"

Avoid: Deadline pressure, project recovery, planning unless dependencies are central.`
    },

    // ==========================================
    // AI FLUENCY FAMILIES (Pro Tier Only)
    // ==========================================
    {
        id: 'ai_fluency_architecture',
        dimension: 'ai_fluency',
        family_name: 'Architecture Decision-Making',
        prompt_guidance: `Frame questions that test the candidate's ability to justify architectural decisions for AI features.

Scenario frame: "You launched an AI-powered feature (e.g., summarization, recommendation, assistant). Walk me through the architecture decisions you made."

Escalation paths:
- When would you choose RAG vs fine-tuning?
- How did context window constraints influence your design?
- What failure mode were you most worried about?
- How did latency influence model choice?

Penalize:
- "We used GPT because it was easiest"
- "We just plugged into the API"
- High-level buzzwords without system flow clarity

Evaluate for:
- Decision clarity
- Trade-off articulation
- Constraint awareness
- Alternative consideration

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_evaluation',
        dimension: 'ai_fluency',
        family_name: 'Evaluation & Metrics Rigor',
        prompt_guidance: `Frame questions that test whether the candidate understands how AI quality is measured beyond surface metrics.

Scenario frame: "How did you evaluate whether your AI feature was actually working well?"

Escalation paths:
- Offline vs online evaluation trade-offs
- Human review vs automated evals
- How did you detect silent quality degradation?
- What metric would alert you to hallucination risk?

Penalize:
- "We tracked engagement"
- "Users seemed happy"
- No distinction between model output quality and product metrics

Evaluate for:
- Metric specificity
- Evaluation layering
- Quality vs engagement separation
- Operational alert thinking

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_reliability',
        dimension: 'ai_fluency',
        family_name: 'Hallucination & Reliability',
        prompt_guidance: `Frame questions that test understanding of hallucination mitigation strategy.

Scenario frame: "Your AI occasionally produces incorrect outputs. How did you reduce hallucination risk?"

Escalation paths:
- Guardrails vs retrieval grounding
- Confidence scoring strategies
- Fallback flows
- User trust recovery mechanisms

Penalize:
- "We added a disclaimer"
- "The model improved over time"
- No mention of grounding or validation

Evaluate for:
- Mitigation layering
- Grounding awareness
- User trust thinking
- Failure containment

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_stability',
        dimension: 'ai_fluency',
        family_name: 'Drift & Long-Term Stability',
        prompt_guidance: `Frame questions that test understanding of drift and long-term model degradation.

Scenario frame: "Six weeks after launch, quality complaints increase. How would you determine if this is model drift or expectation shift?"

Escalation paths:
- Distribution shift signals
- Embedding drift
- Prompt decay
- External model updates (vendor model changes)

Penalize:
- "We would retrain"
- "We would tweak prompts"
- No mention of structured diagnosis

Evaluate for:
- Diagnostic structure
- Root cause separation
- System vs user shift reasoning

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_cost',
        dimension: 'ai_fluency',
        family_name: 'Cost & Scaling Trade-offs',
        prompt_guidance: `Frame questions that test cost-awareness and scaling trade-offs for AI systems.

Scenario frame: "Your AI feature usage doubled. Your inference costs tripled. What decisions do you make?"

Escalation paths:
- Caching strategies
- Model tiering (smaller models for simple queries)
- Latency vs quality compromise
- Token optimization

Penalize:
- "We would upgrade our plan"
- "Costs would be absorbed"
- No mention of architectural levers

Evaluate for:
- Economic reasoning
- Prioritization clarity
- Constraint navigation

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_orchestration',
        dimension: 'ai_fluency',
        family_name: 'Tooling & Orchestration',
        prompt_guidance: `Frame questions that test understanding of orchestration beyond a single API call.

Scenario frame: "Describe how your AI system handled multi-step reasoning or tool usage."

Escalation paths:
- Tool-calling architecture
- Context management across steps
- MCP vs custom orchestration
- State management

Penalize:
- "The model handled everything"
- "We relied entirely on prompting"
- No system boundary awareness

Evaluate for:
- System decomposition
- Reasoning about orchestration layers
- Multi-step pipeline clarity

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    },
    {
        id: 'ai_fluency_governance',
        dimension: 'ai_fluency',
        family_name: 'Ethical & Risk Framing',
        prompt_guidance: `Frame questions that test the candidate's ability to frame AI risk responsibly.

Scenario frame: "What risks did you explicitly choose not to mitigate at launch?"

Escalation paths:
- Regulatory risk trade-offs
- Bias mitigation decisions
- Escalation protocol design

Penalize:
- "We handled everything"
- "No risks identified"
- No mention of deliberate risk acceptance

Evaluate for:
- Honest risk framing
- Trade-off clarity
- Governance maturity

No coaching. No corrective teaching. Diagnostics only.
Avoid: Definition-style questions, glossary content, trivia.`
    }
]
