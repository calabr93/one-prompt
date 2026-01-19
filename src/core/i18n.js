/**
 * Internationalization module
 *
 * Handles language detection, translation loading, and UI updates.
 *
 * @module @core/i18n
 */

// Logger alias
const logger = window.OnePromptLogger || console;

export let currentLanguage = null;
export let translations = {};

/**
 * Detect user's preferred language
 */
export function detectLanguage() {
  const stored = localStorage.getItem('oneprompt-language');
  if (stored) return stored;

  // Detect from browser/system language
  const navLang = navigator.language.split('-')[0];
  const supported = ['en', 'es', 'it', 'fr', 'de', 'pt', 'tr'];

  if (supported.includes(navLang)) {
    return navLang;
  }

  return null; // Return null to trigger language selection modal
}

/**
 * Set current language
 */
export function setCurrentLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('oneprompt-language', lang);
}

/**
 * Load translations for a specific language
 */
export async function loadTranslations(lang) {
  try {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
    translations[lang] = await response.json();
  } catch (error) {
    logger.error(`Error loading translations for ${lang}:`, error);
    // Fallback to empty object to prevent crashes
    translations[lang] = {};
  }
}

/**
 * Translate a key with optional parameters
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
 * Initialize i18n system
 */
export async function initI18n() {
  currentLanguage = detectLanguage();
  if (currentLanguage) {
    await loadTranslations(currentLanguage);
  }
  return currentLanguage;
}
