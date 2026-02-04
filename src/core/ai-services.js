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

