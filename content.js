/**
 * AlgoLens - Content Script
 * Runs on LeetCode problem pages
 * Handles: DOM extraction, sidebar injection, message passing
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__ALGOLENS_INJECTED__) return;
  window.__ALGOLENS_INJECTED__ = true;

  console.log('🔍 AlgoLens: Initializing...');

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  
  const state = {
    sidebarVisible: true,
    sidebarInjected: false,
    problemData: null,
    lastCodeSnapshot: null
  };

  // ═══════════════════════════════════════════════════════════════
  // Page Detection
  // ═══════════════════════════════════════════════════════════════
  
  function isLeetCodeProblemPage() {
    return window.location.href.includes('leetcode.com/problems/');
  }

  // ═══════════════════════════════════════════════════════════════
  // DOM Extraction
  // ═══════════════════════════════════════════════════════════════
  
  function extractProblemData() {
    const data = {
      title: '',
      description: '',
      examples: [],
      constraints: [],
      difficulty: '',
      url: window.location.href
    };

    try {
      // Extract title
      const titleEl = document.querySelector('[data-cy="question-title"]') 
        || document.querySelector('.text-title-large')
        || document.querySelector('div[class*="title"]');
      
      if (titleEl) {
        data.title = titleEl.textContent.trim();
      }

      // Extract problem description
      const descriptionEl = document.querySelector('[data-track-load="description_content"]')
        || document.querySelector('div[class*="elfjS"]')
        || document.querySelector('.question-content');
      
      if (descriptionEl) {
        data.description = descriptionEl.innerText.trim();
        
        // Parse examples from description
        const exampleMatches = data.description.match(/Example \d+:[\s\S]*?(?=Example \d+:|Constraints:|$)/gi);
        if (exampleMatches) {
          data.examples = exampleMatches.map(ex => ex.trim());
        }
        
        // Parse constraints
        const constraintsMatch = data.description.match(/Constraints:[\s\S]*$/i);
        if (constraintsMatch) {
          const constraintText = constraintsMatch[0].replace('Constraints:', '').trim();
          data.constraints = constraintText
            .split('\n')
            .map(c => c.trim())
            .filter(c => c.length > 0);
        }
      }

      // Extract difficulty
      const difficultyEl = document.querySelector('div[class*="difficulty"]')
        || document.querySelector('[diff]');
      
      if (difficultyEl) {
        const text = difficultyEl.textContent.toLowerCase();
        if (text.includes('easy')) data.difficulty = 'Easy';
        else if (text.includes('medium')) data.difficulty = 'Medium';
        else if (text.includes('hard')) data.difficulty = 'Hard';
      }

    } catch (error) {
      console.error('AlgoLens: Error extracting problem data:', error);
    }

    return data;
  }

  function extractCodeEditorContent() {
    const code = {
      content: '',
      language: ''
    };

    try {
      // Try Monaco editor (LeetCode's main editor)
      const monacoEditor = document.querySelector('.monaco-editor');
      if (monacoEditor) {
        // Get code from Monaco's view lines
        const lines = monacoEditor.querySelectorAll('.view-line');
        code.content = Array.from(lines)
          .map(line => line.textContent)
          .join('\n');
        
        // Detect language from Monaco or language selector
        const langSelector = document.querySelector('[data-cy="lang-select"]')
          || document.querySelector('button[class*="language"]');
        
        if (langSelector) {
          code.language = langSelector.textContent.trim().toLowerCase();
        }
      }

      // Alternative: CodeMirror
      if (!code.content) {
        const codeMirror = document.querySelector('.CodeMirror');
        if (codeMirror && codeMirror.CodeMirror) {
          code.content = codeMirror.CodeMirror.getValue();
        }
      }

    } catch (error) {
      console.error('AlgoLens: Error extracting code:', error);
    }

    return code;
  }

  // ═══════════════════════════════════════════════════════════════
  // Sidebar Injection
  // ═══════════════════════════════════════════════════════════════
  
  function injectSidebar() {
    if (state.sidebarInjected) return;

    // Create sidebar container
    const container = document.createElement('div');
    container.id = 'algolens-sidebar-container';
    
    // Create iframe for isolated styles
    const iframe = document.createElement('iframe');
    iframe.id = 'algolens-sidebar-frame';
    iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
    iframe.style.cssText = `
      width: 380px;
      height: 100vh;
      border: none;
      position: fixed;
      top: 0;
      right: 0;
      z-index: 999999;
      background: transparent;
    `;
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // Add body padding to prevent overlap
    document.body.style.marginRight = '380px';
    document.body.style.transition = 'margin-right 0.3s ease';
    
    state.sidebarInjected = true;
    console.log('🔍 AlgoLens: Sidebar injected');

    // Wait for iframe to load, then send initial data
    iframe.onload = () => {
      setTimeout(() => {
        sendDataToSidebar();
      }, 500);
    };
  }

  function toggleSidebar() {
    const container = document.getElementById('algolens-sidebar-container');
    if (!container) return;

    state.sidebarVisible = !state.sidebarVisible;
    
    if (state.sidebarVisible) {
      container.style.display = 'block';
      document.body.style.marginRight = '380px';
    } else {
      container.style.display = 'none';
      document.body.style.marginRight = '0';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Communication
  // ═══════════════════════════════════════════════════════════════
  
  function sendDataToSidebar() {
    const iframe = document.getElementById('algolens-sidebar-frame');
    if (!iframe || !iframe.contentWindow) return;

    const problemData = extractProblemData();
    const codeData = extractCodeEditorContent();

    state.problemData = problemData;
    state.lastCodeSnapshot = codeData;

    iframe.contentWindow.postMessage({
      type: 'ALGOLENS_DATA',
      payload: {
        problem: problemData,
        code: codeData
      }
    }, '*');

    console.log('🔍 AlgoLens: Data sent to sidebar', { problemData, codeData });
  }

  // Listen for messages from sidebar
  window.addEventListener('message', (event) => {
    if (event.data.type === 'ALGOLENS_REQUEST_DATA') {
      sendDataToSidebar();
    }
    
    if (event.data.type === 'ALGOLENS_REQUEST_CODE') {
      const codeData = extractCodeEditorContent();
      const iframe = document.getElementById('algolens-sidebar-frame');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'ALGOLENS_CODE_UPDATE',
          payload: codeData
        }, '*');
      }
    }

    if (event.data.type === 'ALGOLENS_TOGGLE') {
      toggleSidebar();
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
      sendResponse({ success: true });
    }
    
    if (message.type === 'GET_PROBLEM_DATA') {
      const data = extractProblemData();
      sendResponse({ data });
    }
    
    if (message.type === 'GET_CODE') {
      const code = extractCodeEditorContent();
      sendResponse({ code });
    }
    
    return true;
  });

  // ═══════════════════════════════════════════════════════════════
  // Observers
  // ═══════════════════════════════════════════════════════════════
  
  // Watch for code changes (debounced)
  let codeUpdateTimeout;
  function observeCodeChanges() {
    const editor = document.querySelector('.monaco-editor');
    if (!editor) return;

    const observer = new MutationObserver(() => {
      clearTimeout(codeUpdateTimeout);
      codeUpdateTimeout = setTimeout(() => {
        const newCode = extractCodeEditorContent();
        if (newCode.content !== state.lastCodeSnapshot?.content) {
          state.lastCodeSnapshot = newCode;
          const iframe = document.getElementById('algolens-sidebar-frame');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'ALGOLENS_CODE_UPDATE',
              payload: newCode
            }, '*');
          }
        }
      }, 1000);
    });

    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════
  
  function init() {
    if (!isLeetCodeProblemPage()) {
      console.log('🔍 AlgoLens: Not a problem page, skipping');
      return;
    }

    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initSidebar, 1000);
      });
    } else {
      setTimeout(initSidebar, 1000);
    }
  }

  function initSidebar() {
    injectSidebar();
    
    // Start observing code changes after a delay
    setTimeout(observeCodeChanges, 2000);
  }

  // Start
  init();

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (isLeetCodeProblemPage()) {
        setTimeout(sendDataToSidebar, 1500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
