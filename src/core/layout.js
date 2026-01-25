/**
 * Layout Mode module for one-prompt
 * 
 * Manages the layout of the webview grid (horizontal, vertical, grid)
 * Can be imported in one-prompt-private and one-prompt-auto
 * 
 * @module @core/layout
 */

// Layout modes
const LAYOUT_MODES = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  GRID: 'grid'
};

// Default layout mode
const DEFAULT_LAYOUT_MODE = LAYOUT_MODES.HORIZONTAL;

// Storage key
const STORAGE_KEY = 'oneprompt-layout-mode';

/**
 * Get current layout mode from localStorage
 * @returns {string} Current layout mode
 */
function getLayoutMode() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LAYOUT_MODE;
}

/**
 * Set layout mode and save to localStorage
 * @param {string} mode - The layout mode to set
 */
function setLayoutMode(mode) {
  if (!Object.values(LAYOUT_MODES).includes(mode)) {
    console.warn(`[Layout] Invalid mode: ${mode}, using default`);
    mode = DEFAULT_LAYOUT_MODE;
  }
  localStorage.setItem(STORAGE_KEY, mode);
  applyLayoutMode(mode);

  // Reset resizer sizes when layout mode changes
  if (window.OnePromptUI && window.OnePromptUI.resizer) {
    window.OnePromptUI.resizer.onLayoutModeChange();
  }
}

/**
 * Apply layout mode to the webview grid
 * @param {string} mode - The layout mode to apply
 */
function applyLayoutMode(mode) {
  const webviewGrid = document.getElementById('webviewGrid');
  if (!webviewGrid) return;

  // Remove all layout classes
  webviewGrid.classList.remove('layout-horizontal', 'layout-vertical', 'layout-grid');
  
  // Add the appropriate class
  webviewGrid.classList.add(`layout-${mode}`);
}

/**
 * Initialize layout mode on startup
 */
function initLayoutMode() {
  const mode = getLayoutMode();
  applyLayoutMode(mode);
  
  // Setup the settings UI if it exists
  setupSettingsUI();
}

/**
 * Setup the layout mode settings UI
 */
function setupSettingsUI() {
  const radioButtons = document.querySelectorAll('input[name="layoutMode"]');
  if (radioButtons.length === 0) return;

  const currentMode = getLayoutMode();
  
  // Set the current value
  radioButtons.forEach(radio => {
    if (radio.value === currentMode) {
      radio.checked = true;
    }
    
    // Add change listener
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        setLayoutMode(e.target.value);
      }
    });
  });
}

// Export for module usage
if (typeof window !== 'undefined') {
  window.OnePromptCore = window.OnePromptCore || {};
  window.OnePromptCore.layout = {
    LAYOUT_MODES,
    getLayoutMode,
    setLayoutMode,
    applyLayoutMode,
    initLayoutMode,
    setupSettingsUI
  };
}

export {
  LAYOUT_MODES,
  getLayoutMode,
  setLayoutMode,
  applyLayoutMode,
  initLayoutMode,
  setupSettingsUI
};
