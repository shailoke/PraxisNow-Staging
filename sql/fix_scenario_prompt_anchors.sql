-- ============================================================
-- fix_scenario_prompt_anchors.sql
-- Question Variety Enforcement — Scenario Prompt Sanitisation
-- PraxisNow v2.0   2026-03-21
-- ============================================================
-- Removes named product/company/market anchors embedded in
-- scenario prompts that caused GPT-4o to generate the same
-- opening question every session.
--
-- TYPE 1 prompts (behavioral): remove situation prescription.
-- TYPE 2 prompts (case/hypothetical): replace with generation
--   criteria so GPT invents a fresh situation each session.
--
-- IDEMPOTENT: Safe to run multiple times.
-- ============================================================

-- BACKUP (create once, safe to re-run)
CREATE TABLE IF NOT EXISTS public.scenarios_prompt_backup_pre_variety AS
SELECT id, role, level, prompt
FROM public.scenarios;

-- ============================================================
-- SOFTWARE DEVELOPMENT ENGINEER
-- ============================================================

-- SDE Junior — TYPE 2 (algorithm/coding)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Code Correctness, DS&A Knowledge, Communication, and Edge Case Handling. Present a novel problem that tests these dimensions. Do not reuse any problem from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve designing, implementing, or reasoning about a data structure or algorithm; it must be solvable in an interview timebox; it must have at least one non-obvious edge case worth probing. Good problem forms: "given a stream of X, find Y efficiently", "design a data structure that supports operations A, B, C", "given a graph/array/string of type X, solve constraint problem Y." Invalid forms: questions about product roadmaps, user research, stakeholder management, or system architecture without a direct coding component. Freshness constraint: novelty must come from an unexpected constraint (offline-first, adversarial input, memory limit), an unusual data type, or an unfamiliar access pattern — not from switching to a different named problem. HARD CONSTRAINT: Every question in this session must be answerable by a Software Engineer candidate. Questions requiring product management, marketing, or business strategy knowledge are forbidden.'
WHERE role IN ('Software Development Engineer', 'Software Engineer', 'SDE') AND level = 'Junior';

-- SDE Senior — TYPE 2 (system design)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on System Design, Scalability, Trade-offs, and Database Choice. Present a novel distributed system design problem that tests these dimensions. Do not reuse any problem from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve designing a distributed component at internet scale; it must require reasoning about consistency, partitioning, and failure modes; the scale and constraint requirements must emerge through dialogue, not be pre-stated. Good problem forms: "design a distributed component that does X under constraint Y", "design the write or read path for a system with property Z", "how would you architect a service that handles N with requirement Q." Invalid forms: naming specific existing products (e.g., "design Twitter", "build a Kafka clone"), any question requiring product management or business strategy knowledge. Freshness constraint: novelty must come from an unusual consistency requirement, an asymmetric read/write pattern, an adversarial client model, or an unexpected failure mode — not from switching domain names. HARD CONSTRAINT: Every question in this session must be answerable by a Software Engineer candidate. Questions requiring product management or business knowledge without an engineering component are forbidden.'
WHERE role IN ('Software Development Engineer', 'Software Engineer', 'SDE') AND level = 'Senior';

-- SDE Principal — TYPE 1 (architectural leadership)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Architecture Evolution, Risk Management, Influence, and Technical Vision. Do not introduce a migration scenario. Open by asking the candidate to describe a large-scale architectural decision or migration they have personally led or significantly contributed to. Use their answer as the basis for all follow-up questions. Probe specifically for: how they identified and sequenced risks in the migration path; how they built organisational alignment around technical direction; what trade-offs they made and what they would change in hindsight. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises — not on any situation you introduce. HARD CONSTRAINT: Every question in this session must be answerable by a Software Engineer candidate. Questions requiring product management, marketing, or HR knowledge are forbidden.'
WHERE role IN ('Software Development Engineer', 'Software Engineer', 'SDE') AND level = 'Principal';

-- SDE Leader — TYPE 1 (engineering org leadership)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Organisational Health, Metrics, Leadership, and Execution. Do not introduce a velocity or delivery decline scenario. Open by asking the candidate to describe a situation where they identified and addressed a systemic decline in engineering delivery. Use their answer as the basis for all follow-up questions. Probe specifically for: the signals they used to detect the decline; how they diagnosed root cause (people, process, or technical debt); and what concrete interventions they drove and measured. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises — not on any situation you introduce. HARD CONSTRAINT: Every question in this session must be answerable by a Software Engineer candidate. Questions requiring product strategy, financial modelling, or marketing knowledge are forbidden.'
WHERE role IN ('Software Development Engineer', 'Software Engineer', 'SDE') AND level = 'Leader';


-- ============================================================
-- PRODUCT MANAGER
-- ============================================================

-- PM Junior — TYPE 2 (product sense)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Product Sense, User Empathy, Creativity, and Communication. Present a novel product improvement or design problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve identifying a user need and proposing a product response; it must be scoped to a single digital product surface; it must involve at least one prioritisation decision the candidate must justify. Good problem forms: "pick a product used by audience X and identify its biggest friction point", "design a new feature for a product serving segment Y", "how would you improve the experience of Z for a non-obvious user group." Freshness constraint: novelty must come from an unexpected user segment, a physical-to-digital context, a resource constraint, or an underserved use case — never reuse a named product, company, or market from the blocked question list. Invalid forms: questions about engineering architecture, data model design, or ML internals. HARD CONSTRAINT: Every question in this session must be answerable by a Product Manager candidate. Questions requiring software implementation or data science knowledge are forbidden.'
WHERE role = 'Product Manager' AND level = 'Junior';

-- PM Senior — TYPE 2 (product strategy / competitive launch)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Product Strategy, Market Analysis, Prioritisation, and Execution. Present a novel product launch or competitive entry problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve entering or competing in a market with existing incumbents; it must require a defensible MVP definition and sequencing rationale; it must surface trade-offs between speed, scope, and differentiation. Good problem forms: "we have decided to enter category X — how do you define what we build first and why", "a new category is forming in space Y — how do you position and launch", "design the market entry strategy for a product competing in a space with one dominant player." Freshness constraint: novelty must come from an unexpected product category, an unusual competitive dynamic, a regulatory or distribution constraint, or a non-obvious target segment — never name a specific company or product from the blocked list. Invalid forms: questions about engineering implementation or data pipeline design. HARD CONSTRAINT: Every question in this session must be answerable by a Product Manager candidate. Questions requiring software architecture or ML knowledge are forbidden.'
WHERE role = 'Product Manager' AND level = 'Senior';

-- PM Principal — TYPE 1 (strategic inflection)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Strategic Vision, Business Models, Stakeholder Management, and Data Fluency. Do not introduce a churn or market positioning scenario. Open by asking the candidate to describe a significant strategic inflection or market repositioning they have personally led or driven. Use their answer as the basis for all follow-up questions. Probe specifically for: how they built the business case and got executive alignment; what data they used to frame the strategic decision; and what trade-offs they navigated between short-term revenue and long-term positioning. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Product Manager candidate. Questions requiring engineering architecture or ML model knowledge are forbidden.'
WHERE role = 'Product Manager' AND level = 'Principal';

-- PM Leader — TYPE 1 (org design / conflict)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Leadership, Org Design, Conflict Resolution, and Vision Alignment. Do not introduce a team conflict scenario. Open by asking the candidate to describe a situation where they had to restructure, realign, or resolve systemic misalignment across product teams. Use their answer as the basis for all follow-up questions. Probe specifically for: the diagnostic process they used to identify the structural root cause; how they built alignment across senior stakeholders; and what they changed and how they measured whether it worked. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Product Manager or Product Leader candidate. Questions requiring engineering implementation knowledge are forbidden.'
WHERE role = 'Product Manager' AND level = 'Leader';

-- ============================================================
-- MARKETER
-- (Former PMM scenarios consolidated during role model cleanup.
--  Matched by role = 'Marketer' AND dimension array contains
--  the distinguishing dimension.)
-- ============================================================

-- Marketer — Positioning & Messaging  — TYPE 2 (GTM / launch hypothesis)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Messaging, Audience Segmentation, GTM Strategy, and Market Positioning. Present a novel go-to-market positioning or launch problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve developing positioning for a product with a specific user segment; it must require the candidate to articulate a value proposition and at least one channel or distribution choice; the product must be a consumer or prosumer item or a B2B tool, not a generic abstract concept. Good problem forms: "develop messaging for a new product for segment X with constraint Y", "position a product entering a crowded category for audience Z", "how would you differentiate a product that does what competitors do but for an underserved group." Freshness constraint: novelty must come from an unexpected product category, a budget constraint, a channel limitation, or a non-obvious competitive positioning angle — never reuse a named product, brand, or market from the blocked list. HARD CONSTRAINT: Every question in this session must be answerable by a Marketer candidate. Engineering, data science, or product roadmap ownership questions are forbidden.'
WHERE role = 'Marketer' AND evaluation_dimensions && ARRAY['Positioning & Messaging'];

-- Marketer — Demand Generation  — TYPE 2 (performance / growth campaign)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Demand Generation, Channel Strategy, Campaign Execution, and Metrics. Present a novel demand generation or growth campaign challenge that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve building or optimising a pipeline of demand for a product or service; it must require the candidate to choose channels and justify the choice with a constraint (budget, audience reach, or time-to-pipeline); it must surface a measurement or attribution challenge. Good problem forms: "design a demand generation programme for a B2B product entering a new vertical with constraint Y", "our pipeline is down — walk me through how you diagnose and recover it", "how would you build a repeatable growth engine for product X with budget constraint Y." Freshness constraint: novelty must come from an unexpected vertical, an unusual channel mix constraint, a competitive saturation problem, or a measurement gap — never reuse a named product or market. HARD CONSTRAINT: Every question in this session must be answerable by a Marketer candidate. Engineering implementation and data science questions are forbidden.'
WHERE role = 'Marketer' AND evaluation_dimensions && ARRAY['Demand Generation']
  AND NOT (evaluation_dimensions && ARRAY['Positioning & Messaging']);

-- Marketer — Brand & Narrative  — TYPE 1 (brand leadership experience)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Brand Strategy, Thought Leadership, Brand & Narrative, and Market Positioning. Do not introduce a rebrand or brand-aging scenario. Open by asking the candidate to describe a situation where they had to significantly reposition a brand, establish a new brand voice, or drive a narrative shift in a competitive market. Use their answer as the basis for all follow-up questions. Probe specifically for: how they diagnosed the gap between brand perception and product reality; how they built CEO or board alignment to invest in the brand shift; and what success metrics they defined and whether they were achieved. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Marketer candidate. Engineering or data science questions are forbidden.'
WHERE role = 'Marketer' AND evaluation_dimensions && ARRAY['Brand & Narrative'];

-- Marketer — Account-Based Marketing  — TYPE 2 (ABM programme design)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Account-Based Marketing, Sales Alignment, Campaign Execution, and Metrics. Present a novel ABM programme design or account strategy challenge that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve designing or optimising a targeted account-based programme for a B2B product; it must require reasoning about account selection criteria, tiering, and channel orchestration; it must surface a sales-marketing alignment challenge. Good problem forms: "design a tier-1 ABM programme for a SaaS product entering a new enterprise vertical", "our ABM programme is generating engagement but not pipeline — walk me through your diagnosis", "how would you design account selection and personalisation for a product with constraint Y." Freshness constraint: novelty must come from an unexpected industry vertical, an unusual account tier structure, a data quality constraint, or an unusual sales motion (PLG, channel-sold, or partner-led) — never reuse a named account or company. HARD CONSTRAINT: Every question in this session must be answerable by a Marketer candidate. Engineering implementation and product roadmap questions are forbidden.'
WHERE role = 'Marketer' AND evaluation_dimensions && ARRAY['Account-Based Marketing'];

-- ============================================================
-- DATA SCIENTIST
-- ============================================================

-- DS Junior — TYPE 2 (SQL / data analysis)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on SQL, Data Intuition, Communication, and Basic Statistics. Present a novel data analysis problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve querying or aggregating behavioural event data; it must require at least one non-trivial SQL pattern (window function, aggregation, or join); it must require the candidate to articulate what they would look for and why. Good problem forms: "given a table of user activity events, write the SQL to find X pattern", "you have tables A and B — how do you answer question Y", "an analyst asks you to find the cohort retention rate — how do you write this query." Freshness constraint: novelty must come from an unexpected data schema, a counter-intuitive aggregation target, or an ambiguous metric definition — not from changing domain names. HARD CONSTRAINT: Every question in this session must be answerable by a Data Scientist candidate. Product management or engineering architecture questions without a data component are forbidden.'
WHERE role = 'Data Scientist' AND level = 'Junior';

-- DS Mid (seed_presets) — TYPE 2 (ML system design / anomaly detection)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Feature Engineering, Model Selection, and Productionisation. Present a novel anomaly detection or risk classification ML system design problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve building an end-to-end ML pipeline to detect an anomalous or rare event pattern in high-volume transactional data; it must require reasoning about feature design, model selection, and production deployment; it must surface a non-trivial challenge such as class imbalance, delayed labels, or adversarial behaviour. Good problem forms: "design an ML pipeline to detect anomalous events in data of type X with constraint Y", "build a risk classification system for domain Z that must handle challenge Q", "how would you architect a detection system where labels are delayed by N days." Freshness constraint: novelty must come from an unexpected domain, an unusual feedback loop, a latency requirement, or a privacy constraint — not from switching industry names. HARD CONSTRAINT: Every question in this session must be answerable by a Data Scientist candidate.'
WHERE role = 'Data Scientist' AND level = 'Mid';

-- DS Senior — TYPE 2 (ML system design)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on ML System Design, Feature Engineering, Productionisation, and Metrics. Present a novel ML system design problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve designing an ML system end-to-end for a real product use case; it must require reasoning about feature design, model selection, and production deployment; it must surface a non-trivial challenge such as cold start, distribution shift, or feedback loops. Good problem forms: "design a ranking or personalisation system for product X with constraint Y", "build a model that predicts Z at scale with challenge Q", "how would you architect an ML pipeline for a system that must handle property X." Freshness constraint: novelty must come from an unexpected prediction target, an unusual data sparsity pattern, a privacy constraint, or an asymmetric feedback signal — not from switching the product name. HARD CONSTRAINT: Every question in this session must be answerable by a Data Scientist candidate. Product roadmap or engineering-only architecture questions are forbidden.'
WHERE role = 'Data Scientist' AND level = 'Senior';

-- DS Principal — TYPE 2 (data strategy / ethics)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Data Strategy, Ethics/Privacy, Architecture, and Influence. Present a novel high-stakes data or AI strategy problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve using sensitive or behavioural data at scale for a consequential prediction; it must require the candidate to articulate ethical risks and not just technical safeguards; it must surface trade-offs between data value and privacy or fairness constraints. Good problem forms: "we want to use data of type X to make decision Y — what are the risks and guardrails", "design a data strategy for a use case with legal and ethical exposure in domain Z", "how would you architect a system that maximises data utility while enforcing constraint Q." Freshness constraint: novelty must come from an unexpected data type, a new regulatory context, an unfamiliar prediction target, or an unusual harm category. HARD CONSTRAINT: Every question in this session must be answerable by a Data Scientist candidate.'
WHERE role = 'Data Scientist' AND level = 'Principal';

-- DS Leader — TYPE 1 (data culture / org)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Data Culture, Leadership, Cross-functional Influence, and ROI Focus. Do not introduce a culture or adoption scenario. Open by asking the candidate to describe a situation where they drove meaningful adoption of data-informed decision-making across a team or organisation that was resistant or immature. Use their answer as the basis for all follow-up questions. Probe specifically for: the specific behaviours or decisions they were trying to change; how they built credibility and coalition with non-data stakeholders; and what metrics they used to know the culture had actually shifted. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Data Science Leader candidate. Questions requiring software engineering implementation or product roadmap ownership knowledge are forbidden.'
WHERE role = 'Data Scientist' AND level = 'Leader';

-- ============================================================
-- PROJECT MANAGER
-- ============================================================

-- PgM Junior — TYPE 2 (project planning)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Planning, Scheduling, Communication, and Risk Identification. Present a novel project planning problem that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve planning a time-boxed technical or operational initiative with at least two external dependencies; it must require the candidate to surface and sequence risks; it must require a communication or stakeholder plan. Good problem forms: "plan a delivery of X with constraints Y and dependency Z", "how do you build a project timeline for an initiative where team capacity is uncertain", "a project has a fixed launch date and three external dependencies — walk me through your plan." Freshness constraint: novelty must come from an unexpected dependency type, a compressed timeline, unclear ownership, or an unusual cross-team structure. HARD CONSTRAINT: Every question in this session must be answerable by a Project Manager candidate. Engineering implementation or product strategy questions are forbidden.'
WHERE role = 'Project Manager' AND level = 'Junior';

-- PgM Senior — TYPE 1 (risk recovery experience)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Risk Management, Negotiation, Stakeholder Communication, and Problem Solving. Do not introduce a vendor delay or delivery failure scenario. Open by asking the candidate to describe a situation where a significant delivery risk materialised on a project they owned. Use their answer as the basis for all follow-up questions. Probe specifically for: how they detected the risk early (or why they did not); what recovery options they evaluated and how they chose between them; how they communicated to stakeholders under pressure. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Project Manager candidate. Product strategy or engineering architecture questions are forbidden.'
WHERE role = 'Project Manager' AND level = 'Senior';

-- PgM Principal — TYPE 2 (programme coordination)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Program Management, Governance, Reporting, and Strategic Alignment. Present a novel large-scale programme coordination challenge that tests these dimensions. Do not reuse any scenario from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve coordinating multiple interdependent workstreams across more than two business units; it must require a governance and escalation design; it must surface trade-offs between central visibility and team autonomy. Good problem forms: "design the operating model for a multi-year programme with N teams across M orgs", "how do you structure reporting and escalation for a complex transformation with ambiguous ownership", "a programme has competing priorities across business units — how do you surface and resolve conflicts." Freshness constraint: novelty must come from an unusual stakeholder structure, an immovable regulatory deadline, a geographically distributed team, or an ambiguous sponsorship model. HARD CONSTRAINT: Every question in this session must be answerable by a Project Manager or Programme Manager candidate.'
WHERE role = 'Project Manager' AND level = 'Principal';

-- PgM Leader — TYPE 1 (delivery capability / org building)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Org Building, Process Design, Leadership, and Efficiency. Do not introduce a PMO from-scratch scenario. Open by asking the candidate to describe a situation where they had to establish or significantly mature a delivery capability or function within an organisation that lacked one. Use their answer as the basis for all follow-up questions. Probe specifically for: how they diagnosed what was broken before they standardised; how they got adoption without mandate; what trade-offs they made between rigour and speed. The quality of the evaluation depends entirely on how deeply you probe what the candidate raises. HARD CONSTRAINT: Every question in this session must be answerable by a Programme Management or Delivery Leadership candidate.'
WHERE role = 'Project Manager' AND level = 'Leader';

-- ============================================================
-- FRESH GRADUATES
-- (Stored as applicant_context = 'fresh_graduate' after cleanup.
--  Match by original role names that may still exist, or by
--  the applicant_context column if the cleanup already ran.)
-- ============================================================

-- Fresh Engineering Grad — TYPE 2 (CS fundamentals / coding)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on CS Fundamentals, Coding, Communication, and Learning Agility. Present a novel CS fundamentals or coding problem that tests these dimensions. Do not reuse any problem from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must test a foundational CS concept (data structures, OS internals, algorithm complexity, or basic system behaviour); it must be solvable in an interview timebox by a new graduate; it must have a conceptual component the candidate can explain verbally, not just code. Good problem forms: "explain why X happens in a system that does Y", "implement a solution for problem of type Z", "compare approaches A and B for achieving outcome C." Freshness constraint: novelty must come from an unexpected application of a known concept, an unusual constraint, or a conceptual question paired with a changed invariant — not from naming a different standard CS topic. HARD CONSTRAINT: Questions must be answerable by a new engineering graduate. Business strategy and product management questions are forbidden.'
WHERE role = 'Fresh Engineering Grad' AND level = 'Entry';

-- Fresh MBA Grad — TYPE 2 (market sizing / structured thinking)
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Structured Thinking, Guesstimation, Culture Fit, and Communication. Present a novel market sizing or structured estimation problem that tests these dimensions. Do not reuse any problem from the blocked question list. Generate a fresh problem each session — novelty is intentional and required. The problem must meet ALL of the following criteria: it must involve estimating the size of a market or quantity that requires the candidate to decompose the problem without perfect information; it must require the candidate to state and justify their assumptions; the product or market must be one the candidate is unlikely to have prepared specifically for. Good problem forms: "estimate the market size for X in market Y", "how many Z exist in city/country Q", "estimate the annual revenue of business type X." After the sizing exercise, transition to culture-fit and motivation questions. Freshness constraint: novelty must come from an unexpected product category, a non-obvious market geography, or an unusual unit of measurement — never reuse a category from the blocked question list. HARD CONSTRAINT: Questions must be answerable by a new MBA graduate. Technical engineering or data science questions are forbidden.'
WHERE role = 'Fresh MBA Grad' AND level = 'Entry';

-- ============================================================
-- SEED_PRESETS.SQL SCENARIOS
-- (These rows use role names 'SDE', 'PM', 'Data Scientist'
--  which may have been standardised. Each UPDATE uses both
--  the original role name and the standardised name to be
--  idempotent regardless of whether cleanup has run.)
-- ============================================================

-- SDE Junior (seed_presets) — TYPE 2
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Code Correctness, Edge Case Handling, and Communication. Present a novel array or hashing problem that tests these dimensions. Do not name any well-known problem. Do not reuse any problem from the blocked question list. Generate a fresh problem each session. The problem must involve efficient lookup, search, or transformation of a flat data collection. Freshness constraint: novelty must come from an unexpected constraint (e.g., single-pass only, constant space, adversarial input distribution) or an unfamiliar problem framing — not from switching the array element type. HARD CONSTRAINT: Every question must be answerable by a Software Engineer candidate.'
WHERE role IN ('SDE', 'Software Engineer') AND level = 'Junior'
  AND prompt LIKE '%Two Sum%';

-- SDE Senior (seed_presets) — TYPE 2
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Architecture, Scalability, and Trade-offs. Present a novel distributed infrastructure design problem that tests these dimensions. Do not name "rate limiter" as the component. Do not reuse any problem from the blocked question list. Generate a fresh distributed system challenge each session. The problem must involve a control-plane or coordination challenge at API scale (admission control, circuit breaking, distributed locking, quota enforcement, or similar). Freshness constraint: novelty must come from an unexpected failure mode, an asymmetric client load pattern, a multi-region requirement, or a correctness vs throughput trade-off. HARD CONSTRAINT: Every question must be answerable by a Software Engineer candidate.'
WHERE role IN ('SDE', 'Software Engineer') AND level = 'Senior'
  AND prompt LIKE '%rate limiter%';

-- PM Junior (seed_presets) — TYPE 2
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Product Sense, User Empathy, and Structure. Present a novel product improvement problem for an underserved or non-obvious user segment. Do not name WhatsApp or any other specific product or demographic. Do not reuse any scenario from the blocked question list. Generate a fresh scenario each session. The problem must involve a digital product with a friction or gap for a specific user segment that the candidate must diagnose and propose a solution for. Freshness constraint: novelty must come from an unexpected user segment, a physical-to-digital context, an accessibility constraint, or a cultural or geographic specificity. HARD CONSTRAINT: Every question must be answerable by a Product Manager candidate.'
WHERE role = 'PM' AND level = 'Junior';

-- PM Senior (seed_presets) — TYPE 1
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Leadership, Stakeholder Management, and Strategic Vision. Do not introduce a specific stakeholder or feature conflict. Open by asking the candidate to describe a situation where a senior stakeholder pushed for something that conflicted with their product judgment or roadmap. Use their answer as the basis for all follow-up questions. Probe specifically for: how they diagnosed whether the request had legitimate signal; how they managed the relationship without capitulating on product direction; and what the outcome was and what they would do differently. HARD CONSTRAINT: Every question must be answerable by a Product Manager candidate.'
WHERE role = 'PM' AND level = 'Senior';

-- Data Scientist Mid (seed_presets) — TYPE 2
UPDATE public.scenarios
SET prompt = 'The candidate is being evaluated on Feature Engineering, Model Selection, and Productionisation. Present a novel anomaly detection or risk classification ML system design problem. Do not name "fraud detection" or "payment gateway." Do not reuse any scenario from the blocked question list. Generate a fresh ML design challenge each session. The problem must involve building an end-to-end ML pipeline to detect an anomalous or rare event pattern in high-volume transactional data. Freshness constraint: novelty must come from an unexpected domain, a class imbalance constraint, a latency requirement, or an unusual feedback loop (delayed labels, adversarial behaviour). HARD CONSTRAINT: Every question must be answerable by a Data Scientist candidate.'
WHERE role = 'Data Scientist' AND level = 'Mid'
  AND prompt LIKE '%fraud detection%';

-- ============================================================
-- ROLLBACK (commented — run only if needed):
-- UPDATE public.scenarios s
-- SET prompt = b.prompt
-- FROM public.scenarios_prompt_backup_pre_variety b
-- WHERE s.id = b.id;
-- ============================================================
