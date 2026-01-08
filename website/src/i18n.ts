import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import it from './locales/it.json';
import en from './locales/en.json';

const savedLanguage = localStorage.getItem('language') || 'it';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    lng: savedLanguage,
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
