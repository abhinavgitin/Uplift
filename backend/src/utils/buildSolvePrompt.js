const requestGuidanceByType = {
  explain: 'Explain the problem in simple terms, identify input/output, and summarize the core challenge.',
  constraints: 'Extract constraints and explain how they influence algorithm and data structure choices.',
  complexity: 'Provide target time and space complexity with short justification and trade-offs.',
  hint: 'Give one lightweight directional hint only. Do not reveal full algorithm.',
  hint1: 'Give one lightweight directional hint only. Do not reveal full algorithm.',
  hint2: 'Give a medium-detail hint describing approach and key steps, but avoid full code.',
  hint3: 'Give a strong hint with pseudocode-level guidance while avoiding complete final code.',
  ideas: 'List 2-4 viable approaches with pros/cons and when to use each.',
  analyze: 'Review the provided code for correctness, edge cases, complexity, and specific improvements.',
  stuck: 'Provide an actionable recovery plan with next debugging steps and one minimal example.'
};

function getRequestGuidance(type) {
  return requestGuidanceByType[type] ||
    'Provide concise, practical guidance focused on correctness, complexity, and implementation clarity.';
}

export function buildSolvePrompt({ type, problem, code, language }) {
  const normalizedType = (type || 'explain').toLowerCase();
  const requestGuidance = getRequestGuidance(normalizedType);

  return `${normalizedType}: ${problem?.title || problem}. ${requestGuidance}`;
}
