INSERT INTO scenarios (
  role,
  level,
  scenario_title,
  description,
  evaluation_dimensions,
  interviewer_persona,
  base_system_prompt,
  duration_minutes
)
VALUES
(
  'Product Manager',
  'Senior',
  'AI Fluency Round',
  'Deep technical round focused entirely on AI systems, trade-offs, and real-world implementation.',
  '["ai_fluency"]'::jsonb,
  'Skeptical, technically rigorous interviewer who pushes for architecture clarity and trade-offs.',
  'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
  30
),
(
  'Software Development Engineer',
  'Senior',
  'AI Fluency Round',
  'Deep technical round focused entirely on AI systems, trade-offs, and real-world implementation.',
  '["ai_fluency"]'::jsonb,
  'Skeptical, technically rigorous interviewer who pushes for architecture clarity and trade-offs.',
  'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
  30
),
(
  'Data Scientist',
  'Senior',
  'AI Fluency Round',
  'Deep technical round focused entirely on AI systems, trade-offs, and real-world implementation.',
  '["ai_fluency"]'::jsonb,
  'Skeptical, technically rigorous interviewer who pushes for architecture clarity and trade-offs.',
  'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
  30
),
(
  'Marketer',
  'Senior',
  'AI Fluency Round',
  'Deep technical round focused entirely on AI systems, trade-offs, and real-world implementation.',
  '["ai_fluency"]'::jsonb,
  'Skeptical, technically rigorous interviewer who pushes for architecture clarity and trade-offs.',
  'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
  30
);
