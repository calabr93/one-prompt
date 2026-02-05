/**
 * State management module
 *
 * Handles session state, configured AIs, and cross-check settings.
 * This module can be extended by private repos to add credits, auth state, etc.
 *
 * @module @core/state
 */

// Logger alias (loaded from utils/logger-renderer.js, disables logs in production)
const logger = window.OnePromptLogger || console;

// API History limit (sliding window: 6 user/assistant exchanges = 12 messages)
export const API_HISTORY_LIMIT = 12;

// Session/Tab management
export let sessions = [];
export let currentSessionId = null;
export let sessionCounter = 0;

// AI state
export let aiConfigs = {};
export let loadedWebviews = new Set();
export let webviewInstances = {}; // Map sessionId -> { aiKey -> webview element }

// Default to Perplexity and Copilot active, ChatGPT/Claude/Gemini in sidebar for fresh installations (Web mode)
export let configuredAIs = new Set(
  JSON.parse(localStorage.getItem('oneprompt-configured-services') || '["perplexity", "copilot", "chatgpt", "claude", "gemini"]')
);

// Default to ChatGPT, Gemini, Claude for API mode
export let configuredApiAIs = new Set(
  JSON.parse(localStorage.getItem('oneprompt-configured-api-services') || '["chatgpt", "gemini", "claude"]')
);

// Cross-Check mode state
export let crossCheckEnabled = false;

// Webview zoom state
export let focusedWebview = null;
export let webviewZoomLevels = {}; // Map aiKey -> zoomLevel

// Default Cross-Check prompt template
export const DEFAULT_CROSS_CHECK_TEMPLATE = `I've collected responses from several AIs, including yours, regarding my last request:

{{OTHER_RESPONSES}}

Compare them objectively. Be honest and acknowledge if another AI provided a better or more accurate answer. Respond in the same language as my original request.`;

// AI display names for cross-check prompts
export const AI_DISPLAY_NAMES = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  deepseek: 'DeepSeek'
};

export function setSessions(newSessions) {
  sessions = newSessions;
}

export function setCurrentSessionId(id) {
  currentSessionId = id;
}

/**
 * Get cross-check template from localStorage or use default
 */
export function getCrossCheckTemplate() {
  return localStorage.getItem('oneprompt-crosscheck-template') || DEFAULT_CROSS_CHECK_TEMPLATE;
}

/**
 * Create a new session object
 */
export function createNewSession(name = null, selectedAIsSet = null, mode = null) {
  sessionCounter++;

  // Find lowest available session number (gap finding)
  const usedNumbers = new Set(sessions.map(s => s.sessionNumber).filter(n => typeof n === 'number'));
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  // Determine mode based on default settings if not provided
  let initialMode = mode;
  if (!initialMode) {
    const defaultMode = localStorage.getItem('oneprompt-default-mode');
    if (defaultMode && defaultMode !== 'ask') {
      initialMode = defaultMode;
    }
  }

  return {
    id: `session-${Date.now()}-${sessionCounter}`,
    name: name || null, // null means use default translated name
    sessionNumber: nextNumber,
    selectedAIs: selectedAIsSet ? Array.from(selectedAIsSet) : [],
    mode: initialMode || null, // 'web' or 'api' or null
    chatUrls: {}, // Map aiKey -> URL
    apiChatHistory: {}, // Map aiKey -> Array of {role, content} for API mode
    promptDraft: '', // Draft content of the prompt textarea
    createdAt: Date.now()
  };
}

/**
 * Get current session
 */
export function getCurrentSession() {
  return sessions.find(s => s.id === currentSessionId) || sessions[0];
}

/**
 * Get webviews for a specific session
 */
export function getSessionWebviews(sessionId) {
  if (!webviewInstances[sessionId]) {
    webviewInstances[sessionId] = {};
  }
  return webviewInstances[sessionId];
}

/**
 * Get webviews for current session
 */
export function getCurrentSessionWebviews() {
  return getSessionWebviews(currentSessionId);
}

/**
 * Capture current URLs from webviews before saving
 */
export function captureCurrentUrls() {
  const currentSession = getCurrentSession();
  if (!currentSession) return;

  if (!currentSession.chatUrls) {
    currentSession.chatUrls = {};
  }

  const sessionWebviews = getCurrentSessionWebviews();
  Object.keys(sessionWebviews).forEach(aiKey => {
    const webview = sessionWebviews[aiKey];
    if (webview) {
      try {
        const url = (typeof webview.getURL === 'function') ? webview.getURL() : webview.src;
        if (url) {
          currentSession.chatUrls[aiKey] = url;
        }
      } catch (e) {
        logger.error(`Error capturing URL for ${aiKey}:`, e);
      }
    }
  });
}

/**
 * Save sessions to localStorage
 */
export function saveSessionsToStorage() {
  try {
    captureCurrentUrls();
    localStorage.setItem('oneprompt-sessions', JSON.stringify(sessions));
    localStorage.setItem('oneprompt-current-session', currentSessionId);
    localStorage.setItem('oneprompt-session-counter', sessionCounter.toString());
  } catch (error) {
    logger.error('Failed to save sessions to storage:', error);

    // Handle QuotaExceededError
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      // Clear API history for old sessions to free space
      sessions.forEach(session => {
        if (session.id !== currentSessionId && session.apiChatHistory) {
          session.apiChatHistory = {};
        }
      });

      // Retry save
      try {
        localStorage.setItem('oneprompt-sessions', JSON.stringify(sessions));
      } catch (retryError) {
        logger.error('Still failed after cleanup:', retryError);
      }
    }
  }
}

/**
 * Load sessions from localStorage
 */
export function loadSessionsFromStorage() {
  try {
    const saved = localStorage.getItem('oneprompt-sessions');
    const savedCurrent = localStorage.getItem('oneprompt-current-session');
    const savedCounter = localStorage.getItem('oneprompt-session-counter');

    if (saved) {
      sessions = JSON.parse(saved);

      // Migrate old sessions: add sessionNumber if missing
      sessions.forEach((session, index) => {
        if (!session.sessionNumber) {
          session.sessionNumber = index + 1;
        }
      });
    }

    if (savedCurrent) {
      currentSessionId = savedCurrent;
    }

    if (savedCounter) {
      sessionCounter = parseInt(savedCounter, 10);
    }

    // Validate current session exists
    if (currentSessionId && !sessions.find(s => s.id === currentSessionId)) {
      currentSessionId = sessions[0]?.id || null;
    }

    return { sessions, currentSessionId, sessionCounter };
  } catch (error) {
    logger.error('Failed to load sessions from storage:', error);
    return { sessions: [], currentSessionId: null, sessionCounter: 0 };
  }
}

/**
 * Save selected AIs to localStorage
 */
export function saveSelectedAIs() {
  localStorage.setItem('oneprompt-configured-services', JSON.stringify(Array.from(configuredAIs)));
  localStorage.setItem('oneprompt-configured-api-services', JSON.stringify(Array.from(configuredApiAIs)));
}

/**
 * Toggle AI service enabled state
 */
export function toggleServiceEnabled(aiKey, mode = 'web') {
  const targetSet = mode === 'api' ? configuredApiAIs : configuredAIs;

  if (targetSet.has(aiKey)) {
    targetSet.delete(aiKey);
  } else {
    targetSet.add(aiKey);
  }

  saveSelectedAIs();
  return targetSet.has(aiKey);
}
