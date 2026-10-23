/**
 * OnePrompt Theme Module
 *
 * Handles system/dark/light theme switching and persistence.
 * The chosen theme is also applied to the AI panels (webviews):
 * websites left on their "system" theme follow it.
 *
 * @module @core/theme
 */

const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// State: 'system', 'dark' or 'light'
let currentTheme = localStorage.getItem('oneprompt-theme') || 'system';

/**
 * Resolve a theme preference to the theme actually shown
 * @param {string} theme - 'system', 'dark' or 'light'
 * @returns {string} 'dark' or 'light'
 */
export function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  return darkScheme.matches ? 'dark' : 'light';
}

/**
 * Get current theme preference
 * @returns {string} 'system', 'dark' or 'light'
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Apply theme to the document and to the AI panels
 * @param {string} theme - 'system', 'dark' or 'light'
 */
export function applyTheme(theme) {
  document.body.setAttribute('data-theme', resolveTheme(theme));
  currentTheme = theme;
  localStorage.setItem('oneprompt-theme', theme);

  // Websites read the theme through prefers-color-scheme, which follows
  // Electron's native theme. The reply says whether it is dark now: on
  // 'system' that is the OS appearance.
  window.electronAPI?.setNativeTheme?.(theme).then(isDark => {
    if (currentTheme === theme) {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  });

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
  // Re-read: settings may have been restored to localStorage after import
  currentTheme = localStorage.getItem('oneprompt-theme') || 'system';
  applyTheme(currentTheme);

  // On 'system', follow OS appearance changes
  window.electronAPI?.onNativeThemeUpdated?.(isDark => {
    if (currentTheme === 'system') {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  });
}

/**
 * Toggle between dark and light theme
 * @returns {string} The new theme
 */
export function toggleTheme() {
  const newTheme = resolveTheme(currentTheme) === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}

// Export as default object for backward compatibility
export default {
  getCurrentTheme,
  resolveTheme,
  applyTheme,
  init,
  toggleTheme
};
