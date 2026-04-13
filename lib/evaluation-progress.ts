const FALLBACK_STEPS = ['Analysing transcript', 'Evaluating responses', 'Generating feedback']

const STEPS: Record<string, string[]> = {
  'pm-1': [
    'Clarifying Questions', 'Goal & Metric Alignment', 'User Segmentation',
    'Pain Point Identification', 'Solution Breadth', 'Prioritisation & Rationale',
    'Tradeoff Awareness', 'Business & Strategic Coherence',
  ],
  'pm-2': [
    'Metric Definition', 'Metric Diagnosis', 'Experimentation Fluency',
    'Estimation & Sizing', 'Insight Generation',
  ],
  'pm-3': [
    'Prioritisation Under Constraints', 'Influencing Without Authority',
    'Handling Failure & Ambiguity', 'Technical Fluency', 'Cross-Functional Leadership',
  ],
  'pm-4': [
    'AI Use Case Judgment', 'Designing for Model Uncertainty',
    'AI Metrics & Evaluation', 'AI Ethics & Trust', 'AI Competitive & Strategic Thinking',
  ],

  'sde-1': [
    'Requirements Clarification', 'High-Level Architecture', 'Data Model & Storage',
    'Scalability & Bottleneck Identification', 'Tradeoff Reasoning', 'Failure Modes & Resilience',
  ],
  'sde-2': [
    'Problem Understanding Before Coding', 'Approach Articulation', 'Correctness',
    'Complexity Analysis', 'Optimisation Path', 'Testing & Verification',
  ],
  'sde-3': [
    'Ownership of Technical Decisions', 'Delivering Under Ambiguity',
    'Technical Debt & Quality Judgment', 'Handling Production Incidents',
    'Concurrency & Operating Systems', 'Engineering Leadership & Mentorship',
  ],
  'sde-4': [
    'LLM Fundamentals', 'RAG & Information Retrieval', 'AI Infrastructure & Serving',
    'AI System Reliability & Evaluation',
  ],

  'ds-1': [
    'Problem Framing', 'Statistical Reasoning', 'Experimentation Design',
    'SQL & Data Manipulation', 'Insight Generation',
  ],
  'ds-2': [
    'Problem Framing for ML', 'Feature Engineering Judgment',
    'Model Selection & Evaluation', 'Handling Class Imbalance & Distribution Shift',
    'Productionisation & Experimentation',
  ],
  'ds-3': [
    'Research Depth & Originality', 'Translating Research to Impact',
    'Technical Leadership & Mentorship', 'Navigating Ambiguity & Failure',
  ],
  'ds-4': [
    'Deep Learning Theory', 'LLM Research Frontier',
    'Reinforcement Learning Foundations', 'AI Alignment & Safety',
    'Evaluation & Interpretability',
  ],
}

export function getEvaluationSteps(role: string, round: number): string[] {
  const key = `${role.toLowerCase()}-${round}`
  return STEPS[key] ?? FALLBACK_STEPS
}
