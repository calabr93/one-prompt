/**
 * Logger utility - disables console output in production
 * In development: all logs are shown
 * In production: only errors are shown
 */

const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

// For Electron main process, we also check app.isPackaged
let isElectronDev = isDev;
try {
  const { app } = require('electron');
  isElectronDev = !app.isPackaged || (process.argv && process.argv.includes('--dev'));
} catch (e) {
  // Not in Electron main process, use isDev
}

const logger = {
  log: (...args) => {
    if (isElectronDev) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isElectronDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // Always show errors, even in production
    console.error(...args);
  },
  info: (...args) => {
    if (isElectronDev) {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (isElectronDev) {
      console.debug(...args);
    }
  }
};

module.exports = logger;
