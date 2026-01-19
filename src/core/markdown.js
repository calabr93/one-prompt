/**
 * OnePrompt Markdown Module
 *
 * Pure functions for markdown rendering and AI response cleaning.
 * No side-effects, no state dependencies.
 *
 * @module @core/markdown
 */

// Logger alias
const logger = window.OnePromptLogger || console;

/**
 * Clean AI response artifacts (citation markers, function call XML, etc.)
 * @param {string} text - Raw AI response text
 * @returns {string} Cleaned text
 */
export function cleanAIResponseText(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove OpenAI internal special tokens (Unicode Private Use Area)
  cleaned = cleaned.replace(/[\uE000-\uF8FF]/g, '');

  // First pass: remove full patterns like "citeturn0forecast0", "turn0search1"
  cleaned = cleaned.replace(/(?:cite)?turn\d+(?:search|forecast|news|context|\w+)\d*/gi, '');

  // Second pass: remove standalone "cite" that appears alone
  cleaned = cleaned.replace(/\s*\.?\s*\bcite\b\s*/gi, ' ');

  // Run multiple passes to catch any remaining concatenated markers
  let prevLength = 0;
  while (cleaned.length !== prevLength) {
    prevLength = cleaned.length;
    cleaned = cleaned.replace(/(?:cite)?turn\d+\w*\d*/gi, '');
  }

  // Remove function call XML from Grok reasoning models
  cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '');
  cleaned = cleaned.replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, '');
  cleaned = cleaned.replace(/<parameters[^>]*>[\s\S]*?<\/parameters>/gi, '');

  // Clean up multiple consecutive spaces (but NOT newlines - preserve markdown formatting)
  cleaned = cleaned.replace(/[^\S\n]{2,}/g, ' ');
  cleaned = cleaned.replace(/\.\s*\./g, '.');

  return cleaned.trim();
}

/**
 * Render markdown text to sanitized HTML
 * Uses marked.js + DOMPurify (loaded globally in index.html)
 * @param {string} text - Markdown text to render
 * @returns {string} Sanitized HTML
 */
export function renderMarkdown(text) {
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
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    const rawHtml = marked.parse(cleanedText);

    // CRITICAL: Sanitize HTML to prevent XSS attacks
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(rawHtml);
    }

    logger.warn('[OnePrompt] DOMPurify not loaded - returning raw HTML');
    return rawHtml;
  }

  // Fallback: return text with basic formatting
  return cleanedText.replace(/\n/g, '<br>');
}

/**
 * Re-clean all existing API message bubbles in the DOM
 * Call this when switching sessions or when old messages need updating
 */
export function reCleanApiMessages() {
  document.querySelectorAll('.api-message.assistant.markdown-content').forEach(bubble => {
    const text = bubble.textContent || bubble.innerText;

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

// Also export as default object for backward compatibility
export default {
  cleanAIResponseText,
  renderMarkdown,
  reCleanApiMessages
};
