export function buildSolvePrompt({ problem, code, language }) {
  return [
    'You are an expert coding interview assistant.',
    'Help solve the problem with concise reasoning, edge cases, and improved code guidance.',
    '',
    `Problem:`,
    problem,
    '',
    `Language: ${language}`,
    '',
    'Current code:',
    code
  ].join('\n');
}
