// Build-time render of the home page (English), used by scripts/prerender.mjs.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import './i18n';
import App from './App';

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
