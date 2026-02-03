/**
 * Tabs Management Module
 * Handles tab rendering, drag & drop, rename, and session switching
 */

import { t } from './i18n.js';
import {
  getSessions,
  getCurrentSessionId,
  setCurrentSessionId,
  getCurrentSession,
  saveSessionsToStorage,
  createSession,
  removeSession,
  addSession
} from './sessions.js';

// DOM element references (set via init)
let tabList = null;
let tabBar = null;

// Callbacks for repo-specific functions (set via init)
let callbacks = {
  renderSidebar: () => {},
  renderWebviews: () => {},
  updateCopyButton: () => {},
  updateCrossCheckVisibility: () => {},
  updatePromptButtons: () => {},
  getSelectedAIs: () => new Set(),
  setSelectedAIs: () => {},
  createNewSessionAndSwitch: null // If provided, use this instead of internal function
};

/**
 * Initialize tabs module with DOM elements and callbacks
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.tabList - Tab list container element
 * @param {HTMLElement} config.tabBar - Tab bar element
 * @param {Object} config.callbacks - Callback functions
 */
export function initTabs(config) {
  tabList = config.tabList;
  tabBar = config.tabBar;

  if (config.callbacks) {
    callbacks = { ...callbacks, ...config.callbacks };
  }
}

/**
 * Render all tabs
 */
export function renderTabs() {
  if (!tabList || !tabBar) {
    console.warn('[tabs] Module not initialized. Call initTabs() first.');
    return;
  }

  const sessions = getSessions();
  tabList.innerHTML = '';

  // Always show tab bar (Chrome style)
  tabBar.style.display = 'flex';

  sessions.forEach(session => {
    const tab = createTabElement(session);
    tabList.appendChild(tab);
  });

  // Add + button after last tab
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
    // Use callback if provided (allows repo-specific state sync)
    if (callbacks.createNewSessionAndSwitch) {
      callbacks.createNewSessionAndSwitch();
    } else {
      createNewSessionAndSwitch();
    }
  });
  tabList.appendChild(newTabBtn);

  // Ensure active tab is visible
  scrollToActiveTab();
}

/**
 * Scroll active tab into view
 */
export function scrollToActiveTab() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

/**
 * Create a tab element for a session
 * @param {Object} session - Session object
 * @returns {HTMLElement} Tab element
 */
export function createTabElement(session) {
  const currentSessionId = getCurrentSessionId();
  const sessions = getSessions();

  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.sessionId = session.id;

  if (session.id === currentSessionId) {
    tab.classList.add('active');
  }

  const tabName = document.createElement('div');
  tabName.className = 'tab-name';
  // If name is null or empty, use translated name with number
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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

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

  // Click on tab to switch
  tab.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close') && !tabName.isContentEditable) {
      switchToSession(session.id);
    }
  });

  // Double-click on name to rename
  tabName.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startRenameTab(tabName, session);
  });

  // Click X to close
  tabClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSession(session.id);
  });

  return tab;
}

/**
 * Start renaming a tab
 * @param {HTMLElement} tabNameElement - Tab name element
 * @param {Object} session - Session object
 */
export function startRenameTab(tabNameElement, session) {
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

/**
 * Switch to a different session
 * @param {string} sessionId - Session ID to switch to
 */
export function switchToSession(sessionId) {
  const currentId = getCurrentSessionId();
  if (sessionId === currentId) return;

  // Save current session's prompt draft before switching
  const currentSession = getCurrentSession();
  const promptInput = document.getElementById('promptInput');
  if (currentSession && promptInput) {
    currentSession.promptDraft = promptInput.value;
  }

  // Save current session state BEFORE switching
  saveSessionsToStorage();

  setCurrentSessionId(sessionId);
  const session = getCurrentSession();

  // Update selectedAIs with the new session's AIs
  callbacks.setSelectedAIs(new Set(session.selectedAIs));

  saveSessionsToStorage();

  // Re-render everything
  renderTabs();
  callbacks.renderSidebar();
  callbacks.renderWebviews();
  callbacks.updateCopyButton();
  callbacks.updateCrossCheckVisibility();

  // Restore prompt draft and placeholder for the new session
  if (promptInput) {
    promptInput.value = session.promptDraft || '';
    // Note: placeholder is now updated in callbacks.updatePromptButtons()
    // to allow repo-specific logic (one-prompt-auto always uses 'api' placeholder)
  }
  callbacks.updatePromptButtons();
}

/**
 * Update sidebar state based on current session
 */
export function updateSidebarState() {
  const selectedAIs = callbacks.getSelectedAIs();
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

/**
 * Close a session
 * @param {string} sessionId - Session ID to close
 */
export function closeSession(sessionId) {
  const sessions = getSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  // Pulisci le webview della sessione prima di rimuoverla
  if (callbacks.cleanupSessionWebviews) {
    callbacks.cleanupSessionWebviews(sessionId);
  }

  removeSession(sessionId);

  // If we closed all sessions, create a new empty one (Chrome style)
  if (sessions.length === 0) {
    const newSession = createSession(null, new Set([]));
    addSession(newSession);
    setCurrentSessionId(newSession.id);
    callbacks.setSelectedAIs(new Set(newSession.selectedAIs));
  } else if (sessionId === getCurrentSessionId()) {
    // If we closed the current session, switch to another
    const newIndex = Math.max(0, sessionIndex - 1);
    setCurrentSessionId(sessions[newIndex].id);
    callbacks.setSelectedAIs(new Set(sessions[newIndex].selectedAIs));
  }

  saveSessionsToStorage();

  // Re-render everything
  renderTabs();
  callbacks.renderSidebar();
  callbacks.renderWebviews();
  callbacks.updateCopyButton();
  callbacks.updateCrossCheckVisibility();
}

/**
 * Create a new session and switch to it
 */
export function createNewSessionAndSwitch() {
  const sessions = getSessions();

  // Maximum 20 tabs limit
  if (sessions.length >= 20) {
    alert(t('error.maxTabs') || 'Maximum 20 tabs allowed');
    return;
  }

  // Save current session state BEFORE switching
  saveSessionsToStorage();

  // Create new empty session (no preselected services)
  const newSession = createSession(null, new Set([]));

  addSession(newSession);
  setCurrentSessionId(newSession.id);
  callbacks.setSelectedAIs(new Set(newSession.selectedAIs));

  saveSessionsToStorage();

  // Re-render everything
  renderTabs();
  callbacks.renderSidebar();
  callbacks.renderWebviews();
  callbacks.updateCopyButton();
}
