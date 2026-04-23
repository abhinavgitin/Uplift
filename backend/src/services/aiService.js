import { env } from '../config/env.js';
import { solveWithGemini } from '../providers/geminiProvider.js';
import { solveWithOpenAI } from '../providers/openaiProvider.js';
import { solveWithGrok } from '../providers/grokProvider.js';
import { solveWithDeepSeek } from '../providers/deepseekProvider.js';
import { solveWithOpenRouter } from '../providers/openrouterProvider.js';
import { AppError } from '../utils/appError.js';
import { buildSolvePrompt } from '../utils/buildSolvePrompt.js';
import { logger } from '../utils/logger.js';

const providerHandlers = {
  gemini: solveWithGemini,
  openai: solveWithOpenAI,
  grok: solveWithGrok,
  deepseek: solveWithDeepSeek,
  openrouter: solveWithOpenRouter
};

function normalizeProvider(providerName) {
  return String(providerName || '').trim().toLowerCase();
}

function resolveProvider(providerOverride) {
  const providerName = normalizeProvider(providerOverride) || normalizeProvider(env.defaultProvider);
  if (!providerHandlers[providerName]) {
    throw new AppError(`Unsupported provider: ${providerName}`, 400, 'INVALID_PROVIDER');
  }
  return providerName;
}

function shouldRetry(error) {
  if (!(error instanceof AppError)) {
    return false;
  }

  if (['PROVIDER_TIMEOUT', 'PROVIDER_NETWORK_ERROR'].includes(error.code)) {
    return true;
  }

  return [429, 502, 503, 504].includes(error.statusCode);
}

function getBackoffDelay(baseDelayMs, attempt) {
  const jitterMs = Math.floor(Math.random() * 100);
  return baseDelayMs * 2 ** (attempt - 1) + jitterMs;
}

async function runWithRetry(task, options) {
  const {
    attempts,
    baseDelayMs,
    requestId,
    providerName,
    requestType
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const content = await task();
      return {
        content,
        retryCount: attempt - 1
      };
    } catch (error) {
      lastError = error;
      const willRetry = attempt < attempts && shouldRetry(error);

      if (!willRetry) {
        break;
      }

      const delayMs = getBackoffDelay(baseDelayMs, attempt);
      logger.warn(
        `[${requestId || 'no-request-id'}] Retry ${attempt}/${attempts - 1} for ${requestType} using ${providerName} after ${delayMs}ms: ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function solveProblem(payload, providerOverride, requestMeta = {}) {
  const providerName = resolveProvider(providerOverride);
  if (providerName === 'deepseek') {
    logger.info('[INFO] Using DeepSeek provider');
  }
  const requestType = (payload.type || '').toLowerCase();
  const providerHandler = providerHandlers[providerName];

  const prompt = buildSolvePrompt({
    type: requestType,
    problem: payload.problem,
    code: payload.code,
    language: payload.language
  });

  const startedAt = Date.now();

  const { content, retryCount } = await runWithRetry(() => providerHandler(prompt), {
    attempts: Math.max(1, env.ai.retryAttempts),
    baseDelayMs: Math.max(100, env.ai.retryBaseDelayMs),
    requestId: requestMeta.requestId,
    providerName,
    requestType
  });

  return {
    content,
    provider: providerName,
    model: env.providers[providerName]?.model || null,
    requestType,
    retryCount,
    latencyMs: Date.now() - startedAt
  };
}
