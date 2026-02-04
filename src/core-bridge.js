/**
 * OnePromptCore Bridge
 *
 * Questo modulo fornisce un layer di astrazione per i servizi esterni.
 * Il renderer.js chiama questi metodi, che possono essere overridden
 * nelle repo private tramite Vite alias o injection.
 *
 * NELL'OPEN SOURCE:
 * - BYOK (Bring Your Own Key) - API keys salvate in localStorage
 * - Nessun credit system
 * - Nessun tracking
 *
 * NEL PRIVATE (override):
 * - Managed API keys dal backend
 * - Credit system con Supabase
 * - PostHog tracking
 *
 * @module OnePromptCore
 */

// IIFE per isolare le variabili locali e evitare conflitti con renderer.js
(function() {
  'use strict';

  const logger = window.OnePromptLogger || console;

/**
 * OnePromptCore - The Bridge
 *
 * Esposto come window.OnePromptCore per essere accessibile dal renderer
 */
const OnePromptCore = {
  /**
   * Feature flags - indicano quali funzionalita sono disponibili
   */
  features: {
    byok: true,          // BYOK sempre attivo nell'open
    credits: false,      // Sistema crediti (solo nel private)
    auth: false,         // Autenticazione (solo nel private)
    analytics: false,    // Tracking PostHog (solo nel private)
  },

  /**
   * Configurazione dell'app
   */
  config: {
    appName: 'OnePrompt',
    windowTitle: 'OnePrompt',
  },

  // ============================================================
  // API KEY MANAGEMENT (BYOK)
  // ============================================================

  /**
   * Recupera l'API key per un servizio AI
   * @param {string} aiKey - chatgpt, claude, gemini
   * @returns {string|null}
   */
  getApiKey(aiKey) {
    const keyMap = {
      chatgpt: 'oneprompt-api-openai',
      claude: 'oneprompt-api-anthropic',
      gemini: 'oneprompt-api-gemini'
    };
    const storageKey = keyMap[aiKey];
    return storageKey ? localStorage.getItem(storageKey) : null;
  },

  /**
   * Salva l'API key per un servizio AI
   * @param {string} aiKey - chatgpt, claude, gemini
   * @param {string} key - L'API key
   */
  setApiKey(aiKey, key) {
    const keyMap = {
      chatgpt: 'oneprompt-api-openai',
      claude: 'oneprompt-api-anthropic',
      gemini: 'oneprompt-api-gemini'
    };
    const storageKey = keyMap[aiKey];
    if (storageKey) {
      if (key) {
        localStorage.setItem(storageKey, key);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  },

  /**
   * Recupera il modello selezionato per un servizio AI
   * @param {string} aiKey
   * @returns {string}
   */
  getSelectedModel(aiKey) {
    const modelMap = {
      chatgpt: { key: 'oneprompt-model-openai', default: 'gpt-5.2' },
      claude: { key: 'oneprompt-model-anthropic', default: 'claude-sonnet-4-5' },
      gemini: { key: 'oneprompt-model-gemini', default: 'gemini-3-flash-preview' }
    };
    const config = modelMap[aiKey];
    return config ? (localStorage.getItem(config.key) || config.default) : null;
  },

  /**
   * Salva il modello selezionato per un servizio AI
   * @param {string} aiKey
   * @param {string} modelId
   */
  setSelectedModel(aiKey, modelId) {
    const modelMap = {
      chatgpt: 'oneprompt-model-openai',
      claude: 'oneprompt-model-anthropic',
      gemini: 'oneprompt-model-gemini'
    };
    const storageKey = modelMap[aiKey];
    if (storageKey && modelId) {
      localStorage.setItem(storageKey, modelId);
    }
  },

  // ============================================================
  // CREDIT SYSTEM (stubs per l'open, overridden nel private)
  // ============================================================

  /**
   * Verifica se l'utente puo fare una chiamata API
   * Nel private: controlla i crediti
   * Nell'open: controlla solo se l'API key esiste
   *
   * @param {string} aiKey
   * @returns {Promise<{canProceed: boolean, error?: string, credits?: number}>}
   */
  async checkCanMakeRequest(aiKey) {
    const apiKey = this.getApiKey(aiKey);
    if (!apiKey) {
      return { canProceed: false, error: 'API key not configured' };
    }
    return { canProceed: true };
  },

  /**
   * Consuma un credito dopo una chiamata API riuscita
   * Nel private: decrementa i crediti
   * Nell'open: no-op
   *
   * @param {string} aiKey
   * @returns {Promise<{success: boolean, remainingCredits?: number}>}
   */
  async consumeCredit(aiKey) {
    // No-op nell'open source
    return { success: true };
  },

  /**
   * Recupera il saldo crediti corrente
   * Nel private: query Supabase
   * Nell'open: restituisce null (crediti non disponibili)
   *
   * @returns {Promise<number|null>}
   */
  async getCreditsBalance() {
    // Crediti non disponibili nell'open source
    return null;
  },

  // ============================================================
  // AI API CALLS
  // ============================================================

  /**
   * Ottiene il system prompt con la lingua dell'utente
   * @returns {string}
   */
  getSystemPrompt() {
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
  },

  /**
   * Fa una chiamata API a OpenAI
   * @param {string} apiKey
   * @param {string} model
   * @param {Array} messages
   * @param {string} systemPrompt
   * @returns {Promise<string>}
   */
  async callOpenAI(apiKey, model, messages, systemPrompt) {
    const inputMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: inputMessages,
        tools: [{ type: "web_search" }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    if (data.output_text) {
      return data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && messageOutput.content[0]) {
        return messageOutput.content[0].text;
      }
    }
    throw new Error('Invalid response from OpenAI');
  },

  /**
   * Fa una chiamata API a Anthropic Claude
   */
  async callAnthropic(apiKey, model, messages, systemPrompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 8192,
        system: systemPrompt,
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
        return textBlocks.map(b => b.text).join('\n');
      }
    }
    throw new Error('Invalid response from Anthropic');
  },

  /**
   * Fa una chiamata API a Google Gemini
   */
  async callGemini(apiKey, model, messages, systemPrompt) {
    const geminiContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 8192 },
        tools: [{ google_search: {} }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini');
    }
    return data.candidates[0].content.parts[0].text;
  },

  /**
   * Pulisce il testo delle risposte AI da artifacts
   */
  cleanAIResponseText(text) {
    if (!text) return '';
    let cleaned = text;

    // Remove special tokens
    cleaned = cleaned.replace(/[\uE000-\uF8FF]/g, '');

    // Remove citation markers
    cleaned = cleaned.replace(/(?:cite)?turn\d+(?:search|forecast|news|context|\w+)\d*/gi, '');
    cleaned = cleaned.replace(/\s*\.?\s*\bcite\b\s*/gi, ' ');

    let prevLength = 0;
    while (cleaned.length !== prevLength) {
      prevLength = cleaned.length;
      cleaned = cleaned.replace(/(?:cite)?turn\d+\w*\d*/gi, '');
    }

    // Remove function call XML
    cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '');
    cleaned = cleaned.replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, '');
    cleaned = cleaned.replace(/<parameters[^>]*>[\s\S]*?<\/parameters>/gi, '');

    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.replace(/\.\s*\./g, '.');

    return cleaned.trim();
  },

  /**
   * Funzione principale per fare una chiamata AI
   * Questa e il punto principale di override nel private
   *
   * @param {string} aiKey - chatgpt, claude, gemini
   * @param {Array} messages - Array di {role, content}
   * @returns {Promise<string>} - La risposta dell'AI
   */
  async makeAIRequest(aiKey, messages) {
    // 1. Verifica se puo procedere (crediti nel private, API key nell'open)
    const check = await this.checkCanMakeRequest(aiKey);
    if (!check.canProceed) {
      throw new Error(check.error);
    }

    // 2. Recupera API key e model
    const apiKey = this.getApiKey(aiKey);
    const model = this.getSelectedModel(aiKey);
    const systemPrompt = this.getSystemPrompt();

    // 3. Esegui la chiamata
    let responseText;

    if (aiKey === 'chatgpt') {
      responseText = await this.callOpenAI(apiKey, model, messages, systemPrompt);
    } else if (aiKey === 'claude') {
      responseText = await this.callAnthropic(apiKey, model, messages, systemPrompt);
    } else if (aiKey === 'gemini') {
      responseText = await this.callGemini(apiKey, model, messages, systemPrompt);
    } else {
      throw new Error('API support for this service is not yet implemented');
    }

    // 4. Consuma credito (no-op nell'open)
    await this.consumeCredit(aiKey);

    return responseText;
  },

  // ============================================================
  // ANALYTICS (stubs per l'open, overridden nel private)
  // ============================================================

  /**
   * Traccia un evento (solo nel private con PostHog)
   * @param {string} eventName
   * @param {Object} properties
   */
  async trackEvent(eventName, properties = {}) {
    // No-op nell'open source
    logger.log('[Analytics] Event (disabled):', eventName, properties);
  },

  // ============================================================
  // AUTH (stubs per l'open, overridden nel private)
  // ============================================================

  /**
   * Verifica se l'utente e autenticato
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    return false; // Sempre false nell'open (no auth)
  },

  /**
   * Recupera l'utente corrente
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    return null; // Sempre null nell'open
  },

  // ============================================================
  // UI CUSTOMIZATION
  // ============================================================

  /**
   * Verifica se mostrare i settings BYOK
   * @returns {boolean}
   */
  shouldShowBYOKSettings() {
    return this.features.byok;
  },

  /**
   * Verifica se mostrare il credit display
   * @returns {boolean}
   */
  shouldShowCredits() {
    return this.features.credits;
  },

  /**
   * Verifica se mostrare il login button
   * @returns {boolean}
   */
  shouldShowAuth() {
    return this.features.auth;
  },

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Inizializza il core
   * Chiamato all'avvio dell'app
   */
  async init() {
    logger.log('[OnePromptCore] Initializing...');
    logger.log('[OnePromptCore] Features:', this.features);
    logger.log('[OnePromptCore] Config:', this.config);
  }
};

// Esponi globalmente (Safe Merge)
// Se window.OnePromptCore esiste già (creato da renderer-entry.js), lo estendiamo
// altrimenti lo creiamo nuovo.
window.OnePromptCore = Object.assign(window.OnePromptCore || {}, OnePromptCore);

})(); // Fine IIFE
