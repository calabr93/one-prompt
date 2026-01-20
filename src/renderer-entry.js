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

// Import UI modules
import * as notifications from './ui/notifications.js';

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

// Expose UI modules
window.OnePromptUI.notifications = notifications;

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

// Note: renderer.js is loaded separately in index.html for now
// Once fully migrated, we'll import it here:
// import './renderer.js';
