// Logger alias (loaded from utils/logger-renderer.js, disables logs in production)
const logger = window.OnePromptLogger || console;

// Markdown module alias (loaded from core/markdown.js)
// Falls back to local functions if module not loaded
const MarkdownModule = (window.OnePromptCore && window.OnePromptCore.markdown) || null;

// AI Services module alias (loaded from core/ai-services.js)
const AIServicesModule = (window.OnePromptCore && window.OnePromptCore.aiServices) || null;

// Webview Factory module alias (loaded from ui/webview-factory.js)
const WebviewFactoryModule = (window.OnePromptUI && window.OnePromptUI.webviewFactory) || null;

// Sidebar module alias (loaded from ui/sidebar.js)
const SidebarModule = (window.OnePromptUI && window.OnePromptUI.sidebar) || null;

// Services Modal module alias (loaded from ui/services-modal.js)
const ServicesModalModule = (window.OnePromptUI && window.OnePromptUI.servicesModal) || null;

// Resizer module alias (loaded from ui/resizer.js)
const ResizerModule = (window.OnePromptUI && window.OnePromptUI.resizer) || null;

// Mode Selection module alias (loaded from core/mode-selection.js)
const ModeSelectionModule = (window.OnePromptCore && window.OnePromptCore.modeSelection) || null;

// CRITICAL: Define window.selectMode early so that onclick handlers in mode-cards work
// This must be defined BEFORE init() is called, which renders the mode selection screen
window.selectMode = function (mode) {
  if (ModeSelectionModule) {
    ModeSelectionModule.selectMode(mode);
  } else {
    logger.error('ModeSelectionModule not loaded when selectMode called');
  }
};

// Clean AI response artifacts (citation markers, function call XML, etc.)
function cleanAIResponseText(text) {
  if (!text) return '';

  // Remove OpenAI citation markers in various formats:
  // - "citeturn0forecast0", "turn0search1" (full format)
  // - "cite" alone (truncated format)
  // - Concatenated: "citeturn0forecast0turn0forecast1"
  let cleaned = text;

  // Remove OpenAI internal special tokens (Unicode Private Use Area)
  // These often look like boxes or weird symbols:  
  cleaned = cleaned.replace(/[\uE000-\uF8FF]/g, '');

  // First pass: remove full patterns like "citeturn0forecast0", "turn0search1"
  cleaned = cleaned.replace(/(?:cite)?turn\d+(?:search|forecast|news|context|\w+)\d*/gi, '');

  // Second pass: remove standalone "cite" that appears alone (with optional leading dot/space)
  cleaned = cleaned.replace(/\s*\.?\s*\bcite\b\s*/gi, ' ');

  // Run multiple passes to catch any remaining concatenated markers
  let prevLength = 0;
  while (cleaned.length !== prevLength) {
    prevLength = cleaned.length;
    cleaned = cleaned.replace(/(?:cite)?turn\d+\w*\d*/gi, '');
  }

  // Remove function call XML from Grok reasoning models
  // Pattern: <function_calls>...</function_calls> with all content inside
  cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '');

  // Also remove standalone invoke/parameters XML tags if any remain
  cleaned = cleaned.replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, '');
  cleaned = cleaned.replace(/<parameters[^>]*>[\s\S]*?<\/parameters>/gi, '');

  // Remove citation markers like [1], [2], etc. - optional, keep if links work
  // cleaned = cleaned.replace(/\[\d+\]/g, '');

  // Clean up multiple consecutive spaces (but NOT newlines - preserve markdown formatting)
  cleaned = cleaned.replace(/[^\S\n]{2,}/g, ' ');

  // Clean up any trailing dots from removed citations
  cleaned = cleaned.replace(/\.\s*\./g, '.');

  return cleaned.trim();
}

// Re-clean all existing API message bubbles in the DOM
// Call this when switching sessions or when old messages need updating
function reCleanApiMessages() {
  document.querySelectorAll('.api-message.assistant.markdown-content').forEach(bubble => {
    // Get the text content and re-render
    const text = bubble.textContent || bubble.innerText;

    // Check for "cite", "turn", or Private Use Area characters
    if (text && (/(?:cite)?turn\d+/i.test(text) || /\bcite\b/i.test(text) || /[\uE000-\uF8FF]/.test(text))) {
      const cleanedHtml = renderMarkdown(text);
      bubble.innerHTML = cleanedHtml;

      // Re-attach link handlers
      bubble.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            window.electronAPI.openExternal(href);
          }
        });
        link.style.color = 'inherit';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
      });
    }
  });
}

// Markdown rendering using marked.js + DOMPurify (local libs loaded in index.html)
function renderMarkdown(text) {
  if (!text) return '';

  // First, clean AI-specific artifacts
  let cleanedText = cleanAIResponseText(text);

  // Fix Gemini/Grok formatting issues:
  // 1. Insert newline before ANY heading # that doesn't have one (Grok issue)
  cleanedText = cleanedText.replace(/([^\n])(#{1,6}\s+[A-Z0-9])/g, '$1\n\n$2');
  // 2. Insert newline after punctuation before headings
  cleanedText = cleanedText.replace(/([.!?])\s*(#{1,6}\s)/g, '$1\n\n$2');
  // 3. Insert newline after punctuation before bold titles
  cleanedText = cleanedText.replace(/([.!?])\s*(\*\*[^*]+:\*\*)/g, '$1\n\n$2');
  // 4. Bold text followed by single newline should have double newline
  cleanedText = cleanedText.replace(/(\*\*[^*]+\*\*)\n(?!\n)/g, '$1\n\n');
  // 5. Headings followed by single newline should have double newline
  cleanedText = cleanedText.replace(/(#{1,6}\s+[^\n]+)\n(?!\n)/g, '$1\n\n');

  // Check if marked is available
  if (typeof marked !== 'undefined') {
    // Configure marked
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // Parse markdown to HTML
    const rawHtml = marked.parse(cleanedText);

    // CRITICAL: Sanitize HTML to prevent XSS attacks
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(rawHtml);
    }

    // Fallback if DOMPurify not loaded (should not happen)
    logger.warn('[OnePrompt] DOMPurify not loaded - returning raw HTML');
    return rawHtml;
  }

  // Fallback: return text with basic formatting
  return cleanedText.replace(/\n/g, '<br>');
}

// State management
let aiConfigs = {};
let loadedWebviews = new Set();
let webviewInstances = {}; // Map sessionId → { aiKey → webview element }
// Default to ChatGPT, Perplexity, Claude, and Gemini for fresh installations (web mode)
let configuredAIs = new Set(JSON.parse(localStorage.getItem('oneprompt-configured-services') || '["chatgpt", "perplexity", "claude", "gemini"]'));
// Default to ChatGPT, Gemini, and Claude for API mode
let configuredApiAIs = new Set(JSON.parse(localStorage.getItem('oneprompt-configured-api-services') || '["chatgpt", "gemini", "claude"]'));

// API History limit (sliding window: 6 user/assistant exchanges = 12 messages)
const API_HISTORY_LIMIT = 12;

// Webview zoom state - tracks the currently focused webview for zoom controls
let focusedWebview = null;
let webviewZoomLevels = {}; // Map aiKey → zoomLevel (persisted per webview)

// Default Cross-Check prompt template
const DEFAULT_CROSS_CHECK_TEMPLATE = `I've collected responses from several AIs, including yours, regarding my last request:

{{OTHER_RESPONSES}}

Compare them objectively. Be honest and acknowledge if another AI provided a better or more accurate answer. Respond in the same language as my original request.`;

// Get cross-check template from localStorage or use default
function getCrossCheckTemplate() {
  return localStorage.getItem('oneprompt-crosscheck-template') || DEFAULT_CROSS_CHECK_TEMPLATE;
}

// AI display names for cross-check prompts
const AI_DISPLAY_NAMES = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  deepseek: 'DeepSeek'
};

// i18n Module alias (loaded from core/i18n.js)
// Falls back to local functions if module not loaded
const I18nModule = (window.OnePromptCore && window.OnePromptCore.i18n) || null;

// i18n - Internazionalizzazione (fallback if module not loaded)
function detectLanguage() {
  if (I18nModule) return I18nModule.detectLanguage();
  
  const stored = localStorage.getItem('oneprompt-language');
  if (stored) return stored;

  // Detect from browser/system language
  const navLang = navigator.language.split('-')[0];
  const supported = ['en', 'es', 'it', 'fr', 'de', 'pt', 'tr'];

  if (supported.includes(navLang)) {
    return navLang;
  }

  return null; // Return null to trigger language selection modal
}

let currentLanguage = detectLanguage();
let translations = {};

async function loadTranslations(lang) {
  if (I18nModule) {
    I18nModule.setCurrentLanguage(lang);
    await I18nModule.loadTranslations(lang);
    return;
  }
  
  try {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
    translations[lang] = await response.json();
  } catch (error) {
    logger.error(`Error loading translations for ${lang}:`, error);
    // Fallback to empty object to prevent crashes
    translations[lang] = {};
  }
}

function t(key, params = {}) {
  if (I18nModule) return I18nModule.t(key, params);
  
  let text = (translations[currentLanguage] && translations[currentLanguage][key]) || key;
  // Replace placeholders like {service} with actual values
  Object.keys(params).forEach(paramKey => {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
  });
  return text;
}

async function updateUILanguage() {
  // Ensure translations are loaded
  if (I18nModule) {
    if (!I18nModule.hasTranslations(currentLanguage)) {
      await I18nModule.loadTranslations(currentLanguage);
    }
  } else if (!translations[currentLanguage]) {
    await loadTranslations(currentLanguage);
  }

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const optionsAttr = el.getAttribute('data-i18n-options');
    const options = optionsAttr ? JSON.parse(optionsAttr) : {};
    el.textContent = t(key, options);
  });

  // Update titles (tooltips) with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });

  // Update placeholder
  const promptInput = document.getElementById('promptInput');
  if (promptInput) {
    const currentSession = getCurrentSession();
    const isApiMode = currentSession && currentSession.mode === 'api';
    promptInput.placeholder = t(isApiMode ? 'prompt.placeholder.api' : 'prompt.placeholder');
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

  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) copyBtn.title = t('copy');

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.title = t('send');

  const crossCheckBtn = document.getElementById('crossCheckBtn');
  if (crossCheckBtn) crossCheckBtn.title = t('crosscheck.tooltip');

  // Update AI response textareas placeholders
  document.querySelectorAll('.ai-response-textarea').forEach(textarea => {
    const wrapper = textarea.closest('.webview-wrapper');
    if (wrapper) {
      const aiKey = wrapper.dataset.aiKey;
      const config = aiConfigs[aiKey];
      if (config) {
        textarea.placeholder = t('response.placeholder', { service: config.name });
      }
    }
  });

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

// =====================================================
// THEME MANAGEMENT (module + fallback)
// =====================================================
const ThemeModule = window.OnePromptCore?.theme;

let currentTheme = ThemeModule ? ThemeModule.getCurrentTheme() : (localStorage.getItem('oneprompt-theme') || 'dark');

function applyTheme(theme) {
  if (ThemeModule) {
    ThemeModule.applyTheme(theme);
    currentTheme = ThemeModule.getCurrentTheme();
    return;
  }
  // Fallback inline
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
if (ThemeModule) {
  ThemeModule.init();
  currentTheme = ThemeModule.getCurrentTheme();
} else {
  applyTheme(currentTheme);
}

// =====================================================
// LAYOUT MODE (module)
// =====================================================
const LayoutModule = window.OnePromptCore?.layout;

// =====================================================
// SESSION MANAGEMENT (module + fallback)
// =====================================================
const SessionsModule = window.OnePromptCore?.sessions;

// =====================================================
// TABS MODULE
// =====================================================
const TabsModule = window.OnePromptCore?.tabs;

// Session/Tab management - use module state if available
let sessions = [];
let currentSessionId = null;
let sessionCounter = 0;

// Helper functions for sessions
function createNewSession(name = null, selectedAIsSet = null, mode = null) {
  // Use module if available
  if (SessionsModule) {
    // Sync module state with local state first
    SessionsModule.setSessions(sessions);
    const session = SessionsModule.createSession(name, selectedAIsSet, mode);
    sessionCounter = SessionsModule.getSessionCounter();
    return session;
  }
  
  // Fallback: inline implementation
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
    name: name || null,
    sessionNumber: nextNumber,
    selectedAIs: selectedAIsSet ? Array.from(selectedAIsSet) : [],
    mode: initialMode || null,
    chatUrls: {},
    apiChatHistory: {},
    promptDraft: '',
    createdAt: Date.now()
  };
}

function getCurrentSession() {
  // Use module state first (correct during module callbacks), fallback to local
  if (SessionsModule) {
    const moduleSession = SessionsModule.getCurrentSession();
    if (moduleSession) return moduleSession;
  }
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
        logger.error(`Errore cattura URL per ${aiKey}:`, e);
      }
    }
  });
}

function saveSessionsToStorage() {
  // Use module if available
  if (SessionsModule) {
    // Sync module state from module instead of pushing stale local state
    // sessions = SessionsModule.getSessions();
    // currentSessionId = SessionsModule.getCurrentSessionId();
    SessionsModule.saveSessionsToStorage(captureCurrentUrls);
    return;
  }
  
  // Fallback: inline implementation
  try {
    // Cattura gli URL correnti prima di salvare
    captureCurrentUrls();

    localStorage.setItem('oneprompt-sessions', JSON.stringify(sessions));
    localStorage.setItem('oneprompt-current-session', currentSessionId);
    localStorage.setItem('oneprompt-session-counter', sessionCounter.toString());
  } catch (error) {
    logger.error('Failed to save sessions to storage:', error);

    // Handle QuotaExceededError
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      logger.warn('Storage quota exceeded. Attempting to trim history...');

      // Strategy: Aggressively trim API history in all sessions
      let freed = false;
      sessions.forEach(s => {
        if (s.apiChatHistory) {
          Object.keys(s.apiChatHistory).forEach(key => {
            const hist = s.apiChatHistory[key];
            if (hist.length > 6) { // Keep only last ~3 exchanges
              s.apiChatHistory[key] = hist.slice(-6);
              freed = true;
            }
          });
        }
      });

      if (freed) {
        try {
          localStorage.setItem('oneprompt-sessions', JSON.stringify(sessions));
          logger.log('Sessions saved after trimming.');
        } catch (retryError) {
          logger.error('Still failed after trimming:', retryError);
        }
      }
    }
  }
}

function loadSessionsFromStorage() {
  // Use module if available
  if (SessionsModule) {
    const result = SessionsModule.loadSessionsFromStorage({
      defaultServices: ['chatgpt', 'perplexity'],
      defaultMode: 'web'
    });
    sessions = result.sessions;
    currentSessionId = result.currentSessionId;
    sessionCounter = result.sessionCounter;
    logger.log('[loadSessionsFromStorage] Loaded via module:', {
      count: sessions.length,
      currentSessionId,
      sessionCounter
    });
    return;
  }
  
  // Fallback: inline implementation
  const storedSessions = localStorage.getItem('oneprompt-sessions');
  if (storedSessions) {
    try {
      sessions = JSON.parse(storedSessions);
      currentSessionId = localStorage.getItem('oneprompt-current-session');
      sessionCounter = parseInt(localStorage.getItem('oneprompt-session-counter') || '0');
      logger.log('[loadSessionsFromStorage] Loaded sessions:', {
        count: sessions.length,
        currentSessionId,
        sessionCounter,
        sessionsWithApiHistory: sessions.filter(s => s.apiChatHistory && Object.keys(s.apiChatHistory).length > 0).length
      });
    } catch (error) {
      logger.error('[loadSessionsFromStorage] Failed to parse stored sessions:', error);
      sessions = [];
    }
  }

  // Inizializza con una sessione di default se non esistono sessioni
  if (sessions.length === 0) {
    // Default services for first run - always start with web mode as example
    const defaultServices = new Set(['chatgpt', 'perplexity', 'claude', 'gemini']);
    const defaultSession = createNewSession(null, defaultServices, 'web');
    sessions.push(defaultSession);
    currentSessionId = defaultSession.id;
    saveSessionsToStorage();
  } else {
    // Ensure currentSessionId points to a valid session
    const validSession = sessions.find(s => s.id === currentSessionId);
    if (!validSession) {
      // currentSessionId is invalid or null, set to first session
      currentSessionId = sessions[0].id;
      logger.log('[loadSessionsFromStorage] Fixed invalid currentSessionId, now:', currentSessionId);
    }
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

// Sync module state with local state after loading
if (SessionsModule) {
  SessionsModule.setSessions(sessions);
  SessionsModule.setCurrentSessionId(currentSessionId);
}

// Carica le AI selezionate dalla sessione corrente
let selectedAIs = new Set(getCurrentSession()?.selectedAIs || []);

// DOM elements
const promptInput = document.getElementById('promptInput');
const copyBtn = document.getElementById('copyBtn');
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
  logger.log('=== INIT STARTED ===');
  logger.log('[init] Current session ID:', currentSessionId);
  logger.log('[init] Sessions loaded:', sessions.length);
  logger.log('[init] Selected AIs:', Array.from(selectedAIs));
  const currentSession = getCurrentSession();
  if (currentSession) {
    logger.log('[init] Current session details:', {
      id: currentSession.id,
      mode: currentSession.mode,
      selectedAIs: currentSession.selectedAIs,
      hasApiChatHistory: !!currentSession.apiChatHistory,
      apiHistoryKeys: currentSession.apiChatHistory ? Object.keys(currentSession.apiChatHistory) : [],
      apiHistoryCount: currentSession.apiChatHistory 
        ? Object.entries(currentSession.apiChatHistory).map(([k, v]) => `${k}: ${v?.length || 0}`).join(', ')
        : 'none'
    });
  }

  try {
    // Carica le configurazioni delle AI
    aiConfigs = await window.electronAPI.getAIConfigs();
    logger.log('AI Configs:', aiConfigs);

    // Rimuovi servizi "coming soon" da configuredAIs se presenti
    const comingSoonServices = Object.entries(aiConfigs)
      .filter(([_, config]) => config.comingSoon)
      .map(([key, _]) => key);

    comingSoonServices.forEach(aiKey => {
      if (configuredAIs.has(aiKey)) {
        configuredAIs.delete(aiKey);
        logger.log(`[OnePrompt] Removed coming-soon service from configured: ${aiKey}`);
      }
    });
    localStorage.setItem('oneprompt-configured-services', JSON.stringify([...configuredAIs]));

    // Initialize tabs module if available
    if (TabsModule) {
      TabsModule.initTabs({
        tabList: tabList,
        tabBar: tabBar,
        callbacks: {
          renderSidebar: () => renderSidebar(),
          renderWebviews: () => renderWebviews(),
          updateCopyButton: () => updateCopyButton(),
          updateCrossCheckVisibility: () => updateCrossCheckButtonVisibility(),
          updatePromptButtons: () => updatePromptButtons(),
          getSelectedAIs: () => selectedAIs,
          setSelectedAIs: (newSet) => { selectedAIs = newSet; },
          // Use renderer.js version to ensure state sync between local and module
          createNewSessionAndSwitch: () => createNewSessionAndSwitch()
        }
      });
      logger.log('[init] Tabs module initialized');
    }

    // Initialize webview factory module if available
    if (WebviewFactoryModule) {
      WebviewFactoryModule.initWebviewFactory({
        webviewZoomLevels: webviewZoomLevels,
        loadedWebviews: loadedWebviews,
        getCurrentSession: getCurrentSession,
        getCurrentSessionId: () => currentSessionId,
        aiConfigs: aiConfigs
      });
      logger.log('[init] WebviewFactory module initialized');
    }

    // Initialize sidebar module if available
    if (SidebarModule) {
      SidebarModule.initSidebar({
        sidebarNav: sidebarNav,
        aiConfigs: aiConfigs,
        getSelectedAIs: () => selectedAIs,
        getConfiguredAIs: () => configuredAIs,
        getConfiguredApiAIs: () => configuredApiAIs,
        getCurrentSession: getCurrentSession,
        toggleAISelection: toggleAISelection,
        aiServicesModule: AIServicesModule
      });
      logger.log('[init] Sidebar module initialized');
    }

    // Initialize services modal module if available
    if (ServicesModalModule) {
      ServicesModalModule.initServicesModal({
        servicesModal: servicesModal,
        servicesGrid: servicesGrid,
        aiConfigs: aiConfigs,
        getSelectedAIs: () => selectedAIs,
        getConfiguredAIs: () => configuredAIs,
        getConfiguredApiAIs: () => configuredApiAIs,
        getCurrentSession: getCurrentSession,
        saveSelectedAIs: saveSelectedAIs,
        updateSidebarState: updateSidebarState,
        renderWebviews: renderWebviews,
        updateCopyButton: updateCopyButton,
        renderSidebar: renderSidebar,
        updateSidebarButtonState: updateSidebarButtonState,
        updateCrossCheckVisibility: updateCrossCheckButtonVisibility,
        aiServicesModule: AIServicesModule,
        i18nModule: I18nModule
      });
      logger.log('[init] ServicesModal module initialized');
    }

    // Initialize mode selection module if available
    if (ModeSelectionModule) {
      ModeSelectionModule.initModeSelection({
        getSelectedAIs: () => selectedAIs,
        getConfiguredApiAIs: () => configuredApiAIs,
        getCurrentSession: getCurrentSession,
        saveSelectedAIs: saveSelectedAIs,
        saveSessionsToStorage: saveSessionsToStorage,
        renderSidebar: renderSidebar,
        renderWebviews: renderWebviews,
        updatePromptButtons: updatePromptButtons,
        updateCrossCheckVisibility: updateCrossCheckButtonVisibility,
        aiServicesModule: AIServicesModule,
        i18nModule: I18nModule
      });
      logger.log('[init] ModeSelection module initialized');
    }

    // Renderizza le tab
    renderTabs();
    logger.log('Tabs rendered');

    // Crea i pulsanti sidebar per ogni AI
    renderSidebar();
    logger.log('Sidebar rendered');

    // Renderizza le webview iniziali (solo quelle selezionate)
    renderWebviews();
    logger.log('Webviews rendered');

    // Initialize resizers for webview panels
    if (ResizerModule) {
      ResizerModule.initResizers();
      logger.log('Resizers initialized');
    }

    // Imposta la lingua iniziale
    if (currentLanguage === null) {
      // No language detected or stored - show selection modal
      currentLanguage = 'en'; // Temporary fallback for modal UI
      if (I18nModule) I18nModule.setCurrentLanguage('en');
      await loadTranslations(currentLanguage);
      updateUILanguage();
      showLanguageSelectionModal();
    } else {
      languageSelect.value = currentLanguage;
      await loadTranslations(currentLanguage);
      updateUILanguage();
    }

    // Setup event listeners
    setupEventListeners();
    setupScrollListeners();
    setupUpdateHandlers();

    // Initialize layout mode
    if (LayoutModule) {
      LayoutModule.initLayoutMode();
    }

    // Initialize cross-check toggle badge
    initCrossCheckToggle();

    // Update cross-check button visibility
    updateCrossCheckButtonVisibility();

    // Update prompt button visibility based on mode
    updatePromptButtons();

    // Restore prompt draft from saved session
    const currentSession = getCurrentSession();
    if (currentSession && promptInput) {
      // Always restore promptDraft, even if empty (to clear the field)
      promptInput.value = currentSession.promptDraft || '';
      updatePromptButtons(); // Update buttons after restoring text
    }

    // Set version in settings
    const version = await window.electronAPI.getAppVersion();
    const versionEl = document.getElementById('appVersion');
    if (versionEl) {
      versionEl.textContent = `v${version}`;
    }

    logger.log('=== INIT COMPLETED ===');
  } catch (error) {
    logger.error('Errore durante l\'inizializzazione:', error);
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
  // Use module if available and initialized
  if (TabsModule && tabList && tabBar) {
    // Sync module state with local state
    if (SessionsModule) {
      SessionsModule.setSessions(sessions);
      SessionsModule.setCurrentSessionId(currentSessionId);
    }
    TabsModule.renderTabs();
    return;
  }

  // Fallback: inline implementation
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

  // Dopo il rendering delle tab, assicurati che quella attiva sia visibile
  scrollToActiveTab();
}

// Scorre la tab attiva in vista se necessario
function scrollToActiveTab() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
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
  // Use module if available
  if (TabsModule && SessionsModule) {
    // Sync state before calling module
    SessionsModule.setSessions(sessions);
    SessionsModule.setCurrentSessionId(currentSessionId);
    TabsModule.switchToSession(sessionId);
    // Sync local state after module call
    currentSessionId = SessionsModule.getCurrentSessionId();
    return;
  }

  // Fallback: inline implementation
  if (sessionId === currentSessionId) return;

  // Save current session's prompt draft and response texts before switching
  const currentSession = getCurrentSession();
  const promptInput = document.getElementById('promptInput');
  if (currentSession && promptInput) {
    currentSession.promptDraft = promptInput.value;
  }
  
  // Save ai-response-textarea values for current session before switching
  if (currentSession && currentSession.mode === 'web') {
    if (!currentSession.responseTexts) {
      currentSession.responseTexts = {};
    }
    document.querySelectorAll(`.webview-wrapper[data-session-id="${currentSessionId}"] .ai-response-textarea`).forEach(textarea => {
      const wrapper = textarea.closest('.webview-wrapper');
      if (wrapper && textarea.value.trim()) {
        const aiKey = wrapper.dataset.aiKey;
        currentSession.responseTexts[aiKey] = textarea.value;
      }
    });
  }

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
  updateCopyButton();
  updateCrossCheckButtonVisibility();

  // Restore prompt draft and placeholder for the new session
  if (promptInput) {
    promptInput.value = session.promptDraft || '';
    const isApiMode = session && session.mode === 'api';
    promptInput.placeholder = t(isApiMode ? 'prompt.placeholder.api' : 'prompt.placeholder');
  }
  updatePromptButtons();
}

// Aggiorna lo stato della sidebar in base alla sessione corrente
function updateSidebarState() {
  // Use module if available
  if (SidebarModule) {
    SidebarModule.syncState({ selectedAIs: selectedAIs });
    SidebarModule.updateSidebarState();
    return;
  }
  
  // Fallback: inline implementation
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
  // Use module if available
  if (TabsModule && SessionsModule) {
    // Sync state before calling module
    SessionsModule.setSessions(sessions);
    SessionsModule.setCurrentSessionId(currentSessionId);
    TabsModule.closeSession(sessionId);
    // Sync local state after module call
    sessions = SessionsModule.getSessions();
    currentSessionId = SessionsModule.getCurrentSessionId();
    return;
  }

  // Fallback: inline implementation
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
  updateCopyButton();
}

// Crea nuova sessione
function createNewSessionAndSwitch() {
  // Use module if available
  if (TabsModule && SessionsModule) {
    // Sync state before calling module
    SessionsModule.setSessions(sessions);
    SessionsModule.setCurrentSessionId(currentSessionId);
    TabsModule.createNewSessionAndSwitch();
    // Sync local state after module call
    sessions = SessionsModule.getSessions();
    currentSessionId = SessionsModule.getCurrentSessionId();
    return;
  }

  // Fallback: inline implementation
  // Limite massimo di 20 tab
  if (sessions.length >= 20) {
    alert(t('error.maxTabs') || 'Massimo 20 tab consentite');
    return;
  }

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
  updateCopyButton();
}

// === MODALE SERVIZI ===

// Apri modale servizi - delegates to module
function openServicesModal() {
  if (ServicesModalModule) {
    ServicesModalModule.openServicesModal();
  }
}

// Chiudi modale servizi - delegates to module
function closeServicesModalFn() {
  if (ServicesModalModule) {
    ServicesModalModule.closeServicesModal();
  }
}

// === LANGUAGE SELECTION MODAL ===

const languageSelectionModal = document.getElementById('languageSelectionModal');
const languagesGrid = document.getElementById('languagesGrid');

const languageConfig = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'tr', name: 'Türkçe' }
];

function renderLanguageSelectionModal() {
  languagesGrid.innerHTML = '';

  languageConfig.forEach(lang => {
    const card = document.createElement('div');
    card.className = 'language-card';
    card.dataset.lang = lang.code;

    card.innerHTML = `
      <div class="language-name">${lang.name}</div>
    `;

    card.addEventListener('click', async () => {
      await selectLanguage(lang.code);
    });

    languagesGrid.appendChild(card);
  });
}

async function selectLanguage(langCode) {
  // Save selected language
  currentLanguage = langCode;
  if (I18nModule) I18nModule.setCurrentLanguage(langCode);
  localStorage.setItem('oneprompt-language', langCode);

  // Load translations and update UI
  await loadTranslations(langCode);
  updateUILanguage();

  // Update language selector in settings
  languageSelect.value = langCode;

  // Close modal
  languageSelectionModal.style.display = 'none';

  logger.log(`Language selected: ${langCode}`);
}

function showLanguageSelectionModal() {
  renderLanguageSelectionModal();
  languageSelectionModal.style.display = 'flex';
}

// Close language modal button
const closeLanguageModalBtn = document.getElementById('closeLanguageModal');
if (closeLanguageModalBtn) {
  closeLanguageModalBtn.addEventListener('click', () => {
    // Default to English if user closes without selecting
    if (!currentLanguage) {
      selectLanguage('en');
    } else {
      languageSelectionModal.style.display = 'none';
    }
  });
}

// Apri modale impostazioni
function openSettingsModal() {
  settingsModal.style.display = 'flex';

  // Reload cross-check template from storage (to show last valid saved value)
  const templateTextarea = document.getElementById('crossCheckPromptTemplate');
  const errorMsg = document.getElementById('crossCheckPromptError');
  if (templateTextarea) {
    templateTextarea.value = getCrossCheckTemplate();
    // Hide error message since we're loading a valid template
    if (errorMsg) {
      errorMsg.style.display = 'none';
    }
  }
}
// Expose to window for onclick handlers in translated strings
window.openSettingsModal = openSettingsModal;

// Chiudi modale impostazioni
function closeSettingsModalFn() {
  settingsModal.style.display = 'none';
}

// Render griglia servizi - delegates to module
function renderServicesGrid(mode = 'web') {
  if (ServicesModalModule) {
    ServicesModalModule.renderServicesGrid(mode);
  }
}

// Toggle servizio abilitato/disabilitato - delegates to module
function toggleServiceEnabled(aiKey, cardElement, mode = 'web') {
  if (ServicesModalModule) {
    ServicesModalModule.toggleServiceEnabled(aiKey, cardElement, mode);
  }
}

// Toggle AI selection - delegates to module
function toggleAISelection(aiKey) {
  if (ServicesModalModule) {
    ServicesModalModule.toggleAISelection(aiKey);
  }
}

// Render webviews (solo quelle selezionate)
async function renderWebviews() {
  // Reset classe grid
  webviewGrid.className = 'webview-grid';
  
  // Re-apply layout mode after reset
  if (LayoutModule) {
    LayoutModule.applyLayoutMode(LayoutModule.getLayoutMode());
  }

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

    // Note: If no mode is set and defaultMode is not set or is 'ask', 
    // we show the mode selection screen (handled below in the !mode check)

    // Helper to sanitize translations for usage in HTML strings
    const safeT = (key) => {
      const text = t(key);
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      }
      return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    if (!mode) {
      // Show Mode Selection Screen
      placeholder.innerHTML = `
            <div class="mode-selection-container">
                <div class="mode-cards">
                    <div class="mode-card" onclick="selectMode('web')">
                        <div class="mode-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </div>
                        <div class="mode-title">${safeT('mode.web.title')}</div>
                        <div class="mode-desc">${safeT('mode.web.desc')}</div>
                    </div>
                    <div class="mode-card" onclick="selectMode('api')">
                        <div class="mode-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                        </div>
                        <div class="mode-title">${safeT('mode.api.title')}</div>
                        <div class="mode-desc">${safeT('mode.api.desc')}</div>
                    </div>
                </div>
                <div class="mode-remember">
                    <label class="toggle-switch">
                        <input type="checkbox" id="rememberModeToggle">
                        <span class="toggle-slider"></span>
                    </label>
                    <span>${safeT('mode.remember')}</span>
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
                <h3 class="placeholder-title">${safeT('placeholder.title')}</h3>
                <p style="color: var(--text-secondary); margin-top: 10px;">${safeT('placeholder.subtitle')}</p>
            </div>
         `;
    } else {
      // Web Mode (Default Placeholder)
      placeholder.innerHTML = `
          <div class="placeholder-content">
            <div class="placeholder-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="5 5"></rect>
                <path d="M12 8v8M8 12h8" stroke-dasharray="none"></path>
              </svg>
            </div>
            <h3 class="placeholder-title">${safeT('placeholder.title')}</h3>
            <p style="color: var(--text-secondary); margin-top: 10px;">${safeT('placeholder.subtitle')}</p>
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
      logger.warn(`[OnePrompt] Config not found for AI: ${aiKey}`);
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
          ${config.logo ? `<img src="${config.logo}" style="width: 16px; height: 16px; object-fit: contain;">` : config.icon}
          ${config.name}
        </div>
        <div class="webview-header-close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      `;

      wrapper.appendChild(header);

      // Close button event listener
      const closeBtn = header.querySelector('.webview-header-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAISelection(aiKey);
      });

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

      // Add response textarea container for manual paste (Web Mode only)
      if (mode === 'web') {
        const textareaContainer = document.createElement('div');
        textareaContainer.className = 'ai-response-container';

        const responseTextarea = document.createElement('textarea');
        responseTextarea.className = 'ai-response-textarea';
        responseTextarea.placeholder = t('response.placeholder', { service: config.name }) || `Paste your ${config.name} response here...`;
        responseTextarea.rows = 3;

        textareaContainer.appendChild(responseTextarea);
        wrapper.appendChild(textareaContainer);
      }

      // Set order
      wrapper.style.order = index;
      webviewGrid.appendChild(wrapper);

      // Add resizer handle to the new wrapper
      if (ResizerModule) {
        ResizerModule.addResizerToWrapper(wrapper);
      }
    } else {
      // Il wrapper esiste già, mostralo
      wrapper.style.display = 'flex';

      // Update order without moving in DOM (prevents reload)
      wrapper.style.order = index;

      // Check if content matches current mode - if not, recreate it
      const existingApiPanel = wrapper.querySelector('.api-panel');
      const existingWebview = wrapper.querySelector('webview');
      const sessionWebviews = getCurrentSessionWebviews();
      
      if (mode === 'api' && !existingApiPanel) {
        // Need API panel but have webview - recreate
        if (existingWebview) {
          existingWebview.remove();
        }
        const textareaContainer = wrapper.querySelector('.ai-response-container');
        if (textareaContainer) {
          textareaContainer.style.display = 'none';
        }
        const apiPanel = createApiPanel(aiKey);
        // Insert after header
        const header = wrapper.querySelector('.webview-header');
        if (header && header.nextSibling) {
          wrapper.insertBefore(apiPanel, header.nextSibling);
        } else {
          wrapper.appendChild(apiPanel);
        }
        sessionWebviews[aiKey] = apiPanel;
      } else if (mode === 'web' && !existingWebview) {
        // Need webview but have API panel - recreate
        if (existingApiPanel) {
          existingApiPanel.remove();
        }
        const webview = await createWebview(aiKey);
        // Insert after header
        const header = wrapper.querySelector('.webview-header');
        if (header && header.nextSibling) {
          wrapper.insertBefore(webview, header.nextSibling);
        } else {
          wrapper.appendChild(webview);
        }
        sessionWebviews[aiKey] = webview;
      }

      // Handle ai-response-container visibility based on mode
      let textareaContainer = wrapper.querySelector('.ai-response-container');
      if (mode === 'web') {
        // Web Mode: ensure textarea container exists
        if (!textareaContainer) {
          textareaContainer = document.createElement('div');
          textareaContainer.className = 'ai-response-container';

          const responseTextarea = document.createElement('textarea');
          responseTextarea.className = 'ai-response-textarea';
          responseTextarea.placeholder = t('response.placeholder', { service: config.name }) || `Paste your ${config.name} response here...`;
          responseTextarea.rows = 3;

          textareaContainer.appendChild(responseTextarea);
          wrapper.appendChild(textareaContainer);
        } else {
          textareaContainer.style.display = 'block';
        }
      } else {
        // API Mode: hide textarea container if exists
        if (textareaContainer) {
          textareaContainer.style.display = 'none';
        }
      }

      // Only append if not already in grid (should not happen if found by querySelector)
      if (!wrapper.parentElement) {
        webviewGrid.appendChild(wrapper);
      }
    }
    index++;
  }

  // Re-clean any existing API messages that might have citation artifacts
  // Use module if available, fallback to local function
  if (MarkdownModule) {
    MarkdownModule.reCleanApiMessages();
  } else {
    reCleanApiMessages();
  }
  
  // Restore saved textarea contents for this session
  if (currentSession && currentSession.responseTexts && mode === 'web') {
    Object.keys(currentSession.responseTexts).forEach(aiKey => {
      const wrapper = document.querySelector(`.webview-wrapper[data-session-id="${currentSessionId}"][data-ai-key="${aiKey}"]`);
      if (wrapper) {
        const textarea = wrapper.querySelector('.ai-response-textarea');
        if (textarea && !textarea.value) {
          textarea.value = currentSession.responseTexts[aiKey];
        }
      }
    });
  }

  // Update cross-check visibility after rendering
  updateCrossCheckVisibility();

  // Reinitialize all resizers after all wrappers have been rendered
  // This ensures resizers are correct whether wrappers were created or shown
  if (ResizerModule) {
    setTimeout(() => {
      ResizerModule.initResizers();
    }, 150);
  }
}

// Create webview - uses module if available, fallback to inline
async function createWebview(aiKey) {
  // Use module if available
  if (WebviewFactoryModule) {
    return WebviewFactoryModule.createWebview(aiKey);
  }
  
  // Fallback: inline implementation
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
  webview.setAttribute('allowpopups', 'false');
  webview.setAttribute('preload', `file://${preloadPath}`);
  // Security: disable node integration and enable context isolation
  webview.setAttribute('nodeintegration', 'false');
  webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no');
  webview.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
  webview.style.width = '100%';
  webview.style.height = '100%';

  // Listen for zoom controls from webview
  webview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'zoom-change') {
      const direction = event.args[0];
      const targetWebview = event.target;
      const targetAiKey = targetWebview.getAttribute('data-ai-key') || aiKey;

      if (webviewZoomLevels[targetAiKey] === undefined) {
        webviewZoomLevels[targetAiKey] = 0;
      }

      if (direction === 'in') {
        webviewZoomLevels[targetAiKey] = Math.min(webviewZoomLevels[targetAiKey] + 0.5, 5);
      } else if (direction === 'out') {
        webviewZoomLevels[targetAiKey] = Math.max(webviewZoomLevels[targetAiKey] - 0.5, -5);
      } else if (direction === 'reset') {
        webviewZoomLevels[targetAiKey] = 0;
      }

      targetWebview.setZoomLevel(webviewZoomLevels[targetAiKey]);
      logger.log(`[Zoom] ${targetAiKey}: level ${webviewZoomLevels[targetAiKey]}`);
    }
  });

  // Event listeners
  webview.addEventListener('did-finish-load', () => {
    logger.log(`${config.name} - caricamento completato`);
    loadedWebviews.add(aiKey);
    updateWebviewStatus(aiKey, 'ready');
  });

  webview.addEventListener('did-fail-load', (e) => {
    logger.error(`${config.name} - errore caricamento:`, e);
  });

  return webview;
}

// Update webview status in header - uses module if available
function updateWebviewStatus(aiKey, status) {
  // Use module if available
  if (WebviewFactoryModule) {
    WebviewFactoryModule.updateWebviewStatus(aiKey, status, currentSessionId);
    return;
  }
  
  // Fallback: inline implementation
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

// Render sidebar buttons - uses module if available, fallback to inline
function renderSidebar() {
  // Use module if available
  if (SidebarModule) {
    SidebarModule.syncState({
      selectedAIs: selectedAIs,
      configuredAIs: configuredAIs,
      configuredApiAIs: configuredApiAIs,
      aiConfigs: aiConfigs
    });
    SidebarModule.renderSidebar();
    return;
  }
  
  // Fallback: inline implementation
  sidebarNav.innerHTML = '';

  const currentSession = getCurrentSession();
  const mode = currentSession ? currentSession.mode : 'web';
  const apiServices = AIServicesModule ? AIServicesModule.getApiServices() : ['chatgpt', 'gemini', 'claude'];

  // Mostra solo i servizi configurati nella sidebar
  Object.entries(aiConfigs).forEach(([key, config]) => {
    let isConfigured = false;
    if (mode === 'api') {
      // In API mode, check configuredApiAIs AND if it's an API service
      if (configuredApiAIs.has(key) && apiServices.includes(key)) {
        isConfigured = true;
      }
    } else {
      // In Web mode, check configuredAIs
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

// Gestione indicatori di scroll - uses module if available
function updateScrollIndicators() {
  if (SidebarModule) {
    SidebarModule.updateScrollIndicators();
    return;
  }
  
  // Fallback: inline implementation
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

// Setup scroll listeners - uses module if available
function setupScrollListeners() {
  if (SidebarModule) {
    SidebarModule.setupScrollListeners();
    return;
  }
  
  // Fallback: inline implementation
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

// Create sidebar button - inline only (module uses internal function)
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
  const mode = currentSession ? currentSession.mode : 'web';

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

  // Security fix: avoid innerHTML injection in onerror handler
  const iconHtml = config.logo
    ? `<img src="${config.logo}" alt="${config.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span class="icon-fallback" style="display:none;">${config.icon}</span>`
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

// Update sidebar button state - uses module if available
function updateSidebarButtonState(aiKey) {
  if (SidebarModule) {
    SidebarModule.syncState({ selectedAIs: selectedAIs });
    SidebarModule.updateSidebarButtonState(aiKey);
    return;
  }
  
  // Fallback: inline implementation
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
  promptInput.addEventListener('input', updatePromptButtons);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentSession = getCurrentSession();
      const isApiMode = currentSession && currentSession.mode === 'api';
      if (isApiMode) {
        if (!sendBtn.disabled) {
          sendPromptToSelectedAIs();
        }
      } else {
        if (!copyBtn.disabled) {
          copyPromptToClipboard();
        }
      }
    }
  });

  // Copy button (Web Mode)
  copyBtn.addEventListener('click', copyPromptToClipboard);

  // Send button (API Mode)
  sendBtn.addEventListener('click', sendPromptToSelectedAIs);

  // New session button
  newSessionBtn.addEventListener('click', createNewSessionAndSwitch);

  // Add service button - apri modale
  addServiceBtn.addEventListener('click', openServicesModal);

  // Close modal button (X icon)
  closeServicesModal.addEventListener('click', closeServicesModalFn);

  // Close modal button (Done button in footer)
  const closeServicesModalDone = document.getElementById('closeServicesModalDone');
  if (closeServicesModalDone) {
    closeServicesModalDone.addEventListener('click', closeServicesModalFn);
  }

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
    if (I18nModule) I18nModule.setCurrentLanguage(currentLanguage);
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

// Update prompt buttons state based on mode
function updatePromptButtons() {
  const hasPrompt = promptInput.value.trim().length > 0;
  const hasSelection = selectedAIs.size > 0;
  const currentSession = getCurrentSession();
  const isApiMode = currentSession && currentSession.mode === 'api';

  // Update placeholder based on mode
  // Web Mode: copy-paste only, API Mode: write and send
  promptInput.placeholder = t(isApiMode ? 'prompt.placeholder.api' : 'prompt.placeholder');

  if (isApiMode) {
    // API Mode: show sendBtn, hide copyBtn
    copyBtn.style.display = 'none';
    sendBtn.style.display = 'flex';
    sendBtn.disabled = !(hasPrompt && hasSelection);
  } else {
    // Web Mode: show copyBtn, hide sendBtn
    copyBtn.style.display = 'flex';
    sendBtn.style.display = 'none';
  }
}

// Alias for backward compatibility
function updateCopyButton() {
  updatePromptButtons();
}

// Copy prompt to clipboard
async function copyPromptToClipboard() {
  let prompt = promptInput.value.trim();

  // If empty, use placeholder text
  if (!prompt) {
    prompt = promptInput.placeholder;
  }

  try {
    await navigator.clipboard.writeText(prompt);

    // Show success message with translation
    const message = t('copy.success');
    showNotification(message, 'success');

  } catch (error) {
    logger.error('Error copying to clipboard:', error);
    showNotification(t('copy.error'), 'error');
  }
}

// =====================================================
// NOTIFICATIONS (module + fallback)
// =====================================================
const NotificationsModule = window.OnePromptUI?.notifications;

function showNotification(message, type = 'info') {
  if (NotificationsModule) {
    NotificationsModule.show(message, type);
    return;
  }
  // Fallback inline
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// Send prompt to selected AIs
async function sendPromptToSelectedAIs() {
  const prompt = promptInput.value.trim();

  if (!prompt || selectedAIs.size === 0) {
    return;
  }

  try {
    // Ottieni le webview della sessione corrente
    const sessionWebviews = getCurrentSessionWebviews();
    const currentSession = getCurrentSession();
    const isApiMode = currentSession && currentSession.mode === 'api';
    const aiKeys = Array.from(selectedAIs);

    // Clear prompt input IMMEDIATELY after send button click
    promptInput.value = '';
    updatePromptButtons();

    // Send prompt to all selected AIs
    const promises = aiKeys.map(async aiKey => {
      const webview = sessionWebviews[aiKey];
      if (!webview) {
        logger.error(`Webview for ${aiKey} not found in current session`);
        return;
      }

      // Aspetta che sia caricata (solo per Web Mode)
      if (!isApiMode) {
        await ensureWebviewLoaded(aiKey, webview);
      }

      // Send via IPC to webview or Handle API
      if (isApiMode) {
        logger.log(`[${Date.now()}] Handling API chat for ${aiKey}...`);

        // Save USER message to history explicitly before calling handler
        // The handler will display it, but we ensure it's in storage
        saveApiHistory(aiKey, 'user', prompt);

        // Fire and forget - all requests start in parallel
        handleApiChat(aiKey, prompt, webview);
      }
      // Web Mode: user copies prompt manually via copyBtn
    });

    await Promise.all(promises);

  } catch (error) {
    logger.error('Errore invio prompt:', error);
  }
}

// Ensure webview is loaded
async function ensureWebviewLoaded(aiKey, webview) {
  if (loadedWebviews.has(aiKey)) return;

  logger.log(`Waiting for ${aiKey} to load...`);
  updateWebviewStatus(aiKey, 'thinking');

  await new Promise(resolve => {
    const onLoaded = () => {
      webview.removeEventListener('did-finish-load', onLoaded);
      logger.log(`${aiKey} loaded!`);
      resolve();
    };
    webview.addEventListener('did-finish-load', onLoaded);

    // Timeout fallback (15s)
    setTimeout(() => {
      webview.removeEventListener('did-finish-load', onLoaded);
      logger.log(`${aiKey} load timeout, continuing anyway...`);
      resolve();
    }, 15000);
  });

  // Extra delay for SPA hydration
  logger.log(`Waiting extra 2s for ${aiKey} SPA hydration...`);
  await new Promise(r => setTimeout(r, 2000));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Salva gli URL delle chat e i testi delle textarea quando l'app viene chiusa
window.addEventListener('beforeunload', () => {
  // Sync local state with module state before saving
  sessions = SessionsModule.getSessions();
  currentSessionId = SessionsModule.getCurrentSessionId();
  
  // Save textarea contents to current session
  const currentSession = getCurrentSession();
  if (currentSession) {
    // Save promptInput value (always save, even empty to clear previous text)
    if (promptInput) {
      currentSession.promptDraft = promptInput.value;
    }
    
    // Save ai-response-textarea values (only in web mode for one-prompt/private)
    // Filter by session-id to avoid mixing between tabs
    if (currentSession.mode === 'web') {
      if (!currentSession.responseTexts) {
        currentSession.responseTexts = {};
      }
      document.querySelectorAll(`.webview-wrapper[data-session-id="${currentSessionId}"] .ai-response-textarea`).forEach(textarea => {
        const wrapper = textarea.closest('.webview-wrapper');
        if (wrapper) {
          const aiKey = wrapper.dataset.aiKey;
          // Always save, even empty to clear previous text
          currentSession.responseTexts[aiKey] = textarea.value;
        }
      });
    }
  }
  
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

// Update Handling (Console only for public repo)
function setupUpdateHandlers() {
  window.electronAPI.onUpdateAvailable((info) => {
    logger.log('%c[OnePrompt] Update available: ' + info.version, 'color: #2563eb; font-weight: bold;');
    logger.log('[OnePrompt] New version available for download. Visit https://github.com/calabr93/one-prompt/releases');
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    logger.log('%c[OnePrompt] Update downloaded: ' + info.version, 'color: #10a37f; font-weight: bold;');
    logger.log('[OnePrompt] Update is ready to be installed on next restart.');
  });
}

// === MODE SELECTION & SETTINGS ===

// Note: window.selectMode is defined at the top of the file (after ModeSelectionModule)
// to ensure it's available when mode-cards are rendered in init()

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
    currentDefaultMode = 'ask'; // Default to always ask if not set
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

  // API Key and Model settings - use OnePromptCore bridge
  // In private repos, BYOK section can be hidden and replaced with managed keys

  // Only show BYOK settings if the bridge says so
  const byokSection = document.querySelector('.settings-tab-content#apiSettings');
  if (byokSection && !window.OnePromptCore.shouldShowBYOKSettings()) {
    // Hide BYOK section in private version (managed API keys)
    byokSection.style.display = 'none';
  }

  // OpenAI
  if (apiKeyOpenAI) {
    apiKeyOpenAI.value = window.OnePromptCore.getApiKey('chatgpt') || '';
    apiKeyOpenAI.addEventListener('input', (e) => window.OnePromptCore.setApiKey('chatgpt', e.target.value));
  }

  const modelOpenAI = document.getElementById('modelOpenAI');
  if (modelOpenAI) {
    modelOpenAI.value = window.OnePromptCore.getSelectedModel('chatgpt') || 'gpt-4o';
    modelOpenAI.addEventListener('change', (e) => window.OnePromptCore.setSelectedModel('chatgpt', e.target.value));
  }

  // Anthropic
  if (apiKeyAnthropic) {
    apiKeyAnthropic.value = window.OnePromptCore.getApiKey('claude') || '';
    apiKeyAnthropic.addEventListener('input', (e) => window.OnePromptCore.setApiKey('claude', e.target.value));
  }

  const modelAnthropic = document.getElementById('modelAnthropic');
  if (modelAnthropic) {
    modelAnthropic.value = window.OnePromptCore.getSelectedModel('claude') || 'claude-sonnet-4-5';
    modelAnthropic.addEventListener('change', (e) => window.OnePromptCore.setSelectedModel('claude', e.target.value));
  }

  // Google Gemini
  if (apiKeyGemini) {
    apiKeyGemini.value = window.OnePromptCore.getApiKey('gemini') || '';
    apiKeyGemini.addEventListener('input', (e) => window.OnePromptCore.setApiKey('gemini', e.target.value));
  }

  const modelGemini = document.getElementById('modelGemini');
  if (modelGemini) {
    modelGemini.value = window.OnePromptCore.getSelectedModel('gemini') || 'gemini-2.5-flash';
    modelGemini.addEventListener('change', (e) => window.OnePromptCore.setSelectedModel('gemini', e.target.value));
  }
}

// Initialize settings logic
initSettings();

// Cross-Check Button Logic
function initCrossCheckButton() {
  const crossCheckBtn = document.getElementById('crossCheckBtn');
  if (!crossCheckBtn) return;

  // Cross-Check button - gather responses and insert prompt
  crossCheckBtn.addEventListener('click', () => {
    // Get the cross-check template from settings
    let template = getCrossCheckTemplate();

    // Check current mode
    const currentSession = getCurrentSession();
    const isApiMode = currentSession && currentSession.mode === 'api';

    // Collect responses based on mode
    const responses = [];
    const webviewWrappers = document.querySelectorAll('.webview-wrapper');

    webviewWrappers.forEach(wrapper => {
      // Check if this webview is visible/active
      if (wrapper.style.display !== 'none') {
        const aiKey = wrapper.dataset.aiKey;

        if (isApiMode) {
          // API Mode: Extract from chat bubbles (last assistant message)
          const chatContainer = wrapper.querySelector('.api-chat-container');
          const aiName = AI_DISPLAY_NAMES[aiKey] || aiKey;

          if (chatContainer) {
            const assistantMessages = chatContainer.querySelectorAll('.api-message.assistant');
            if (assistantMessages.length > 0) {
              const lastMessage = assistantMessages[assistantMessages.length - 1];
              const responseText = lastMessage.textContent.trim();
              if (responseText && aiKey) {
                responses.push(`### ${aiName}'s Response:\n${responseText}`);
              } else {
                // No response text yet, add placeholder
                responses.push(`### ${aiName}'s Response:\n`);
              }
            } else {
              // No assistant messages yet, add placeholder
              responses.push(`### ${aiName}'s Response:\n`);
            }
          } else if (aiKey) {
            // No chat container yet, add placeholder
            responses.push(`### ${aiName}'s Response:\n`);
          }
        } else {
          // Web Mode: Extract from textarea (or use placeholder if empty)
          const textarea = wrapper.querySelector('.ai-response-textarea');
          if (textarea && aiKey) {
            const aiName = AI_DISPLAY_NAMES[aiKey] || aiKey;
            const responseText = textarea.value.trim() || textarea.placeholder;
            responses.push(`### ${aiName}'s Response:\n${responseText}`);
          }
        }
      }
    });

    // Format responses section
    const responsesSection = responses.length > 0
      ? '\n## Responses from Other AI Assistants:\n' + responses.join('\n\n') + '\n\n--- END OF RESPONSES ---\n'
      : '';

    // Replace {{OTHER_RESPONSES}} placeholder in template
    const finalPrompt = template.replace('{{OTHER_RESPONSES}}', responsesSection);

    // Insert into prompt input
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
      promptInput.value = finalPrompt;
      promptInput.focus();
      updatePromptButtons(); // Update button state after setting value

      if (isApiMode) {
        // API Mode: Just show notification, no clipboard copy
        showNotification(t('crosscheck.generated'), 'success');
      } else {
        // Web Mode: Copy to clipboard and clear textareas
        navigator.clipboard.writeText(finalPrompt).then(() => {
          // Clear all ai-response-textareas
          webviewWrappers.forEach(wrapper => {
            if (wrapper.style.display !== 'none') {
              const textarea = wrapper.querySelector('.ai-response-textarea');
              if (textarea) {
                textarea.value = '';
              }
            }
          });
          // Show success notification
          showNotification(t('copy.crosscheck.success'), 'success');
        }).catch(err => {
          logger.error('Error copying to clipboard:', err);
          showNotification(t('copy.error'), 'error');
        });
      }
    }
  });
}

// Cross Check Toggle state - default OFF for one-prompt
let crossCheckEnabled = localStorage.getItem('oneprompt-crosscheck-enabled') === 'true';

// Initialize Cross Check Toggle
function initCrossCheckToggle() {
  const toggle = document.getElementById('crossCheckToggle');
  if (!toggle) return;

  // Set initial state from storage
  toggle.checked = crossCheckEnabled;
  
  // Apply initial visibility
  updateCrossCheckVisibility();

  // Listen for changes
  toggle.addEventListener('change', (e) => {
    crossCheckEnabled = e.target.checked;
    localStorage.setItem('oneprompt-crosscheck-enabled', crossCheckEnabled.toString());
    updateCrossCheckVisibility();
  });
}

// Update visibility of cross-check button and response containers
function updateCrossCheckVisibility() {
  const crossCheckBtn = document.getElementById('crossCheckBtn');
  const responseContainers = document.querySelectorAll('.ai-response-container');
  const currentSession = getCurrentSession();
  const isApiMode = currentSession && currentSession.mode === 'api';

  // Cross Check Button - show only in WEB mode when enabled
  if (crossCheckBtn) {
    crossCheckBtn.style.display = (crossCheckEnabled && !isApiMode) ? 'flex' : 'none';
  }

  // AI Response Containers (textarea containers) - NEVER show in API mode
  responseContainers.forEach(container => {
    container.style.display = (crossCheckEnabled && !isApiMode) ? 'block' : 'none';
  });
}

// Update cross-check button visibility based on mode (legacy, now delegates to updateCrossCheckVisibility)
function updateCrossCheckButtonVisibility() {
  updateCrossCheckVisibility();
}

// Initialize cross-check settings
function initCrossCheckSettings() {
  const templateTextarea = document.getElementById('crossCheckPromptTemplate');
  const resetBtn = document.getElementById('resetCrossCheckPrompt');
  const errorMsg = document.getElementById('crossCheckPromptError');

  // Validation function - require {{OTHER_RESPONSES}} placeholder
  function validateTemplate(text) {
    return text.trim().length > 0 && text.includes('{{OTHER_RESPONSES}}');
  }

  if (templateTextarea) {
    // Load saved template or default
    templateTextarea.value = getCrossCheckTemplate();

    // Validate on load
    if (errorMsg && !validateTemplate(templateTextarea.value)) {
      errorMsg.style.display = 'block';
    }

    // Save on change with validation
    templateTextarea.addEventListener('input', (e) => {
      const isValid = validateTemplate(e.target.value);

      // Show/hide error message
      if (errorMsg) {
        errorMsg.style.display = isValid ? 'none' : 'block';
      }

      // Save to localStorage ONLY if valid
      if (isValid) {
        localStorage.setItem('oneprompt-crosscheck-template', e.target.value);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('oneprompt-crosscheck-template');
      if (templateTextarea) {
        templateTextarea.value = DEFAULT_CROSS_CHECK_TEMPLATE;
        // Hide error on reset (default template is always valid)
        if (errorMsg) {
          errorMsg.style.display = 'none';
        }
      }
    });
  }
}

// Initialize cross-check features
initCrossCheckButton();
initCrossCheckSettings();

// Initialize Tab navigation for AI response textareas
function initTabNavigation() {
  document.addEventListener('keydown', (e) => {
    // Check if Tab key is pressed
    if (e.key === 'Tab' && document.activeElement.classList.contains('ai-response-textarea')) {
      e.preventDefault();

      // Get all visible ai-response-textarea elements
      const textareas = Array.from(document.querySelectorAll('.ai-response-textarea')).filter(textarea => {
        const wrapper = textarea.closest('.webview-wrapper');
        return wrapper && wrapper.style.display !== 'none';
      });

      if (textareas.length === 0) return;

      // Find current index
      const currentIndex = textareas.indexOf(document.activeElement);

      // Calculate next index (circular)
      const nextIndex = (currentIndex + 1) % textareas.length;

      // Focus next textarea
      textareas[nextIndex].focus();
    }
  });
}
initTabNavigation();

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
        ${config.logo ? `<img src="${config.logo}" style="width: 48px; height: 48px; object-fit: contain;">` : config.icon}
      </div>
      <h3 data-i18n="api.panel.title" data-i18n-options='{"service": "${config.name}"}'>${config.name} (API Mode)</h3>
      <p data-i18n="api.panel.waiting">Waiting for prompt...</p>
  `;
  // Translate welcome elements
  welcome.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const optionsAttr = el.getAttribute('data-i18n-options');
    const options = optionsAttr ? JSON.parse(optionsAttr) : {};
    el.textContent = t(key, options);
  });
  chatContainer.appendChild(welcome);

  panel.appendChild(chatContainer);

  // Restore history if available
  const session = getCurrentSession();
  logger.log('[createApiPanel] Restoring history for', aiKey, {
    sessionId: session?.id,
    hasApiChatHistory: !!session?.apiChatHistory,
    historyForThisAI: session?.apiChatHistory?.[aiKey]?.length || 0
  });
  if (session && session.apiChatHistory && session.apiChatHistory[aiKey]) {
    const history = session.apiChatHistory[aiKey];
    logger.log('[createApiPanel] Found', history.length, 'messages for', aiKey);
    if (history.length > 0) {
      history.forEach((msg, idx) => {
        logger.log(`[createApiPanel] Restoring message ${idx}:`, msg.role, msg.content?.substring(0, 50));
        appendApiMessage(panel, msg.role, msg.content, false); // false = don't re-save
      });
    }
  } else {
    logger.log('[createApiPanel] No history found for', aiKey);
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

  // Render Markdown for assistant messages, plain text for user
  // Security fix: always sanitize HTML before innerHTML
  if (role === 'system') {
    bubble.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(text) : text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  } else if (role === 'assistant') {
    // Render Markdown - use module if available, fallback to local function
    bubble.innerHTML = MarkdownModule ? MarkdownModule.renderMarkdown(text) : renderMarkdown(text);
    bubble.classList.add('markdown-content');

    // Intercept link clicks to open in system browser
    bubble.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          window.electronAPI.openExternal(href);
        }
      });
      // Style links to look clickable
      link.style.color = 'inherit';
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';
    });
  } else {
    // User messages: plain text with whitespace preservation
    bubble.style.whiteSpace = 'pre-wrap';
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

// Get system prompt with language instruction
function getSystemPromptWithLanguage() {
  const lang = localStorage.getItem('oneprompt-language') || 'en';
  const languageNames = {
    en: 'English',
    it: 'Italian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    tr: 'Turkish'
  };
  const languageName = languageNames[lang] || 'English';
  return `You are a helpful AI assistant. Always respond in ${languageName} unless the user explicitly asks for a different language.`;
}

// Handle API Chat Logic - uses OnePromptCore bridge for API calls
// The bridge can be overridden in private repos to add credit checking, managed API keys, etc.
async function handleApiChat(aiKey, prompt, panel) {
  // 1. Show User Message immediately (already saved in sendPromptToSelectedAIs)
  appendApiMessage(panel, 'user', prompt, false);

  // 2. Check if can proceed (API key in open, credits in private)
  const check = await window.OnePromptCore.checkCanMakeRequest(aiKey);
  if (!check.canProceed) {
    // Use translated message - error.apiKeyMissing includes link to settings
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
    // 4. Use the bridge to make the API request
    // This is the main extension point - private repos can override makeAIRequest
    // to add credit deduction, use managed API keys, route through proxy, etc.
    const responseText = await window.OnePromptCore.makeAIRequest(aiKey, messages);

    // Remove loader
    loader.remove();

    // Append message to UI and SAVE TO HISTORY
    logger.log(`[${Date.now()}] [handleApiChat] Saving assistant response for ${aiKey}, length: ${responseText?.length}`);
    appendApiMessage(panel, 'assistant', responseText, true);

    // Explicitly force save session to storage to ensure persistence
    logger.log(`[handleApiChat] Calling saveSessionsToStorage for ${aiKey}`);
    saveSessionsToStorage();

    updateWebviewStatus(aiKey, 'ready');

  } catch (error) {
    logger.error(`API Error (${aiKey}):`, error);
    // Remove loader
    loader.remove();

    // Check if error is related to API key issues
    const errorMsg = error.message || '';
    const isApiKeyError = errorMsg.includes('ISO-8859-1') ||
                          errorMsg.includes('Failed to fetch') ||
                          errorMsg.includes('401') ||
                          errorMsg.includes('invalid_api_key') ||
                          errorMsg.includes('Unauthorized');

    if (isApiKeyError) {
      appendApiMessage(panel, 'system', t('error.apiKeyInvalid'));
    } else {
      appendApiMessage(panel, 'system', `Error: ${errorMsg}`);
    }
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

// --- Global Event Listeners ---


