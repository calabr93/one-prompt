// State management
let aiConfigs = {};
let injectionRules = {};
let loadedWebviews = new Set();
let webviewInstances = {}; // Map sessionId → { aiKey → webview element }
let configuredAIs = new Set(JSON.parse(localStorage.getItem('oneprompt-configured-services') || '[]'));

// i18n - Internazionalizzazione
let currentLanguage = localStorage.getItem('oneprompt-language') || 'it';

const translations = {
  it: {
    'services.title': 'Servizi disponibili',
    'settings.title': 'Impostazioni',
    'settings.language': 'Lingua',
    'placeholder.title': 'Seleziona almeno un servizio',
    'placeholder.subtitle': 'Clicca sul pulsante + per aggiungere servizi AI',
    'session.default': 'Sessione',
    'sidebar.addService': 'Aggiungi servizio',
    'sidebar.newSession': 'Nuova sessione',
    'sidebar.reportBug': 'Segnala Bug o Richiedi Funzionalità',
    'sidebar.settings': 'Impostazioni',
    'prompt.placeholder': 'Inserisci il tuo prompt qui...',
    'send': 'Invia',
    'comingSoon': 'Prossimamente'
  },
  en: {
    'services.title': 'Available Services',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'placeholder.title': 'Select at least one service',
    'placeholder.subtitle': 'Click the + button to add AI services',
    'session.default': 'Session',
    'sidebar.addService': 'Add service',
    'sidebar.newSession': 'New session',
    'sidebar.reportBug': 'Report Bug or Request Feature',
    'sidebar.settings': 'Settings',
    'prompt.placeholder': 'Enter your prompt here...',
    'send': 'Send',
    'comingSoon': 'Coming Soon'
  }
};

function t(key) {
  return translations[currentLanguage][key] || key;
}

function updateUILanguage() {
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

// Session/Tab management
let sessions = [];
let currentSessionId = null;
let sessionCounter = 0;

// Helper functions for sessions
function createNewSession(name = null, selectedAIsSet = null) {
  sessionCounter++;

  // Calcola il numero di sessione più basso disponibile (gap finding)
  const usedNumbers = new Set(sessions.map(s => s.sessionNumber).filter(n => typeof n === 'number'));
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return {
    id: `session-${Date.now()}-${sessionCounter}`,
    name: name || null, // null significa usa il nome di default tradotto
    sessionNumber: nextNumber, // Usa il numero calcolato
    selectedAIs: selectedAIsSet ? Array.from(selectedAIsSet) : [],
    chatUrls: {}, // Mappa aiKey -> URL della conversazione
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
    const defaultSession = createNewSession(null, new Set([]));
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

  // Perplexity è sempre configurato (non richiede login obbligatorio)
  if (!configuredAIs.has('perplexity')) {
    configuredAIs.add('perplexity');
    localStorage.setItem('oneprompt-configured-services', JSON.stringify([...configuredAIs]));
  }

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
    updateUILanguage();

    // Setup event listeners
    setupEventListeners();

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

  // Mostra tab bar solo se ci sono 2+ sessioni
  if (sessions.length >= 2) {
    tabBar.style.display = 'flex';
  } else {
    tabBar.style.display = 'none';
  }

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
  updateSidebarState();
  renderWebviews();
  updateSendButton();
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
  if (sessions.length === 1) {
    // Non permettere di chiudere l'ultima sessione
    return;
  }

  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  sessions.splice(sessionIndex, 1);

  // Se abbiamo chiuso la sessione corrente, passa a un'altra
  if (sessionId === currentSessionId) {
    // Prendi la sessione precedente o la prima disponibile
    const newIndex = Math.max(0, sessionIndex - 1);
    currentSessionId = sessions[newIndex].id;
    selectedAIs = new Set(sessions[newIndex].selectedAIs);
  }

  saveSessionsToStorage();

  // Re-render tutto
  renderTabs();
  updateSidebarState();
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
  updateSidebarState();
  renderWebviews();
  updateSendButton();
}

// === MODALE SERVIZI ===

// Apri modale servizi
function openServicesModal() {
  renderServicesGrid();
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
function renderServicesGrid() {
  servicesGrid.innerHTML = '';

  Object.entries(aiConfigs).forEach(([aiKey, config]) => {
    const card = createServiceCard(aiKey, config);
    servicesGrid.appendChild(card);
  });
}

// Crea card servizio
function createServiceCard(aiKey, config) {
  const card = document.createElement('div');
  card.className = 'service-card';
  card.dataset.aiKey = aiKey;

  // Aggiungi classe 'coming-soon' se il servizio non è ancora disponibile
  if (config.comingSoon) {
    card.classList.add('coming-soon');
  } else if (configuredAIs.has(aiKey)) {
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
      toggleServiceEnabled(aiKey, card);
    });
  }

  return card;
}

// Toggle servizio abilitato/disabilitato
function toggleServiceEnabled(aiKey, cardElement) {
  if (configuredAIs.has(aiKey)) {
    // Disabilita servizio
    configuredAIs.delete(aiKey);
    cardElement.classList.remove('enabled');
    localStorage.setItem('oneprompt-configured-services', JSON.stringify([...configuredAIs]));

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
    configuredAIs.add(aiKey);
    cardElement.classList.add('enabled');
    localStorage.setItem('oneprompt-configured-services', JSON.stringify([...configuredAIs]));

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
}

// Render webviews (solo quelle selezionate)
async function renderWebviews() {
  // Reset classe grid
  webviewGrid.className = 'webview-grid';

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

    placeholder.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="5 5"></rect>
            <path d="M12 8v8M8 12h8" stroke-dasharray="none"></path>
          </svg>
        </div>
        <h3 class="placeholder-title">${t('placeholder.title')}</h3>
      </div>
    `;
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

      // Crea webview se non esiste per questa sessione
      let webview = sessionWebviews[aiKey];
      if (!webview) {
        webview = await createWebview(aiKey);
        sessionWebviews[aiKey] = webview;
      }

      wrapper.appendChild(webview);
      webviewGrid.appendChild(wrapper);
    } else {
      // Il wrapper esiste già, mostralo
      wrapper.style.display = 'flex';
    }
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

  // Mostra solo i servizi configurati nella sidebar
  Object.entries(aiConfigs).forEach(([key, config]) => {
    if (configuredAIs.has(key)) {
      const button = createSidebarButton(key, config);
      sidebarNav.appendChild(button);
    }
  });
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

  // Aggiungi classe logged-in se configurato
  if (configuredAIs.has(key)) {
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
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('oneprompt-language', currentLanguage);
    updateUILanguage();
  });

  // Report Bug button - open GitHub Issues in external browser
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

    // Invia il prompt a tutte le AI selezionate
    const promises = Array.from(selectedAIs).map(async aiKey => {
      const webview = sessionWebviews[aiKey];
      if (!webview) {
        console.error(`Webview for ${aiKey} not found in current session`);
        return;
      }

      // Aspetta che sia caricata
      if (!loadedWebviews.has(aiKey)) {
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

      // Send via IPC to webview
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
    });

    await Promise.all(promises);

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
