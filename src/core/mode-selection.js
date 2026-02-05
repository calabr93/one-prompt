/**
 * Mode Selection Module
 * Handles switching between web and api modes
 *
 * Usage:
 * 1. Import in renderer-entry.js
 * 2. Call initModeSelection() with config object
 * 3. Use selectMode() to switch modes
 */

const logger = window.OnePromptLogger || console;

// Module state - initialized via initModeSelection()
let selectedAIs = new Set();
let configuredApiAIs = new Set();
let getCurrentSessionFn = null;
let saveSelectedAIsFn = null;
let saveSessionsToStorageFn = null;
let renderSidebarFn = null;
let renderWebviewsFn = null;
let updatePromptButtonsFn = null;
let updateCrossCheckVisibilityFn = null;
let renderTabsFn = null;
let AIServicesModule = null;
let I18nModule = null;

// Getter functions for dynamic state
let getSelectedAIsFn = null;
let getConfiguredApiAIsFn = null;

/**
 * Initialize the mode selection module
 * @param {Object} config - Configuration object
 * @param {Function} config.getSelectedAIs - Function to get selected AIs Set
 * @param {Function} config.getConfiguredApiAIs - Function to get configured API AIs Set
 * @param {Function} config.getCurrentSession - Function to get current session
 * @param {Function} config.saveSelectedAIs - Function to save selected AIs
 * @param {Function} config.saveSessionsToStorage - Function to save sessions to storage
 * @param {Function} config.renderSidebar - Function to render sidebar
 * @param {Function} config.renderWebviews - Function to render webviews
 * @param {Function} config.updatePromptButtons - Function to update prompt buttons
 * @param {Function} config.updateCrossCheckVisibility - Function to update cross-check visibility
 * @param {Function} [config.renderTabs] - Optional function to render tabs
 * @param {Object} [config.aiServicesModule] - Optional AI Services module reference
 * @param {Object} [config.i18nModule] - Optional i18n module reference
 */
export function initModeSelection(config) {
  getCurrentSessionFn = config.getCurrentSession;
  saveSelectedAIsFn = config.saveSelectedAIs;
  saveSessionsToStorageFn = config.saveSessionsToStorage;
  renderSidebarFn = config.renderSidebar;
  renderWebviewsFn = config.renderWebviews;
  updatePromptButtonsFn = config.updatePromptButtons;
  updateCrossCheckVisibilityFn = config.updateCrossCheckVisibility || null;
  renderTabsFn = config.renderTabs || null;
  AIServicesModule = config.aiServicesModule || null;
  I18nModule = config.i18nModule || null;

  // Store getter functions for dynamic state
  getSelectedAIsFn = config.getSelectedAIs;
  getConfiguredApiAIsFn = config.getConfiguredApiAIs;

  // Update state from getters
  refreshState();

  logger.log('ModeSelection module initialized');
}

/**
 * Refresh state from getter functions
 * Call this before operations that need current state
 */
function refreshState() {
  if (getSelectedAIsFn) selectedAIs = getSelectedAIsFn();
  if (getConfiguredApiAIsFn) configuredApiAIs = getConfiguredApiAIsFn();
}

/**
 * Translation helper - uses I18nModule if available
 */
function t(key) {
  if (I18nModule && I18nModule.t) {
    return I18nModule.t(key);
  }
  // Fallback to window.t if available
  if (typeof window !== 'undefined' && window.t) {
    return window.t(key);
  }
  return key;
}

/**
 * Select mode (web or api)
 * @param {string} mode - 'web' or 'api'
 */
export function selectMode(mode) {
  refreshState();

  const rememberToggle = document.getElementById('rememberModeToggle');
  const remember = rememberToggle ? rememberToggle.checked : false;

  if (remember) {
    localStorage.setItem('oneprompt-default-mode', mode);
    // Update settings UI if open
    const radio = document.querySelector(`input[name="defaultMode"][value="${mode}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  const currentSession = getCurrentSessionFn ? getCurrentSessionFn() : null;
  if (currentSession) {
    currentSession.mode = mode;

    // If switching to API mode, ensure API services are configured (but don't clear selections)
    if (mode === 'api') {
      // Do NOT clear selectedAIs - preserve user's service selections when switching modes
      // Just ensure API services are configured so they appear in sidebar
      const apiServices = AIServicesModule ? AIServicesModule.getApiServices() : ['chatgpt', 'gemini', 'claude'];
      apiServices.forEach(key => {
        if (!configuredApiAIs.has(key)) {
          configuredApiAIs.add(key);
        }
      });
      localStorage.setItem('oneprompt-configured-api-services', JSON.stringify([...configuredApiAIs]));
      // Save current selections to session
      if (saveSelectedAIsFn) saveSelectedAIsFn();
    }

    if (saveSessionsToStorageFn) saveSessionsToStorageFn();
    if (renderTabsFn) renderTabsFn(); // Update tab icon for mode
    if (renderSidebarFn) renderSidebarFn(); // Update sidebar for new mode
    if (renderWebviewsFn) renderWebviewsFn();
    if (updatePromptButtonsFn) updatePromptButtonsFn(); // Update button visibility for mode
    if (updateCrossCheckVisibilityFn) updateCrossCheckVisibilityFn();

    // Update prompt placeholder for mode
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
      promptInput.placeholder = t(mode === 'api' ? 'prompt.placeholder.api' : 'prompt.placeholder');
    }
  }
}

/**
 * Check if current session is in API mode
 * @param {Object} session - Session object
 * @returns {boolean}
 */
export function isApiMode(session) {
  return session && session.mode === 'api';
}
