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

  // Fallback to English
  return 'en';
}

/**
 * Check if the language has been explicitly confirmed by the user
 * @returns {boolean}
 */
export function isLanguageConfirmed() {
  return localStorage.getItem('oneprompt-language-confirmed') === 'true';
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
 * Set current language TEMPORARILY without persisting to localStorage
 * Used for previewing languages or setting initial system language before confirmation
 * @param {string} lang - Language code
 */
export function setCurrentLanguageTemporary(lang) {
  currentLanguage = lang;
  logger.log('[i18n] Temporary language set to:', lang);
}

/**
 * Confirm language selection - saves preference and marks as confirmed
 * @param {string} lang - Language code to confirm
 */
export function confirmLanguageSelection(lang) {
  currentLanguage = lang;
  localStorage.setItem('oneprompt-language', lang);
  localStorage.setItem('oneprompt-language-confirmed', 'true');
  logger.log('[i18n] Language confirmed and saved:', lang);
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
  setCurrentLanguageTemporary,
  isLanguageConfirmed,
  confirmLanguageSelection,
  hasTranslations,
  getTranslations,
  detectLanguage,
  loadTranslations,
  t,
  init
};
