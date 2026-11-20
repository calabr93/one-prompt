// Title, description and address of each page, used by the app (document.title) and by
// scripts/prerender.mjs (the <head> of every prerendered page).
import i18n from './i18n';
import { LANGS, isLang, pathFor, type Lang, type Page } from './routes';
import { COMPARE_CONTENT } from './pages/compareContent';

export const SITE = 'https://one-prompt.app';

export const OG_LOCALE: Record<Lang, string> = {
  en: 'en_US',
  it: 'it_IT',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  pt: 'pt_BR',
  tr: 'tr_TR',
};

export interface PageMeta {
  title: string;
  description: string;
  url: string;
}

export function pageMeta(language: string, page: Page): PageMeta {
  const lang: Lang = isLang(language) ? language : 'en';
  if (page === 'compare') {
    const c = COMPARE_CONTENT[lang];
    return { title: c.metaTitle, description: c.metaDescription, url: SITE + pathFor(lang, 'compare') };
  }
  const t = i18n.getFixedT(lang);
  if (page === 'prompts') {
    return {
      title: `${t('promptsPage.title')} - OnePrompt`,
      description: t('promptsPage.subtitle'),
      url: SITE + pathFor(lang, 'prompts'),
    };
  }
  if (lang === 'en') {
    return {
      title: 'OnePrompt - Compare AIs in an Instant',
      description:
        'Compare responses from ChatGPT, Claude, Gemini and other AI services in a single app. Open source and free.',
      url: SITE + '/',
    };
  }
  return {
    title: `OnePrompt - ${t('hero.headline')}`,
    description: t('hero.subheadline'),
    url: SITE + pathFor(lang, 'home'),
  };
}

/** Every prerendered page: home, prompts and the comparison article in each language. */
export function allPages(): { lang: Lang; page: Page; path: string }[] {
  const pages: { lang: Lang; page: Page; path: string }[] = [];
  for (const page of ['home', 'prompts', 'compare'] as const) {
    for (const lang of LANGS) {
      pages.push({ lang, page, path: pathFor(lang, page) });
    }
  }
  return pages;
}
