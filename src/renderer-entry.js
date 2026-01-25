/**
 * OnePrompt Renderer Entry Point
 *
 * This is the main entry point for the renderer process when using Vite.
 * It imports all ES6 modules and exposes them on window for backward compatibility
 * with code that hasn't been migrated yet.
 *
 * As we migrate more code to ES6 modules, this file will shrink and eventually
 * the renderer.js code will be split into proper modules.
 */

// Import core modules (use relative paths for dev, Vite resolves aliases in build)
import * as i18n from './core/i18n.js';
import * as markdown from './core/markdown.js';
import * as theme from './core/theme.js';
import * as state from './core/state.js';
import * as sessions from './core/sessions.js';
import * as tabs from './core/tabs.js';
import * as aiServices from './core/ai-services.js';
import * as modeSelection from './core/mode-selection.js';
import * as layout from './core/layout.js';

// Import UI modules
import * as notifications from './ui/notifications.js';
import * as webviewFactory from './ui/webview-factory.js';
import * as sidebar from './ui/sidebar.js';
import * as servicesModal from './ui/services-modal.js';
import * as resizer from './ui/resizer.js';

// Import services
import * as aiApi from './services/ai-api.js';
import * as settings from './services/settings.js';

// ============================================================
// BACKWARD COMPATIBILITY LAYER
// Expose modules on window for code that hasn't been migrated
// ============================================================

// Create namespace objects
window.OnePromptCore = window.OnePromptCore || {};
window.OnePromptUI = window.OnePromptUI || {};
window.OnePromptServices = window.OnePromptServices || {};

// Expose core modules
window.OnePromptCore.markdown = markdown;
window.OnePromptCore.i18n = i18n;
window.OnePromptCore.theme = theme;
window.OnePromptCore.state = state;
window.OnePromptCore.sessions = sessions;
window.OnePromptCore.tabs = tabs;
window.OnePromptCore.aiServices = aiServices;
window.OnePromptCore.modeSelection = modeSelection;
window.OnePromptCore.layout = layout;

// Expose UI modules
window.OnePromptUI.notifications = notifications;
window.OnePromptUI.webviewFactory = webviewFactory;
window.OnePromptUI.sidebar = sidebar;
window.OnePromptUI.servicesModal = servicesModal;
window.OnePromptUI.resizer = resizer;

// Expose services
window.OnePromptServices.aiApi = aiApi;
window.OnePromptServices.settings = settings;

// Convenience aliases for most commonly used functions
window.t = i18n.t;
window.showNotification = notifications.showNotification;
window.renderMarkdown = markdown.renderMarkdown;
window.cleanAIResponseText = markdown.cleanAIResponseText;

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize theme immediately (before DOM content loaded)
// This prevents flash of wrong theme
const savedTheme = localStorage.getItem('oneprompt-theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

// Log that Vite entry point loaded
console.log('[OnePrompt] Vite entry point loaded, modules available on window');

// ============================================================
// IMPORT MAIN RENDERER CODE
// The renderer.js file will be gradually migrated to use imports
// For now, it still uses window.OnePromptCore etc.
// ============================================================

// Signal that modules are ready (for any code that needs to wait)
window.OnePromptModulesReady = true;
window.dispatchEvent(new CustomEvent('oneprompt-modules-ready'));

// CRITICAL: Use dynamic import to ensure window.OnePromptCore is set BEFORE renderer.js runs
// Static imports are hoisted and would execute renderer.js before our window assignments
import('./renderer.js').then(() => {
  console.log('[OnePrompt] renderer.js loaded successfully');
}).catch(err => {
  console.error('[OnePrompt] Failed to load renderer.js:', err);
});
