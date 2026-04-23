function compressProblem(problem) {
  if (!problem) return '';

  if (typeof problem === 'string') {
    return problem.slice(0, 250).trim();
  }

  const title = String(problem.title || '').trim();
  const description = String(problem.description || '').slice(0, 180).trim();

  return `${title}\n${description}`.trim().slice(0, 250);
}

export function buildSolvePrompt({ type, problem, code, language }) {
  const normalizedType = (type || 'explain').toLowerCase();
  const shortProblem = compressProblem(problem);

  return `
You are an AI function that returns only final answers.

Rules:
- Do NOT explain your thinking
- Do NOT describe steps
- Do NOT include phrases like "we need to"
- Do NOT repeat instructions

Output only the result.

Task: ${normalizedType}

Problem:
${shortProblem}

${code ? `Code:\n${code.slice(0, 200)}` : ''}

Answer:
`.trim();
}