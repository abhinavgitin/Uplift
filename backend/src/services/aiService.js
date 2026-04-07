const placeholderByType = {
  explain: 'Explain response',
  constraints: 'Constraints response',
  complexity: 'Complexity response',
  hint: 'Hint response',
  hint1: 'Hint response',
  hint2: 'Hint response',
  hint3: 'Hint response',
  ideas: 'Ideas response',
  analyze: 'Analyze response',
  stuck: 'Stuck response'
};

export async function solveProblem(payload, _providerOverride) {
  const requestType = (payload.type || '').toLowerCase();
  const response = placeholderByType[requestType] || `${payload.type} response`;
  return response;
}
