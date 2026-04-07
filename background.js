/**
 * AlgoLens - Background Service Worker
 * Handles: API calls, message passing, extension lifecycle
 */

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  BACKEND_SOLVE_ENDPOINT: 'http://127.0.0.1:8080/api/ai/solve'
};

// ═══════════════════════════════════════════════════════════════
// Backend API Integration
// ═══════════════════════════════════════════════════════════════

async function callBackendAPI(payload) {
  try {
    console.log('AlgoLens Backend API request start:', {
      url: CONFIG.BACKEND_SOLVE_ENDPOINT,
      type: payload?.type
    });

    const response = await fetch(CONFIG.BACKEND_SOLVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'omit',
      body: JSON.stringify(payload)
    });

    console.log('AlgoLens Backend API response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('AlgoLens Backend API non-OK response:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      return {
        success: false,
        error: error?.error?.message || `Backend API error: ${response.status}`
      };
    }

    const data = await response.json();

    if (!data?.success || !data?.data) {
      return {
        success: false,
        error: 'No response from backend'
      };
    }

    return {
      success: true,
      content: data.data
    };

  } catch (error) {
    console.error('AlgoLens Backend API fetch failed:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      payloadType: payload?.type,
      endpoint: CONFIG.BACKEND_SOLVE_ENDPOINT
    });
    return {
      success: false,
      error: error.message || 'Backend network error occurred'
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Request Handlers
// ═══════════════════════════════════════════════════════════════

async function handleAIRequest(type, problemData, codeData = null) {
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
  console.log('AlgoLens Background: Received message', message.type);

  // Handle async responses
  (async () => {
    try {
      switch (message.type) {
        case 'AI_REQUEST':
          const result = await handleAIRequest(
            message.requestType,
            message.problemData,
            message.codeData
          );
          sendResponse(result);
          break;

        case 'PING':
          sendResponse({ pong: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('AlgoLens Background Error:', error);
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
  if (tab.url.includes('leetcode.com/problems/')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  }
});

console.log('🔍 AlgoLens: Background service worker initialized');
