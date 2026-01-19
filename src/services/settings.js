/**
 * Settings Service module
 *
 * Handles application settings persistence and retrieval.
 * This includes API keys (BYOK), model selection, and preferences.
 *
 * Private repositories can override this to:
 * - Remove BYOK settings (managed keys from backend)
 * - Add subscription/credit settings
 * - Add user profile settings
 *
 * @module @services/settings
 */

/**
 * Settings keys for localStorage
 */
export const SETTINGS_KEYS = {
  // API Keys (BYOK)
  API_OPENAI: 'oneprompt-api-openai',
  API_ANTHROPIC: 'oneprompt-api-anthropic',
  API_GEMINI: 'oneprompt-api-gemini',
  API_XAI: 'oneprompt-api-xai',

  // Selected Models
  MODEL_OPENAI: 'oneprompt-model-openai',
  MODEL_ANTHROPIC: 'oneprompt-model-anthropic',
  MODEL_GEMINI: 'oneprompt-model-gemini',
  MODEL_XAI: 'oneprompt-model-xai',

  // UI Preferences
  LANGUAGE: 'oneprompt-language',
  THEME: 'oneprompt-theme',
  DEFAULT_MODE: 'oneprompt-default-mode',

  // Services
  CONFIGURED_SERVICES: 'oneprompt-configured-services',
  CONFIGURED_API_SERVICES: 'oneprompt-configured-api-services',

  // Sessions
  SESSIONS: 'oneprompt-sessions',
  CURRENT_SESSION: 'oneprompt-current-session',
  SESSION_COUNTER: 'oneprompt-session-counter',

  // Cross-check
  CROSSCHECK_TEMPLATE: 'oneprompt-crosscheck-template'
};

/**
 * Get a setting value
 */
export function getSetting(key, defaultValue = null) {
  const value = localStorage.getItem(key);
  return value !== null ? value : defaultValue;
}

/**
 * Set a setting value
 */
export function setSetting(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

/**
 * Get JSON setting
 */
export function getJsonSetting(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Set JSON setting
 */
export function setJsonSetting(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Check if BYOK (Bring Your Own Key) is enabled
 * Returns true in open source version, false in private (managed keys)
 */
export function isBYOKEnabled() {
  return true; // Always true in open source
}

/**
 * Check if a specific API key is configured
 */
export function hasApiKey(aiKey) {
  const keyMap = {
    chatgpt: SETTINGS_KEYS.API_OPENAI,
    claude: SETTINGS_KEYS.API_ANTHROPIC,
    gemini: SETTINGS_KEYS.API_GEMINI,
    grok: SETTINGS_KEYS.API_XAI
  };

  const storageKey = keyMap[aiKey];
  if (!storageKey) return false;

  const value = localStorage.getItem(storageKey);
  return value !== null && value.length > 0;
}

/**
 * Get all API key settings
 */
export function getApiKeySettings() {
  return {
    openai: getSetting(SETTINGS_KEYS.API_OPENAI, ''),
    anthropic: getSetting(SETTINGS_KEYS.API_ANTHROPIC, ''),
    gemini: getSetting(SETTINGS_KEYS.API_GEMINI, ''),
    xai: getSetting(SETTINGS_KEYS.API_XAI, '')
  };
}

/**
 * Save API key
 */
export function saveApiKey(provider, key) {
  const keyMap = {
    openai: SETTINGS_KEYS.API_OPENAI,
    anthropic: SETTINGS_KEYS.API_ANTHROPIC,
    gemini: SETTINGS_KEYS.API_GEMINI,
    xai: SETTINGS_KEYS.API_XAI
  };

  const storageKey = keyMap[provider];
  if (storageKey) {
    setSetting(storageKey, key);
  }
}

/**
 * Get all model settings
 */
export function getModelSettings() {
  return {
    openai: getSetting(SETTINGS_KEYS.MODEL_OPENAI, 'gpt-4o'),
    anthropic: getSetting(SETTINGS_KEYS.MODEL_ANTHROPIC, 'claude-sonnet-4-5'),
    gemini: getSetting(SETTINGS_KEYS.MODEL_GEMINI, 'gemini-2.5-flash'),
    xai: getSetting(SETTINGS_KEYS.MODEL_XAI, 'grok-4-1-fast')
  };
}

/**
 * Save model selection
 */
export function saveModelSelection(provider, modelId) {
  const keyMap = {
    openai: SETTINGS_KEYS.MODEL_OPENAI,
    anthropic: SETTINGS_KEYS.MODEL_ANTHROPIC,
    gemini: SETTINGS_KEYS.MODEL_GEMINI,
    xai: SETTINGS_KEYS.MODEL_XAI
  };

  const storageKey = keyMap[provider];
  if (storageKey) {
    setSetting(storageKey, modelId);
  }
}

/**
 * Clear all settings (factory reset)
 */
export function clearAllSettings() {
  Object.values(SETTINGS_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Export settings for backup
 */
export function exportSettings() {
  const settings = {};
  Object.entries(SETTINGS_KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      settings[name] = value;
    }
  });
  return settings;
}

/**
 * Import settings from backup
 */
export function importSettings(settings) {
  Object.entries(settings).forEach(([name, value]) => {
    const key = SETTINGS_KEYS[name];
    if (key) {
      localStorage.setItem(key, value);
    }
  });
}
