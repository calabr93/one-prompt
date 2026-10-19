/**
 * API Mode model catalog
 *
 * Single source for the models offered in API Mode. The app starts from a
 * bundled list and refreshes it in the background from a remote source:
 * - one-prompt: models.json published in the GitHub repository
 * - private/auto: the Supabase `models` table (see catalogFromRows)
 *
 * The last valid remote list is cached, so a failed refresh (offline, 404)
 * keeps the previous models instead of breaking API Mode.
 *
 * Catalog format:
 * {
 *   "updatedAt": "2026-10-19",
 *   "providers": {
 *     "chatgpt": { "default": "gpt-5.2", "models": [{ "id": "gpt-5.2", "name": "GPT-5.2" }] }
 *   }
 * }
 * Models may also carry "credits" (private/auto only).
 *
 * @module @services/models
 */

import { logger } from '../utils/logger-renderer.js';

export const AI_KEYS = ['chatgpt', 'claude', 'gemini'];
export const MODELS_UPDATED_EVENT = 'oneprompt-models-updated';

const PROVIDERS = { chatgpt: 'openai', claude: 'anthropic', gemini: 'google' };

const CACHE_KEY = 'oneprompt-models-cache';
const FETCH_TIMEOUT_MS = 5000;
// Model IDs end up in request bodies and in the Gemini URL path: allow plain IDs only
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
const MAX_NAME_LENGTH = 80;

const EMPTY_CATALOG = { updatedAt: '', providers: {} };

let bundledCatalog = EMPTY_CATALOG;
let catalog = EMPTY_CATALOG;
let remoteFetcher = null;

function normalizeModel(raw) {
  if (!raw || typeof raw.id !== 'string' || !MODEL_ID_PATTERN.test(raw.id)) return null;
  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim().slice(0, MAX_NAME_LENGTH)
    : raw.id;
  const model = { id: raw.id, name };
  if (Number.isInteger(raw.credits) && raw.credits > 0) model.credits = raw.credits;
  return model;
}

function normalizeProvider(raw) {
  if (!raw || !Array.isArray(raw.models)) return null;
  const models = [];
  for (const entry of raw.models) {
    const model = normalizeModel(entry);
    if (model && !models.some(m => m.id === model.id)) models.push(model);
  }
  if (models.length === 0) return null;
  const defaultId = models.some(m => m.id === raw.default) ? raw.default : models[0].id;
  return { default: defaultId, models };
}

/**
 * Validate a catalog. Invalid providers are dropped, so a partly broken
 * remote list never removes the models of the other providers.
 * @param {Object} raw
 * @returns {{updatedAt: string, providers: Object}|null} null if nothing is usable
 */
export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.providers || typeof raw.providers !== 'object') {
    return null;
  }
  const providers = {};
  for (const aiKey of AI_KEYS) {
    const provider = normalizeProvider(raw.providers[aiKey]);
    if (provider) providers[aiKey] = provider;
  }
  if (Object.keys(providers).length === 0) return null;
  return { updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '', providers };
}

/**
 * Build a catalog from rows of the Supabase `models` table (private/auto).
 * Rows are expected already filtered on `enabled` and ordered by `sort_order`.
 * @param {Array} rows
 */
export function catalogFromRows(rows) {
  const providers = {};
  let updatedAt = '';
  for (const row of rows || []) {
    if (!AI_KEYS.includes(row.ai_key)) continue;
    providers[row.ai_key] ??= { default: null, models: [] };
    providers[row.ai_key].models.push({ id: row.id, name: row.display_name, credits: row.credits });
    if (row.is_default) providers[row.ai_key].default = row.id;
    if (row.updated_at && row.updated_at > updatedAt) updatedAt = row.updated_at;
  }
  return { updatedAt, providers };
}

// Use the override for each provider it covers, the base list for the rest
function mergeCatalogs(base, override) {
  if (!override) return base;
  return { updatedAt: override.updatedAt, providers: { ...base.providers, ...override.providers } };
}

function readCache() {
  try {
    const cached = normalizeCatalog(JSON.parse(localStorage.getItem(CACHE_KEY)));
    // A newer app release may bundle a newer list than an old cached one
    return cached && cached.updatedAt >= bundledCatalog.updatedAt ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(remote) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
  } catch {
    // Storage unavailable: the list is fetched again on next start
  }
}

/**
 * Load the bundled (and cached) list synchronously, then refresh it in the background.
 * @param {Object} options
 * @param {Object} options.bundled - Catalog shipped with the app, used as fallback
 * @param {Function} [options.fetchRemote] - Async function returning a raw catalog
 * @returns {Promise<boolean>} Resolves when the background refresh ends
 */
export function initModels({ bundled, fetchRemote = null } = {}) {
  bundledCatalog = normalizeCatalog(bundled) || EMPTY_CATALOG;
  catalog = mergeCatalogs(bundledCatalog, readCache());
  remoteFetcher = fetchRemote;
  return refreshModels();
}

/**
 * Fetch the remote list and apply it. Keeps the current list on any failure.
 * @returns {Promise<boolean>} true if the list was updated
 */
export async function refreshModels() {
  if (!remoteFetcher) return false;
  try {
    const remote = normalizeCatalog(await remoteFetcher());
    if (!remote) {
      logger.warn('[Models] Remote model list is empty or invalid, keeping current list');
      return false;
    }
    catalog = mergeCatalogs(bundledCatalog, remote);
    writeCache(remote);
    window.dispatchEvent(new CustomEvent(MODELS_UPDATED_EVENT));
    logger.log('[Models] Model list updated:', remote.updatedAt);
    return true;
  } catch (error) {
    logger.warn('[Models] Could not refresh model list:', error?.message || error);
    return false;
  }
}

/**
 * Create a fetcher for a catalog published as a JSON file.
 * @param {string} url
 * @returns {Function}
 */
export function fetchJsonCatalog(url) {
  return async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * @param {string} aiKey - chatgpt, claude, gemini
 * @returns {string|null} openai, anthropic, google
 */
export function getProvider(aiKey) {
  return PROVIDERS[aiKey] || null;
}

/**
 * @param {string} aiKey - chatgpt, claude, gemini
 * @returns {Array<{id: string, name: string, credits?: number}>}
 */
export function getModels(aiKey) {
  return (catalog.providers[aiKey]?.models || []).map(model => ({ ...model }));
}

/**
 * @param {string} aiKey
 * @returns {string|null}
 */
export function getDefaultModel(aiKey) {
  return catalog.providers[aiKey]?.default || null;
}

/**
 * @param {string} aiKey
 * @param {string} modelId
 * @returns {{id: string, name: string, credits?: number}|null}
 */
export function getModel(aiKey, modelId) {
  const model = catalog.providers[aiKey]?.models.find(m => m.id === modelId);
  return model ? { ...model } : null;
}

/**
 * The saved model if it is still offered, otherwise the provider default
 * (covers models removed from the list after the user picked them).
 * @param {string} aiKey
 * @param {string|null} modelId
 * @returns {string|null}
 */
export function resolveModel(aiKey, modelId) {
  return getModel(aiKey, modelId) ? modelId : getDefaultModel(aiKey);
}

/**
 * @param {Function} callback - Called after each successful refresh
 * @returns {Function} Unsubscribe
 */
export function onModelsUpdated(callback) {
  window.addEventListener(MODELS_UPDATED_EVENT, callback);
  return () => window.removeEventListener(MODELS_UPDATED_EVENT, callback);
}

/**
 * Fill a <select> with the models of a provider.
 * @param {HTMLSelectElement} select
 * @param {string} aiKey
 * @param {string|null} selectedId - Model to select if still offered
 * @returns {string|null} The selected model ID
 */
export function populateSelect(select, aiKey, selectedId) {
  const value = resolveModel(aiKey, selectedId);
  select.replaceChildren(...getModels(aiKey).map(model => new Option(model.name, model.id)));
  if (value) select.value = value;
  return value;
}
