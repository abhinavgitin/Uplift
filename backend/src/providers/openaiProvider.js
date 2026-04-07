import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export async function solveWithOpenAI(prompt) {
  const config = env.providers.openai;
  if (!config.apiKey) {
    throw new AppError('OpenAI API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(`OpenAI request failed (${response.status}): ${errorBody}`, 502, 'PROVIDER_REQUEST_FAILED');
  }

  const data = await response.json();
  const outputText = data.output_text || '';
  if (!outputText.trim()) {
    throw new AppError('OpenAI returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }
  return outputText;
}
