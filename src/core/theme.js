/**
 * OnePrompt Theme Module
 *
 * Handles dark/light theme switching and persistence.
 *
 * @module @core/theme
 */

// State
let currentTheme = localStorage.getItem('oneprompt-theme') || 'dark';

/**
 * Get current theme
 * @returns {string} 'dark' or 'light'
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Apply theme to the document
 * @param {string} theme - 'dark' or 'light'
 */
export function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem('oneprompt-theme', theme);

  // Update buttons state
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Initialize theme on startup
 */
export function init() {
  applyTheme(currentTheme);
}

/**
 * Toggle between dark and light theme
 * @returns {string} The new theme
 */
export function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}

// Export as default object for backward compatibility
export default {
  getCurrentTheme,
  applyTheme,
  init,
  toggleTheme
};
