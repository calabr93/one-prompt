/**
 * OnePrompt Theme Module
 * 
 * Handles dark/light theme switching and persistence.
 * Uses IIFE pattern to avoid global scope pollution.
 * 
 * Exposes: window.OnePromptCore.theme
 */
(function() {
  'use strict';

  // State
  let currentTheme = localStorage.getItem('oneprompt-theme') || 'dark';

  /**
   * Get current theme
   * @returns {string} 'dark' or 'light'
   */
  function getCurrentTheme() {
    return currentTheme;
  }

  /**
   * Apply theme to the document
   * @param {string} theme - 'dark' or 'light'
   */
  function applyTheme(theme) {
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
  function init() {
    applyTheme(currentTheme);
  }

  /**
   * Toggle between dark and light theme
   * @returns {string} The new theme
   */
  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    return newTheme;
  }

  // =====================================================
  // EXPOSE MODULE VIA GLOBAL OBJECT
  // =====================================================

  // Ensure namespace exists
  window.OnePromptCore = window.OnePromptCore || {};

  // Expose theme module
  window.OnePromptCore.theme = {
    getCurrentTheme,
    applyTheme,
    init,
    toggleTheme
  };

})();
