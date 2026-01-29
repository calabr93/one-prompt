/**
 * Sessions Management Module
 * Handles session creation, persistence, and API chat history
 */

import { logger } from '../utils/logger-renderer.js';

// Storage keys
const STORAGE_KEYS = {
  SESSIONS: 'oneprompt-sessions',
  CURRENT_SESSION: 'oneprompt-current-session',
  SESSION_COUNTER: 'oneprompt-session-counter',
  DEFAULT_MODE: 'oneprompt-default-mode'
};

// Default session configuration
const DEFAULT_CONFIG = {
  defaultServices: ['perplexity', 'copilot'],
  defaultMode: 'web',
  maxHistoryPerAI: 6 // Number of messages to keep when trimming
};

// Module state
let sessions = [];
let currentSessionId = null;
let sessionCounter = 0;

// Callback for after-save hook (allows Electron apps to sync to file)
let onAfterSave = null;

/**
 * Set a callback to be called after sessions are saved to localStorage
 * This allows Electron apps to sync to file storage
 * @param {Function} callback - Function to call after save
 */
export function setOnAfterSave(callback) {
  onAfterSave = callback;
}

/**
 * Create a new session object
 * @param {string|null} name - Session name (null = use default translated name)
 * @param {Set|null} selectedAIsSet - Set of selected AI keys
 * @param {string|null} mode - 'web' or 'api' or null
 * @returns {Object} New session object
 */
export function createSession(name = null, selectedAIsSet = null, mode = null) {
  sessionCounter++;
  
  // Calculate next session number
  const existingNumbers = sessions
    .map(s => s.sessionNumber || 0)
    .filter(n => n > 0);
  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;

  // Determine mode based on default settings if not provided
  let initialMode = mode;
  if (!initialMode) {
    const defaultMode = localStorage.getItem(STORAGE_KEYS.DEFAULT_MODE);
    if (defaultMode && defaultMode !== 'ask') {
      initialMode = defaultMode;
    }
  }

  return {
    id: `session-${Date.now()}-${sessionCounter}`,
    name: name || null,
    sessionNumber: nextNumber,
    selectedAIs: selectedAIsSet ? Array.from(selectedAIsSet) : [],
    mode: initialMode || null,
    chatUrls: {},
    apiChatHistory: {},
    promptDraft: '',
    createdAt: Date.now()
  };
}

/**
 * Get all sessions
 * @returns {Array} Array of session objects
 */
export function getSessions() {
  return sessions;
}

/**
 * Set sessions array (for external manipulation)
 * @param {Array} newSessions - New sessions array
 */
export function setSessions(newSessions) {
  sessions = newSessions;
}

/**
 * Get current session ID
 * @returns {string|null} Current session ID
 */
export function getCurrentSessionId() {
  return currentSessionId;
}

/**
 * Set current session ID
 * @param {string} sessionId - Session ID to set as current
 */
export function setCurrentSessionId(sessionId) {
  currentSessionId = sessionId;
}

/**
 * Get the current session object
 * @returns {Object|null} Current session or first session
 */
export function getCurrentSession() {
  return sessions.find(s => s.id === currentSessionId) || sessions[0];
}

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {Object|undefined} Session object
 */
export function getSessionById(sessionId) {
  return sessions.find(s => s.id === sessionId);
}

/**
 * Add a new session
 * @param {Object} session - Session object
 */
export function addSession(session) {
  sessions.push(session);
}

/**
 * Remove a session by ID
 * @param {string} sessionId - Session ID to remove
 * @returns {boolean} True if removed
 */
export function removeSession(sessionId) {
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get session counter
 * @returns {number} Session counter
 */
export function getSessionCounter() {
  return sessionCounter;
}

/**
 * Save sessions to localStorage
 * @param {Function} captureUrlsFn - Optional function to capture current URLs before saving
 */
export function saveSessionsToStorage(captureUrlsFn = null) {
  try {
    // Capture current URLs before saving if function provided
    if (captureUrlsFn && typeof captureUrlsFn === 'function') {
      captureUrlsFn();
    }

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, currentSessionId);
    localStorage.setItem(STORAGE_KEYS.SESSION_COUNTER, sessionCounter.toString());
    
    // Call after-save hook if registered (for Electron file sync)
    if (onAfterSave && typeof onAfterSave === 'function') {
      try {
        onAfterSave();
      } catch (hookError) {
        logger.error('onAfterSave hook failed:', hookError);
      }
    }
  } catch (error) {
    logger.error('Failed to save sessions to storage:', error);

    // Handle QuotaExceededError
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      logger.warn('Storage quota exceeded. Attempting to trim history...');

      const freed = trimAllApiHistory();

      if (freed) {
        try {
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
          logger.log('Sessions saved after trimming.');
        } catch (retryError) {
          logger.error('Still failed after trimming:', retryError);
        }
      }
    }
  }
}

/**
 * Load sessions from localStorage
 * @param {Object} options - Load options
 * @param {Array} options.defaultServices - Default services for first session
 * @param {string} options.defaultMode - Default mode for first session
 * @returns {Object} Loaded state { sessions, currentSessionId, sessionCounter }
 */
export function loadSessionsFromStorage(options = {}) {
  const defaultServices = options.defaultServices || DEFAULT_CONFIG.defaultServices;
  const defaultMode = options.defaultMode || DEFAULT_CONFIG.defaultMode;

  const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  if (storedSessions) {
    try {
      sessions = JSON.parse(storedSessions);
      currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      sessionCounter = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_COUNTER) || '0');
      logger.log('[loadSessionsFromStorage] Loaded sessions:', {
        count: sessions.length,
        currentSessionId,
        sessionCounter,
        sessionsWithApiHistory: sessions.filter(s => s.apiChatHistory && Object.keys(s.apiChatHistory).length > 0).length
      });
    } catch (error) {
      logger.error('[loadSessionsFromStorage] Failed to parse stored sessions:', error);
      sessions = [];
    }
  }

  // Initialize with default session if none exist
  if (sessions.length === 0) {
    const defaultSession = createSession(null, new Set(defaultServices), defaultMode);
    sessions.push(defaultSession);
    currentSessionId = defaultSession.id;
    saveSessionsToStorage();
  } else {
    // Ensure currentSessionId points to a valid session
    const validSession = sessions.find(s => s.id === currentSessionId);
    if (!validSession) {
      // currentSessionId is invalid or null, set to first session
      currentSessionId = sessions[0].id;
      logger.log('[loadSessionsFromStorage] Fixed invalid currentSessionId, now:', currentSessionId);
    }
  }

  // Add sessionNumber to existing sessions that don't have it
  sessions.forEach((session, index) => {
    if (!session.sessionNumber) {
      session.sessionNumber = index + 1;
    }
  });

  return { sessions, currentSessionId, sessionCounter };
}

/**
 * Trim API history for all sessions to prevent storage quota issues
 * @param {number} maxMessages - Maximum messages to keep per AI
 * @returns {boolean} True if any history was trimmed
 */
export function trimAllApiHistory(maxMessages = DEFAULT_CONFIG.maxHistoryPerAI) {
  let freed = false;
  
  sessions.forEach(session => {
    if (session.apiChatHistory) {
      Object.keys(session.apiChatHistory).forEach(aiKey => {
        const history = session.apiChatHistory[aiKey];
        if (history.length > maxMessages) {
          session.apiChatHistory[aiKey] = history.slice(-maxMessages);
          freed = true;
        }
      });
    }
  });
  
  return freed;
}

/**
 * Get API chat history for a specific AI in current session
 * @param {string} aiKey - AI key
 * @returns {Array} Chat history array
 */
export function getApiChatHistory(aiKey) {
  const session = getCurrentSession();
  if (!session || !session.apiChatHistory) return [];
  return session.apiChatHistory[aiKey] || [];
}

/**
 * Add message to API chat history
 * @param {string} aiKey - AI key
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 */
export function addApiChatMessage(aiKey, role, content) {
  const session = getCurrentSession();
  if (!session) return;
  
  if (!session.apiChatHistory) {
    session.apiChatHistory = {};
  }
  if (!session.apiChatHistory[aiKey]) {
    session.apiChatHistory[aiKey] = [];
  }
  
  session.apiChatHistory[aiKey].push({ role, content });
}

/**
 * Clear API chat history for a specific AI in current session
 * @param {string} aiKey - AI key
 */
export function clearApiChatHistory(aiKey) {
  const session = getCurrentSession();
  if (!session || !session.apiChatHistory) return;
  
  session.apiChatHistory[aiKey] = [];
}

/**
 * Clear all API chat history for current session
 */
export function clearAllApiChatHistory() {
  const session = getCurrentSession();
  if (!session) return;
  
  session.apiChatHistory = {};
}

/**
 * Update session chat URL
 * @param {string} aiKey - AI key
 * @param {string} url - Chat URL
 */
export function updateSessionChatUrl(aiKey, url) {
  const session = getCurrentSession();
  if (!session) return;
  
  if (!session.chatUrls) {
    session.chatUrls = {};
  }
  
  session.chatUrls[aiKey] = url;
}

/**
 * Get session chat URL
 * @param {string} aiKey - AI key
 * @returns {string|null} Chat URL
 */
export function getSessionChatUrl(aiKey) {
  const session = getCurrentSession();
  if (!session || !session.chatUrls) return null;
  
  return session.chatUrls[aiKey] || null;
}

/**
 * Update session prompt draft
 * @param {string} draft - Prompt draft content
 */
export function updatePromptDraft(draft) {
  const session = getCurrentSession();
  if (!session) return;
  
  session.promptDraft = draft;
}

/**
 * Get session prompt draft
 * @returns {string} Prompt draft
 */
export function getPromptDraft() {
  const session = getCurrentSession();
  return session?.promptDraft || '';
}

/**
 * Update session mode
 * @param {string} mode - 'web' or 'api'
 */
export function updateSessionMode(mode) {
  const session = getCurrentSession();
  if (!session) return;
  
  session.mode = mode;
}

/**
 * Get session mode
 * @returns {string|null} Session mode
 */
export function getSessionMode() {
  const session = getCurrentSession();
  return session?.mode || null;
}

/**
 * Update session selected AIs
 * @param {Array|Set} selectedAIs - Selected AI keys
 */
export function updateSelectedAIs(selectedAIs) {
  const session = getCurrentSession();
  if (!session) return;
  
  session.selectedAIs = Array.isArray(selectedAIs) 
    ? selectedAIs 
    : Array.from(selectedAIs);
}

/**
 * Get session selected AIs
 * @returns {Array} Selected AI keys
 */
export function getSelectedAIs() {
  const session = getCurrentSession();
  return session?.selectedAIs || [];
}

// Export storage keys for external use
export { STORAGE_KEYS, DEFAULT_CONFIG };
