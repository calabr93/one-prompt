import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import it from './locales/it.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import { currentRoute } from './routes';

// The build also renders the home page in Node (scripts/prerender.mjs), where there is no browser:
// there the page is rendered in English.
const isBrowser = typeof window !== 'undefined';

// Simple language detection (keep in sync with the prerender-wait script in index.html):
// the URL prefix (/it/, /es/…) wins, then the saved choice, then the browser language.
const getLanguage = () => {
  if (!isBrowser) return 'en';
  const fromPath = currentRoute().lang;
  if (fromPath) return fromPath;
  const saved = localStorage.getItem('language');
  if (saved) return saved;

  const browserLang = navigator.language.split('-')[0];
  const supported = ['it', 'en', 'es', 'fr', 'de', 'pt', 'tr'];
  return supported.includes(browserLang) ? browserLang : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      pt: { translation: pt },
      tr: { translation: tr },
    },
    lng: getLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

if (isBrowser) {
  // Update HTML lang attribute when language changes
  i18n.on('languageChanged', (lng) => {
    document.documentElement.setAttribute('lang', lng);
  });

  // Set initial lang attribute
  document.documentElement.setAttribute('lang', i18n.language);
}

export default i18n;
