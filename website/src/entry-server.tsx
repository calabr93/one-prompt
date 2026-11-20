// Build-time render of every page in every language, used by scripts/prerender.mjs.
// Never loaded by the dev server, so the fast-refresh export rule does not apply.
/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import i18n from './i18n';
import App from './App';
import { allPages, pageMeta, OG_LOCALE, SITE } from './meta';
import { LANGS, pathFor } from './routes';
import { COMPARE_UPDATED } from './pages/compareContent';

export { allPages, pageMeta, OG_LOCALE, SITE, LANGS, pathFor, COMPARE_UPDATED };

export async function render(path: string, lang: string): Promise<string> {
  await i18n.changeLanguage(lang);
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>
  );
}
