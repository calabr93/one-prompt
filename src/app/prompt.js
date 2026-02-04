/**
 * Prompt Module
 *
 * Handles prompt input functionality:
 * - Button state management (send/copy)
 * - Copy to clipboard
 * - Send to selected AIs (API mode)
 *
 * @module @app/prompt
 */

// Module state (initialized via initPrompt)
let promptInput = null;
let copyBtn = null;
let sendBtn = null;
let selectedAIs = new Set();
let loadedWebviews = new Set();
let logger = console;
let t = (key) => key;
let showNotification = () => {};
let getCurrentSession = () => null;
let getCurrentSessionWebviews = () => ({});
let getCurrentSessionId = () => null;
let updateWebviewStatus = () => {};
let saveApiHistory = () => {};
let handleApiChat = () => {};

/**
 * Initialize Prompt module with dependencies
 * @param {Object} deps - Dependencies
 */
export function initPrompt(deps) {
  if (deps.promptInput) promptInput = deps.promptInput;
  if (deps.copyBtn) copyBtn = deps.copyBtn;
  if (deps.sendBtn) sendBtn = deps.sendBtn;
  if (deps.selectedAIs) selectedAIs = deps.selectedAIs;
  if (deps.loadedWebviews) loadedWebviews = deps.loadedWebviews;
  if (deps.logger) logger = deps.logger;
  if (deps.t) t = deps.t;
  if (deps.showNotification) showNotification = deps.showNotification;
  if (deps.getCurrentSession) getCurrentSession = deps.getCurrentSession;
  if (deps.getCurrentSessionWebviews) getCurrentSessionWebviews = deps.getCurrentSessionWebviews;
  if (deps.getCurrentSessionId) getCurrentSessionId = deps.getCurrentSessionId;
  if (deps.updateWebviewStatus) updateWebviewStatus = deps.updateWebviewStatus;
  if (deps.saveApiHistory) saveApiHistory = deps.saveApiHistory;
  if (deps.handleApiChat) handleApiChat = deps.handleApiChat;
}

/**
 * Sync state with renderer (call when selectedAIs changes)
 * @param {Object} state - State to sync
 */
export function syncState(state) {
  if (state.selectedAIs) selectedAIs = state.selectedAIs;
  if (state.loadedWebviews) loadedWebviews = state.loadedWebviews;
}

/**
 * Update prompt buttons based on current state
 */
export function updatePromptButtons() {
  if (!promptInput || !copyBtn || !sendBtn) return;

  const hasPrompt = promptInput.value.trim().length > 0;
  const hasSelection = selectedAIs.size > 0;
  const currentSession = getCurrentSession();
  const isApiMode = currentSession && currentSession.mode === 'api';

  // Update placeholder based on mode
  promptInput.placeholder = t(isApiMode ? 'prompt.placeholder.api' : 'prompt.placeholder');

  if (isApiMode) {
    // API Mode: show sendBtn, hide copyBtn
    copyBtn.style.display = 'none';
    sendBtn.style.display = 'flex';
    sendBtn.disabled = !(hasPrompt && hasSelection);
  } else {
    // Web Mode: show copyBtn, hide sendBtn
    copyBtn.style.display = 'flex';
    sendBtn.style.display = 'none';
  }
}

/**
 * Alias for backward compatibility
 */
export function updateCopyButton() {
  updatePromptButtons();
}

/**
 * Copy prompt to clipboard
 */
export async function copyPromptToClipboard() {
  if (!promptInput) return;

  let prompt = promptInput.value.trim();

  // If empty, use placeholder text
  if (!prompt) {
    prompt = promptInput.placeholder;
  }

  try {
    await navigator.clipboard.writeText(prompt);
    showNotification(t('copy.success'), 'success');
  } catch (error) {
    logger.error('Error copying to clipboard:', error);
    showNotification(t('copy.error'), 'error');
  }
}

/**
 * Ensure webview is loaded before sending
 * @param {string} aiKey - AI service key
 * @param {HTMLElement} webview - Webview element
 */
async function ensureWebviewLoaded(aiKey, webview) {
  if (loadedWebviews.has(aiKey)) return;

  logger.log(`Waiting for ${aiKey} to load...`);
  updateWebviewStatus(aiKey, 'thinking');

  await new Promise(resolve => {
    const onLoaded = () => {
      webview.removeEventListener('did-finish-load', onLoaded);
      logger.log(`${aiKey} loaded!`);
      resolve();
    };
    webview.addEventListener('did-finish-load', onLoaded);

    // Timeout fallback (15s)
    setTimeout(() => {
      webview.removeEventListener('did-finish-load', onLoaded);
      logger.log(`${aiKey} load timeout, continuing anyway...`);
      resolve();
    }, 15000);
  });

  // Extra delay for SPA hydration
  logger.log(`Waiting extra 2s for ${aiKey} SPA hydration...`);
  await new Promise(r => setTimeout(r, 2000));
}

/**
 * Send prompt to all selected AIs
 */
export async function sendPromptToSelectedAIs() {
  if (!promptInput) return;

  const prompt = promptInput.value.trim();

  if (!prompt || selectedAIs.size === 0) {
    return;
  }

  try {
    // CRITICAL: Capture sessionId at the START of the request
    // This prevents race condition when user switches tabs during API call
    const capturedSessionId = getCurrentSessionId();

    // Get webviews for current session
    const sessionWebviews = getCurrentSessionWebviews();
    const currentSession = getCurrentSession();
    const isApiMode = currentSession && currentSession.mode === 'api';
    const aiKeys = Array.from(selectedAIs);

    // Clear prompt input IMMEDIATELY after send button click
    promptInput.value = '';
    updatePromptButtons();

    // Send prompt to all selected AIs
    const promises = aiKeys.map(async aiKey => {
      const webview = sessionWebviews[aiKey];
      if (!webview) {
        logger.error(`Webview for ${aiKey} not found in current session`);
        return;
      }

      // Wait for webview to load (only for Web Mode)
      if (!isApiMode) {
        await ensureWebviewLoaded(aiKey, webview);
      }

      // Send via IPC to webview or Handle API
      if (isApiMode) {
        logger.log(`[${Date.now()}] Handling API chat for ${aiKey} in session ${capturedSessionId}...`);

        // Save USER message to history explicitly before calling handler
        saveApiHistory(aiKey, 'user', prompt, capturedSessionId);

        // Fire and forget - all requests start in parallel
        handleApiChat(aiKey, prompt, webview, capturedSessionId);
      }
      // Web Mode: user copies prompt manually via copyBtn
    });

    await Promise.all(promises);

  } catch (error) {
    logger.error('Errore invio prompt:', error);
  }
}

/**
 * Get current prompt value
 * @returns {string} Current prompt text
 */
export function getPromptValue() {
  return promptInput ? promptInput.value : '';
}

/**
 * Set prompt value
 * @param {string} value - New prompt text
 */
export function setPromptValue(value) {
  if (promptInput) {
    promptInput.value = value;
    updatePromptButtons();
  }
}
