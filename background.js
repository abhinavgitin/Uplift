/**
 * AlgoLens - Background Service Worker
 * Handles: API calls, message passing, extension lifecycle
 */

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  MODEL: 'gemini-2.0-flash',
  MAX_TOKENS: 1024
};

// ═══════════════════════════════════════════════════════════════
// API Key Management
// ═══════════════════════════════════════════════════════════════

async function getApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  return result.apiKey || null;
}

async function setApiKey(key) {
  await chrome.storage.local.set({ apiKey: key });
}

// ═══════════════════════════════════════════════════════════════
// Google Gemini API Integration
// ═══════════════════════════════════════════════════════════════

async function callGeminiAPI(systemPrompt, userPrompt) {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API key not configured. Please set your Gemini API key in settings.'
    };
  }

  try {
    const response = await fetch(`${CONFIG.API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: CONFIG.MAX_TOKENS,
          temperature: 0.7
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    // Extract text from Gemini response format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return {
        success: false,
        error: 'No response from Gemini'
      };
    }

    return {
      success: true,
      content: content
    };

  } catch (error) {
    console.error('AlgoLens API Error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred'
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
  let systemPrompt = SYSTEM_PROMPTS.base;
  let userPrompt = '';

  const problemContext = `
Problem: ${problemData.title}

Description:
${problemData.description}

Constraints:
${problemData.constraints?.join('\n') || 'Not specified'}
`.trim();

  switch (type) {
    case 'explain':
      systemPrompt = SYSTEM_PROMPTS.problemExplanation;
      userPrompt = problemContext;
      break;

    case 'constraints':
      systemPrompt = SYSTEM_PROMPTS.constraintAnalysis;
      userPrompt = problemContext;
      break;

    case 'complexity':
      systemPrompt = SYSTEM_PROMPTS.expectedComplexity;
      userPrompt = problemContext;
      break;

    case 'hint1':
      systemPrompt = SYSTEM_PROMPTS.hint1;
      userPrompt = problemContext;
      break;

    case 'hint2':
      systemPrompt = SYSTEM_PROMPTS.hint2;
      userPrompt = problemContext;
      break;

    case 'hint3':
      systemPrompt = SYSTEM_PROMPTS.hint3;
      userPrompt = problemContext;
      break;

    case 'ideas':
      systemPrompt = SYSTEM_PROMPTS.ideas;
      userPrompt = problemContext;
      break;

    case 'analyze':
      systemPrompt = SYSTEM_PROMPTS.codeAnalysis;
      userPrompt = `${problemContext}

User's Code (${codeData?.language || 'unknown'}):
\`\`\`
${codeData?.content || 'No code provided'}
\`\`\``;
      break;

    case 'stuck':
      systemPrompt = SYSTEM_PROMPTS.stuck;
      userPrompt = codeData?.content 
        ? `${problemContext}

User's Current Attempt:
\`\`\`
${codeData.content}
\`\`\``
        : problemContext;
      break;

    default:
      return { success: false, error: 'Unknown request type' };
  }

  return await callGeminiAPI(systemPrompt, userPrompt);
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
        case 'SET_API_KEY':
          await setApiKey(message.apiKey);
          sendResponse({ success: true });
          break;

        case 'GET_API_KEY':
          const key = await getApiKey();
          sendResponse({ apiKey: key ? '••••••••' : null, hasKey: !!key });
          break;

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
