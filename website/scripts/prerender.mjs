// Puts the home page, rendered in English at build time (src/entry-server.tsx), inside dist/index.html.
// Crawlers that don't run JavaScript (GPTBot, ClaudeBot, PerplexityBot…) can then read the page;
// in the browser React takes over (see src/main.tsx and the prerender-wait script in index.html).
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'dist', 'index.html');
const ssrDir = path.join(root, 'dist-ssr');

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const html = await readFile(indexPath, 'utf8');
const marker = '<div id="root"></div>';
if (!html.includes(marker)) {
  throw new Error(`prerender: ${marker} not found in dist/index.html`);
}

const appHtml = render();
if (!appHtml.includes('<h1')) {
  throw new Error('prerender: the rendered home page has no <h1>');
}

await writeFile(indexPath, html.replace(marker, `<div id="root">${appHtml}</div>`));
await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: home page written into dist/index.html (${appHtml.length} characters)`);
