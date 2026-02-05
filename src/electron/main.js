const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');

// IMPORTANT: Set app name BEFORE any other requires that might use app.getPath()
// This determines the userData folder name in %APPDATA% (Windows) or ~/Library/Application Support/ (Mac)
app.setName('OnePrompt');

const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let mainWindow;

// Configure auto-updater (uses GitHub Releases directly)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-update event handlers
autoUpdater.on('update-available', (info) => {
  logger.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  logger.log('App is up to date');
});

autoUpdater.on('error', (err) => {
  logger.error('Auto-updater error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  logger.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  logger.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

// Configurazione delle AI supportate
const AI_CONFIGS = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: '🤖',
    logo: 'ai-services/chatgpt.png',
    color: '#10a37f'
  },
  perplexity: {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai',
    icon: '🔍',
    logo: 'ai-services/perplexity.png',
    color: '#20808d'
  },
  copilot: {
    name: 'Copilot',
    url: 'https://copilot.microsoft.com',
    icon: '💬',
    logo: 'ai-services/copilot.png',
    color: '#0078d4'
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai',
    icon: '🧠',
    logo: 'ai-services/claude.png',
    color: '#cc785c'
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: '✨',
    logo: 'ai-services/gemini.png',
    color: '#4285f4'
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: '🌊',
    logo: 'ai-services/deepseek.png',
    color: '#1e90ff'
  },
  grok: {
    name: 'Grok',
    url: 'https://x.com/i/grok',
    icon: '⚡',
    logo: 'ai-services/grok.png',
    color: '#ff6b00'
  }
};

function createMainWindow() {
  // Seleziona l'icona appropriata per la piattaforma
  // Note: assets/ is at project root, main.js is in src/electron/
  let iconPath;
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, '../../assets/logo/logo.icns');
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '../../assets/logo/logo.ico');
  } else {
    iconPath = path.join(__dirname, '../../assets/logo/logo.png');
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'OnePrompt',
    icon: iconPath,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#2d2d2d',
      symbolColor: '#ffffff',
      height: 38
    },
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // In development with Vite, load from dev server
  // In production, load from bundled files
  const isDev = !app.isPackaged || process.argv.includes('--dev');
  const useViteDevServer = isDev && process.env.VITE_DEV_SERVER_URL;
  const forceProd = process.argv.includes('--prod'); // Force loading from dist/renderer

  if (useViteDevServer && !forceProd) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    logger.log('Loading from Vite dev server');
  } else if (app.isPackaged || forceProd) {
    // Production: load from dist/renderer (dist/ is at project root)
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    logger.log('Loading from dist/renderer (production build)');
  } else {
    // Development without Vite: load source directly (index.html is in src/)
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  // DevTools: Open in dev mode, block keyboard shortcut in production
  if (!app.isPackaged || process.argv.includes('--dev')) {
    // Development: allow DevTools
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Production: block DevTools keyboard shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block Cmd+Option+I (Mac) and Ctrl+Shift+I (Windows/Linux)
      const isMac = process.platform === 'darwin';
      const isDevToolsShortcut = isMac
        ? (input.meta && input.alt && input.key.toLowerCase() === 'i')
        : (input.control && input.shift && input.key.toLowerCase() === 'i');

      // Also block F12
      const isF12 = input.key === 'F12';

      // Block Cmd+Option+J (Mac) / Ctrl+Shift+J (Windows) - JS Console
      const isConsoleShortcut = isMac
        ? (input.meta && input.alt && input.key.toLowerCase() === 'j')
        : (input.control && input.shift && input.key.toLowerCase() === 'j');

      if (isDevToolsShortcut || isF12 || isConsoleShortcut) {
        event.preventDefault();
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Enable context menu for all webContents (including webviews)
  app.on('web-contents-created', (event, contents) => {
    contents.on('context-menu', (e, params) => {
      const menuItems = [];
      
      // Add text selection options
      if (params.selectionText) {
        menuItems.push(
          { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
          { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }
        );
      }
      
      // Add paste option for editable fields
      if (params.isEditable) {
        menuItems.push(
          { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
          { label: 'Select All', role: 'selectAll', enabled: params.editFlags.canSelectAll }
        );
      }
      
      // Only show menu if there are items
      if (menuItems.length > 0) {
        // Add separator if we have both selection and editable options
        if (params.selectionText && params.isEditable && menuItems.length > 2) {
          menuItems.splice(2, 0, { type: 'separator' });
        }
        const menu = Menu.buildFromTemplate(menuItems);
        menu.popup();
      }
    });
  });

  // Handler IPC
  ipcMain.handle('get-ai-configs', () => {
    return AI_CONFIGS;
  });

  // Check for updates on app start (from GitHub Releases)
  if (!process.argv.includes('--dev')) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        logger.log('Update check failed (this is normal during development):', err.message);
      });
    }, 3000); // Wait 3 seconds after app starts
  }

  // Disable mDNS to prevent Windows Firewall popup
  app.commandLine.appendSwitch('disable-features', 'MediaRouter');

  ipcMain.handle('get-webview-preload-path', () => {
    return path.join(__dirname, 'webview-preload.js');
  });

  // Open external URL in default browser
  ipcMain.handle('open-external', async (event, url) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      logger.error('Blocked unsafe URL opening attempt:', url);
      return { success: false, error: 'Invalid protocol' };
    }

    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      logger.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  // Get App Version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Update handlers
  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
