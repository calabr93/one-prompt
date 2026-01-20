/**
 * Sidebar Module
 * Handles sidebar rendering, button creation, scroll indicators
 * 
 * Usage:
 * 1. Import in renderer-entry.js
 * 2. Call initSidebar() with config object
 * 3. Use renderSidebar(), updateSidebarState(), etc.
 */

const logger = window.OnePromptLogger || console;

// Module state - initialized via initSidebar()
let sidebarNav = null;
let aiConfigs = {};
let selectedAIs = new Set();
let configuredAIs = new Set();
let configuredApiAIs = new Set();
let getCurrentSessionFn = null;
let toggleAISelectionFn = null;
let AIServicesModule = null;

/**
 * Initialize the sidebar module
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.sidebarNav - The sidebar nav element
 * @param {Object} config.aiConfigs - AI configurations object
 * @param {Function} config.getSelectedAIs - Function to get selected AIs Set
 * @param {Function} config.getConfiguredAIs - Function to get configured AIs Set (web mode)
 * @param {Function} config.getConfiguredApiAIs - Function to get configured API AIs Set
 * @param {Function} config.getCurrentSession - Function to get current session
 * @param {Function} config.toggleAISelection - Function to toggle AI selection
 * @param {Object} [config.aiServicesModule] - Optional AI Services module reference
 */
export function initSidebar(config) {
  sidebarNav = config.sidebarNav;
  aiConfigs = config.aiConfigs || {};
  getCurrentSessionFn = config.getCurrentSession;
  toggleAISelectionFn = config.toggleAISelection;
  AIServicesModule = config.aiServicesModule || null;
  
  // Store getter functions for dynamic state
  if (config.getSelectedAIs) {
    selectedAIs = config.getSelectedAIs();
  }
  if (config.getConfiguredAIs) {
    configuredAIs = config.getConfiguredAIs();
  }
  if (config.getConfiguredApiAIs) {
    configuredApiAIs = config.getConfiguredApiAIs();
  }
  
  logger.log('[Sidebar] Module initialized');
}

/**
 * Update module's reference to external state
 * Call this before renderSidebar if state may have changed
 */
export function syncState(config) {
  if (config.selectedAIs) selectedAIs = config.selectedAIs;
  if (config.configuredAIs) configuredAIs = config.configuredAIs;
  if (config.configuredApiAIs) configuredApiAIs = config.configuredApiAIs;
  if (config.aiConfigs) aiConfigs = config.aiConfigs;
}

/**
 * Render sidebar buttons based on current mode and configured services
 */
export function renderSidebar() {
  if (!sidebarNav) {
    logger.warn('[Sidebar] sidebarNav not initialized');
    return;
  }
  
  sidebarNav.innerHTML = '';

  const currentSession = getCurrentSessionFn ? getCurrentSessionFn() : null;
  const mode = currentSession ? currentSession.mode : 'web';
  const apiServices = AIServicesModule ? AIServicesModule.getApiServices() : ['chatgpt', 'gemini', 'claude'];

  // Show only configured services in sidebar
  Object.entries(aiConfigs).forEach(([key, config]) => {
    let isConfigured = false;
    if (mode === 'api') {
      // In API mode, check configuredApiAIs AND if it's an API service
      if (configuredApiAIs.has(key) && apiServices.includes(key)) {
        isConfigured = true;
      }
    } else {
      // In Web mode, check configuredAIs
      if (configuredAIs.has(key)) {
        isConfigured = true;
      }
    }

    if (isConfigured) {
      const button = createSidebarButton(key, config, mode);
      sidebarNav.appendChild(button);
    }
  });

  // Update scroll indicators
  updateScrollIndicators();
}

/**
 * Update sidebar button states based on selected AIs
 */
export function updateSidebarState() {
  const allButtons = document.querySelectorAll('.sidebar-item[data-ai-key]');
  allButtons.forEach(button => {
    const aiKey = button.dataset.aiKey;
    if (selectedAIs.has(aiKey)) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Update a single sidebar button state
 * @param {string} aiKey - The AI service key
 */
export function updateSidebarButtonState(aiKey) {
  const button = document.querySelector(`.sidebar-item[data-ai-key="${aiKey}"]`);
  if (!button) return;

  if (selectedAIs.has(aiKey)) {
    button.classList.add('active');
  } else {
    button.classList.remove('active');
  }
}

/**
 * Update scroll indicators visibility
 */
export function updateScrollIndicators() {
  const scrollUpBtn = document.getElementById('scrollUpBtn');
  const scrollDownBtn = document.getElementById('scrollDownBtn');

  if (!scrollUpBtn || !scrollDownBtn || !sidebarNav) return;

  const hasOverflow = sidebarNav.scrollHeight > sidebarNav.clientHeight;
  const isAtTop = sidebarNav.scrollTop <= 0;
  const isAtBottom = sidebarNav.scrollTop + sidebarNav.clientHeight >= sidebarNav.scrollHeight - 1;

  if (hasOverflow) {
    if (!isAtTop) {
      scrollUpBtn.classList.add('visible');
    } else {
      scrollUpBtn.classList.remove('visible');
    }

    if (!isAtBottom) {
      scrollDownBtn.classList.add('visible');
    } else {
      scrollDownBtn.classList.remove('visible');
    }
  } else {
    scrollUpBtn.classList.remove('visible');
    scrollDownBtn.classList.remove('visible');
  }
}

/**
 * Setup scroll listeners for sidebar
 */
export function setupScrollListeners() {
  const scrollUpBtn = document.getElementById('scrollUpBtn');
  const scrollDownBtn = document.getElementById('scrollDownBtn');

  if (sidebarNav) {
    sidebarNav.addEventListener('scroll', updateScrollIndicators);
    // Also update on window resize
    window.addEventListener('resize', updateScrollIndicators);
  }

  if (scrollUpBtn) {
    scrollUpBtn.addEventListener('click', () => {
      sidebarNav.scrollBy({ top: -60, behavior: 'smooth' });
    });
  }

  if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
      sidebarNav.scrollBy({ top: 60, behavior: 'smooth' });
    });
  }
  
  logger.log('[Sidebar] Scroll listeners setup complete');
}

/**
 * Create a sidebar button for an AI service
 * @param {string} key - The AI service key
 * @param {Object} config - The AI config object
 * @param {string} mode - Current mode ('web' or 'api')
 * @returns {HTMLButtonElement} The button element
 */
function createSidebarButton(key, config, mode) {
  const button = document.createElement('button');
  button.className = 'sidebar-item';
  button.dataset.aiKey = key;
  button.title = config.name;

  // Add active class if selected
  if (selectedAIs.has(key)) {
    button.classList.add('active');
  }

  // Add logged-in class if configured
  let isConfigured = false;
  if (mode === 'api') {
    if (configuredApiAIs.has(key)) isConfigured = true;
  } else {
    if (configuredAIs.has(key)) isConfigured = true;
  }

  if (isConfigured) {
    button.classList.add('logged-in');
  }

  const iconHtml = config.logo
    ? `<img src="${config.logo}" alt="${config.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${config.icon}';">`
    : config.icon;

  button.innerHTML = `
    <span class="sidebar-icon">${iconHtml}</span>
    <span class="sidebar-item-status"></span>
  `;

  button.addEventListener('click', () => {
    if (toggleAISelectionFn) {
      toggleAISelectionFn(key);
    }
  });

  return button;
}
