import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export async function solveWithGrok(prompt) {
  const config = env.providers.grok;
  if (!config.apiKey) {
    throw new AppError('Grok API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are an expert coding interview assistant.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(`Grok request failed (${response.status}): ${errorBody}`, 502, 'PROVIDER_REQUEST_FAILED');
  }

  const data = await response.json();
  const outputText = data?.choices?.[0]?.message?.content || '';
  if (!outputText.trim()) {
    throw new AppError('Grok returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }
  return outputText;
}
