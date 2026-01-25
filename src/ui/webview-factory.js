/**
 * Webview Factory Module
 * Creates and manages webviews for AI services
 */

import { logger } from '../utils/logger-renderer.js';

// Module state - will be set via init()
let webviewZoomLevels = {};
let loadedWebviews = null;
let currentSessionId = null;
let aiConfigs = null;
let getCurrentSessionFn = null;

/**
 * Initialize the webview factory with dependencies
 * @param {Object} config - Configuration object
 * @param {Object} config.webviewZoomLevels - Object to track zoom levels per AI
 * @param {Set} config.loadedWebviews - Set of loaded webview keys
 * @param {Function} config.getCurrentSession - Function to get current session
 * @param {Function} config.getCurrentSessionId - Function to get current session ID
 * @param {Object} config.aiConfigs - AI configurations object
 */
export function initWebviewFactory(config) {
  webviewZoomLevels = config.webviewZoomLevels || {};
  loadedWebviews = config.loadedWebviews || new Set();
  getCurrentSessionFn = config.getCurrentSession;
  aiConfigs = config.aiConfigs;
  
  // Store getter for currentSessionId
  if (config.getCurrentSessionId) {
    Object.defineProperty(module, 'currentSessionId', {
      get: config.getCurrentSessionId
    });
  }
  
  logger.log('[WebviewFactory] Initialized');
}

// Internal module reference for property access
const module = {
  currentSessionId: null
};

/**
 * Create a webview element for an AI service
 * @param {string} aiKey - The AI service key
 * @returns {Promise<HTMLElement>} The webview element
 */
export async function createWebview(aiKey) {
  const config = aiConfigs[aiKey];
  const webview = document.createElement('webview');

  // Get preload path
  const preloadPath = await window.electronAPI.getWebviewPreloadPath();

  // Use saved URL if available, otherwise use default URL
  const currentSession = getCurrentSessionFn ? getCurrentSessionFn() : null;
  const savedUrl = currentSession?.chatUrls?.[aiKey];
  const urlToLoad = savedUrl || config.url;

  webview.setAttribute('src', urlToLoad);
  webview.setAttribute('data-ai-key', aiKey);
  webview.setAttribute('partition', `persist:${aiKey}`);
  webview.setAttribute('allowpopups', 'true');
  webview.setAttribute('preload', `file://${preloadPath}`);
  // Security: disable node integration and enable context isolation
  webview.setAttribute('nodeintegration', 'false');
  webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no');
  webview.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
  webview.style.width = '100%';
  webview.style.height = '100%';

  // Listen for zoom controls from webview
  webview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'zoom-change') {
      handleZoomChange(event, aiKey);
    }
  });

  // Event listeners
  webview.addEventListener('did-finish-load', () => {
    logger.log(`${config.name} - caricamento completato`);
    loadedWebviews.add(aiKey);
    updateWebviewStatus(aiKey, 'ready');
  });

  webview.addEventListener('did-fail-load', (e) => {
    logger.error(`${config.name} - errore caricamento:`, e);
  });

  return webview;
}

/**
 * Handle zoom change from webview IPC message
 * @param {Event} event - IPC message event
 * @param {string} defaultAiKey - Default AI key if not found in event
 */
function handleZoomChange(event, defaultAiKey) {
  const direction = event.args[0];
  const targetWebview = event.target;
  const targetAiKey = targetWebview.getAttribute('data-ai-key') || defaultAiKey;

  if (webviewZoomLevels[targetAiKey] === undefined) {
    webviewZoomLevels[targetAiKey] = 0;
  }

  if (direction === 'in') {
    webviewZoomLevels[targetAiKey] = Math.min(webviewZoomLevels[targetAiKey] + 0.5, 5);
  } else if (direction === 'out') {
    webviewZoomLevels[targetAiKey] = Math.max(webviewZoomLevels[targetAiKey] - 0.5, -5);
  } else if (direction === 'reset') {
    webviewZoomLevels[targetAiKey] = 0;
  }

  targetWebview.setZoomLevel(webviewZoomLevels[targetAiKey]);
  logger.log(`[Zoom] ${targetAiKey}: level ${webviewZoomLevels[targetAiKey]}`);
}

/**
 * Update webview status indicator in header
 * @param {string} aiKey - AI service key
 * @param {string} status - Status: 'ready', 'sent', 'error'
 * @param {string} [sessionId] - Optional session ID (uses current if not provided)
 */
export function updateWebviewStatus(aiKey, status, sessionId = null) {
  const sessId = sessionId || module.currentSessionId;
  const statusEl = document.getElementById(`status-${sessId}-${aiKey}`);
  if (!statusEl) return;

  const statusMap = {
    ready: { text: '●', color: 'var(--text-secondary)' },
    sent: { text: '●', color: 'var(--success-color)' },
    error: { text: '●', color: '#dc3545' }
  };

  const statusInfo = statusMap[status] || statusMap.ready;
  statusEl.textContent = statusInfo.text;
  statusEl.style.color = statusInfo.color;
}

/**
 * Get current zoom level for an AI service
 * @param {string} aiKey - AI service key
 * @returns {number} Current zoom level
 */
export function getZoomLevel(aiKey) {
  return webviewZoomLevels[aiKey] || 0;
}

/**
 * Set zoom level for an AI service
 * @param {string} aiKey - AI service key
 * @param {number} level - Zoom level
 */
export function setZoomLevel(aiKey, level) {
  webviewZoomLevels[aiKey] = Math.max(-5, Math.min(5, level));
}

/**
 * Check if a webview is loaded
 * @param {string} aiKey - AI service key
 * @returns {boolean} True if loaded
 */
export function isWebviewLoaded(aiKey) {
  return loadedWebviews ? loadedWebviews.has(aiKey) : false;
}

/**
 * Mark a webview as loaded
 * @param {string} aiKey - AI service key
 */
export function markWebviewLoaded(aiKey) {
  if (loadedWebviews) {
    loadedWebviews.add(aiKey);
  }
}

/**
 * Clear loaded webviews (e.g., when switching sessions)
 */
export function clearLoadedWebviews() {
  if (loadedWebviews) {
    loadedWebviews.clear();
  }
}
