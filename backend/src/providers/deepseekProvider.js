import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const RETRYABLE_UPSTREAM_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

function trimErrorMessage(errorBody, maxLength = 400) {
  if (!errorBody) {
    return '';
  }
  return errorBody.length > maxLength ? `${errorBody.slice(0, maxLength)}...` : errorBody;
}

function extractDeepSeekText(payload) {
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

export async function solveWithDeepSeek(prompt) {
  const config = env.providers.deepseek;
  if (!config.apiKey) {
    throw new AppError('DeepSeek API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const endpoint = 'https://api.deepseek.com/chat/completions';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.ai.requestTimeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model || DEFAULT_DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.3
      })
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AppError('DeepSeek request timed out', 504, 'PROVIDER_TIMEOUT');
    }
    throw new AppError(`DeepSeek network error: ${error.message}`, 502, 'PROVIDER_NETWORK_ERROR');
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
      `DeepSeek request failed (${response.status})${providerMessage ? `: ${providerMessage}` : ''}`,
      statusCode,
      'PROVIDER_REQUEST_FAILED'
    );
  }

  const data = await response.json();
  const outputText = extractDeepSeekText(data);

  if (!outputText.trim()) {
    throw new AppError('DeepSeek returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }

  return outputText;
}
