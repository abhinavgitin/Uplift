import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export async function solveWithGemini(prompt) {
  const config = env.providers.gemini;
  if (!config.apiKey) {
    throw new AppError('Gemini API key is not configured', 500, 'PROVIDER_CONFIG_ERROR');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(`Gemini request failed (${response.status}): ${errorBody}`, 502, 'PROVIDER_REQUEST_FAILED');
  }

  const data = await response.json();
  const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!outputText.trim()) {
    throw new AppError('Gemini returned an empty response', 502, 'EMPTY_PROVIDER_RESPONSE');
  }
  return outputText;
}
