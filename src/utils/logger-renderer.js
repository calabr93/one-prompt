/**
 * Logger utility for renderer process - disables console output in production
 * In development: all logs are shown
 * In production: only errors are shown
 * 
 * This file works both as:
 * - A plain script (loaded via <script> tag) - exposes window.OnePromptLogger
 * - An ES6 module (imported via Vite) - exports { logger }
 */

// Will be set by main process via IPC
let isDevMode = true;

// Initialize from window.electronAPI if available
if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.isDevelopment === 'function') {
  window.electronAPI.isDevelopment().then(isDev => {
    isDevMode = isDev;
  }).catch(() => {
    // Fallback to true if check fails
    isDevMode = true;
  });
}

const logger = {
  log: (...args) => {
    if (isDevMode) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isDevMode) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // Always show errors, even in production
    console.error(...args);
  },
  info: (...args) => {
    if (isDevMode) {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (isDevMode) {
      console.debug(...args);
    }
  },
  // Allow manual setting of dev mode (useful for early initialization)
  setDevMode: (isDev) => {
    isDevMode = isDev;
  }
};

// Expose on window for backward compatibility (script tag usage)
if (typeof window !== 'undefined') {
  window.OnePromptLogger = logger;
}

// ES6 module export (for Vite bundled imports)
export { logger };
