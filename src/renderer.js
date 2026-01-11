// State management
let aiConfigs = {};
let injectionRules = {};
let loadedWebviews = new Set();
let webviewInstances = {}; // Map sessionId → { aiKey → webview element }
// Default to ChatGPT and Perplexity for fresh installations
let configuredAIs = new Set(JSON.parse(localStorage.getItem('oneprompt-configured-services') || '["chatgpt", "perplexity"]'));
// Default to ChatGPT, Gemini, Claude, and Grok for API mode
let configuredApiAIs = new Set(JSON.parse(localStorage.getItem('oneprompt-configured-api-services') || '["chatgpt", "gemini", "claude", "grok"]'));

// API History limit (sliding window: 6 user/assistant exchanges = 12 messages)
const API_HISTORY_LIMIT = 12;

// Cross-Check mode state
let crossCheckEnabled = false;

// Default Cross-Check prompt template
const DEFAULT_CROSS_CHECK_TEMPLATE = `You are participating in a cross-validation exercise. Your task is to critically analyze responses from other AI assistants and provide your honest assessment.

## Original User Request:
{{ORIGINAL_PROMPT}}

## Responses from Other AI Assistants:
{{OTHER_RESPONSES}}

## Your Task:
1. **Initial Assessment**: Briefly summarize what each AI responded and their main approach
2. **Critical Analysis**:
   - Identify strengths and weaknesses in each response
   - Point out any factual errors, inconsistencies, or missing information
   - Note where you agree or disagree with their conclusions
3. **Synthesis**: Provide your own improved answer that:
   - Incorporates the best elements from all responses
   - Corrects any errors you identified
   - Adds any important points that were missed
4. **Final Verdict**: Give a brief conclusion on which response was most helpful and why

Be honest, objective, and constructive. Don't be defensive - acknowledge if another AI provided a better answer than you would have.

**IMPORTANT: Respond in the same language as the original user request above.**`;

// Get cross-check template from localStorage or use default
function getCrossCheckTemplate() {
  return localStorage.getItem('oneprompt-crosscheck-template') || DEFAULT_CROSS_CHECK_TEMPLATE;
}

// AI display names for cross-check prompts
const AI_DISPLAY_NAMES = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok'
};

// Cross-Check prompt builder
function buildCrossCheckPrompt(originalPrompt, otherResponses) {
  const responsesSection = otherResponses
    .map(r => `### ${r.aiName}'s Response:\n${r.response}`)
    .join('\n\n');

  const template = getCrossCheckTemplate();

  return template
    .replace('{{ORIGINAL_PROMPT}}', originalPrompt)
    .replace('{{OTHER_RESPONSES}}', responsesSection);
}

// i18n - Internazionalizzazione
let currentLanguage = localStorage.getItem('oneprompt-language') || 'it';
let translations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
    translations[lang] = await response.json();
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    // Fallback to empty object to prevent crashes
    translations[lang] = {};
  }
}

function t(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) || key;
}

async function updateUILanguage() {
  // Ensure translations are loaded
  if (!translations[currentLanguage]) {
    await loadTranslations(currentLanguage);
  }

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update placeholder
  const promptInput = document.getElementById('promptInput');
  if (promptInput) {
    promptInput.placeholder = t('prompt.placeholder');
  }

  // Update placeholders with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // Update button titles
  const addServiceBtn = document.getElementById('addServiceBtn');
  if (addServiceBtn) addServiceBtn.title = t('sidebar.addService');

  const newSessionBtn = document.getElementById('newSessionBtn');
  if (newSessionBtn) newSessionBtn.title = t('sidebar.newSession');

  const reportBugBtn = document.getElementById('reportBugBtn');
  if (reportBugBtn) reportBugBtn.title = t('sidebar.reportBug');

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.title = t('sidebar.settings');

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.title = t('send');

  // Re-render placeholder if visible
  const placeholder = document.querySelector('.webview-placeholder');
  if (placeholder && placeholder.style.display !== 'none') {
    renderWebviews();
  }

  // Re-render coming soon badges
  renderServicesGrid();

  // Re-render tabs to update "Sessione X" / "Session X" translations
  renderTabs();
}

// Theme management
let currentTheme = localStorage.getItem('oneprompt-theme') || 'dark';

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem('oneprompt-theme', theme);
  
  // Update buttons state
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Apply theme on startup
applyTheme(currentTheme);

// Session/Tab management
let sessions = [];
let currentSessionId = null;
let sessionCounter = 0;

// Helper functions for sessions
function createNewSession(name = null, selectedAIsSet = null, mode = null) {
  sessionCounter++;

  // Calcola il numero di sessione più basso disponibile (gap finding)
  const usedNumbers = new Set(sessions.map(s => s.sessionNumber).filter(n => typeof n === 'number'));
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  // Determine mode based on default settings if not provided
  let initialMode = mode;
  if (!initialMode) {
      const defaultMode = localStorage.getItem('oneprompt-default-mode');
      if (defaultMode && defaultMode !== 'ask') {
          initialMode = defaultMode;
      }
  }

  return {
    id: `session-${Date.now()}-${sessionCounter}`,
    name: name || null, // null significa usa il nome di default tradotto
    sessionNumber: nextNumber, // Usa il numero calcolato
    selectedAIs: selectedAIsSet ? Array.from(selectedAIsSet) : [],
    mode: initialMode || null, // 'injection' or 'api' or null
    chatUrls: {}, // Mappa aiKey -> URL della conversazione
    apiChatHistory: {}, // Mappa aiKey -> Array di {role, content} per API mode
    createdAt: Date.now()
  };
}

function getCurrentSession() {
  return sessions.find(s => s.id === currentSessionId) || sessions[0];
}

function getSessionWebviews(sessionId) {
  if (!webviewInstances[sessionId]) {
    webviewInstances[sessionId] = {};
  }
  return webviewInstances[sessionId];
}

function getCurrentSessionWebviews() {
  return getSessionWebviews(currentSessionId);
}

function captureCurrentUrls() {
  const currentSession = getCurrentSession();
  if (!currentSession) return;

  // Inizializza chatUrls se non esiste (per sessioni vecchie)
  if (!currentSession.chatUrls) {
    currentSession.chatUrls = {};
  }

  // Cattura l'URL corrente di ogni webview della sessione corrente
  const sessionWebviews = getCurrentSessionWebviews();
  Object.keys(sessionWebviews).forEach(aiKey => {
    const webview = sessionWebviews[aiKey];
    if (webview) {
      try {
        // Usa getURL() se disponibile per ottenere l'URL corrente reale (navigazione utente)
        // altrimenti fallback su src
        const url = (typeof webview.getURL === 'function') ? webview.getURL() : webview.src;
        if (url) {
          currentSession.chatUrls[aiKey] = url;
        }
      } catch (e) {
        console.error(`Errore cattura URL per ${aiKey}:`, e);
      }
    }
  });
}

function saveSessionsToStorage() {
  // Cattura gli URL correnti prima di salvare
  captureCurrentUrls();

  localStorage.setItem('oneprompt-sessions', JSON.stringify(sessions));
  localStorage.setItem('oneprompt-current-session', currentSessionId);
  localStorage.setItem('oneprompt-session-counter', sessionCounter.toString());
}

function loadSessionsFromStorage() {
  const storedSessions = localStorage.getItem('oneprompt-sessions');
  if (storedSessions) {
    sessions = JSON.parse(storedSessions);
    currentSessionId = localStorage.getItem('oneprompt-current-session');
    sessionCounter = parseInt(localStorage.getItem('oneprompt-session-counter') || '0');
  }

  // Inizializza con una sessione di default se non esistono sessioni
  if (sessions.length === 0) {
    // Default services for first run
    const defaultServices = new Set(['chatgpt', 'perplexity']);
    const defaultSession = createNewSession(null, defaultServices, 'injection');
    sessions.push(defaultSession);
    currentSessionId = defaultSession.id;
    saveSessionsToStorage();
  }

  // Aggiungi sessionNumber alle sessioni esistenti che non ce l'hanno
  sessions.forEach((session, index) => {
    if (!session.sessionNumber) {
      session.sessionNumber = index + 1;
    }
  });
}

// Carica le sessioni all'avvio
loadSessionsFromStorage();

// Carica le AI selezionate dalla sessione corrente
let selectedAIs = new Set(getCurrentSession()?.selectedAIs || []);

// DOM elements
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const webviewGrid = document.getElementById('webviewGrid');
const sidebarNav = document.getElementById('sidebarNav');
const tabBar = document.getElementById('tabBar');
const tabList = document.getElementById('tabList');
const newSessionBtn = document.getElementById('newSessionBtn');
const addServiceBtn = document.getElementById('addServiceBtn');
const servicesModal = document.getElementById('servicesModal');
const closeServicesModal = document.getElementById('closeServicesModal');
const servicesGrid = document.getElementById('servicesGrid');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const languageSelect = document.getElementById('languageSelect');
const reportBugBtn = document.getElementById('reportBugBtn');

// Initialize app
async function init() {
  console.log('=== INIT STARTED ===');

  try {
    // Carica le configurazioni delle AI
    aiConfigs = await window.electronAPI.getAIConfigs();
    console.log('AI Configs:', aiConfigs);

    // Rimuovi servizi "coming soon" da configuredAIs se presenti
    const comingSoonServices = Object.entries(aiConfigs)
      .filter(([_, config]) => config.comingSoon)
      .map(([key, _]) => key);

    comingSoonServices.forEach(aiKey => {
      if (configuredAIs.has(aiKey)) {
        configuredAIs.delete(aiKey);
        console.log(`[OnePrompt] Removed coming-soon service from configured: ${aiKey}`);
      }
    });
    localStorage.setItem('oneprompt-configured-services', JSON.stringify([...configuredAIs]));

    // Carica le injection rules
    injectionRules = await loadInjectionRules();
    console.log('Injection Rules:', injectionRules);

    // Renderizza le tab
    renderTabs();
    console.log('Tabs rendered');

    // Crea i pulsanti sidebar per ogni AI
    renderSidebar();
    console.log('Sidebar rendered');

    // Renderizza le webview iniziali (solo quelle selezionate)
    renderWebviews();
    console.log('Webviews rendered');

    // Imposta la lingua iniziale
    languageSelect.value = currentLanguage;
    await loadTranslations(currentLanguage);
    updateUILanguage();

    // Setup event listeners
    setupEventListeners();
    setupScrollListeners();
    setupUpdateHandlers();

    // Update cross-check button visibility
    updateCrossCheckButtonVisibility();

    // Set version in settings
    const version = await window.electronAPI.getAppVersion();
    const versionEl = document.getElementById('appVersion');
    if (versionEl) {
      versionEl.textContent = `v${version}`;
    }

    console.log('=== INIT COMPLETED ===');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione:', error);
  }
}

// Carica injection rules da file JSON
async function loadInjectionRules() {
  try {
    const response = await fetch('./injection-rules.json');
    return await response.json();
  } catch (error) {
    console.error('Errore caricamento injection-rules.json:', error);
    return {};
  }
}

// Salva le AI selezionate nella sessione corrente
function saveSelectedAIs() {
  const session = getCurrentSession();
  if (session) {
    session.selectedAIs = Array.from(selectedAIs);
    saveSessionsToStorage();
  }
}

// Render tabs
function renderTabs() {
  tabList.innerHTML = '';

  // Mostra sempre la tab bar (stile Chrome)
  tabBar.style.display = 'flex';

  sessions.forEach(session => {
    const tab = createTabElement(session);
    tabList.appendChild(tab);
  });

  // Aggiungi il pulsante + dopo l'ultima tab
  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'new-tab-btn';
  newTabBtn.title = 'Nuova tab';
  newTabBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  newTabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createNewSessionAndSwitch();
  });
  tabList.appendChild(newTabBtn);
}

// Crea elemento tab
function createTabElement(session) {
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.sessionId = session.id;

  if (session.id === currentSessionId) {
    tab.classList.add('active');
  }

  const tabName = document.createElement('div');
  tabName.className = 'tab-name';
  // Se name è null o vuoto, usa il nome tradotto con il numero
  tabName.textContent = session.name || `${t('session.default')} ${session.sessionNumber || '1'}`;

  const tabClose = document.createElement('div');
  tabClose.className = 'tab-close';
  tabClose.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  tab.appendChild(tabName);
  tab.appendChild(tabClose);

  // Drag & Drop support
  tab.draggable = true;

  tab.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', session.id);
    e.dataTransfer.effectAllowed = 'move';
    tab.classList.add('dragging');
  });

  tab.addEventListener('dragend', () => {
    tab.classList.remove('dragging');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
  });

  tab.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    
    // Only add class if we are not over the dragged element itself
    if (!tab.classList.contains('dragging')) {
      tab.classList.add('drag-over');
    }
  });

  tab.addEventListener('dragleave', () => {
    tab.classList.remove('drag-over');
  });

  tab.addEventListener('drop', (e) => {
    e.preventDefault();
    tab.classList.remove('drag-over');
    
    const draggedSessionId = e.dataTransfer.getData('text/plain');
    if (draggedSessionId === session.id) return;

    const draggedIndex = sessions.findIndex(s => s.id === draggedSessionId);
    const targetIndex = sessions.findIndex(s => s.id === session.id);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Move the session in the array
      const [draggedSession] = sessions.splice(draggedIndex, 1);
      sessions.splice(targetIndex, 0, draggedSession);
      
      saveSessionsToStorage();
      renderTabs();
    }
  });

  // Click sulla tab per switchare
  tab.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close') && !tabName.isContentEditable) {
      switchToSession(session.id);
    }
  });

  // Click sul nome per rinominare
  tabName.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startRenameTab(tabName, session);
  });

  // Click su X per chiudere
  tabClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSession(session.id);
  });

  return tab;
}

// Inizia rinomina tab
function startRenameTab(tabNameElement, session) {
  const currentName = session.name;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tab-name-input';
  input.value = currentName;

  tabNameElement.replaceWith(input);
  input.focus();
  input.select();

  function finishRename() {
    const newName = input.value.trim() || currentName;
    session.name = newName;
    saveSessionsToStorage();

    const newTabName = document.createElement('div');
    newTabName.className = 'tab-name';
    newTabName.textContent = newName;

    newTabName.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startRenameTab(newTabName, session);
    });

    input.replaceWith(newTabName);
  }

  input.addEventListener('blur', finishRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur();
    } else if (e.key === 'Escape') {
      input.value = currentName;
      input.blur();
    }
  });
}

// Switch a una sessione diversa
function switchToSession(sessionId) {
  if (sessionId === currentSessionId) return;

  // Salva lo stato della sessione corrente PRIMA di cambiare
  saveSessionsToStorage();

  currentSessionId = sessionId;
  const session = getCurrentSession();

  // Aggiorna selectedAIs con le AI della nuova sessione
  selectedAIs = new Set(session.selectedAIs);

  saveSessionsToStorage();

  // Re-render tutto
  renderTabs();
  renderSidebar();
  renderWebviews();
  updateSendButton();
  updateCrossCheckButtonVisibility();
}

// Aggiorna lo stato della sidebar in base alla sessione corrente
function updateSidebarState() {
  // Aggiorna quali bottoni AI sono attivi
  const allButtons = document.querySelectorAll('.sidebar-item[data-ai-key]');
  allButtons.forEach(button => {
    const aiKey = button.dataset.aiKey;
    if (selectedAIs.has(aiKey)) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Chiudi sessione
function closeSession(sessionId) {
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  sessions.splice(sessionIndex, 1);

  // Se abbiamo chiuso tutte le sessioni, crea una nuova sessione vuota (stile Chrome)
  if (sessions.length === 0) {
    const newSession = createNewSession(null, new Set([]));
    sessions.push(newSession);
    currentSessionId = newSession.id;
    selectedAIs = new Set(newSession.selectedAIs);
  } else if (sessionId === currentSessionId) {
    // Se abbiamo chiuso la sessione corrente, passa a un'altra
    // Prendi la sessione precedente o la prima disponibile
    const newIndex = Math.max(0, sessionIndex - 1);
    currentSessionId = sessions[newIndex].id;
    selectedAIs = new Set(sessions[newIndex].selectedAIs);
  }

  saveSessionsToStorage();

  // Re-render tutto
  renderTabs();
  renderSidebar();
  renderWebviews();
  updateSendButton();
}

// Crea nuova sessione
function createNewSessionAndSwitch() {
  // Salva lo stato della sessione corrente PRIMA di cambiare
  saveSessionsToStorage();

  // Crea nuova sessione vuota (senza servizi preselezionati)
  const newSession = createNewSession(null, new Set([]));

  sessions.push(newSession);
  currentSessionId = newSession.id;
  selectedAIs = new Set(newSession.selectedAIs);

  saveSessionsToStorage();

  // Re-render tutto
  renderTabs();
  renderSidebar();
  renderWebviews();
  updateSendButton();
}

// === MODALE SERVIZI ===

// Apri modale servizi
function openServicesModal() {
  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : 'injection';
  
  const modalTitle = document.querySelector('#servicesModal h2');
  if (mode === 'api') {
      modalTitle.textContent = t('services.title.api') || 'Servizi disponibili (API)';
  } else {
      modalTitle.textContent = t('services.title') || 'Servizi disponibili';
  }

  renderServicesGrid(mode);
  servicesModal.style.display = 'flex';
}

// Chiudi modale servizi
function closeServicesModalFn() {
  servicesModal.style.display = 'none';
}

// Apri modale impostazioni
function openSettingsModal() {
  settingsModal.style.display = 'flex';
}

// Chiudi modale impostazioni
function closeSettingsModalFn() {
  settingsModal.style.display = 'none';
}

// Render griglia servizi
function renderServicesGrid(mode = 'injection') {
  servicesGrid.innerHTML = '';
  const apiServices = ['chatgpt', 'gemini', 'claude', 'grok'];

  Object.entries(aiConfigs).forEach(([aiKey, config]) => {
    if (mode === 'api' && !apiServices.includes(aiKey)) {
        return;
    }
    const card = createServiceCard(aiKey, config, mode);
    servicesGrid.appendChild(card);
  });
}

// Crea card servizio
function createServiceCard(aiKey, config, mode = 'injection') {
  const card = document.createElement('div');
  card.className = 'service-card';
  card.dataset.aiKey = aiKey;

  let isConfigured = false;
  if (mode === 'api') {
      if (configuredApiAIs.has(aiKey)) isConfigured = true;
  } else {
      if (configuredAIs.has(aiKey)) isConfigured = true;
  }

  // Aggiungi classe 'coming-soon' se il servizio non è ancora disponibile
  if (config.comingSoon) {
    card.classList.add('coming-soon');
  } else if (isConfigured) {
    // Aggiungi classe 'enabled' se il servizio è abilitato
    card.classList.add('enabled');
  }

  const icon = document.createElement('div');
  icon.className = 'service-icon';

  if (config.logo) {
    icon.innerHTML = `<img src="../assets/${config.logo}" alt="${config.name}">`;
  } else {
    icon.textContent = config.icon;
  }

  const name = document.createElement('div');
  name.className = 'service-name';
  name.textContent = config.name;

  card.appendChild(icon);
  card.appendChild(name);

  // Aggiungi badge "Prossimamente" se coming soon
  if (config.comingSoon) {
    const badge = document.createElement('div');
    badge.className = 'coming-soon-badge';
    badge.textContent = t('comingSoon');
    card.appendChild(badge);
  }

  // Click sul card per abilitare/disabilitare (solo se non è coming soon)
  if (!config.comingSoon) {
    card.addEventListener('click', () => {
      toggleServiceEnabled(aiKey, card, mode);
    });
  }

  return card;
}

// Toggle servizio abilitato/disabilitato
function toggleServiceEnabled(aiKey, cardElement, mode = 'injection') {
  let targetSet = mode === 'api' ? configuredApiAIs : configuredAIs;
  const storageKey = mode === 'api' ? 'oneprompt-configured-api-services' : 'oneprompt-configured-services';

  if (targetSet.has(aiKey)) {
    // Disabilita servizio
    targetSet.delete(aiKey);
    cardElement.classList.remove('enabled');
    localStorage.setItem(storageKey, JSON.stringify([...targetSet]));

    // Se il servizio è anche selezionato nella sessione corrente, rimuovilo
    if (selectedAIs.has(aiKey)) {
      selectedAIs.delete(aiKey);
      saveSelectedAIs();
      updateSidebarState();
      renderWebviews();
      updateSendButton();
    }

    // Re-render sidebar per rimuovere lo status
    renderSidebar();
  } else {
    // Abilita servizio e apri URL
    targetSet.add(aiKey);
    cardElement.classList.add('enabled');
    localStorage.setItem(storageKey, JSON.stringify([...targetSet]));

    // Re-render sidebar per aggiungere lo status
    renderSidebar();

    // Chiudi modale
    closeServicesModalFn();

    // Crea/mostra webview per questo servizio
    // Prima aggiungi alla selezione se non c'è già
    if (!selectedAIs.has(aiKey)) {
      selectedAIs.add(aiKey);
      saveSelectedAIs();
      updateSidebarState();
      renderWebviews();
      updateSendButton();
    }
  }
}

// Toggle AI selection
function toggleAISelection(aiKey) {
  if (selectedAIs.has(aiKey)) {
    selectedAIs.delete(aiKey);
  } else {
    selectedAIs.add(aiKey);
  }

  // Salva lo stato
  saveSelectedAIs();

  // Update sidebar button state
  updateSidebarButtonState(aiKey);

  // Re-render webviews
  renderWebviews();

  // Update send button
  updateSendButton();

  // Update cross-check button visibility
  updateCrossCheckButtonVisibility();
}

// Render webviews (solo quelle selezionate)
async function renderWebviews() {
  // Reset classe grid
  webviewGrid.className = 'webview-grid';
  
  // Check session mode
  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : null;

  if (selectedAIs.size === 0) {
    // Nascondi tutte le webview di tutte le sessioni
    Object.keys(webviewInstances).forEach(sessionId => {
      const sessionWebviews = webviewInstances[sessionId];
      Object.keys(sessionWebviews).forEach(aiKey => {
        const wrapper = document.querySelector(`.webview-wrapper[data-session-id="${sessionId}"][data-ai-key="${aiKey}"]`);
        if (wrapper) {
          wrapper.style.display = 'none';
        }
      });
    });

    // Mostra placeholder
    let placeholder = document.querySelector('.webview-placeholder');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'webview-placeholder';
      webviewGrid.appendChild(placeholder);
    }

    // Logic moved to createNewSession to avoid changing mode of existing sessions
    // when settings change.
    
    // Default to Injection if no mode is set and no default preference
    // This is a fallback for very old sessions or edge cases
    const defaultMode = localStorage.getItem('oneprompt-default-mode');
    if (!mode && !defaultMode) {
        if (currentSession) {
            currentSession.mode = 'injection';
            saveSessionsToStorage();
            renderWebviews();
            return;
        }
    }
    if (!mode && !defaultMode) {
        if (currentSession) {
            currentSession.mode = 'injection';
            saveSessionsToStorage();
            renderWebviews();
            return;
        }
    }

    if (!mode) {
        // Show Mode Selection Screen
        placeholder.innerHTML = `
            <div class="mode-selection-container">
                <div class="mode-cards">
                    <div class="mode-card" onclick="selectMode('injection')">
                        <div class="mode-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </div>
                        <div class="mode-title">${t('mode.injection.title')}</div>
                        <div class="mode-desc">${t('mode.injection.desc')}</div>
                    </div>
                    <div class="mode-card" onclick="selectMode('api')">
                        <div class="mode-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                        </div>
                        <div class="mode-title">${t('mode.api.title')}</div>
                        <div class="mode-desc">${t('mode.api.desc')}</div>
                    </div>
                </div>
                <div class="mode-remember">
                    <label class="toggle-switch">
                        <input type="checkbox" id="rememberModeToggle">
                        <span class="toggle-slider"></span>
                    </label>
                    <span>${t('mode.remember')}</span>
                </div>
            </div>
        `;
    } else if (mode === 'api') {
         // API Mode Placeholder
         placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="5 5"></rect>
                    <path d="M12 8v8M8 12h8" stroke-dasharray="none"></path>
                  </svg>
                </div>
                <h3 class="placeholder-title">${t('placeholder.title')}</h3>
                <p style="color: var(--text-secondary); margin-top: 10px;">${t('placeholder.subtitle')}</p>
            </div>
         `;
    } else {
        // Injection Mode (Default Placeholder)
        placeholder.innerHTML = `
          <div class="placeholder-content">
            <div class="placeholder-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="5 5"></rect>
                <path d="M12 8v8M8 12h8" stroke-dasharray="none"></path>
              </svg>
            </div>
            <h3 class="placeholder-title">${t('placeholder.title')}</h3>
            <p style="color: var(--text-secondary); margin-top: 10px;">${t('placeholder.subtitle')}</p>
          </div>
        `;
    }

    placeholder.style.display = 'flex';
    return;
  }

  // Nascondi placeholder se esiste
  const placeholder = document.querySelector('.webview-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }

  // Nascondi TUTTE le webview di TUTTE le sessioni
  Object.keys(webviewInstances).forEach(sessionId => {
    const sessionWebviews = webviewInstances[sessionId];
    Object.keys(sessionWebviews).forEach(aiKey => {
      const wrapper = document.querySelector(`.webview-wrapper[data-session-id="${sessionId}"][data-ai-key="${aiKey}"]`);
      if (wrapper) {
        wrapper.style.display = 'none';
      }
    });

  });

  // Ottieni le webview della sessione corrente
  const sessionWebviews = getCurrentSessionWebviews();

  // Mostra solo le webview della sessione corrente che sono selezionate
  let index = 0;
  for (const aiKey of selectedAIs) {
    // Verifica che la config esista
    const config = aiConfigs[aiKey];
    if (!config) {
      console.warn(`[OnePrompt] Config not found for AI: ${aiKey}`);
      continue;
    }

    // Controlla se il wrapper per questa sessione e AI esiste già
    let wrapper = document.querySelector(`.webview-wrapper[data-session-id="${currentSessionId}"][data-ai-key="${aiKey}"]`);

    if (!wrapper) {
      // Crea nuovo wrapper e webview
      wrapper = document.createElement('div');
      wrapper.className = 'webview-wrapper';
      wrapper.dataset.sessionId = currentSessionId;
      wrapper.dataset.aiKey = aiKey;

      // Header
      const header = document.createElement('div');
      header.className = 'webview-header';
      header.innerHTML = `
        <div class="webview-header-title">
          ${config.logo ? `<img src="../assets/${config.logo}" style="width: 16px; height: 16px; object-fit: contain;">` : config.icon}
          ${config.name}
        </div>
        <div class="webview-header-status" id="status-${currentSessionId}-${aiKey}">●</div>
      `;

      wrapper.appendChild(header);

      // Drag & Drop support for webview wrapper
      header.draggable = true; // Make only header draggable to avoid issues with webview interaction
      
      header.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', aiKey);
        e.dataTransfer.effectAllowed = 'move';
        wrapper.classList.add('dragging');
      });

      header.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        document.querySelectorAll('.webview-wrapper').forEach(w => w.classList.remove('drag-over'));
      });

      // Add listeners to wrapper for drop target
      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!wrapper.classList.contains('dragging')) {
          wrapper.classList.add('drag-over');
        }
      });

      wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('drag-over');
      });

      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drag-over');
        
        const draggedAiKey = e.dataTransfer.getData('text/plain');
        if (draggedAiKey === aiKey) return;

        // Reorder selectedAIs
        const newSelectedAIs = new Set();
        const currentArray = Array.from(selectedAIs);
        const draggedIndex = currentArray.indexOf(draggedAiKey);
        const targetIndex = currentArray.indexOf(aiKey);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Remove dragged item
          currentArray.splice(draggedIndex, 1);
          // Insert at new position
          currentArray.splice(targetIndex, 0, draggedAiKey);
          
          // Rebuild Set
          currentArray.forEach(key => newSelectedAIs.add(key));
          
          selectedAIs = newSelectedAIs;
          saveSelectedAIs();
          renderWebviews();
        }
      });

      // Crea webview se non esiste per questa sessione
      let webview = sessionWebviews[aiKey];
      if (!webview) {
        if (mode === 'api') {
            webview = createApiPanel(aiKey);
        } else {
            webview = await createWebview(aiKey);
        }
        sessionWebviews[aiKey] = webview;
      }

      wrapper.appendChild(webview);
      
      // Set order
      wrapper.style.order = index;
      webviewGrid.appendChild(wrapper);
    } else {
      // Il wrapper esiste già, mostralo
      wrapper.style.display = 'flex';
      
      // Update order without moving in DOM (prevents reload)
      wrapper.style.order = index;
      
      // Only append if not already in grid (should not happen if found by querySelector)
      if (!wrapper.parentElement) {
        webviewGrid.appendChild(wrapper);
      }
    }
    index++;
  }
}

// Create webview
async function createWebview(aiKey) {
  const config = aiConfigs[aiKey];
  const webview = document.createElement('webview');

  // Get preload path
  const preloadPath = await window.electronAPI.getWebviewPreloadPath();

  // Configura User Agent per sembrare un Chrome standard (rimuove riferimenti a Electron)
  // Questo aiuta a evitare blocchi da parte di servizi come Cloudflare
  const userAgent = navigator.userAgent
    .replace(/OnePrompt\/[^ ]+ /, '')
    .replace(/Electron\/[^ ]+ /, '');
  webview.setAttribute('useragent', userAgent);

  // Usa l'URL salvato se disponibile, altrimenti usa l'URL di default
  const currentSession = getCurrentSession();
  const savedUrl = currentSession?.chatUrls?.[aiKey];
  const urlToLoad = savedUrl || config.url;

  webview.setAttribute('src', urlToLoad);
  webview.setAttribute('data-ai-key', aiKey);
  webview.setAttribute('partition', `persist:${aiKey}`);
  webview.setAttribute('allowpopups', 'true');
  webview.setAttribute('preload', `file://${preloadPath}`);
  webview.style.width = '100%';
  webview.style.height = '100%';

  // Listen for status updates from webview
  webview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'status-update') {
      const status = event.args[0]; // 'sent', 'thinking', 'done'
      updateWebviewStatus(aiKey, status);
    } else if (event.channel === 'console-log') {
      // Debug logging from webview
      const message = event.args[0];
      console.log(`[Webview ${aiKey}]:`, message);
    }
  });

  // Event listeners
  webview.addEventListener('did-finish-load', () => {
    console.log(`${config.name} - caricamento completato`);
    loadedWebviews.add(aiKey);
    updateWebviewStatus(aiKey, 'ready');

    // Open DevTools for debugging
    // if (aiKey === 'grok') {
    //   webview.openDevTools();
    // }
  });

  webview.addEventListener('did-fail-load', (e) => {
    console.error(`${config.name} - errore caricamento:`, e);
  });

  return webview;
}

// Update webview status in header
function updateWebviewStatus(aiKey, status) {
  // Lo status ID ora include il sessionId
  const statusEl = document.getElementById(`status-${currentSessionId}-${aiKey}`);
  if (!statusEl) return;

  const statusMap = {
    ready: { text: '●', color: 'var(--text-secondary)' },
    sent: { text: '●', color: 'var(--success-color)' },
    error: { text: '●', color: '#dc3545' }
  };

  const statusInfo = statusMap[status] || statusMap.ready;
  statusEl.textContent = statusInfo.text;
  statusEl.style.color = statusInfo.color;
}

// Render sidebar buttons
function renderSidebar() {
  sidebarNav.innerHTML = '';

  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : 'injection';
  const apiServices = ['chatgpt', 'gemini', 'claude', 'grok'];

  // Mostra solo i servizi configurati nella sidebar
  Object.entries(aiConfigs).forEach(([key, config]) => {
    let isConfigured = false;
    if (mode === 'api') {
        // In API mode, check configuredApiAIs AND if it's an API service
        if (configuredApiAIs.has(key) && apiServices.includes(key)) {
            isConfigured = true;
        }
    } else {
        // In Injection mode, check configuredAIs
        if (configuredAIs.has(key)) {
            isConfigured = true;
        }
    }

    if (isConfigured) {
      const button = createSidebarButton(key, config);
      sidebarNav.appendChild(button);
    }
  });

  // Aggiorna indicatori di scroll
  updateScrollIndicators();
}

// Gestione indicatori di scroll
function updateScrollIndicators() {
  const scrollUpBtn = document.getElementById('scrollUpBtn');
  const scrollDownBtn = document.getElementById('scrollDownBtn');
  
  if (!scrollUpBtn || !scrollDownBtn) return;

  const hasOverflow = sidebarNav.scrollHeight > sidebarNav.clientHeight;
  const isAtTop = sidebarNav.scrollTop <= 0;
  const isAtBottom = sidebarNav.scrollTop + sidebarNav.clientHeight >= sidebarNav.scrollHeight - 1;

  if (hasOverflow) {
    if (!isAtTop) {
      scrollUpBtn.classList.add('visible');
    } else {
      scrollUpBtn.classList.remove('visible');
    }

    if (!isAtBottom) {
      scrollDownBtn.classList.add('visible');
    } else {
      scrollDownBtn.classList.remove('visible');
    }
  } else {
    scrollUpBtn.classList.remove('visible');
    scrollDownBtn.classList.remove('visible');
  }
}

// Setup scroll listeners
function setupScrollListeners() {
  const scrollUpBtn = document.getElementById('scrollUpBtn');
  const scrollDownBtn = document.getElementById('scrollDownBtn');

  if (sidebarNav) {
    sidebarNav.addEventListener('scroll', updateScrollIndicators);
    // Aggiorna anche al resize della finestra
    window.addEventListener('resize', updateScrollIndicators);
  }

  if (scrollUpBtn) {
    scrollUpBtn.addEventListener('click', () => {
      sidebarNav.scrollBy({ top: -60, behavior: 'smooth' });
    });
  }

  if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
      sidebarNav.scrollBy({ top: 60, behavior: 'smooth' });
    });
  }
}

// Create sidebar button
function createSidebarButton(key, config) {
  const button = document.createElement('button');
  button.className = 'sidebar-item';
  button.dataset.aiKey = key;
  button.title = config.name;

  // Aggiungi classe active se selezionato
  if (selectedAIs.has(key)) {
    button.classList.add('active');
  }

  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : 'injection';

  // Aggiungi classe logged-in se configurato
  let isConfigured = false;
  if (mode === 'api') {
      if (configuredApiAIs.has(key)) isConfigured = true;
  } else {
      if (configuredAIs.has(key)) isConfigured = true;
  }

  if (isConfigured) {
    button.classList.add('logged-in');
  }

  const iconHtml = config.logo
    ? `<img src="../assets/${config.logo}" alt="${config.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${config.icon}';">`
    : config.icon;

  button.innerHTML = `
    <span class="sidebar-icon">${iconHtml}</span>
    <span class="sidebar-item-status"></span>
  `;

  button.addEventListener('click', () => {
    // Toggle selection
    toggleAISelection(key);
  });

  return button;
}

// Update sidebar button state
function updateSidebarButtonState(aiKey) {
  const button = document.querySelector(`.sidebar-item[data-ai-key="${aiKey}"]`);
  if (!button) return;

  if (selectedAIs.has(aiKey)) {
    button.classList.add('active');
  } else {
    button.classList.remove('active');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Prompt input
  promptInput.addEventListener('input', updateSendButton);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        sendPromptToSelectedAIs();
      }
    }
  });

  // Send button
  sendBtn.addEventListener('click', sendPromptToSelectedAIs);

  // New session button
  newSessionBtn.addEventListener('click', createNewSessionAndSwitch);

  // Add service button - apri modale
  addServiceBtn.addEventListener('click', openServicesModal);

  // Close modal button
  closeServicesModal.addEventListener('click', closeServicesModalFn);

  // Close modal on overlay click
  servicesModal.addEventListener('click', (e) => {
    if (e.target === servicesModal) {
      closeServicesModalFn();
    }
  });

  // Close modal on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (servicesModal.style.display === 'flex') {
        closeServicesModalFn();
      }
      if (settingsModal.style.display === 'flex') {
        closeSettingsModalFn();
      }
    }
  });

  // Settings button - apri modale impostazioni
  settingsBtn.addEventListener('click', openSettingsModal);

  // Close settings modal button
  closeSettingsModal.addEventListener('click', closeSettingsModalFn);

  // Close settings modal on overlay click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModalFn();
    }
  });

  // Language select change
  languageSelect.addEventListener('change', async (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('oneprompt-language', currentLanguage);
    await loadTranslations(currentLanguage);
    updateUILanguage();
  });

  // Theme buttons
  const themeDarkBtn = document.getElementById('themeDarkBtn');
  const themeLightBtn = document.getElementById('themeLightBtn');

  if (themeDarkBtn) {
    themeDarkBtn.addEventListener('click', () => applyTheme('dark'));
  }

  if (themeLightBtn) {
    themeLightBtn.addEventListener('click', () => applyTheme('light'));
  }

  // Report Bug button - always open GitHub Issues
  reportBugBtn.addEventListener('click', () => {
    window.electronAPI.openExternal('https://github.com/calabr93/one-prompt/issues/new/choose');
  });
}

// Update send button state
function updateSendButton() {
  const hasPrompt = promptInput.value.trim().length > 0;
  const hasSelection = selectedAIs.size > 0;
  sendBtn.disabled = !(hasPrompt && hasSelection);
}

// Send prompt to selected AIs
async function sendPromptToSelectedAIs() {
  const prompt = promptInput.value.trim();

  if (!prompt || selectedAIs.size === 0) {
    return;
  }

  try {
    sendBtn.disabled = true;

    // Ottieni le webview della sessione corrente
    const sessionWebviews = getCurrentSessionWebviews();
    const currentSession = getCurrentSession();
    const isApiMode = currentSession && currentSession.mode === 'api';

    // Check if cross-check is enabled (only in API mode with 2+ AIs)
    const doCrossCheck = crossCheckEnabled && isApiMode && selectedAIs.size >= 2;

    if (doCrossCheck) {
      // === CROSS-CHECK FLOW (Two Rounds) ===
      console.log('[OnePrompt] Cross-Check mode: Starting two-round flow...');

      // Round 1: Send original prompt to all AIs and collect responses
      const round1Responses = {};
      const aiKeys = Array.from(selectedAIs);

      // Show user message in all panels first
      for (const aiKey of aiKeys) {
        const panel = sessionWebviews[aiKey];
        if (panel) {
          appendApiMessage(panel, 'user', prompt);
        }
      }

      // Send to all AIs in parallel and collect responses
      const round1Promises = aiKeys.map(async aiKey => {
        const panel = sessionWebviews[aiKey];
        if (!panel) {
          console.error(`Panel for ${aiKey} not found`);
          return { aiKey, response: null, error: 'Panel not found' };
        }

        try {
          const response = await handleApiChatWithResponse(aiKey, prompt, panel);
          return { aiKey, response, error: null };
        } catch (error) {
          console.error(`Round 1 error for ${aiKey}:`, error);
          return { aiKey, response: null, error: error.message };
        }
      });

      const round1Results = await Promise.all(round1Promises);

      // Collect successful responses
      for (const result of round1Results) {
        if (result.response) {
          round1Responses[result.aiKey] = result.response;
        }
      }

      console.log('[OnePrompt] Round 1 complete. Responses collected:', Object.keys(round1Responses));

      // Round 2: Send cross-check prompt to each AI
      if (Object.keys(round1Responses).length >= 2) {
        console.log('[OnePrompt] Starting Round 2: Cross-Check...');

        const round2Promises = aiKeys.map(async aiKey => {
          const panel = sessionWebviews[aiKey];
          if (!panel || !round1Responses[aiKey]) {
            return; // Skip AIs that failed in round 1
          }

          // Build list of OTHER responses (exclude this AI's own response)
          const otherResponses = Object.entries(round1Responses)
            .filter(([key, _]) => key !== aiKey)
            .map(([key, response]) => ({
              aiName: AI_DISPLAY_NAMES[key] || key,
              response: response
            }));

          if (otherResponses.length === 0) return;

          // Build cross-check prompt
          const crossCheckPrompt = buildCrossCheckPrompt(prompt, otherResponses);

          // Send cross-check prompt and mark response with special style
          try {
            const crossCheckResponse = await handleApiChatWithResponse(aiKey, crossCheckPrompt, panel, true); // true = isCrossCheck
          } catch (error) {
            console.error(`Round 2 error for ${aiKey}:`, error);
          }
        });

        await Promise.all(round2Promises);
        console.log('[OnePrompt] Cross-Check complete!');
      } else {
        console.log('[OnePrompt] Not enough successful responses for cross-check.');
      }

    } else {
      // === NORMAL FLOW (Single Round) ===
      const promises = Array.from(selectedAIs).map(async aiKey => {
        const webview = sessionWebviews[aiKey];
        if (!webview) {
          console.error(`Webview for ${aiKey} not found in current session`);
          return;
        }

        // Aspetta che sia caricata (solo per Injection Mode)
        if (!isApiMode && !loadedWebviews.has(aiKey)) {
          console.log(`Waiting for ${aiKey} to load...`);
          updateWebviewStatus(aiKey, 'thinking');

          await new Promise(resolve => {
            if (loadedWebviews.has(aiKey)) {
              resolve();
              return;
            }

            const onLoaded = () => {
              webview.removeEventListener('did-finish-load', onLoaded);
              console.log(`${aiKey} loaded!`);
              resolve();
            };
            webview.addEventListener('did-finish-load', onLoaded);

            // Timeout fallback (10s)
            setTimeout(() => {
              webview.removeEventListener('did-finish-load', onLoaded);
              console.log(`${aiKey} load timeout, continuing anyway...`);
              resolve();
            }, 10000);
          });

          // Extra delay for SPA hydration
          console.log(`Waiting extra 2s for ${aiKey} SPA hydration...`);
          await new Promise(r => setTimeout(r, 2000));
        }

        // Send via IPC to webview or Handle API
        if (isApiMode) {
            console.log(`Handling API chat for ${aiKey}...`);
            // webview here is actually the div panel
            handleApiChat(aiKey, prompt, webview);
        } else {
            // Injection Mode
            console.log(`Sending prompt to ${aiKey} webview...`);
            try {
              // Invia anche le injection rules per questo AI
              webview.send('send-prompt', {
                prompt,
                aiKey,
                injectionRules: injectionRules[aiKey]
              });
              console.log(`Prompt sent to ${aiKey}`);
              updateWebviewStatus(aiKey, 'sent');
            } catch (err) {
              console.error(`Error sending to ${aiKey}:`, err);
              updateWebviewStatus(aiKey, 'error');
            }
        }
      });

      await Promise.all(promises);
    }

    // Clear prompt input after successful send
    promptInput.value = '';

  } catch (error) {
    console.error('Errore invio prompt:', error);
  } finally {
    sendBtn.disabled = false;
    updateSendButton();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Salva gli URL delle chat quando l'app viene chiusa
window.addEventListener('beforeunload', () => {
  saveSessionsToStorage();
});

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);

// Update Handling
function setupUpdateHandlers() {
  const updateBanner = document.getElementById('updateBanner');
  const updateText = document.getElementById('updateText');
  const updateActionBtn = document.getElementById('updateActionBtn');

  if (!updateBanner || !updateText || !updateActionBtn) return;

  window.electronAPI.onUpdateAvailable((info) => {
    console.log('Update available:', info);
    updateText.textContent = `Nuova versione ${info.version} disponibile!`;
    updateActionBtn.textContent = 'Scarica e Installa';
    updateActionBtn.onclick = () => {
      updateActionBtn.textContent = 'Download in corso...';
      updateActionBtn.disabled = true;
      window.electronAPI.downloadUpdate();
    };
    updateBanner.style.display = 'block';
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    console.log('Update downloaded:', info);
    updateText.textContent = `Versione ${info.version} pronta per l'installazione.`;
    updateActionBtn.textContent = 'Riavvia ora';
    updateActionBtn.disabled = false;
    updateActionBtn.onclick = () => {
      window.electronAPI.installUpdate();
    };
    updateBanner.style.display = 'block';
  });
}

// === MODE SELECTION & SETTINGS ===

window.selectMode = function(mode) {
    const rememberToggle = document.getElementById('rememberModeToggle');
    const remember = rememberToggle ? rememberToggle.checked : false;

    if (remember) {
        localStorage.setItem('oneprompt-default-mode', mode);
        // Update settings UI if open
        const radio = document.querySelector(`input[name="defaultMode"][value="${mode}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    const currentSession = getCurrentSession();
    if (currentSession) {
        currentSession.mode = mode;

        // If switching to API mode, set default API services
        if (mode === 'api') {
             selectedAIs.clear();
             // Do NOT auto-select services. User must add them manually.
             // Just ensure they are configured so they appear in sidebar.
             const apiServices = ['chatgpt', 'gemini', 'claude', 'grok'];
             apiServices.forEach(key => {
                 if (!configuredApiAIs.has(key)) {
                     configuredApiAIs.add(key);
                 }
             });
             localStorage.setItem('oneprompt-configured-api-services', JSON.stringify([...configuredApiAIs]));
             saveSelectedAIs();
        }

        saveSessionsToStorage();
        renderSidebar(); // Update sidebar for new mode
        renderWebviews();
        updateCrossCheckButtonVisibility();
    }
};

// Settings Elements & Logic
function initSettings() {
    const defaultModeRadios = document.querySelectorAll('input[name="defaultMode"]');
    const apiKeyOpenAI = document.getElementById('apiKeyOpenAI');
    const apiKeyAnthropic = document.getElementById('apiKeyAnthropic');
    const apiKeyGemini = document.getElementById('apiKeyGemini');

    // Settings Sidebar Navigation
    const settingsNavBtns = document.querySelectorAll('.settings-nav-btn');
    const settingsTabContents = document.querySelectorAll('.settings-tab-content');

    settingsNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            settingsNavBtns.forEach(b => b.classList.remove('active'));
            settingsTabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding content
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Init radio buttons
    let currentDefaultMode = localStorage.getItem('oneprompt-default-mode');
    if (!currentDefaultMode) {
        currentDefaultMode = 'injection'; // Default to injection if not set
    }

    defaultModeRadios.forEach(radio => {
        if (radio.value === currentDefaultMode) {
            radio.checked = true;
        }
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('oneprompt-default-mode', e.target.value);
            }
        });
    });

    if (apiKeyOpenAI) {
        apiKeyOpenAI.value = localStorage.getItem('oneprompt-api-openai') || '';
        apiKeyOpenAI.addEventListener('input', (e) => localStorage.setItem('oneprompt-api-openai', e.target.value));
    }
    
    const modelOpenAI = document.getElementById('modelOpenAI');
    if (modelOpenAI) {
        modelOpenAI.value = localStorage.getItem('oneprompt-model-openai') || 'gpt-3.5-turbo';
        modelOpenAI.addEventListener('change', (e) => localStorage.setItem('oneprompt-model-openai', e.target.value));
    }
    
    if (apiKeyAnthropic) {
        apiKeyAnthropic.value = localStorage.getItem('oneprompt-api-anthropic') || '';
        apiKeyAnthropic.addEventListener('input', (e) => localStorage.setItem('oneprompt-api-anthropic', e.target.value));
    }

    const modelAnthropic = document.getElementById('modelAnthropic');
    if (modelAnthropic) {
        modelAnthropic.value = localStorage.getItem('oneprompt-model-anthropic') || 'claude-3-opus-20240229';
        modelAnthropic.addEventListener('change', (e) => localStorage.setItem('oneprompt-model-anthropic', e.target.value));
    }
    
    if (apiKeyGemini) {
        apiKeyGemini.value = localStorage.getItem('oneprompt-api-gemini') || '';
        apiKeyGemini.addEventListener('input', (e) => localStorage.setItem('oneprompt-api-gemini', e.target.value));
    }

    const modelGemini = document.getElementById('modelGemini');
    if (modelGemini) {
        modelGemini.value = localStorage.getItem('oneprompt-model-gemini') || 'gemini-pro';
        modelGemini.addEventListener('change', (e) => localStorage.setItem('oneprompt-model-gemini', e.target.value));
    }

    // xAI (Grok) Settings
    const apiKeyXAI = document.getElementById('apiKeyXAI');
    if (apiKeyXAI) {
        apiKeyXAI.value = localStorage.getItem('oneprompt-api-xai') || '';
        apiKeyXAI.addEventListener('input', (e) => localStorage.setItem('oneprompt-api-xai', e.target.value));
    }

    const modelXAI = document.getElementById('modelXAI');
    if (modelXAI) {
        modelXAI.value = localStorage.getItem('oneprompt-model-xai') || 'grok-3';
        modelXAI.addEventListener('change', (e) => localStorage.setItem('oneprompt-model-xai', e.target.value));
    }
}

// Initialize settings logic
initSettings();

// Cross-Check Button Logic
function initCrossCheckButton() {
  const crossCheckBtn = document.getElementById('crossCheckBtn');
  if (!crossCheckBtn) return;

  // Toggle button click
  crossCheckBtn.addEventListener('click', () => {
    crossCheckEnabled = !crossCheckEnabled;
    crossCheckBtn.classList.toggle('active', crossCheckEnabled);
    console.log(`[OnePrompt] Cross-Check mode: ${crossCheckEnabled ? 'enabled' : 'disabled'}`);
  });
}

// Update cross-check button visibility based on mode
function updateCrossCheckButtonVisibility() {
  const crossCheckBtn = document.getElementById('crossCheckBtn');
  if (!crossCheckBtn) return;

  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : null;

  // Only show cross-check button in API mode with 2+ services selected
  if (mode === 'api' && selectedAIs.size >= 2) {
    crossCheckBtn.style.display = 'flex';
  } else {
    crossCheckBtn.style.display = 'none';
    // Disable cross-check if hidden
    if (crossCheckEnabled) {
      crossCheckEnabled = false;
      crossCheckBtn.classList.remove('active');
    }
  }
}

// Initialize cross-check settings
function initCrossCheckSettings() {
  const templateTextarea = document.getElementById('crossCheckPromptTemplate');
  const resetBtn = document.getElementById('resetCrossCheckPrompt');

  if (templateTextarea) {
    // Load saved template or default
    templateTextarea.value = getCrossCheckTemplate();

    // Save on change
    templateTextarea.addEventListener('input', (e) => {
      localStorage.setItem('oneprompt-crosscheck-template', e.target.value);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('oneprompt-crosscheck-template');
      if (templateTextarea) {
        templateTextarea.value = DEFAULT_CROSS_CHECK_TEMPLATE;
      }
    });
  }
}

// Initialize cross-check features
initCrossCheckButton();
initCrossCheckSettings();

// Create API Panel
function createApiPanel(aiKey) {
  const config = aiConfigs[aiKey];
  const panel = document.createElement('div');
  panel.className = 'api-panel';
  panel.dataset.aiKey = aiKey;
  panel.style.width = '100%';
  panel.style.flex = '1'; // Fix: Use flex instead of height: 100% to avoid overflow with header
  panel.style.minHeight = '0'; // Fix: Prevent flex overflow
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.backgroundColor = 'var(--bg-primary)';
  panel.style.color = 'var(--text-primary)';
  panel.style.overflow = 'hidden';

  // Chat Container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'api-chat-container';
  chatContainer.style.flex = '1';
  chatContainer.style.overflowY = 'auto';
  chatContainer.style.minHeight = '0'; // Crucial for flex child scrolling
  chatContainer.style.padding = '20px';
  chatContainer.style.display = 'flex';
  chatContainer.style.flexDirection = 'column';
  chatContainer.style.gap = '16px';

  // Welcome Message
  const welcome = document.createElement('div');
  welcome.className = 'api-welcome';
  welcome.style.textAlign = 'center';
  welcome.style.opacity = '0.7';
  welcome.style.marginTop = 'auto';
  welcome.style.marginBottom = 'auto';
  welcome.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem; display: flex; justify-content: center;">
        ${config.logo ? `<img src="../assets/${config.logo}" style="width: 48px; height: 48px; object-fit: contain;">` : config.icon}
      </div>
      <h3>${config.name} (API Mode)</h3>
      <p>Waiting for prompt...</p>
  `;
  chatContainer.appendChild(welcome);

  panel.appendChild(chatContainer);

  // Restore history if available
  const session = getCurrentSession();
  if (session && session.apiChatHistory && session.apiChatHistory[aiKey]) {
    const history = session.apiChatHistory[aiKey];
    if (history.length > 0) {
      history.forEach(msg => {
        appendApiMessage(panel, msg.role, msg.content, false); // false = don't re-save
      });
    }
  }

  return panel;
}

// Helper to append message to API panel
// save: true = save to history, false = just display (for restoring history)
function appendApiMessage(panel, role, text, save = true) {
    const chatContainer = panel.querySelector('.api-chat-container');
    const welcome = panel.querySelector('.api-welcome');
    if (welcome) welcome.remove();

    // Save to history (only user and assistant, not system messages)
    if (save && role !== 'system') {
      saveApiHistory(panel.dataset.aiKey, role, text);
    }

    const bubble = document.createElement('div');
    bubble.className = `api-message ${role}`;
    bubble.style.maxWidth = '85%';
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '12px';
    bubble.style.lineHeight = '1.5';
    bubble.style.fontSize = '0.95rem';
    bubble.style.wordWrap = 'break-word';
    
    // Colors based on role and service
    if (role === 'user') {
        bubble.style.alignSelf = 'flex-end';
        bubble.style.backgroundColor = 'var(--bg-tertiary)';
        bubble.style.color = 'var(--text-primary)';
        bubble.style.borderBottomRightRadius = '4px';
    } else {
        bubble.style.alignSelf = 'flex-start';
        bubble.style.borderBottomLeftRadius = '4px';
        bubble.style.color = '#fff';
        
        // Service specific colors
        const aiKey = panel.dataset.aiKey;
        if (aiKey === 'chatgpt') bubble.style.backgroundColor = '#10a37f'; // OpenAI Green
        else if (aiKey === 'claude') bubble.style.backgroundColor = '#d97757'; // Claude Clay
        else if (aiKey === 'gemini') bubble.style.backgroundColor = '#1b72e8'; // Google Blue
        else if (aiKey === 'perplexity') bubble.style.backgroundColor = '#22b8cf'; // Perplexity Cyan
        else if (aiKey === 'copilot') bubble.style.backgroundColor = '#24292f'; // GitHub/Copilot Black
        else if (aiKey === 'grok') {
            bubble.style.backgroundColor = '#0e0e0e'; // xAI/Grok Black
            bubble.style.color = '#c6c6c6';
        }
        else bubble.style.backgroundColor = 'var(--accent-color)';
    }

    // Simple markdown-like parsing (bold, code blocks) could be added here
    // For now, just text with whitespace preservation
    bubble.style.whiteSpace = 'pre-wrap';
    
    // Allow HTML for system messages (e.g. settings link)
    if (role === 'system') {
        bubble.innerHTML = text;
    } else {
        bubble.textContent = text;
    }

    chatContainer.appendChild(bubble);
    // Use requestAnimationFrame to ensure scroll happens after render
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
    return bubble;
}

// Helper to save API chat history with sliding window limit
function saveApiHistory(aiKey, role, content) {
  const session = getCurrentSession();
  if (!session) return;

  if (!session.apiChatHistory) {
    session.apiChatHistory = {};
  }
  if (!session.apiChatHistory[aiKey]) {
    session.apiChatHistory[aiKey] = [];
  }

  session.apiChatHistory[aiKey].push({ role, content });

  // Enforce sliding window limit (keep last N messages)
  if (session.apiChatHistory[aiKey].length > API_HISTORY_LIMIT) {
    session.apiChatHistory[aiKey] = session.apiChatHistory[aiKey].slice(-API_HISTORY_LIMIT);
  }

  saveSessionsToStorage();
}

// Handle API Chat Logic (returns response for cross-check)
// isCrossCheck: if true, marks the response with special cross-check styling
// skipUserMessage: if true, doesn't show user message (already shown)
async function handleApiChatWithResponse(aiKey, prompt, panel, isCrossCheck = false, skipUserMessage = true) {
    // Only show user message if not cross-check (already shown in sendPromptToSelectedAIs)
    if (!skipUserMessage) {
      appendApiMessage(panel, 'user', prompt);
    }

    // Get API Key
    let apiKey = '';
    if (aiKey === 'chatgpt') apiKey = localStorage.getItem('oneprompt-api-openai');
    else if (aiKey === 'claude') apiKey = localStorage.getItem('oneprompt-api-anthropic');
    else if (aiKey === 'gemini') apiKey = localStorage.getItem('oneprompt-api-gemini');
    else if (aiKey === 'grok') apiKey = localStorage.getItem('oneprompt-api-xai');

    if (!apiKey) {
        appendApiMessage(panel, 'system', t('error.apiKeyMissing'));
        updateWebviewStatus(aiKey, 'error');
        throw new Error('API key missing');
    }

    updateWebviewStatus(aiKey, 'thinking');

    // Show loader
    const loader = appendApiLoader(panel);

    // Build messages array with history
    const session = getCurrentSession();
    const existingHistory = (session?.apiChatHistory?.[aiKey] || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-API_HISTORY_LIMIT);

    // For cross-check, add the prompt as user message to history temporarily
    const messages = [...existingHistory];
    if (isCrossCheck || !skipUserMessage) {
      // Save user message to history for cross-check
      saveApiHistory(aiKey, 'user', prompt);
    }
    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    try {
        let responseText = '';

        if (aiKey === 'chatgpt') {
            const model = localStorage.getItem('oneprompt-model-openai') || 'gpt-4o-mini';
            const res = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    input: messages,
                    tools: [{ type: "web_search" }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            if (data.output_text) {
              responseText = data.output_text;
            } else if (data.output && Array.isArray(data.output)) {
              const messageOutput = data.output.find(item => item.type === 'message');
              if (messageOutput && messageOutput.content && messageOutput.content[0]) {
                responseText = messageOutput.content[0].text;
              } else {
                throw new Error('Invalid response structure from OpenAI Responses API');
              }
            } else {
              throw new Error('Invalid response from OpenAI');
            }
        }
        else if (aiKey === 'claude') {
             const model = localStorage.getItem('oneprompt-model-anthropic') || 'claude-3-5-sonnet-20240620';
             const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 4096,
                    messages: messages,
                    tools: [{
                      type: "web_search_20250305",
                      name: "web_search",
                      max_uses: 5
                    }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            if (data.content && data.content.length > 0) {
              const textBlocks = data.content.filter(block => block.type === 'text');
              if (textBlocks.length > 0) {
                responseText = textBlocks.map(b => b.text).join('\n');
              } else {
                throw new Error('No text content in Anthropic response');
              }
            } else {
              throw new Error('Invalid response from Anthropic');
            }
        }
        else if (aiKey === 'gemini') {
            const model = localStorage.getItem('oneprompt-model-gemini') || 'gemini-1.5-flash';
            const geminiContents = messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }));
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: geminiContents,
                    tools: [{ google_search: {} }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.candidates[0].content.parts[0].text;
        }
        else if (aiKey === 'grok') {
            const model = localStorage.getItem('oneprompt-model-xai') || 'grok-3';
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    tools: [
                      { type: "web_search" },
                      { type: "x_search" }
                    ]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices[0].message.content;
        }
        else {
            responseText = "API support for this service is not yet implemented.";
        }

        // Remove loader
        loader.remove();

        // Append message with special styling if cross-check
        const bubble = appendApiMessage(panel, 'assistant', responseText);
        if (isCrossCheck && bubble) {
          bubble.classList.add('cross-check-response');
        }

        updateWebviewStatus(aiKey, 'ready');

        return responseText;

    } catch (error) {
        console.error(`API Error (${aiKey}):`, error);
        loader.remove();
        appendApiMessage(panel, 'system', `Error: ${error.message}`);
        updateWebviewStatus(aiKey, 'error');
        throw error;
    }
}

// Handle API Chat Logic (original - fire and forget)
async function handleApiChat(aiKey, prompt, panel) {
    // 1. Show User Message immediately
    appendApiMessage(panel, 'user', prompt);

    // 2. Get API Key
    let apiKey = '';
    if (aiKey === 'chatgpt') apiKey = localStorage.getItem('oneprompt-api-openai');
    else if (aiKey === 'claude') apiKey = localStorage.getItem('oneprompt-api-anthropic');
    else if (aiKey === 'gemini') apiKey = localStorage.getItem('oneprompt-api-gemini');
    else if (aiKey === 'grok') apiKey = localStorage.getItem('oneprompt-api-xai');

    if (!apiKey) {
        appendApiMessage(panel, 'system', t('error.apiKeyMissing'));
        updateWebviewStatus(aiKey, 'error');
        return;
    }

    updateWebviewStatus(aiKey, 'thinking');

    // Show loader
    const loader = appendApiLoader(panel);

    // 3. Build messages array with history (including the new user message just saved)
    const session = getCurrentSession();
    const existingHistory = (session?.apiChatHistory?.[aiKey] || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-API_HISTORY_LIMIT);

    // Messages array for API call (history already includes the current prompt)
    const messages = existingHistory;

    try {
        let responseText = '';

        if (aiKey === 'chatgpt') {
            const model = localStorage.getItem('oneprompt-model-openai') || 'gpt-4o-mini';
            // Use Responses API for web search support
            const res = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    input: messages,
                    tools: [{ type: "web_search" }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            // Responses API returns output_text directly or in output array
            if (data.output_text) {
              responseText = data.output_text;
            } else if (data.output && Array.isArray(data.output)) {
              const messageOutput = data.output.find(item => item.type === 'message');
              if (messageOutput && messageOutput.content && messageOutput.content[0]) {
                responseText = messageOutput.content[0].text;
              } else {
                throw new Error('Invalid response structure from OpenAI Responses API');
              }
            } else {
              throw new Error('Invalid response from OpenAI');
            }
        }
        else if (aiKey === 'claude') {
             const model = localStorage.getItem('oneprompt-model-anthropic') || 'claude-3-5-sonnet-20240620';
             const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 4096,
                    messages: messages,
                    tools: [{
                      type: "web_search_20250305",
                      name: "web_search",
                      max_uses: 5
                    }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            // With web search, response may have multiple content blocks
            if (data.content && data.content.length > 0) {
              const textBlocks = data.content.filter(block => block.type === 'text');
              if (textBlocks.length > 0) {
                responseText = textBlocks.map(b => b.text).join('\n');
              } else {
                throw new Error('No text content in Anthropic response');
              }
            } else {
              throw new Error('Invalid response from Anthropic');
            }
        }
        else if (aiKey === 'gemini') {
            const model = localStorage.getItem('oneprompt-model-gemini') || 'gemini-1.5-flash';
            // Convert to Gemini format (user/model roles)
            const geminiContents = messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }));
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: geminiContents,
                    tools: [{ google_search: {} }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.candidates[0].content.parts[0].text;
        }
        else if (aiKey === 'grok') {
            const model = localStorage.getItem('oneprompt-model-xai') || 'grok-3';
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    tools: [
                      { type: "web_search" },
                      { type: "x_search" }
                    ]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices[0].message.content;
        }
        else {
            responseText = "API support for this service is not yet implemented.";
        }

        // Remove loader
        loader.remove();
        
        appendApiMessage(panel, 'assistant', responseText);
        updateWebviewStatus(aiKey, 'ready');

    } catch (error) {
        console.error(`API Error (${aiKey}):`, error);
        // Remove loader
        loader.remove();
        appendApiMessage(panel, 'system', `Error: ${error.message}`);
        updateWebviewStatus(aiKey, 'error');
    }
}

// Helper to append loader
function appendApiLoader(panel) {
    const chatContainer = panel.querySelector('.api-chat-container');
    const welcome = panel.querySelector('.api-welcome');
    if (welcome) welcome.remove();

    const loader = document.createElement('div');
    loader.className = 'api-message assistant loader-bubble';
    loader.style.alignSelf = 'flex-start';
    loader.style.borderBottomLeftRadius = '4px';
    loader.style.backgroundColor = 'var(--bg-secondary)';
    loader.style.padding = '12px 16px';
    loader.style.borderRadius = '12px';
    loader.style.width = 'fit-content';
    
    loader.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    chatContainer.appendChild(loader);
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
    return loader;
}
