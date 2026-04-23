import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const RETRYABLE_UPSTREAM_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

function trimErrorMessage(errorBody, maxLength = 400) {
  if (!errorBody) {
    return '';
  }
  return errorBody.length > maxLength ? `${errorBody.slice(0, maxLength)}...` : errorBody;
}

function extractOpenRouterText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();
  }

  return '';
}

export async function solveWithOpenRouter(prompt) {
  const config = env.providers.openrouter;
  if (!config.apiKey) {
    throw new AppError('OpenRouter API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.ai.requestTimeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model || DEFAULT_OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.3
      })
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AppError('OpenRouter request timed out', 504, 'PROVIDER_TIMEOUT');
    }
    throw new AppError(`OpenRouter network error: ${error.message}`, 502, 'PROVIDER_NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const providerMessage = trimErrorMessage(errorBody);
    const statusCode = response.status === 429
      ? 429
      : RETRYABLE_UPSTREAM_STATUS.has(response.status)
        ? 502
        : 502;

    throw new AppError(
      `OpenRouter request failed (${response.status})${providerMessage ? `: ${providerMessage}` : ''}`,
      statusCode,
      'PROVIDER_REQUEST_FAILED'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AppError('OpenRouter returned an invalid JSON response', 502, 'PROVIDER_RESPONSE_PARSE_ERROR');
  }

  const outputText = extractOpenRouterText(data);

  if (!outputText.trim()) {
    throw new AppError('OpenRouter returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }

  return outputText;
}
