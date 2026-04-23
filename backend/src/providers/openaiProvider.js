import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const RETRYABLE_UPSTREAM_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function trimErrorMessage(errorBody, maxLength = 400) {
  if (!errorBody) {
    return '';
  }
  return errorBody.length > maxLength ? `${errorBody.slice(0, maxLength)}...` : errorBody;
}

function extractOpenAIText(payload) {
  const directText = payload?.output_text;
  if (typeof directText === 'string') {
    return directText.trim();
  }

  const responseOutput = payload?.output;
  if (Array.isArray(responseOutput)) {
    const responseText = responseOutput
      .flatMap((entry) => (Array.isArray(entry?.content) ? entry.content : []))
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();

    if (responseText) {
      return responseText;
    }
  }

  const chatContent = payload?.choices?.[0]?.message?.content;
  if (typeof chatContent === 'string') {
    return chatContent.trim();
  }

  if (Array.isArray(chatContent)) {
    return chatContent
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();
  }

  return '';
}

export async function solveWithOpenAI(prompt) {
  const config = env.providers.openai;
  if (!config.apiKey) {
    throw new AppError('OpenAI API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const endpoint = 'https://api.openai.com/v1/responses';
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
        model: config.model,
        input: prompt
      })
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AppError('OpenAI request timed out', 504, 'PROVIDER_TIMEOUT');
    }
    throw new AppError(`OpenAI network error: ${error.message}`, 502, 'PROVIDER_NETWORK_ERROR');
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
      `OpenAI request failed (${response.status})${providerMessage ? `: ${providerMessage}` : ''}`,
      statusCode,
      'PROVIDER_REQUEST_FAILED'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AppError('OpenAI returned an invalid JSON response', 502, 'PROVIDER_RESPONSE_PARSE_ERROR');
  }

  const outputText = extractOpenAIText(data);
  if (!outputText.trim()) {
    throw new AppError('OpenAI returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }
  return outputText;
}
