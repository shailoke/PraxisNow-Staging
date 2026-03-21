-- Clear existing to avoid duplicates (optional, use with care)
-- truncate table public.scenarios cascade;

insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona)
values
-- SDE JUNIOR
('SDE', 'Junior', 'The candidate is being evaluated on Code Correctness, Edge Case Handling, and Communication. Present a novel array or hashing problem that tests these dimensions. Do not name any well-known problem. Do not reuse any problem from the blocked question list. Generate a fresh problem each session. The problem must involve efficient lookup, search, or transformation of a flat data collection. Freshness constraint: novelty must come from an unexpected constraint (e.g., single-pass only, constant space, adversarial input distribution) or an unfamiliar problem framing — not from switching the array element type. HARD CONSTRAINT: Every question must be answerable by a Software Engineer candidate.', 
 ARRAY['Code Correctness', 'Edge Case Handling', 'Communication'], 
 'Neutral and efficient'),

-- SDE SENIOR
('SDE', 'Senior', 'The candidate is being evaluated on Architecture, Scalability, and Trade-offs. Present a novel distributed infrastructure design problem that tests these dimensions. Do not name "rate limiter" as the component. Do not reuse any problem from the blocked question list. Generate a fresh distributed system challenge each session. The problem must involve a control-plane or coordination challenge at API scale (admission control, circuit breaking, distributed locking, quota enforcement, or similar). Freshness constraint: novelty must come from an unexpected failure mode, an asymmetric client load pattern, a multi-region requirement, or a correctness vs throughput trade-off. HARD CONSTRAINT: Every question must be answerable by a Software Engineer candidate.', 
 ARRAY['Architecture', 'Scalability', 'Trade-offs'], 
 'Skeptical and architectural'),

-- PM JUNIOR
('PM', 'Junior', 'The candidate is being evaluated on Product Sense, User Empathy, and Structure. Present a novel product improvement problem for an underserved or non-obvious user segment. Do not name WhatsApp or any other specific product or demographic. Do not reuse any scenario from the blocked question list. Generate a fresh scenario each session. The problem must involve a digital product with a friction or gap for a specific user segment that the candidate must diagnose and propose a solution for. Freshness constraint: novelty must come from an unexpected user segment, a physical-to-digital context, an accessibility constraint, or a cultural or geographic specificity. HARD CONSTRAINT: Every question must be answerable by a Product Manager candidate.', 
 ARRAY['Product Sense', 'User Empathy', 'Structure'], 
 'User-centric and methodical'),

-- PM SENIOR
('PM', 'Senior', 'The candidate is being evaluated on Leadership, Stakeholder Management, and Strategic Vision. Do not introduce a specific stakeholder or feature conflict. Open by asking the candidate to describe a situation where a senior stakeholder pushed for something that conflicted with their product judgment or roadmap. Use their answer as the basis for all follow-up questions. Probe specifically for: how they diagnosed whether the request had legitimate signal; how they managed the relationship without capitulating on product direction; and what the outcome was and what they would do differently. HARD CONSTRAINT: Every question must be answerable by a Product Manager candidate.', 
 ARRAY['Leadership', 'Stakeholder Management', 'Strategic Vision'], 
 'Executive and diplomatic'),

-- DATA SCIENTIST MID
('Data Scientist', 'Mid', 'The candidate is being evaluated on Feature Engineering, Model Selection, and Productionisation. Present a novel anomaly detection or risk classification ML system design problem. Do not name "fraud detection" or "payment gateway." Do not reuse any scenario from the blocked question list. Generate a fresh ML design challenge each session. The problem must involve building an end-to-end ML pipeline to detect an anomalous or rare event pattern in high-volume transactional data. Freshness constraint: novelty must come from an unexpected domain, a class imbalance constraint, a latency requirement, or an unusual feedback loop (delayed labels, adversarial behaviour). HARD CONSTRAINT: Every question must be answerable by a Data Scientist candidate.', 
 ARRAY['Feature Engineering', 'Model Selection', 'Productionization'], 
 'Holistic and practical')
on conflict do nothing;
