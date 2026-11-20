// Writes every page already rendered (src/entry-server.tsx) into dist/: the home page and the prompts
// page in each language (/, /it/, /prompts/, /it/prompts/…) and the comparison article, each with its
// own title, description, canonical and hreflang links, plus sitemap.xml.
// Crawlers that don't run JavaScript (GPTBot, ClaudeBot, PerplexityBot…) can then read the pages;
// in the browser React takes over (see src/main.tsx and the prerender-wait script in index.html).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const ssr = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const { render, allPages, pageMeta, OG_LOCALE, SITE, LANGS, pathFor, COMPARE_UPDATED } = ssr;

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const ROOT_MARKER = '<div id="root"></div>';
if (!template.includes(ROOT_MARKER)) {
  throw new Error(`prerender: ${ROOT_MARKER} not found in dist/index.html`);
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function replaceOnce(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`prerender: ${what} not found in index.html`);
  return html.replace(pattern, replacement);
}

function alternates(page) {
  if (page === 'compare') return '';
  const links = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${pathFor(l, page)}" />`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE}${pathFor('en', page)}" />`);
  return '\n    ' + links.join('\n    ');
}

function articleJsonLd(meta) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title.replace(/ \| OnePrompt$/, ''),
    description: meta.description,
    url: meta.url,
    dateModified: COMPARE_UPDATED,
    inLanguage: 'en',
    image: `${SITE}/og-image.png`,
    author: { '@id': `${SITE}/#organization` },
    publisher: { '@id': `${SITE}/#organization` },
  };
  return `\n    <script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

let written = 0;
for (const { lang, page, path: urlPath } of allPages()) {
  const meta = pageMeta(lang, page);
  const appHtml = await render(urlPath, lang);
  if (!appHtml.includes('<h1')) throw new Error(`prerender: ${urlPath} has no <h1>`);

  let html = template;
  html = replaceOnce(html, /<html lang="[^"]*">/, `<html lang="${lang}">`, '<html lang>');
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`, '<title>');
  html = replaceOnce(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`, 'description');
  html = replaceOnce(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`, 'og:title');
  html = replaceOnce(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`, 'og:description');
  html = replaceOnce(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(meta.url)}$2`, 'og:url');
  html = replaceOnce(html, /(<meta property="og:locale" content=")[^"]*(")/, `$1${OG_LOCALE[lang]}$2`, 'og:locale');
  html = replaceOnce(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`, 'twitter:title');
  html = replaceOnce(html, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`, 'twitter:description');
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${esc(meta.url)}" />${alternates(page)}${page === 'compare' ? articleJsonLd(meta) : ''}`,
    'canonical'
  );
  html = replaceOnce(html, /"inLanguage": "en"/, `"inLanguage": "${lang}"`, 'JSON-LD inLanguage');
  html = html.replace(ROOT_MARKER, `<div id="root">${appHtml}</div>`);

  const outDir = path.join(dist, ...urlPath.split('/').filter(Boolean));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html);
  written++;
}

// sitemap.xml with the language versions of each page.
const today = new Date().toISOString().slice(0, 10);
const urls = [];
for (const page of ['home', 'prompts']) {
  for (const lang of LANGS) {
    const alts = LANGS.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${pathFor(l, page)}"/>`
    ).join('\n');
    urls.push(
      `  <url>\n    <loc>${SITE}${pathFor(lang, page)}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${pathFor('en', page)}"/>\n  </url>`
    );
  }
}
urls.push(`  <url>\n    <loc>${SITE}${pathFor('en', 'compare')}</loc>\n    <lastmod>${COMPARE_UPDATED}</lastmod>\n  </url>`);
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
);

await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: ${written} pages and sitemap.xml written into dist/`);
