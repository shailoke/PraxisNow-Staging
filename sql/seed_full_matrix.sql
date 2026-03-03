-- Clear existing presets to ensure clean slates (optional, but good for matrix consistency)
delete from public.scenarios where true;

-- 1. SOFTWARE DEVELOPMENT ENGINEERING (SDE)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Software Engineer', 'Junior', 
 'Conduct a standard coding interview covering data structures and algorithms. Ask the candidate to solve a problem like "Valid Anagram" or "Detect Cycle in Linked List". Focus on clean code and basic edge cases.',
 ARRAY['Code Correctness', 'DS&A Knowledge', 'Communication', 'Edge Case Handling'], 
 'Neutral and efficient'),

('Software Engineer', 'Senior', 
 'Design a distributed system component (e.g., Distributed Key-Value Store or Notification Service). Focus on consistency models, sharding, and failure handling.',
 ARRAY['System Design', 'Scalability', 'Trade-offs', 'Database Choice'], 
 'Skeptical and architectural'),

('Software Engineer', 'Principal', 
 'Discuss high-level architectural evolution and legacy migration. Scenario: "We need to migrate a monolithic payment system to microservices with zero downtime."',
 ARRAY['Architecture Evolution', 'Risk Management', 'Influence', 'Technical Vision'], 
 'Skeptical and probing'),

('Software Engineer', 'Leader', 
 'Engineering Leadership scenario. Scenario: "Your org velocity has dropped by 30% over two quarters. How do you diagnose and fix this?"',
 ARRAY['Organizational Health', 'Metrics', 'Leadership', 'Execution'], 
 'Challenging and executive');

-- 2. PRODUCT MANAGER (PM)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Product Manager', 'Junior', 
 'Product Sense case. Scenario: "Pick a favorite product. How would you improve it?" Focus on user needs and basic prioritization.',
 ARRAY['Product Sense', 'User Empathy', 'Creativity', 'Communication'], 
 'User-centric and methodical'),

('Product Manager', 'Senior', 
 'Product Strategy and Execution. Scenario: "We need to launch a competitor to TikTok. How do we start and what is the MVP?"',
 ARRAY['Product Strategy', 'Market Analysis', 'Prioritization', 'Execution'], 
 'Analytical and data-driven'),

('Product Manager', 'Principal', 
 'Platform Strategy. Scenario: "Our SaaS platform churn is increasing. Define a strategy to move upmarket while retaining SMBs."',
 ARRAY['Strategic Vision', 'Business Models', 'Stakeholder Management', 'Data Fluency'], 
 'Strategic and questioning'),

('Product Manager', 'Leader', 
 'Organizational Product Leadership. Scenario: "Two of your product teams are in constant conflict over shared resources. How do you resolve this structure?"',
 ARRAY['Leadership', 'Org Design', 'Conflict Resolution', 'Vision Alignment'], 
 'Executive and diplomatic');

-- 3. PRODUCT MARKETING MANAGER (PMM)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Product Marketing Manager', 'Junior', 
 'Go-to-Market basics. Scenario: "Draft the messaging and positioning for a new budget smartphone targeting college students."',
 ARRAY['Messaging', 'Audience Segmentation', 'Copywriting', 'Creativity'], 
 'Enthusiastic and clear'),

('Product Marketing Manager', 'Senior', 
 'Strategic GTM Launch. Scenario: "We are launching a complex B2B enterprise security tool. Outline the 6-month GTM plan."',
 ARRAY['GTM Strategy', 'Channel Strategy', 'Sales Enablement', 'Metrics'], 
 'Focused and metric-heavy'),

('Product Marketing Manager', 'Principal', 
 'Category Creation. Scenario: "We have a new product that doesn''t fit existing categories. How do we define and dominate this new space?"',
 ARRAY['Category Design', 'Brand Strategy', 'Thought Leadership', 'Market Positioning'], 
 'Visionary and critical'),

('Product Marketing Manager', 'Leader', 
 'Portfolio Strategy. Scenario: "Our brand perception is aging. Lead a rebrand that aligns product reality with new market aspirations."',
 ARRAY['Brand Strategy', 'Leadership', 'Budget Management', 'Executive Comm'], 
 'Executive and brand-focused');

-- 4. DATA SCIENTIST (DS)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Data Scientist', 'Junior', 
 'Data Analysis and SQL. Scenario: "Analyze this dataset of user logins to find retention patterns. Write the SQL and explain the findings."',
 ARRAY['SQL', 'Data Intuition', 'Communication', 'Basic Statistics'], 
 'Technical and precise'),

('Data Scientist', 'Senior', 
 'Machine Learning System Design. Scenario: "Design a recommendation system for a video streaming service. Handle cold starts and scalability."',
 ARRAY['ML System Design', 'Feature Engineering', 'Productionization', 'Metrics'], 
 'Analytical and thorough'),

('Data Scientist', 'Principal', 
 'Data Strategy & AI Ethics. Scenario: "We want to use user data to predict health outcomes. What are the ethical risks and architectural safeguards?"',
 ARRAY['Data Strategy', 'Ethics/Privacy', 'Architecture', 'Influence'], 
 'Ethical and strategic'),

('Data Scientist', 'Leader', 
 'Data Organization Leadership. Scenario: "The engineering team ignores data insights. How do you build a data-driven culture?"',
 ARRAY['Data Culture', 'Leadership', 'Cross-functional Influence', 'ROI Focus'], 
 'Challenging and outcome-oriented');

-- 5. PROJECT MANAGER (PgM)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Project Manager', 'Junior', 
 'Project Planning. Scenario: "Create a timeline for a 3-month web migration project with 3 dependencies."',
 ARRAY['Planning', 'Scheduling', 'Communication', 'Risk ID'], 
 'Organized and detail-oriented'),

('Project Manager', 'Senior', 
 'Risk Management & Recovery. Scenario: "A critical vendor is 3 weeks late, threatening the launch date. How do you recover?"',
 ARRAY['Risk Management', 'Negotiation', 'Stakeholder Comm', 'Problem Solving'], 
 'Pragmatic and firm'),

('Project Manager', 'Principal', 
 'Program Management. Scenario: "Manage a multi-year digital transformation program across 5 business units. How do you track 20+ workstreams?"',
 ARRAY['Program Management', 'Governance', 'Reporting', 'Strategic Alignment'], 
 'Systematic and big-picture'),

('Project Manager', 'Leader', 
 'PMO Leadership. Scenario: "Establish a Project Management Office (PMO) from scratch. Define the standards, tools, and hiring plan."',
 ARRAY['Org Building', 'Process Design', 'Leadership', 'Efficiency'], 
 'Executive and process-focused');

-- 6. QUALITY ASSURANCE (QA)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Quality Assurance', 'Junior', 
 'Test Case Design. Scenario: "Write test cases for a login page with social auth. Cover positive, negative, and edge cases."',
 ARRAY['Test Planning', 'Edge Cases', 'Attention to Detail', 'Bug Reporting'], 
 'Rigorous and observant'),

('Quality Assurance', 'Senior', 
 'Test Automation Strategy. Scenario: "Our manual regression takes 3 days. Design an automation strategy to cut it to 4 hours."',
 ARRAY['Automation Strategy', 'CI/CD Integration', 'Tool Selection', 'Efficiency'], 
 'Efficiency-focused and technical'),

('Quality Assurance', 'Principal', 
 'Quality Engineering Architecture. Scenario: "Design the quality gates for a microservices architecture deploying 50 times a day."',
 ARRAY['Quality Architecture', 'DevOps Integration', 'Risk Analysis', 'Influence'], 
 'Architectural and uncompromising'),

('Quality Assurance', 'Leader', 
 'Quality Culture. Scenario: "Developers view QA as a bottleneck. How do you shift the culture to ''Quality is everyone''s responsibility''?"',
 ARRAY['Culture Change', 'Leadership', 'Metric Definition', 'Stakeholder Mgmt'], 
 'Persuasive and executive');

-- 7. FRESH GRADUATES (Entry)
insert into public.scenarios (role, level, prompt, evaluation_dimensions, persona) values
('Fresh Engineering Grad', 'Entry', 
 'CS Fundamentals. Scenario: "Explain the difference between a process and a thread. Reverse a binary tree."',
 ARRAY['CS Fundamentals', 'Coding', 'Communication', 'Learning Agility'], 
 'Encouraging and academic'),

('Fresh MBA Grad', 'Entry', 
 'Business Logic & fit. Scenario: "Estimate the market size for premium dog food in India. Why do you want to join this company?"',
 ARRAY['Structured Thinking', 'Guesstimation', 'Culture Fit', 'Communication'], 
 'Friendly and professional');
