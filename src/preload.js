const { contextBridge, ipcRenderer } = require('electron');

// Espone API sicure al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Ottieni la lista delle AI disponibili
  getAIConfigs: () => ipcRenderer.invoke('get-ai-configs'),

  // Invia prompt a una AI
  sendPromptToAI: (aiKey, prompt) => ipcRenderer.invoke('send-prompt', aiKey, prompt),

  // Apri finestra AI (placeholder per future implementazioni)
  openAIWindow: (aiKey) => ipcRenderer.invoke('open-ai-window', aiKey),

  // Ottieni path del preload per webview
  getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),

  // Apri URL esterno nel browser di default
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Update analytics consent
  updateAnalyticsConsent: (allowed) => ipcRenderer.invoke('update-analytics-consent', allowed)
});
