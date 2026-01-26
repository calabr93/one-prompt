/**
 * AI API Service module
 *
 * Handles API calls to various AI providers (OpenAI, Anthropic, Google, xAI).
 * This module uses BYOK (Bring Your Own Key) - users provide their own API keys.
 *
 * Private repositories can override this to:
 * - Use managed API keys from backend
 * - Add credit checking before API calls
 * - Route through a proxy server
 *
 * @module @services/ai-api
 */

// Logger alias
const logger = window.OnePromptLogger || console;

/**
 * Get API key for a specific AI service from localStorage (BYOK)
 */
export function getApiKey(aiKey) {
  const keyMap = {
    chatgpt: 'oneprompt-api-openai',
    claude: 'oneprompt-api-anthropic',
    gemini: 'oneprompt-api-gemini',
    grok: 'oneprompt-api-xai'
  };

  const storageKey = keyMap[aiKey];
  return storageKey ? localStorage.getItem(storageKey) : null;
}

/**
 * Get selected model for a specific AI service from localStorage
 */
export function getSelectedModel(aiKey) {
  const modelMap = {
    chatgpt: { key: 'oneprompt-model-openai', default: 'gpt-4o' },
    claude: { key: 'oneprompt-model-anthropic', default: 'claude-sonnet-4-5' },
    gemini: { key: 'oneprompt-model-gemini', default: 'gemini-2.5-flash' },
    grok: { key: 'oneprompt-model-xai', default: 'grok-4-1-fast' }
  };

  const config = modelMap[aiKey];
  return config ? (localStorage.getItem(config.key) || config.default) : null;
}

/**
 * Get system prompt with user's preferred language
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
 * Check if API call can proceed (always true in open source version)
 * Private repos override this to check credits
 *
 * @returns {Promise<{canProceed: boolean, error?: string}>}
 */
export async function checkCanMakeApiCall(aiKey) {
  // In open source version, just check if API key exists
  const apiKey = getApiKey(aiKey);
  if (!apiKey) {
    return { canProceed: false, error: 'API key not configured' };
  }
  return { canProceed: true };
}

/**
 * Deduct credit after successful API call (no-op in open source version)
 * Private repos override this to deduct credits
 */
export async function deductCredit(aiKey) {
  // No-op in open source version
  return { success: true };
}

/**
 * Clean AI response text from artifacts
 */
export function cleanAIResponseText(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove OpenAI internal special tokens
  cleaned = cleaned.replace(/[\uE000-\uF8FF]/g, '');

  // Remove citation markers
  cleaned = cleaned.replace(/(?:cite)?turn\d+(?:search|forecast|news|context|\w+)\d*/gi, '');
  cleaned = cleaned.replace(/\s*\.?\s*\bcite\b\s*/gi, ' ');

  // Multiple passes for concatenated markers
  let prevLength = 0;
  while (cleaned.length !== prevLength) {
    prevLength = cleaned.length;
    cleaned = cleaned.replace(/(?:cite)?turn\d+\w*\d*/gi, '');
  }

  // Remove function call XML
  cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '');
  cleaned = cleaned.replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, '');
  cleaned = cleaned.replace(/<parameters[^>]*>[\s\S]*?<\/parameters>/gi, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/\.\s*\./g, '.');

  return cleaned.trim();
}

/**
 * Make API call to OpenAI
 */
export async function callOpenAI(apiKey, model, messages, systemPrompt) {
  const inputMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
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

  let responseText = null;

  if (data.output_text) {
    responseText = data.output_text;
  } else if (data.output && Array.isArray(data.output)) {
    const messageOutput = data.output.find(item => item.type === 'message');
    if (messageOutput && messageOutput.content && messageOutput.content[0]) {
      responseText = messageOutput.content[0].text;
    }
  }

  if (responseText) {
    return responseText;
  }

  throw new Error('Invalid response from OpenAI');
}

/**
 * Make API call to Anthropic Claude
 */
export async function callAnthropic(apiKey, model, messages, systemPrompt) {
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
}

/**
 * Make API call to Google Gemini
 */
export async function callGemini(apiKey, model, messages, systemPrompt) {
  // Convert to Gemini format (user/model roles)
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
}

/**
 * Make API call to xAI Grok
 */
export async function callGrok(apiKey, model, messages, systemPrompt) {
  const messagesWithSystem = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messagesWithSystem,
      stream: false
    })
  });

  const contentType = res.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from xAI');
    }

    const message = data.choices[0].message;

    if (message.content) {
      const cleanedContent = cleanAIResponseText(message.content);
      if (cleanedContent) {
        return cleanedContent;
      }
      // Content was only function calls
      return 'Grok needs to perform a web search to answer this question, but this feature is not yet supported in direct API mode.';
    } else if (message.tool_calls && message.tool_calls.length > 0) {
      return 'Grok needs to perform a web search to answer this question. This feature is not supported in direct API mode.';
    }

    return '[Empty response from Grok]';
  } else {
    const text = await res.text();
    throw new Error(`xAI API Error: ${text.substring(0, 200)}`);
  }
}

/**
 * Main function to make AI API call
 * This is the primary extension point for private repos
 */
export async function makeAiApiCall(aiKey, messages) {
  // Check if can proceed (credits in private, API key in open)
  const check = await checkCanMakeApiCall(aiKey);
  if (!check.canProceed) {
    throw new Error(check.error);
  }

  const apiKey = getApiKey(aiKey);
  const model = getSelectedModel(aiKey);
  const systemPrompt = getSystemPromptWithLanguage();

  let responseText;

  if (aiKey === 'chatgpt') {
    responseText = await callOpenAI(apiKey, model, messages, systemPrompt);
  } else if (aiKey === 'claude') {
    responseText = await callAnthropic(apiKey, model, messages, systemPrompt);
  } else if (aiKey === 'gemini') {
    responseText = await callGemini(apiKey, model, messages, systemPrompt);
  } else if (aiKey === 'grok') {
    responseText = await callGrok(apiKey, model, messages, systemPrompt);
  } else {
    throw new Error('API support for this service is not yet implemented');
  }

  // Deduct credit after successful call (no-op in open source)
  await deductCredit(aiKey);

  return responseText;
}

/**
 * Available models for each AI service
 */
export const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'o1', name: 'o1', description: 'Reasoning model' },
    { id: 'o3-mini', name: 'o3-mini', description: 'Small reasoning model' }
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Best balance' },
    { id: 'claude-opus-4', name: 'Claude Opus 4', description: 'Most capable' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' }
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and capable' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation' }
  ],
  xai: [
    { id: 'grok-4-1-fast', name: 'Grok 4.1 Fast', description: 'Fast responses' },
    { id: 'grok-4-1', name: 'Grok 4.1', description: 'Most capable' },
    { id: 'grok-3-mini-fast', name: 'Grok 3 Mini Fast', description: 'Fastest model' }
  ]
};
