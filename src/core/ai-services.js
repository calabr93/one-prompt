/**
 * AI Services Configuration Module
 * Centralized configuration for AI services across all repos
 */

// ============================================================
// API MODE SERVICES
// Services available in API mode (direct API calls)
// ============================================================

/**
 * List of AI services that support API mode
 * Add/remove services here to update all repos at once
 */
export const API_SERVICES = ['chatgpt', 'gemini', 'claude'];

/**
 * Check if an AI service supports API mode
 * @param {string} aiKey - AI service key
 * @returns {boolean} True if service supports API mode
 */
export function isApiService(aiKey) {
  return API_SERVICES.includes(aiKey);
}

/**
 * Get all API services
 * @returns {string[]} Array of API service keys
 */
export function getApiServices() {
  return [...API_SERVICES];
}

// ============================================================
// WEB MODE SERVICES
// Services available in web mode (webview-based)
// Note: Full config is loaded from main.js via Electron IPC
// ============================================================

/**
 * Default services for new installations (web mode)
 */
export const DEFAULT_WEB_SERVICES = ['chatgpt', 'perplexity'];

/**
 * Default services for new installations (API mode)
 */
export const DEFAULT_API_SERVICES = ['chatgpt', 'gemini', 'claude'];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Filter AI configs based on mode and configured services
 * @param {Object} configs - AI configurations object
 * @param {string} mode - 'web' or 'api'
 * @param {Set} configuredAIs - Set of configured web mode services
 * @param {Set} configuredApiAIs - Set of configured API mode services
 * @returns {Array} Array of [key, config] pairs
 */
export function filterConfiguredServices(configs, mode, configuredAIs, configuredApiAIs) {
  return Object.entries(configs).filter(([key]) => {
    if (mode === 'api') {
      return configuredApiAIs.has(key) && API_SERVICES.includes(key);
    }
    return configuredAIs.has(key);
  });
}

/**
 * Check if a service should be shown in the current mode
 * @param {string} aiKey - AI service key
 * @param {string} mode - 'web' or 'api'
 * @returns {boolean} True if service should be shown
 */
export function shouldShowService(aiKey, mode) {
  if (mode === 'api') {
    return API_SERVICES.includes(aiKey);
  }
  return true; // In web mode, all services can be shown
}
