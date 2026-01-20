/**
 * Services Modal Module
 * Handles the services modal: open, close, render grid, toggle services
 *
 * Usage:
 * 1. Import in renderer-entry.js
 * 2. Call initServicesModal() with config object
 * 3. Use openServicesModal(), closeServicesModal(), etc.
 */

const logger = window.OnePromptLogger || console;

// Module state - initialized via initServicesModal()
let servicesModal = null;
let servicesGrid = null;
let aiConfigs = {};
let selectedAIs = new Set();
let configuredAIs = new Set();
let configuredApiAIs = new Set();
let getCurrentSessionFn = null;
let saveSelectedAIsFn = null;
let updateSidebarStateFn = null;
let renderWebviewsFn = null;
let updateCopyButtonFn = null;
let renderSidebarFn = null;
let updateSidebarButtonStateFn = null;
let updateCrossCheckVisibilityFn = null;
let AIServicesModule = null;
let I18nModule = null;

// Getter functions for dynamic state
let getSelectedAIsFn = null;
let getConfiguredAIsFn = null;
let getConfiguredApiAIsFn = null;

/**
 * Initialize the services modal module
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.servicesModal - The modal element
 * @param {HTMLElement} config.servicesGrid - The grid element for service cards
 * @param {Object} config.aiConfigs - AI configurations object
 * @param {Function} config.getSelectedAIs - Function to get selected AIs Set
 * @param {Function} config.getConfiguredAIs - Function to get configured AIs Set (web mode)
 * @param {Function} config.getConfiguredApiAIs - Function to get configured API AIs Set
 * @param {Function} config.getCurrentSession - Function to get current session
 * @param {Function} config.saveSelectedAIs - Function to save selected AIs
 * @param {Function} config.updateSidebarState - Function to update sidebar state
 * @param {Function} config.renderWebviews - Function to render webviews
 * @param {Function} config.updateCopyButton - Function to update copy button
 * @param {Function} config.renderSidebar - Function to render sidebar
 * @param {Function} config.updateSidebarButtonState - Function to update a single sidebar button state
 * @param {Function} [config.updateCrossCheckVisibility] - Optional function to update cross-check visibility
 * @param {Object} [config.aiServicesModule] - Optional AI Services module reference
 * @param {Object} [config.i18nModule] - Optional i18n module reference
 */
export function initServicesModal(config) {
  servicesModal = config.servicesModal;
  servicesGrid = config.servicesGrid;
  aiConfigs = config.aiConfigs || {};
  getCurrentSessionFn = config.getCurrentSession;
  saveSelectedAIsFn = config.saveSelectedAIs;
  updateSidebarStateFn = config.updateSidebarState;
  renderWebviewsFn = config.renderWebviews;
  updateCopyButtonFn = config.updateCopyButton;
  renderSidebarFn = config.renderSidebar;
  updateSidebarButtonStateFn = config.updateSidebarButtonState;
  updateCrossCheckVisibilityFn = config.updateCrossCheckVisibility || null;
  AIServicesModule = config.aiServicesModule || null;
  I18nModule = config.i18nModule || null;

  // Store getter functions for dynamic state
  getSelectedAIsFn = config.getSelectedAIs;
  getConfiguredAIsFn = config.getConfiguredAIs;
  getConfiguredApiAIsFn = config.getConfiguredApiAIs;

  // Update state from getters
  refreshState();

  logger.log('ServicesModal module initialized');
}

/**
 * Refresh state from getter functions
 * Call this before operations that need current state
 */
function refreshState() {
  if (getSelectedAIsFn) selectedAIs = getSelectedAIsFn();
  if (getConfiguredAIsFn) configuredAIs = getConfiguredAIsFn();
  if (getConfiguredApiAIsFn) configuredApiAIs = getConfiguredApiAIsFn();
}

/**
 * Translation helper - uses I18nModule if available
 */
function t(key) {
  if (I18nModule && I18nModule.t) {
    return I18nModule.t(key);
  }
  // Fallback to window.t if available
  if (typeof window !== 'undefined' && window.t) {
    return window.t(key);
  }
  return key;
}

/**
 * Open the services modal
 */
export function openServicesModal() {
  refreshState();

  const currentSession = getCurrentSessionFn ? getCurrentSessionFn() : null;
  const mode = currentSession ? currentSession.mode : 'web';

  const modalTitle = servicesModal.querySelector('h2');
  if (modalTitle) {
    if (mode === 'api') {
      modalTitle.textContent = t('services.title.api') || 'Servizi disponibili (API)';
    } else {
      modalTitle.textContent = t('services.title') || 'Servizi disponibili';
    }
  }

  renderServicesGrid(mode);
  servicesModal.style.display = 'flex';
}

/**
 * Close the services modal
 */
export function closeServicesModal() {
  if (servicesModal) {
    servicesModal.style.display = 'none';
  }
}

/**
 * Render the services grid
 * @param {string} mode - 'web' or 'api'
 */
export function renderServicesGrid(mode = 'web') {
  refreshState();

  servicesGrid.innerHTML = '';
  const apiServices = AIServicesModule ? AIServicesModule.getApiServices() : ['chatgpt', 'gemini', 'claude'];

  Object.entries(aiConfigs).forEach(([aiKey, config]) => {
    if (mode === 'api' && !apiServices.includes(aiKey)) {
      return;
    }
    const card = createServiceCard(aiKey, config, mode);
    servicesGrid.appendChild(card);
  });
}

/**
 * Create a service card element
 * @param {string} aiKey - AI service key
 * @param {Object} config - AI config object
 * @param {string} mode - 'web' or 'api'
 * @returns {HTMLElement} - The card element
 */
export function createServiceCard(aiKey, config, mode = 'web') {
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
    icon.innerHTML = `<img src="${config.logo}" alt="${config.name}">`;
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

/**
 * Toggle service enabled/disabled
 * @param {string} aiKey - AI service key
 * @param {HTMLElement} cardElement - The card element
 * @param {string} mode - 'web' or 'api'
 */
export function toggleServiceEnabled(aiKey, cardElement, mode = 'web') {
  refreshState();

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
      if (saveSelectedAIsFn) saveSelectedAIsFn();
      if (updateSidebarStateFn) updateSidebarStateFn();
      if (renderWebviewsFn) renderWebviewsFn();
      if (updateCopyButtonFn) updateCopyButtonFn();
      if (updateCrossCheckVisibilityFn) updateCrossCheckVisibilityFn();
    }

    // Re-render sidebar per rimuovere lo status
    if (renderSidebarFn) renderSidebarFn();
  } else {
    // Abilita servizio
    targetSet.add(aiKey);
    cardElement.classList.add('enabled');
    localStorage.setItem(storageKey, JSON.stringify([...targetSet]));

    // Re-render sidebar per aggiungere lo status
    if (renderSidebarFn) renderSidebarFn();

    // Crea/mostra webview per questo servizio
    // Prima aggiungi alla selezione se non c'è già
    if (!selectedAIs.has(aiKey)) {
      selectedAIs.add(aiKey);
      if (saveSelectedAIsFn) saveSelectedAIsFn();
      if (updateSidebarStateFn) updateSidebarStateFn();
      if (renderWebviewsFn) renderWebviewsFn();
      if (updateCopyButtonFn) updateCopyButtonFn();
    }
  }
}

/**
 * Toggle AI selection (from sidebar)
 * @param {string} aiKey - AI service key
 */
export function toggleAISelection(aiKey) {
  refreshState();

  if (selectedAIs.has(aiKey)) {
    selectedAIs.delete(aiKey);
  } else {
    selectedAIs.add(aiKey);
  }

  // Salva lo stato
  if (saveSelectedAIsFn) saveSelectedAIsFn();

  // Update sidebar button state
  if (updateSidebarButtonStateFn) updateSidebarButtonStateFn(aiKey);

  // Re-render webviews
  if (renderWebviewsFn) renderWebviewsFn();

  // Update copy button
  if (updateCopyButtonFn) updateCopyButtonFn();

  // Update cross-check button visibility
  if (updateCrossCheckVisibilityFn) updateCrossCheckVisibilityFn();
}
