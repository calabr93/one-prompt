const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme } = require('electron');

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
    url: 'https://grok.com',
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
      sandbox: true,
      webviewTag: true
    }
  });

  // In development with Vite, load from dev server
  // In production, load from bundled files
  // --dev only counts when running from source: a packaged app ignores it
  const isDev = !app.isPackaged;
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

  // DevTools: Open only in dev mode (production blocking handled globally in web-contents-created)
  if (!app.isPackaged && process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // The main window only shows the app: no navigation and no new windows
  // (links go through openExternal). Blocks forms, links or dropped files
  // that would load another page in the window that has electronAPI.
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // AI panels: only https pages, always with our preload, sandboxed and isolated,
  // whatever the page asks for in the <webview> attributes
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!params.src || !params.src.startsWith('https://')) {
      event.preventDefault();
      return;
    }
    delete webPreferences.preloadURL;
    webPreferences.preload = path.join(__dirname, 'webview-preload.js');
    webPreferences.sandbox = true;
    webPreferences.contextIsolation = true;
    webPreferences.nodeIntegration = false;
    webPreferences.webSecurity = true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  const isProduction = app.isPackaged;

  // Block DevTools globally in production (covers main window + all webviews)
  app.on('web-contents-created', (event, contents) => {
    if (isProduction) {
      contents.on('devtools-opened', () => {
        contents.closeDevTools();
      });
      contents.on('before-input-event', (evt, input) => {
        const isMac = process.platform === 'darwin';
        const isDevToolsShortcut = isMac
          ? (input.meta && input.alt && input.key.toLowerCase() === 'i')
          : (input.control && input.shift && input.key.toLowerCase() === 'i');
        const isF12 = input.key === 'F12';
        const isConsoleShortcut = isMac
          ? (input.meta && input.alt && input.key.toLowerCase() === 'j')
          : (input.control && input.shift && input.key.toLowerCase() === 'j');
        if (isDevToolsShortcut || isF12 || isConsoleShortcut) {
          evt.preventDefault();
        }
      });
    }

    // AI panels: Electron grants every permission when no handler is set.
    // Allow only what the AI sites need (copy, fullscreen, microphone for
    // dictation) and deny the rest: notifications, opening external apps,
    // camera, geolocation, clipboard reading...
    if (contents.getType() === 'webview') {
      const PANEL_PERMISSIONS = ['clipboard-sanitized-write', 'fullscreen'];
      contents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
        const mediaTypes = details.mediaTypes || [];
        const microphoneOnly = permission === 'media' && mediaTypes.length > 0 && mediaTypes.every(type => type === 'audio');
        callback(PANEL_PERMISSIONS.includes(permission) || microphoneOnly);
      });
      contents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) =>
        PANEL_PERMISSIONS.includes(permission) || (permission === 'media' && details.mediaType === 'audio'));

      // Panel popups: links opened in a new tab (e.g. sources cited in an
      // answer) go to the default browser. Popup windows (window.open with a
      // size) and sign-in pages stay in the app, titled with their address,
      // so logins with Google, Apple or Microsoft keep working.
      const LOGIN_HOSTS = ['accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'login.live.com', 'auth.openai.com', 'x.com', 'api.x.com'];
      const isLoginPage = (url) => {
        try {
          return LOGIN_HOSTS.includes(new URL(url).hostname);
        } catch {
          return false;
        }
      };
      contents.setWindowOpenHandler(({ url, disposition }) => {
        if (disposition === 'new-window' || isLoginPage(url)) {
          return { action: 'allow' };
        }
        if (url.startsWith('https://') || url.startsWith('http://')) {
          shell.openExternal(url);
        }
        return { action: 'deny' };
      });
      contents.on('did-create-window', (popup) => {
        const showAddress = () => {
          try {
            popup.setTitle(new URL(popup.webContents.getURL()).host);
          } catch {
            // about:blank or no URL yet: keep the current title
          }
        };
        popup.webContents.on('page-title-updated', (event) => {
          event.preventDefault();
          showAddress();
        });
        popup.webContents.on('did-navigate', showAddress);
      });
    }

    // Enable context menu for all webContents (including webviews)
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

  // Theme for the AI panels: websites on their "system" theme read it
  // through prefers-color-scheme, which follows the native theme
  ipcMain.handle('set-native-theme', (event, theme) => {
    if (['system', 'light', 'dark'].includes(theme)) {
      nativeTheme.themeSource = theme;
    }
    return nativeTheme.shouldUseDarkColors;
  });

  // Tell the renderer when the theme actually shown changes (OS appearance on 'system')
  nativeTheme.on('updated', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('native-theme-updated', nativeTheme.shouldUseDarkColors);
      }
    });
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
