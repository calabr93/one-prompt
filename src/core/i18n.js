/**
 * OnePrompt i18n Module
 *
 * Internationalization - language detection, translation loading, and translation function.
 *
 * @module @core/i18n
 */

// Logger alias
const logger = window.OnePromptLogger || console;

// State
let currentLanguage = null;
const translations = {};

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'it', 'fr', 'de', 'pt', 'tr'];

// Language configuration for selection modal
export const LANGUAGE_CONFIG = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'tr', name: 'Türkçe' }
];

/**
 * Detect user's preferred language from localStorage or browser settings
 * @returns {string|null} Language code or null if not detected
 */
export function detectLanguage() {
  const stored = localStorage.getItem('oneprompt-language');
  if (stored) return stored;

  // Detect from browser/system language
  const navLang = navigator.language.split('-')[0];

  if (SUPPORTED_LANGUAGES.includes(navLang)) {
    return navLang;
  }

  return null; // Return null to trigger language selection modal
}

/**
 * Get current language
 * @returns {string|null} Current language code
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Set current language and persist to localStorage
 * @param {string} lang - Language code
 */
export function setCurrentLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('oneprompt-language', lang);
}

/**
 * Load translations for a specific language
 * @param {string} lang - Language code
 */
export async function loadTranslations(lang) {
  // Skip if already loaded
  if (translations[lang]) {
    return;
  }

  try {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
    translations[lang] = await response.json();
  } catch (error) {
    logger.error(`[i18n] Error loading translations for ${lang}:`, error);
    // Fallback to empty object to prevent crashes
    translations[lang] = {};
  }
}

/**
 * Check if translations are loaded for a language
 * @param {string} lang - Language code
 * @returns {boolean}
 */
export function hasTranslations(lang) {
  return !!translations[lang];
}

/**
 * Get all loaded translations for current language
 * @returns {Object}
 */
export function getTranslations() {
  return translations[currentLanguage] || {};
}

/**
 * Translate a key with optional parameters
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for placeholder replacement
 * @returns {string} Translated text or key if not found
 */
export function t(key, params = {}) {
  let text = (translations[currentLanguage] && translations[currentLanguage][key]) || key;

  // Replace placeholders like {service} with actual values
  Object.keys(params).forEach(paramKey => {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
  });

  return text;
}

/**
 * Initialize i18n system - detect language and load translations
 * @returns {Promise<string|null>} Current language code or null
 */
export async function init() {
  currentLanguage = detectLanguage();
  if (currentLanguage) {
    await loadTranslations(currentLanguage);
  }
  return currentLanguage;
}

// Export as default object for backward compatibility
export default {
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  getCurrentLanguage,
  setCurrentLanguage,
  hasTranslations,
  getTranslations,
  detectLanguage,
  loadTranslations,
  t,
  init
};
