import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './i18n';
import App from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The build ships the home page already rendered in English (scripts/prerender.mjs), so crawlers that
// don't run JavaScript can read it. English desktop visitors reuse that markup; for everyone else
// (other languages, phones, #/prompts) index.html keeps it hidden and React renders from scratch.
if (root.hasChildNodes() && !document.documentElement.classList.contains('prerender-wait')) {
  hydrateRoot(root, app);
} else {
  root.textContent = '';
  createRoot(root).render(app);
}
