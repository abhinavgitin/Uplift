/**
 * UpLift - Content Script
 * Runs on LeetCode problem pages
 * Handles: FAB button, sidebar injection, DOM extraction, message passing
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__ALGOLENS_INJECTED__) return;
  window.__ALGOLENS_INJECTED__ = true;

  console.log('🔍 UpLift: Initializing...');

  // ═══════════════════════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════════════════════
  
  const SIDEBAR_WIDTH = 360;
  const ANIMATION_DURATION = 300;
  
  // FAB button styles (injected into page)
  const FAB_STYLES = `
    #algolens-fab {
      position: fixed;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6A5CFF 0%, #9B6CFF 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(107, 92, 255, 0.4);
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    
    #algolens-fab:hover {
      transform: translateY(-50%) scale(1.08);
      box-shadow: 0 6px 28px rgba(107, 92, 255, 0.5);
    }
    
    #algolens-fab:active {
      transform: translateY(-50%) scale(0.96);
    }
    
    #algolens-fab.sidebar-open {
      right: ${SIDEBAR_WIDTH + 24}px;
    }
    
    #algolens-fab svg {
      width: 24px;
      height: 24px;
      fill: white;
      transition: transform 0.3s ease;
    }
    
    #algolens-fab.sidebar-open svg {
      transform: rotate(180deg);
    }
    
    #algolens-fab.pulse {
      animation: algolens-pulse 2s ease-in-out infinite;
    }
    
    @keyframes algolens-pulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(107, 92, 255, 0.4); }
      50% { box-shadow: 0 4px 30px rgba(107, 92, 255, 0.7), 0 0 60px rgba(107, 92, 255, 0.3); }
    }
    
    #algolens-sidebar-container {
      position: fixed;
      top: 0;
      right: 0;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      z-index: 999999;
      transform: translateX(100%);
      transition: transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    #algolens-sidebar-container.visible {
      transform: translateX(0);
    }
    
    #algolens-sidebar-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    }
    
    /* Overlay for closing sidebar by clicking outside */
    #algolens-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: ${SIDEBAR_WIDTH}px;
      bottom: 0;
      background: rgba(0, 0, 0, 0.2);
      z-index: 999997;
      opacity: 0;
      visibility: hidden;
      transition: opacity ${ANIMATION_DURATION}ms ease, visibility ${ANIMATION_DURATION}ms ease;
    }
    
    #algolens-overlay.visible {
      opacity: 1;
      visibility: visible;
    }
  `;

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  
  const state = {
    sidebarVisible: false, // Start hidden (FAB mode)
    sidebarInjected: false,
    fabInjected: false,
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
  // Style Injection
  // ═══════════════════════════════════════════════════════════════
  
  function injectStyles() {
    if (document.getElementById('algolens-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'algolens-styles';
    style.textContent = FAB_STYLES;
    document.head.appendChild(style);
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
      console.error('UpLift: Error extracting problem data:', error);
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
      console.error('UpLift: Error extracting code:', error);
    }

    return code;
  }

  // ═══════════════════════════════════════════════════════════════
  // FAB Button
  // ═══════════════════════════════════════════════════════════════
  
  function createFAB() {
    if (state.fabInjected) return;
    
    const fab = document.createElement('button');
    fab.id = 'algolens-fab';
    fab.title = 'Open UpLift';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
      </svg>
    `;
    
    fab.addEventListener('click', toggleSidebar);
    document.body.appendChild(fab);
    
    state.fabInjected = true;
    
    // Add pulse animation for first 5 seconds to attract attention
    fab.classList.add('pulse');
    setTimeout(() => {
      fab.classList.remove('pulse');
    }, 5000);
    
    console.log('🔍 UpLift: FAB button created');
  }

  // ═══════════════════════════════════════════════════════════════
  // Sidebar
  // ═══════════════════════════════════════════════════════════════
  
  function injectSidebar() {
    if (state.sidebarInjected) return;

    // Create overlay for clicking outside to close
    const overlay = document.createElement('div');
    overlay.id = 'algolens-overlay';
    overlay.addEventListener('click', hideSidebar);
    document.body.appendChild(overlay);

    // Create sidebar container
    const container = document.createElement('div');
    container.id = 'algolens-sidebar-container';
    
    // Create iframe for isolated styles
    const iframe = document.createElement('iframe');
    iframe.id = 'algolens-sidebar-frame';
    iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    state.sidebarInjected = true;
    console.log('🔍 UpLift: Sidebar injected');

    // Wait for iframe to load, then send initial data
    iframe.onload = () => {
      setTimeout(() => {
        sendDataToSidebar();
      }, 500);
    };
  }

  function showSidebar() {
    if (state.sidebarVisible) return;
    
    const container = document.getElementById('algolens-sidebar-container');
    const fab = document.getElementById('algolens-fab');
    const overlay = document.getElementById('algolens-overlay');
    
    if (container) container.classList.add('visible');
    if (fab) {
      fab.classList.add('sidebar-open');
      fab.title = 'Close UpLift';
    }
    if (overlay) overlay.classList.add('visible');
    
    state.sidebarVisible = true;
    
    // Send fresh data when opening
    setTimeout(sendDataToSidebar, 100);
  }

  function hideSidebar() {
    if (!state.sidebarVisible) return;
    
    const container = document.getElementById('algolens-sidebar-container');
    const fab = document.getElementById('algolens-fab');
    const overlay = document.getElementById('algolens-overlay');
    
    if (container) container.classList.remove('visible');
    if (fab) {
      fab.classList.remove('sidebar-open');
      fab.title = 'Open UpLift';
    }
    if (overlay) overlay.classList.remove('visible');
    
    state.sidebarVisible = false;
  }

  function toggleSidebar() {
    if (state.sidebarVisible) {
      hideSidebar();
    } else {
      showSidebar();
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

    console.log('🔍 UpLift: Data sent to sidebar', { problemData, codeData });
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
  // Keyboard Shortcuts
  // ═══════════════════════════════════════════════════════════════
  
  document.addEventListener('keydown', (e) => {
    // Escape to close sidebar
    if (e.key === 'Escape' && state.sidebarVisible) {
      hideSidebar();
    }
    
    // Ctrl/Cmd + Shift + L to toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      toggleSidebar();
    }
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
      console.log('🔍 UpLift: Not a problem page, skipping');
      return;
    }

    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initUI, 1000);
      });
    } else {
      setTimeout(initUI, 1000);
    }
  }

  function initUI() {
    // Inject styles first
    injectStyles();
    
    // Create FAB button
    createFAB();
    
    // Inject sidebar (hidden initially)
    injectSidebar();
    
    // Start observing code changes after a delay
    setTimeout(observeCodeChanges, 2000);
    
    console.log('🔍 UpLift: UI initialized (FAB mode)');
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
        // Re-inject FAB and sidebar if needed
        if (!document.getElementById('algolens-fab')) {
          createFAB();
        }
        // Send fresh data
        setTimeout(sendDataToSidebar, 1500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
