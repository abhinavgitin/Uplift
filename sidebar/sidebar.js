/**
 * AlgoLens - Sidebar JavaScript
 * Handles: UI interactions, accordion, tabs, state management, API communication
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  
  const state = {
    problemData: null,
    codeData: null,
    previousCode: null,
    hints: {
      1: null,
      2: null,
      3: null
    },
    loading: {},
    activeSection: null, // Single open accordion section
    activeTab: 'hints',   // Active tab in guidance section
    sectionContent: {}    // Cache of loaded content per section
  };

  // ═══════════════════════════════════════════════════════════════
  // DOM Elements
  // ═══════════════════════════════════════════════════════════════
  
  const elements = {
    // Header
    problemTitle: document.getElementById('problemTitle'),
    difficultyBadge: document.getElementById('difficultyBadge'),
    settingsBtn: document.getElementById('settingsBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    closeBtn: document.getElementById('closeBtn'),
    
    // Tabs
    guidanceTabs: document.getElementById('guidanceTabs'),
    tabIndicator: document.querySelector('.tab-indicator'),
    
    // Content areas
    problemContent: document.getElementById('problemContent'),
    constraintsContent: document.getElementById('constraintsContent'),
    complexityContent: document.getElementById('complexityContent'),
    hintsContainer: document.getElementById('hintsContainer'),
    ideasContent: document.getElementById('ideasContent'),
    analyzeContent: document.getElementById('analyzeContent'),
    compareContent: document.getElementById('compareContent'),
    stuckContent: document.getElementById('stuckContent'),
    
    // Modal
    settingsModal: document.getElementById('settingsModal')
  };

  // ═══════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════
  
  function formatContent(text) {
    if (!text) return '';
    
    // Convert markdown-like formatting to HTML
    let html = text
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h4>$1</h4>')
      .replace(/^# (.+)$/gm, '<h4>$1</h4>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Wrap in paragraph
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // Accordion Logic (Single Open)
  // ═══════════════════════════════════════════════════════════════

  function openSection(sectionName) {
    const allCards = document.querySelectorAll('.card[data-section]');
    
    allCards.forEach(card => {
      const section = card.dataset.section;
      
      if (section === sectionName) {
        // Open this section
        card.classList.add('active');
        const body = card.querySelector('.card-body');
        if (body) {
          const inner = body.querySelector('.card-body-inner');
          // Set max-height based on actual content height + padding
          body.style.maxHeight = inner ? `${inner.scrollHeight + 32}px` : 'var(--section-max-height)';
        }
        state.activeSection = sectionName;
      } else {
        // Close other sections
        card.classList.remove('active');
        const body = card.querySelector('.card-body');
        if (body) {
          body.style.maxHeight = '0';
        }
      }
    });
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('algolens_activeSection', sectionName);
    } catch (e) {}
  }

  function closeSection(sectionName) {
    const card = document.querySelector(`.card[data-section="${sectionName}"]`);
    if (card) {
      card.classList.remove('active');
      const body = card.querySelector('.card-body');
      if (body) {
        body.style.maxHeight = '0';
      }
    }
    state.activeSection = null;
    try {
      localStorage.removeItem('algolens_activeSection');
    } catch (e) {}
  }

  function toggleSection(sectionName) {
    if (state.activeSection === sectionName) {
      closeSection(sectionName);
    } else {
      openSection(sectionName);
    }
  }

  function updateSectionHeight(sectionName) {
    const card = document.querySelector(`.card[data-section="${sectionName}"]`);
    if (card && card.classList.contains('active')) {
      const body = card.querySelector('.card-body');
      const inner = body?.querySelector('.card-body-inner');
      if (body && inner) {
        body.style.maxHeight = `${inner.scrollHeight + 32}px`;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Tabs Logic
  // ═══════════════════════════════════════════════════════════════

  function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    const indicator = elements.tabIndicator;
    
    tabs.forEach((tab, index) => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
        // Move indicator
        if (indicator) {
          indicator.style.width = `${100 / tabs.length}%`;
          indicator.style.left = `${(index * 100) / tabs.length}%`;
        }
      } else {
        tab.classList.remove('active');
      }
    });
    
    panels.forEach(panel => {
      if (panel.dataset.panel === tabName) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    state.activeTab = tabName;
    
    // Save preference
    try {
      localStorage.setItem('algolens_activeTab', tabName);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // Loading States
  // ═══════════════════════════════════════════════════════════════

  function showLoading(section) {
    state.loading[section] = true;
    
    // Handle tab panels differently
    if (['hints', 'ideas', 'complexity'].includes(section)) {
      const loading = document.getElementById(`${section}Loading`);
      const placeholder = document.getElementById(`${section}Placeholder`);
      const content = document.getElementById(`${section}Content`);
      
      if (loading) loading.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      if (content) content.classList.add('hidden');
    } else {
      const sectionEl = document.getElementById(`${section}Section`);
      if (!sectionEl) return;
      
      const placeholder = sectionEl.querySelector('.placeholder');
      const loading = sectionEl.querySelector('.loading');
      const content = sectionEl.querySelector('.content');
      
      if (placeholder) placeholder.classList.add('hidden');
      if (loading) loading.classList.remove('hidden');
      if (content) content.classList.add('hidden');
    }
  }

  function hideLoading(section, showContent = true) {
    state.loading[section] = false;
    
    if (['hints', 'ideas', 'complexity'].includes(section)) {
      const loading = document.getElementById(`${section}Loading`);
      const placeholder = document.getElementById(`${section}Placeholder`);
      const content = document.getElementById(`${section}Content`);
      
      if (loading) loading.classList.add('hidden');
      
      if (showContent && content) {
        content.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } else if (placeholder) {
        placeholder.classList.remove('hidden');
      }
    } else {
      const sectionEl = document.getElementById(`${section}Section`);
      if (!sectionEl) return;
      
      const placeholder = sectionEl.querySelector('.placeholder');
      const loading = sectionEl.querySelector('.loading');
      const content = sectionEl.querySelector('.content');
      
      if (loading) loading.classList.add('hidden');
      
      if (showContent && content) {
        content.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } else if (placeholder) {
        placeholder.classList.remove('hidden');
      }
      
      // Update section height after content change
      updateSectionHeight(section);
    }
  }

  function showError(section, message) {
    const content = document.getElementById(`${section}Content`);
    if (content) {
      const scrollContainer = content.querySelector('.content-scroll') || content;
      scrollContainer.innerHTML = `<p style="color: var(--color-error);">⚠️ ${message}</p>`;
    }
    hideLoading(section, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // API Communication
  // ═══════════════════════════════════════════════════════════════
  
  async function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  async function requestAI(type) {
    const response = await sendToBackground({
      type: 'AI_REQUEST',
      requestType: type,
      problemData: state.problemData,
      codeData: state.codeData
    });
    
    return response;
  }

  // ═══════════════════════════════════════════════════════════════
  // Feature Handlers
  // ═══════════════════════════════════════════════════════════════
  
  async function handleExplain() {
    showLoading('problem');
    
    try {
      const result = await requestAI('explain');
      
      if (result.success) {
        const scrollContainer = elements.problemContent.querySelector('.content-scroll') || elements.problemContent;
        scrollContainer.innerHTML = formatContent(result.content);
        state.sectionContent.problem = result.content;
        hideLoading('problem', true);
      } else {
        showError('problem', result.error || 'Failed to analyze problem');
      }
    } catch (error) {
      showError('problem', error.message);
    }
  }

  async function handleConstraints() {
    showLoading('constraints');
    
    try {
      const result = await requestAI('constraints');
      
      if (result.success) {
        const scrollContainer = elements.constraintsContent.querySelector('.content-scroll') || elements.constraintsContent;
        scrollContainer.innerHTML = formatContent(result.content);
        state.sectionContent.constraints = result.content;
        hideLoading('constraints', true);
      } else {
        showError('constraints', result.error || 'Failed to analyze constraints');
      }
    } catch (error) {
      showError('constraints', error.message);
    }
  }

  async function handleComplexity() {
    showLoading('complexity');
    
    try {
      const result = await requestAI('complexity');
      
      if (result.success) {
        elements.complexityContent.innerHTML = formatContent(result.content);
        state.sectionContent.complexity = result.content;
        hideLoading('complexity', true);
      } else {
        showError('complexity', result.error || 'Failed to determine complexity');
      }
    } catch (error) {
      showError('complexity', error.message);
    }
  }

  async function handleHint(level) {
    // Check if already revealed
    if (state.hints[level]) {
      return;
    }
    
    const loadingEl = document.getElementById('hintsLoading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
      const result = await requestAI(`hint${level}`);
      
      if (result.success) {
        state.hints[level] = result.content;
        
        // Mark button as revealed
        const btn = document.querySelector(`[data-hint="${level}"]`);
        if (btn) btn.classList.add('revealed');
        
        // Add hint card
        const hintCard = document.createElement('div');
        hintCard.className = 'hint-card';
        hintCard.innerHTML = `
          <div class="hint-card-header">
            <span>Level ${level}</span>
            <span>•</span>
            <span>${level === 1 ? 'Direction' : level === 2 ? 'Approach' : 'Logic'}</span>
          </div>
          <div class="hint-card-body">${formatContent(result.content)}</div>
        `;
        elements.hintsContainer.appendChild(hintCard);
      } else {
        console.error('Hint error:', result.error);
      }
    } catch (error) {
      console.error('Hint error:', error);
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
  }

  async function handleIdeas() {
    showLoading('ideas');
    
    try {
      const result = await requestAI('ideas');
      
      if (result.success) {
        elements.ideasContent.innerHTML = formatContent(result.content);
        state.sectionContent.ideas = result.content;
        hideLoading('ideas', true);
      } else {
        showError('ideas', result.error || 'Failed to generate ideas');
      }
    } catch (error) {
      showError('ideas', error.message);
    }
  }

  async function handleAnalyze() {
    // Request fresh code from content script
    window.parent.postMessage({ type: 'ALGOLENS_REQUEST_CODE' }, '*');
    
    showLoading('analyze');
    
    // Wait a bit for code to arrive
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const result = await requestAI('analyze');
      
      if (result.success) {
        const scrollContainer = elements.analyzeContent.querySelector('.content-scroll') || elements.analyzeContent;
        scrollContainer.innerHTML = formatContent(result.content);
        state.sectionContent.analyze = result.content;
        hideLoading('analyze', true);
      } else {
        showError('analyze', result.error || 'Failed to analyze code');
      }
    } catch (error) {
      showError('analyze', error.message);
    }
  }

  function handleSnapshot() {
    if (state.codeData?.content) {
      state.previousCode = { ...state.codeData };
      
      // Save to storage
      chrome.storage.local.set({
        [`snapshot_${state.problemData?.url}`]: state.previousCode
      });
      
      // Show confirmation
      const btn = document.querySelector('[data-action="snapshot"]');
      const originalText = btn.textContent;
      btn.textContent = 'Saved ✓';
      btn.disabled = true;
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    }
  }

  function handleCompare() {
    if (!state.previousCode?.content || !state.codeData?.content) {
      const scrollContainer = elements.compareContent.querySelector('.content-scroll') || elements.compareContent;
      scrollContainer.innerHTML = `
        <p style="color: var(--text-muted);">
          Save a snapshot first, then make changes to compare.
        </p>
      `;
      elements.compareContent.classList.remove('hidden');
      document.querySelector('#compareSection .placeholder').classList.add('hidden');
      updateSectionHeight('compare');
      return;
    }
    
    const prev = state.previousCode.content;
    const curr = state.codeData.content;
    
    // Simple comparison
    const prevLines = prev.split('\n').length;
    const currLines = curr.split('\n').length;
    const lineDiff = currLines - prevLines;
    
    const prevLoops = (prev.match(/\b(for|while)\b/g) || []).length;
    const currLoops = (curr.match(/\b(for|while)\b/g) || []).length;
    const loopDiff = currLoops - prevLoops;
    
    const prevNested = (prev.match(/for.*for|while.*while|for.*while|while.*for/gs) || []).length;
    const currNested = (curr.match(/for.*for|while.*while|for.*while|while.*for/gs) || []).length;
    const nestedDiff = currNested - prevNested;
    
    let insights = [];
    
    if (lineDiff > 0) {
      insights.push(`Added ${lineDiff} lines`);
    } else if (lineDiff < 0) {
      insights.push(`Removed ${Math.abs(lineDiff)} lines`);
    }
    
    if (loopDiff < 0) {
      insights.push('Reduced loop count → potential optimization');
    } else if (loopDiff > 0) {
      insights.push('Added more loops');
    }
    
    if (nestedDiff < 0) {
      insights.push('Reduced nesting → cleaner structure');
    } else if (nestedDiff > 0) {
      insights.push('Added nested loops → watch complexity');
    }
    
    const scrollContainer = elements.compareContent.querySelector('.content-scroll') || elements.compareContent;
    scrollContainer.innerHTML = `
      <div class="compare-info">
        <div class="compare-stat">
          <span class="compare-label">Lines</span>
          <span class="compare-value ${lineDiff < 0 ? 'positive' : lineDiff > 0 ? 'negative' : ''}">${prevLines} → ${currLines}</span>
        </div>
        <div class="compare-stat">
          <span class="compare-label">Loops</span>
          <span class="compare-value ${loopDiff < 0 ? 'positive' : loopDiff > 0 ? 'negative' : ''}">${prevLoops} → ${currLoops}</span>
        </div>
        <div class="compare-stat">
          <span class="compare-label">Nested</span>
          <span class="compare-value ${nestedDiff < 0 ? 'positive' : nestedDiff > 0 ? 'negative' : ''}">${prevNested} → ${currNested}</span>
        </div>
      </div>
      ${insights.length > 0 ? `
        <div class="content" style="margin-top: var(--space-3);">
          <h4>Insights</h4>
          <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      ` : ''}
    `;
    
    elements.compareContent.classList.remove('hidden');
    document.querySelector('#compareSection .placeholder').classList.add('hidden');
    updateSectionHeight('compare');
  }

  async function handleStuck() {
    // Request fresh code
    window.parent.postMessage({ type: 'ALGOLENS_REQUEST_CODE' }, '*');
    
    showLoading('stuck');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const result = await requestAI('stuck');
      
      if (result.success) {
        const scrollContainer = elements.stuckContent.querySelector('.content-scroll') || elements.stuckContent;
        scrollContainer.innerHTML = formatContent(result.content);
        state.sectionContent.stuck = result.content;
        hideLoading('stuck', true);
      } else {
        showError('stuck', result.error || 'Failed to get help');
      }
    } catch (error) {
      showError('stuck', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Event Handlers
  // ═══════════════════════════════════════════════════════════════
  
  function setupEventListeners() {
    // Accordion toggle (single open)
    document.querySelectorAll('.card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.card');
        const sectionName = card.dataset.section;
        toggleSection(sectionName);
      });
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });
    
    // Action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        switch (action) {
          case 'explain': handleExplain(); break;
          case 'constraints': handleConstraints(); break;
          case 'complexity': handleComplexity(); break;
          case 'ideas': handleIdeas(); break;
          case 'analyze': handleAnalyze(); break;
          case 'snapshot': handleSnapshot(); break;
          case 'compare': handleCompare(); break;
          case 'stuck': handleStuck(); break;
        }
      });
    });
    
    // Hint buttons
    document.querySelectorAll('[data-hint]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const level = parseInt(btn.dataset.hint);
        handleHint(level);
      });
    });
    
    // Header buttons
    elements.settingsBtn?.addEventListener('click', () => {
      elements.settingsModal.classList.remove('hidden');
    });
    
    elements.refreshBtn?.addEventListener('click', () => {
      window.parent.postMessage({ type: 'ALGOLENS_REQUEST_DATA' }, '*');
    });
    
    elements.closeBtn?.addEventListener('click', () => {
      window.parent.postMessage({ type: 'ALGOLENS_TOGGLE' }, '*');
    });
    
    // Modal
    elements.settingsModal?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') || 
          e.target.closest('.modal-close')) {
        elements.settingsModal.classList.add('hidden');
      }
    });
    
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Handling
  // ═══════════════════════════════════════════════════════════════
  
  function handleMessage(event) {
    const { type, payload } = event.data || {};
    
    switch (type) {
      case 'ALGOLENS_DATA':
        state.problemData = payload.problem;
        state.codeData = payload.code;
        updateProblemBar();
        loadPreviousSnapshot();
        break;
        
      case 'ALGOLENS_CODE_UPDATE':
        state.codeData = payload;
        break;
    }
  }

  function updateProblemBar() {
    if (!state.problemData) return;
    
    elements.problemTitle.textContent = state.problemData.title || 'Unknown Problem';
    
    if (state.problemData.difficulty) {
      elements.difficultyBadge.textContent = state.problemData.difficulty;
      elements.difficultyBadge.className = `difficulty-badge ${state.problemData.difficulty.toLowerCase()}`;
    }
  }

  async function loadPreviousSnapshot() {
    if (!state.problemData?.url) return;
    
    try {
      const key = `snapshot_${state.problemData.url}`;
      const result = await new Promise(resolve => {
        chrome.storage.local.get(key, resolve);
      });
      
      if (result[key]) {
        state.previousCode = result[key];
      }
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Restore Previous State
  // ═══════════════════════════════════════════════════════════════

  function restoreState() {
    try {
      // Restore active section
      const savedSection = localStorage.getItem('algolens_activeSection');
      if (savedSection) {
        // Delay to allow DOM to settle
        setTimeout(() => openSection(savedSection), 100);
      }
      
      // Restore active tab
      const savedTab = localStorage.getItem('algolens_activeTab');
      if (savedTab) {
        switchTab(savedTab);
      }
    } catch (e) {
      // localStorage not available
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════
  
  function init() {
    console.log('🔍 AlgoLens Sidebar: Initializing...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Restore previous state
    restoreState();
    
    // Listen for messages from parent
    window.addEventListener('message', handleMessage);
    
    // Request initial data
    window.parent.postMessage({ type: 'ALGOLENS_REQUEST_DATA' }, '*');
    
    console.log('🔍 AlgoLens Sidebar: Ready');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
