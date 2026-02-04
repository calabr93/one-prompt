/**
 * API Chat Module
 *
 * Handles the API Mode chat functionality:
 * - Panel creation
 * - Message rendering
 * - Chat history management
 * - API request handling
 *
 * @module @app/api-chat
 */

// Module state (initialized via initApiChat)
let aiConfigs = {};
let logger = console;
let t = (key) => key; // i18n function
let renderMarkdown = (text) => text;
let getCurrentSession = () => null;
let saveSessionsToStorage = () => {};
let updateWebviewStatus = () => {};
let getSessionsArray = () => [];
let getCurrentSessionId = () => null;

// Constants
const API_HISTORY_LIMIT = 12;

/**
 * Initialize API Chat module with dependencies
 * @param {Object} deps - Dependencies
 */
export function initApiChat(deps) {
  if (deps.aiConfigs) aiConfigs = deps.aiConfigs;
  if (deps.logger) logger = deps.logger;
  if (deps.t) t = deps.t;
  if (deps.renderMarkdown) renderMarkdown = deps.renderMarkdown;
  if (deps.getCurrentSession) getCurrentSession = deps.getCurrentSession;
  if (deps.saveSessionsToStorage) saveSessionsToStorage = deps.saveSessionsToStorage;
  if (deps.updateWebviewStatus) updateWebviewStatus = deps.updateWebviewStatus;
  if (deps.getSessionsArray) getSessionsArray = deps.getSessionsArray;
  if (deps.getCurrentSessionId) getCurrentSessionId = deps.getCurrentSessionId;
}

/**
 * Create an API chat panel for a given AI service
 * @param {string} aiKey - The AI service key
 * @returns {HTMLElement} The panel element
 */
export function createApiPanel(aiKey) {
  const config = aiConfigs[aiKey];
  const panel = document.createElement('div');
  panel.className = 'api-panel';
  panel.dataset.aiKey = aiKey;
  panel.style.width = '100%';
  panel.style.flex = '1';
  panel.style.minHeight = '0';
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
  chatContainer.style.minHeight = '0';
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
        appendApiMessage(panel, msg.role, msg.content, false);
      });
    }
  } else {
    logger.log('[createApiPanel] No history found for', aiKey);
  }

  return panel;
}

/**
 * Append a message to the API chat panel
 * @param {HTMLElement} panel - The panel element
 * @param {string} role - 'user', 'assistant', or 'system'
 * @param {string} text - The message text
 * @param {boolean} save - Whether to save to history
 * @param {string|null} sessionId - Optional explicit session ID
 * @returns {HTMLElement} The bubble element
 */
export function appendApiMessage(panel, role, text, save = true, sessionId = null) {
  const chatContainer = panel.querySelector('.api-chat-container');
  const welcome = panel.querySelector('.api-welcome');
  if (welcome) welcome.remove();

  // Save to history (only user and assistant, not system messages)
  if (save && role !== 'system') {
    const targetSessionId = sessionId ||
      panel.closest('[data-session-id]')?.dataset?.sessionId ||
      getCurrentSessionId();
    saveApiHistory(panel.dataset.aiKey, role, text, targetSessionId);
  }

  const bubble = document.createElement('div');
  bubble.className = `api-message ${role}`;
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
    if (aiKey === 'chatgpt') bubble.style.backgroundColor = '#10a37f';
    else if (aiKey === 'claude') bubble.style.backgroundColor = '#d97757';
    else if (aiKey === 'gemini') bubble.style.backgroundColor = '#1b72e8';
    else if (aiKey === 'perplexity') bubble.style.backgroundColor = '#22b8cf';
    else if (aiKey === 'copilot') bubble.style.backgroundColor = '#24292f';
    else bubble.style.backgroundColor = 'var(--accent-color)';
  }

  // Render content based on role
  if (role === 'system') {
    bubble.innerHTML = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(text)
      : text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  } else if (role === 'assistant') {
    bubble.innerHTML = renderMarkdown(text);
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
      link.style.color = 'inherit';
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';
    });
  } else {
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.textContent = text;
  }

  chatContainer.appendChild(bubble);
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
  return bubble;
}

/**
 * Save message to API chat history
 * @param {string} aiKey - The AI service key
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - The message content
 * @param {string|null} sessionId - Optional explicit session ID
 */
export function saveApiHistory(aiKey, role, content, sessionId = null) {
  const targetSessionId = sessionId || getCurrentSessionId();
  const sessionsArray = getSessionsArray();
  const session = sessionsArray.find(s => s.id === targetSessionId);

  if (!session) {
    logger.warn(`[saveApiHistory] Session not found: ${targetSessionId}`);
    return;
  }

  if (!session.apiChatHistory) {
    session.apiChatHistory = {};
  }
  if (!session.apiChatHistory[aiKey]) {
    session.apiChatHistory[aiKey] = [];
  }

  session.apiChatHistory[aiKey].push({ role, content });

  // Enforce sliding window limit
  if (session.apiChatHistory[aiKey].length > API_HISTORY_LIMIT) {
    session.apiChatHistory[aiKey] = session.apiChatHistory[aiKey].slice(-API_HISTORY_LIMIT);
  }

  saveSessionsToStorage();
}

/**
 * Get system prompt with language instruction
 * @returns {string} System prompt
 */
export function getSystemPromptWithLanguage() {
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

/**
 * Handle API chat request
 * @param {string} aiKey - The AI service key
 * @param {string} prompt - The user prompt
 * @param {HTMLElement} panel - The panel element
 * @param {string|null} sessionId - Optional explicit session ID
 */
export async function handleApiChat(aiKey, prompt, panel, sessionId = null) {
  const targetSessionId = sessionId || getCurrentSessionId();

  // Show User Message immediately
  appendApiMessage(panel, 'user', prompt, false, targetSessionId);

  // Check if can proceed (API key check)
  const check = await window.OnePromptCore.checkCanMakeRequest(aiKey);
  if (!check.canProceed) {
    appendApiMessage(panel, 'system', t('error.apiKeyMissing'), false, targetSessionId);
    updateWebviewStatus(aiKey, 'error');
    return;
  }

  updateWebviewStatus(aiKey, 'thinking');

  // Show loader
  const loader = appendApiLoader(panel);

  // Build messages array with history
  const sessionsArray = getSessionsArray();
  const session = sessionsArray.find(s => s.id === targetSessionId);
  const existingHistory = (session?.apiChatHistory?.[aiKey] || [])
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .slice(-API_HISTORY_LIMIT);

  const messages = existingHistory;

  try {
    const responseText = await window.OnePromptCore.makeAIRequest(aiKey, messages);

    loader.remove();

    logger.log(`[handleApiChat] Saving assistant response for ${aiKey} to session ${targetSessionId}`);
    appendApiMessage(panel, 'assistant', responseText, true, targetSessionId);

    saveSessionsToStorage();
    updateWebviewStatus(aiKey, 'ready');

  } catch (error) {
    logger.error(`API Error (${aiKey}):`, error);
    loader.remove();

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

/**
 * Append loader indicator to panel
 * @param {HTMLElement} panel - The panel element
 * @returns {HTMLElement} The loader element
 */
export function appendApiLoader(panel) {
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

// Export constant for external use
export { API_HISTORY_LIMIT };
