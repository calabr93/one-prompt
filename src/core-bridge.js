/**
 * OnePromptCore Bridge
 *
 * This module provides an abstraction layer for external services.
 * renderer.js calls these methods, which can be overridden
 * in private repos via Vite aliases or injection.
 *
 * IN OPEN SOURCE:
 * - BYOK (Bring Your Own Key) - API keys stored in localStorage
 * - No credit system
 * - No tracking
 *
 * IN PRIVATE (override):
 * - Managed API keys from backend
 * - Credit system with Supabase
 * - PostHog tracking
 *
 * @module OnePromptCore
 */

// IIFE to isolate local variables and avoid conflicts with renderer.js
(function() {
  'use strict';

  const logger = window.OnePromptLogger || console;

/**
 * OnePromptCore - The Bridge
 *
 * Exposed as window.OnePromptCore to be accessible from renderer
 */
const OnePromptCore = {
  /**
   * Feature flags - indicate which features are available
   */
  features: {
    byok: true,          // BYOK always enabled in open source
    credits: false,      // Credit system (private only)
    auth: false,         // Authentication (private only)
    analytics: false,    // PostHog tracking (private only)
  },

  /**
   * App configuration
   */
  config: {
    appName: 'OnePrompt',
    windowTitle: 'OnePrompt',
  },

  // ============================================================
  // API KEY MANAGEMENT (BYOK)
  // ============================================================

  /**
   * Get the API key for an AI service
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
   * Save the API key for an AI service
   * @param {string} aiKey - chatgpt, claude, gemini
   * @param {string} key - The API key
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
   * Get the selected model for an AI service
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
   * Save the selected model for an AI service
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
  // CREDIT SYSTEM (stubs for open source, overridden in private)
  // ============================================================

  /**
   * Check if the user can make an API call
   * In private: checks credits
   * In open source: only checks if API key exists
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
   * Consume a credit after a successful API call
   * In private: decrements credits
   * In open source: no-op
   *
   * @param {string} aiKey
   * @returns {Promise<{success: boolean, remainingCredits?: number}>}
   */
  async consumeCredit(aiKey) {
    // No-op in open source
    return { success: true };
  },

  /**
   * Get current credits balance
   * In private: Supabase query
   * In open source: returns null (credits not available)
   *
   * @returns {Promise<number|null>}
   */
  async getCreditsBalance() {
    // Credits not available in open source
    return null;
  },

  // ============================================================
  // AI API CALLS
  // ============================================================

  /**
   * Get the system prompt with user's language
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
   * Make an API call to OpenAI
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
   * Make an API call to Anthropic Claude
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
   * Make an API call to Google Gemini
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
   * Clean AI response text from artifacts
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
   * Main function to make an AI call
   * This is the main override point in private repos
   *
   * @param {string} aiKey - chatgpt, claude, gemini
   * @param {Array} messages - Array of {role, content}
   * @returns {Promise<string>} - The AI response
   */
  async makeAIRequest(aiKey, messages) {
    // 1. Check if can proceed (credits in private, API key in open source)
    const check = await this.checkCanMakeRequest(aiKey);
    if (!check.canProceed) {
      throw new Error(check.error);
    }

    // 2. Get API key and model
    const apiKey = this.getApiKey(aiKey);
    const model = this.getSelectedModel(aiKey);
    const systemPrompt = this.getSystemPrompt();

    // 3. Execute the call
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

    // 4. Consume credit (no-op in open source)
    await this.consumeCredit(aiKey);

    return responseText;
  },

  // ============================================================
  // ANALYTICS (stubs for open source, overridden in private)
  // ============================================================

  /**
   * Track an event (private only with PostHog)
   * @param {string} eventName
   * @param {Object} properties
   */
  async trackEvent(eventName, properties = {}) {
    // No-op in open source
    logger.log('[Analytics] Event (disabled):', eventName, properties);
  },

  // ============================================================
  // AUTH (stubs for open source, overridden in private)
  // ============================================================

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    return false; // Always false in open source (no auth)
  },

  /**
   * Get current user
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    return null; // Always null in open source
  },

  // ============================================================
  // UI CUSTOMIZATION
  // ============================================================

  /**
   * Check if BYOK settings should be shown
   * @returns {boolean}
   */
  shouldShowBYOKSettings() {
    return this.features.byok;
  },

  /**
   * Check if credit display should be shown
   * @returns {boolean}
   */
  shouldShowCredits() {
    return this.features.credits;
  },

  /**
   * Check if login button should be shown
   * @returns {boolean}
   */
  shouldShowAuth() {
    return this.features.auth;
  },

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize the core
   * Called at app startup
   */
  async init() {
    logger.log('[OnePromptCore] Initializing...');
    logger.log('[OnePromptCore] Features:', this.features);
    logger.log('[OnePromptCore] Config:', this.config);
  }
};

// Expose globally (Safe Merge)
// If window.OnePromptCore already exists (created by renderer-entry.js), extend it
// otherwise create a new one.
window.OnePromptCore = Object.assign(window.OnePromptCore || {}, OnePromptCore);

})(); // End IIFE
