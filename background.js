/**
 * UpLift - Background Service Worker
 * Handles: API calls, message passing, extension lifecycle
 */

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  BACKEND_AI_ENDPOINT: 'http://localhost:8080/api/ai',
  REQUEST_TIMEOUT_MS: 20_000,
  RETRY_ATTEMPTS: 2,
  RETRY_BASE_DELAY_MS: 350
};

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// ═══════════════════════════════════════════════════════════════
// Backend API Integration
// ═══════════════════════════════════════════════════════════════

function buildRequestId() {
  return `uplift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(baseDelayMs, attempt) {
  const jitterMs = Math.floor(Math.random() * 100);
  return baseDelayMs * 2 ** (attempt - 1) + jitterMs;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeBackendResponse(body) {
  if (!body || body.success !== true) {
    return null;
  }

  if (typeof body.data === 'string') {
    return {
      content: body.data,
      meta: body.meta || null
    };
  }

  if (typeof body?.data?.content === 'string') {
    return {
      content: body.data.content,
      meta: body.meta || null
    };
  }

  return null;
}

function normalizeBackendError(body, status) {
  const message = body?.error?.message || `Backend API error (${status})`;
  const code = body?.error?.code || `HTTP_${status}`;
  const requestId = body?.error?.requestId || null;

  return {
    message,
    code,
    requestId
  };
}

async function callBackendAPI(payload) {
  const requestId = buildRequestId();

  try {
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt += 1) {
      try {
        console.log(`[${requestId}] UpLift backend attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS}`, {
          type: payload?.type,
          endpoint: CONFIG.BACKEND_AI_ENDPOINT
        });

        const response = await fetchWithTimeout(
          CONFIG.BACKEND_AI_ENDPOINT,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-request-id': requestId
            },
            credentials: 'omit',
            body: JSON.stringify(payload)
          },
          CONFIG.REQUEST_TIMEOUT_MS
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const normalizedError = normalizeBackendError(body, response.status);
          const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < CONFIG.RETRY_ATTEMPTS;

          if (shouldRetry) {
            const delayMs = getRetryDelay(CONFIG.RETRY_BASE_DELAY_MS, attempt);
            console.warn(
              `[${requestId}] Retrying backend after HTTP ${response.status} in ${delayMs}ms`
            );
            await sleep(delayMs);
            continue;
          }

          return {
            success: false,
            error: normalizedError.message,
            code: normalizedError.code,
            requestId: normalizedError.requestId || requestId
          };
        }

        const normalizedResponse = normalizeBackendResponse(body);
        if (!normalizedResponse) {
          return {
            success: false,
            error: 'Invalid response format from backend',
            code: 'BAD_BACKEND_RESPONSE',
            requestId
          };
        }

        return {
          success: true,
          content: normalizedResponse.content,
          meta: {
            ...(normalizedResponse.meta || {}),
            requestId: normalizedResponse.meta?.requestId || requestId
          }
        };
      } catch (error) {
        const isTimeout = error?.name === 'AbortError';
        const shouldRetry = isTimeout && attempt < CONFIG.RETRY_ATTEMPTS;

        if (shouldRetry) {
          const delayMs = getRetryDelay(CONFIG.RETRY_BASE_DELAY_MS, attempt);
          console.warn(`[${requestId}] Request timed out, retrying in ${delayMs}ms`);
          await sleep(delayMs);
          continue;
        }

        return {
          success: false,
          error: isTimeout
            ? 'Backend timed out. Please try again.'
            : (error?.message || 'Backend network error occurred'),
          code: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
          requestId
        };
    }
    }

    return {
      success: false,
      error: 'Backend request failed after retries',
      code: 'RETRY_EXHAUSTED',
      requestId
    };
  } catch (error) {
    console.error('UpLift Backend API fetch failed:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      payloadType: payload?.type,
      endpoint: CONFIG.BACKEND_AI_ENDPOINT
    });

    return {
      success: false,
      error: error.message || 'Backend network error occurred',
      code: 'NETWORK_ERROR'
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Request Handlers
// ═══════════════════════════════════════════════════════════════

async function handleAIRequest(type, problemData, codeData = null) {
  if (!problemData?.title || !problemData?.description) {
    return {
      success: false,
      error: 'Problem data is not available yet. Refresh the page and try again.'
    };
  }

  const normalizedType = (type || 'explain').toLowerCase();
  const problemContext = `
Problem: ${problemData.title}

Description:
${problemData.description}

Constraints:
${problemData.constraints?.join('\n') || 'Not specified'}
`.trim();

  const payload = {
    type: normalizedType,
    problem: problemContext,
    code: codeData?.content || 'No code provided',
    language: codeData?.language || 'unknown'
  };

  return await callBackendAPI(payload);
}

// ═══════════════════════════════════════════════════════════════
// Message Listener
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('UpLift Background: Received message', message.type);

  // Handle async responses
  (async () => {
    try {
      switch (message.type) {
        case 'AI_REQUEST': {
          const result = await handleAIRequest(
            message.requestType,
            message.problemData,
            message.codeData
          );
          sendResponse(result);
          break;
        }

        case 'PING': {
          sendResponse({ pong: true });
          break;
        }

        default: {
          sendResponse({ error: 'Unknown message type' });
        }
      }
    } catch (error) {
      console.error('UpLift Background Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

// ═══════════════════════════════════════════════════════════════
// Extension Icon Click
// ═══════════════════════════════════════════════════════════════

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id && typeof tab.url === 'string' && tab.url.includes('leetcode.com/problems/')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  }
});

console.log('🔍 UpLift: Background service worker initialized');
