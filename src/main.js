const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { PostHog } = require('posthog-node');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize PostHog
let posthog = null;
if (process.env.POSTHOG_API_KEY) {
  posthog = new PostHog(
    process.env.POSTHOG_API_KEY,
    { host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com' }
  );
}

let mainWindow;

// Configure auto-updater (uses GitHub Releases directly)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-update event handlers
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('App is up to date');
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
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
  },
  mistral: {
    name: 'Mistral',
    url: 'https://chat.mistral.ai',
    icon: '🌬️',
    logo: 'ai-services/mistral.png',
    color: '#ff6b35',
    comingSoon: true
  },
  phind: {
    name: 'Phind',
    url: 'https://www.phind.com',
    icon: '💻',
    logo: 'ai-services/phind.png',
    color: '#00d4aa',
    comingSoon: true
  },
  replit: {
    name: 'Replit',
    url: 'https://replit.com/ai',
    icon: '🔧',
    logo: 'ai-services/replit.png',
    color: '#f26207',
    comingSoon: true
  },
  bolt: {
    name: 'Bolt',
    url: 'https://bolt.new/',
    icon: '⚡',
    logo: 'ai-services/bolt.png',
    color: '#0ea5e9',
    comingSoon: true
  },
  lovable: {
    name: 'Lovable',
    url: 'https://lovable.dev/',
    icon: '💜',
    logo: 'ai-services/lovable.png',
    color: '#8b5cf6',
    comingSoon: true
  }
};

function createMainWindow() {
  // Seleziona l'icona appropriata per la piattaforma
  let iconPath;
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, '../assets/logo/logo.icns');
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '../assets/logo/logo.ico');
  } else {
    iconPath = path.join(__dirname, '../assets/logo/logo.png');
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Apri DevTools solo in modalità dev
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Lifecycle dell'app
app.whenReady().then(() => {
  // Handler IPC
  ipcMain.handle('get-ai-configs', () => {
    return AI_CONFIGS;
  });

  // Analytics handlers
  ipcMain.handle('update-analytics-consent', (event, allowed) => {
    if (allowed && posthog) {
      try {
        posthog.capture({
          distinctId: 'user_' + require('os').hostname(),
          event: 'app_opened',
          properties: {
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch
          }
        });
        posthog.flush();
      } catch (error) {
        console.error('PostHog tracking error:', error);
      }
    }
  });

  // Check for updates on app start (from GitHub Releases)
  if (!process.argv.includes('--dev')) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Update check failed (this is normal during development):', err.message);
      });
    }, 3000); // Wait 3 seconds after app starts
  }

  // Disable mDNS to prevent Windows Firewall popup
  app.commandLine.appendSwitch('disable-features', 'MediaRouter');

  ipcMain.handle('get-injection-rules', () => {
    const rulesPath = path.join(__dirname, 'injection-rules.json');
    try {
      const data = fs.readFileSync(rulesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Errore caricamento injection-rules.json:', error);
      return {};
    }
  });

  ipcMain.handle('send-prompt', async (event, aiKey, prompt) => {
    // In una implementazione reale, qui inietteremmo il codice nella webview
    // Ma le webview sono nel renderer process, quindi dobbiamo mandare un messaggio alla webview
    // Per ora ritorniamo successo
    return { success: true };
  });

  ipcMain.handle('open-ai-window', (event, aiKey) => {
    // Gestito lato renderer con le webview
    return { success: true };
  });

  ipcMain.handle('get-webview-preload-path', () => {
    return path.join(__dirname, 'webview-preload.js');
  });

  // Open external URL in default browser
  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if PostHog is configured
  ipcMain.handle('is-posthog-configured', () => {
    return !!posthog;
  });

  // Submit feedback
  ipcMain.handle('submit-feedback', async (event, feedback) => {
    if (!posthog) return { success: false, error: 'PostHog not configured' };

    try {
      posthog.capture({
        distinctId: 'user_' + require('os').hostname(),
        event: 'feedback_submitted',
        properties: {
          type: feedback.type,
          message: feedback.message,
          email: feedback.email,
          app_version: app.getVersion(),
          platform: process.platform
        }
      });
      await posthog.flush();
      return { success: true };
    } catch (error) {
      console.error('PostHog feedback error:', error);
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

app.on('before-quit', () => {
  if (posthog) {
    posthog.shutdown();
  }
});
