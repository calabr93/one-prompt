// Website URLs. English lives at the root ("/", "/prompts/"); the other languages under their code
// ("/it/", "/it/prompts/"…), so each language has its own address for search engines (hreflang).
// The comparison article too: /compare/<slug>/ in English, /it/compare/<slug>/ with Italian prices…
// Keep LANGS in sync with src/i18n.ts and the prerender-wait script in index.html.

export const LANGS = ['en', 'it', 'es', 'fr', 'de', 'pt', 'tr'] as const;
export type Lang = (typeof LANGS)[number];
export type Page = 'home' | 'prompts' | 'compare';

export const COMPARE_SLUG = 'claude-pro-vs-chatgpt-plus-vs-gemini';

export interface Route {
  /** Language fixed by the URL prefix; null at the root, where the browser language decides. */
  lang: Lang | null;
  page: Page;
}

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function parsePath(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  let lang: Lang | null = null;
  if (parts.length > 0 && parts[0] !== 'en' && isLang(parts[0])) {
    lang = parts.shift() as Lang;
  }
  if (parts[0] === 'prompts') return { lang, page: 'prompts' };
  if (parts[0] === 'compare' && parts[1] === COMPARE_SLUG) return { lang, page: 'compare' };
  return { lang, page: 'home' };
}

export function pathFor(lang: string, page: Page): string {
  const prefix = lang === 'en' || !isLang(lang) ? '/' : `/${lang}/`;
  if (page === 'compare') return `${prefix}compare/${COMPARE_SLUG}/`;
  return page === 'prompts' ? `${prefix}prompts/` : prefix;
}

export function currentRoute(): Route {
  return parsePath(typeof window === 'undefined' ? '/' : window.location.pathname);
}
