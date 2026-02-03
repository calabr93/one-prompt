const { contextBridge, ipcRenderer } = require('electron');

// Espone API sicure al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Ottieni la lista delle AI disponibili
  getAIConfigs: () => ipcRenderer.invoke('get-ai-configs'),

  // Ottieni path del preload per webview
  getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),

  // Apri URL esterno nel browser di default
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Get App Version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update events
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update')
});
