/**
 * AlgoLens - Background Service Worker
 * Handles: API calls, message passing, extension lifecycle
 */

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  BACKEND_SOLVE_ENDPOINT: 'http://localhost:8080/api/ai/solve'
};

// ═══════════════════════════════════════════════════════════════
// Backend API Integration
// ═══════════════════════════════════════════════════════════════

async function callBackendAPI(payload) {
  try {
    const response = await fetch(CONFIG.BACKEND_SOLVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
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
    console.error('AlgoLens Backend API Error:', error);
    return {
      success: false,
      error: error.message || 'Backend network error occurred'
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Prompt Templates
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  base: `You are AlgoLens, a thinking assistant for LeetCode problems.
Your role is to GUIDE the user's thinking, NOT to provide solutions.

CRITICAL RULES:
- NEVER provide complete code solutions
- NEVER write full implementations
- Keep responses concise and structured
- Use bullet points and clear formatting
- Focus on building understanding
- Encourage independent thinking`,

  problemExplanation: `You are AlgoLens, explaining a LeetCode problem.
Simplify the problem statement in plain English.
Highlight the KEY requirements and what exactly needs to be computed/returned.
Do NOT suggest any approach or solution - just clarify the problem.
Keep it under 150 words.`,

  constraintAnalysis: `You are AlgoLens, analyzing problem constraints.
Explain what each constraint means for the solution approach.
Translate numbers into complexity implications (e.g., n ≤ 10^5 suggests O(n) or O(n log n)).
Do NOT suggest specific algorithms - just explain what the constraints tell us.
Keep it under 150 words.`,

  expectedComplexity: `You are AlgoLens, determining expected complexity.
Based on the constraints, determine the likely expected time and space complexity.
Explain your reasoning briefly.
Format:
- Expected Time: O(?)
- Expected Space: O(?)
- Reasoning: (brief)
Do NOT suggest algorithms or approaches.`,

  hint1: `You are AlgoLens, giving a Level 1 hint (Direction).
Give a subtle DIRECTION hint - just point the user toward the right category of thinking.
Examples: "Consider what data structure allows O(1) lookups", "Think about what property of sorted arrays could help"
ONE sentence maximum. Be vague but helpful.`,

  hint2: `You are AlgoLens, giving a Level 2 hint (Approach).
Give an APPROACH hint - name the technique or pattern without explaining how to implement it.
Examples: "This is a classic sliding window problem", "Consider using two pointers from opposite ends"
TWO sentences maximum. Name the approach but don't explain the logic.`,

  hint3: `You are AlgoLens, giving a Level 3 hint (Guided Logic).
Give a GUIDED LOGIC hint - explain the high-level steps without code.
Break down the logical approach into 3-4 steps.
Do NOT write pseudocode or actual code.
Keep it under 100 words.`,

  ideas: `You are AlgoLens, presenting solution approaches.
List possible approaches from brute force to optimal:

1. BRUTE FORCE: Name it, state complexity, one line about why it's slow
2. BETTER: Name the optimization, state complexity, one line about the insight
3. OPTIMAL: Name the approach, state complexity, one line about the key idea

Do NOT explain implementations. Just name approaches and complexities.
Keep each approach to 2 lines maximum.`,

  codeAnalysis: `You are AlgoLens, analyzing user code (not solving).
Analyze the provided code and give:
- Detected approach/pattern
- Estimated time complexity
- Estimated space complexity
- 1-2 potential issues or inefficiencies (if any)

Do NOT rewrite the code or provide fixes.
Do NOT provide the correct solution.
Just analyze what they have written.
Keep it under 150 words.`,

  stuck: `You are AlgoLens, helping a stuck user.
Provide:
- 2-3 common mistakes people make on this problem
- 1-2 edge cases they might be missing
- A pattern reminder relevant to this problem type

Do NOT provide the solution.
Keep it encouraging and guide them to think.
Keep it under 150 words.`
};

// ═══════════════════════════════════════════════════════════════
// Request Handlers
// ═══════════════════════════════════════════════════════════════

async function handleAIRequest(type, problemData, codeData = null) {
  const problemContext = `
Problem: ${problemData.title}

Description:
${problemData.description}

Constraints:
${problemData.constraints?.join('\n') || 'Not specified'}
`.trim();

  if (!SYSTEM_PROMPTS[type] && type !== 'analyze' && type !== 'stuck') {
    return { success: false, error: 'Unknown request type' };
  }

  const promptHeader = `Request Type: ${type}\n\nGuidance:\n${SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.base}`;
  const payload = {
    problem: `${promptHeader}\n\n${problemContext}`,
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
