import { env } from '../config/env.js';
import { solveWithOpenAI } from '../providers/openaiProvider.js';
import { solveWithGemini } from '../providers/geminiProvider.js';
import { solveWithGrok } from '../providers/grokProvider.js';
import { AppError } from '../utils/appError.js';
import { buildSolvePrompt } from '../utils/buildSolvePrompt.js';

const providers = {
  openai: solveWithOpenAI,
  gemini: solveWithGemini,
  grok: solveWithGrok
};

export async function solveProblem(payload, providerOverride) {
  const provider = (providerOverride || env.defaultProvider || '').toLowerCase();
  const selectedProvider = providers[provider];

  if (!selectedProvider) {
    throw new AppError(`Unsupported AI provider: ${provider}`, 400, 'UNSUPPORTED_PROVIDER');
  }

  const prompt = buildSolvePrompt(payload);
  const result = await selectedProvider(prompt);
  return result;
}
