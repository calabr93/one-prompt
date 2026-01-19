/**
 * Theme management module
 *
 * Handles dark/light theme switching and persistence.
 *
 * @module @core/theme
 */

export let currentTheme = localStorage.getItem('oneprompt-theme') || 'dark';

/**
 * Apply theme to the document
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
export function initTheme() {
  applyTheme(currentTheme);
}

/**
 * Toggle between dark and light theme
 */
export function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}
