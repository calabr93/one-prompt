// Title, description and address of each page, used by the app (document.title) and by
// scripts/prerender.mjs (the <head> of every prerendered page).
import i18n from './i18n';
import { LANGS, isLang, pathFor, type Lang, type Page } from './routes';

export const SITE = 'https://one-prompt.app';

export const OG_LOCALE: Record<Lang, string> = {
  en: 'en_US',
  it: 'it_IT',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  pt: 'pt_PT',
  tr: 'tr_TR',
};

export const COMPARE_META = {
  title: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): which AI subscription? | OnePrompt',
  description:
    'Prices, limits and features of Claude Pro, ChatGPT Plus and Google AI Pro side by side, checked on the official pages, and how to pick the right one for writing, coding and research.',
};

export interface PageMeta {
  title: string;
  description: string;
  url: string;
}

export function pageMeta(language: string, page: Page): PageMeta {
  const lang: Lang = isLang(language) ? language : 'en';
  if (page === 'compare') {
    return { ...COMPARE_META, url: SITE + pathFor('en', 'compare') };
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

/** Every prerendered page: home and prompts in each language, the comparison article in English. */
export function allPages(): { lang: Lang; page: Page; path: string }[] {
  const pages: { lang: Lang; page: Page; path: string }[] = [];
  for (const page of ['home', 'prompts'] as const) {
    for (const lang of LANGS) {
      pages.push({ lang, page, path: pathFor(lang, page) });
    }
  }
  pages.push({ lang: 'en', page: 'compare', path: pathFor('en', 'compare') });
  return pages;
}
