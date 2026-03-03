-- Clear existing to avoid duplicates (optional, use with care)
-- truncate table public.scenarios cascade;

insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona)
values
-- SDE JUNIOR
('SDE', 'Junior', 'Conduct a standard coding interview. Ask the candidate to solve "Two Sum" or a similar array problem. Focus on code correctness and edge cases.', 
 ARRAY['Code Correctness', 'Edge Case Handling', 'Communication'], 
 'Neutral and efficient'),

-- SDE SENIOR
('SDE', 'Senior', 'Design a distributed rate limiter for a high-traffic API. Focus on distributed counting, race conditions, and system scalability.', 
 ARRAY['Architecture', 'Scalability', 'Trade-offs'], 
 'Skeptical and architectural'),

-- PM JUNIOR
('PM', 'Junior', 'Conduct a product case study interview. Ask: "How would you improve WhatsApp for elderly users?"', 
 ARRAY['Product Sense', 'User Empathy', 'Structure'], 
 'User-centric and methodical'),

-- PM SENIOR
('PM', 'Senior', 'A key stakeholder (Head of Sales) demands a feature that does not fit the roadmap. Ask the candidate how they handle this.', 
 ARRAY['Leadership', 'Stakeholder Management', 'Strategic Vision'], 
 'Executive and diplomatic'),

-- DATA SCIENTIST MID
('Data Scientist', 'Mid', 'Design an end-to-end fraud detection system for a payment gateway. Focus on the ML pipeline, feature engineering, and productionization.', 
 ARRAY['Feature Engineering', 'Model Selection', 'Productionization'], 
 'Holistic and practical')
on conflict do nothing;
