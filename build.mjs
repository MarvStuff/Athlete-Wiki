import { readdir, readFile, writeFile, cp, rm, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { load as cheerioLoad } from 'cheerio';
import config from './site.config.mjs';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGES_DIR = 'pages';
const TEMPLATES_DIR = 'templates';
const STATIC_DIR = 'static';
const OUTPUT_DIR = 'public';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_CONTENT_LENGTH = 20_000;

const KNOWN_CATEGORIES = {
  ernaehrung:    { label: 'Ernährung',    color: '#51cf66' },
  training:      { label: 'Training',     color: '#ffa94d' },
  regeneration:  { label: 'Regeneration', color: '#74c0fc' },
  mindset:       { label: 'Mindset',      color: '#cc5de8' },
  gesundheit:    { label: 'Gesundheit',   color: '#ff6b6b' },
  wettkampf:     { label: 'Wettkampf',    color: '#ffd43b' },
  allgemein:     { label: 'Allgemein',    color: '#868e96' },
};

const FONT_FACE_CSS = `<style>
@font-face{font-family:'DM Serif Display';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/dm-serif-display-regular.woff2') format('woff2')}
@font-face{font-family:'Outfit';font-style:normal;font-weight:300;font-display:swap;src:url('/fonts/outfit-300.woff2') format('woff2')}
@font-face{font-family:'Outfit';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/outfit-400.woff2') format('woff2')}
@font-face{font-family:'Outfit';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/outfit-500.woff2') format('woff2')}
@font-face{font-family:'Outfit';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/outfit-600.woff2') format('woff2')}
@font-face{font-family:'Outfit';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/outfit-700.woff2') format('woff2')}
</style>`;

// ─── CLI Flags ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const VALIDATE_ONLY = args.includes('--validate-only');
const WATCH_MODE = args.includes('--watch');

// ─── Logging ────────────────────────────────────────────────────────────────

const warnings = [];
function warn(msg) {
  warnings.push(msg);
  console.warn(`  ⚠ ${msg}`);
}

// ─── Utility Functions ──────────────────────────────────────────────────────

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50);
}

export function parseMetaBlock(html) {
  const match = html.match(/<!--\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) return null;

  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) meta[key] = value;
  }
  return meta;
}

export function formatDate(dateStr) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return dateStr;
  return `${d}. ${months[m - 1]} ${y}`;
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime());
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function extractContent(html) {
  const $ = cheerioLoad(html);
  $('script, style, svg, noscript, nav').remove();
  let text = $.text();
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH);
  }
  return text;
}

export function extractSummaryFromHtml(html) {
  const $ = cheerioLoad(html);
  const firstP = $('p').first().text().trim();
  return firstP.length > 200 ? firstP.slice(0, 197) + '...' : firstP;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── DSGVO: Google Fonts Replacement ────────────────────────────────────────

export function replaceGoogleFonts(html) {
  // Remove Google Fonts <link> tags (DSGVO requirement)
  const linkRegex = /<link[^>]*fonts\.googleapis\.com[^>]*\/?>/gi;
  let modified = html.replace(linkRegex, FONT_FACE_CSS);

  // Remove preconnect to Google Fonts domains
  modified = modified.replace(/<link[^>]*preconnect[^>]*fonts\.(googleapis|gstatic)\.com[^>]*\/?>/gi, '');

  // If no link was replaced but @font-face is already present, just remove any stray Google links
  if (modified === html) {
    // No replacement happened, check if @font-face already exists
    if (html.includes('@font-face') && html.includes('/fonts/')) {
      // Already has local fonts, nothing to do
    } else {
      // No Google Fonts link and no local fonts - add @font-face after first <style> or before </head>
      if (modified.includes('</head>')) {
        modified = modified.replace('</head>', FONT_FACE_CSS + '\n</head>');
      }
    }
  }

  return modified;
}

// DSGVO validation: check for remaining external resource references
export function checkExternalResources(html, filename) {
  const issues = [];
  if (/fonts\.googleapis\.com/i.test(html)) {
    issues.push(`${filename}: Still contains fonts.googleapis.com reference`);
  }
  if (/fonts\.gstatic\.com/i.test(html)) {
    issues.push(`${filename}: Still contains fonts.gstatic.com reference`);
  }
  if (/cdn\.jsdelivr\.net/i.test(html)) {
    issues.push(`${filename}: Still contains cdn.jsdelivr.net reference`);
  }
  // Flag all external scripts (no exceptions – all resources must be local)
  const scriptSrcs = html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi);
  for (const m of scriptSrcs) {
    const src = m[1];
    if (!src.startsWith('/') && !src.startsWith('./')) {
      issues.push(`${filename}: External script: ${src}`);
    }
  }
  return issues;
}

// ─── OG Tag Injection ───────────────────────────────────────────────────────

export function injectOgTags(html, article) {
  const tags = [
    `<meta property="og:title" content="${escapeHtmlAttr(article.title)}">`,
    `<meta property="og:description" content="${escapeHtmlAttr(article.summary || '')}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${escapeHtmlAttr(config.siteUrl + article.url)}">`,
    `<meta property="og:image" content="${escapeHtmlAttr(config.siteUrl + '/og-default.png')}">`,
    `<meta property="og:site_name" content="${escapeHtmlAttr(config.siteName)}">`,
    `<meta property="og:locale" content="de_DE">`,
    `<meta name="description" content="${escapeHtmlAttr(article.summary || '')}">`,
    `<link rel="canonical" href="${escapeHtmlAttr(config.siteUrl + article.url)}">`,
  ].join('\n');

  const jsonLd = `<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  datePublished: article.date,
  description: article.summary || '',
  url: config.siteUrl + article.url,
  publisher: { '@type': 'Organization', name: config.siteName },
})}
</script>`;

  // Remove existing OG tags to prevent duplicates
  let modified = html;
  modified = modified.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name="description"[^>]*>/gi, '');
  modified = modified.replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  modified = modified.replace(/<script\s+type="application\/ld\+json">[^<]*<\/script>/gi, '');

  // Insert after first <meta charset> or after <head>
  const charsetMatch = modified.match(/<meta\s+charset=["'][^"']*["'][^>]*>/i);
  if (charsetMatch) {
    const insertPos = modified.indexOf(charsetMatch[0]) + charsetMatch[0].length;
    modified = modified.slice(0, insertPos) + '\n' + tags + '\n' + jsonLd + '\n' + modified.slice(insertPos);
  } else if (modified.includes('<head>')) {
    modified = modified.replace('<head>', '<head>\n' + tags + '\n' + jsonLd);
  }

  return modified;
}

// ─── Navbar Injection ───────────────────────────────────────────────────────

function buildNavbarHtml() {
  const analyticsScript = config.analyticsToken
    ? `\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${config.analyticsToken}"}'></script>`
    : '';

  return `<nav style="max-width:1100px;margin:0 auto;padding:16px 30px;display:flex;justify-content:space-between;align-items:center;font-family:'Outfit',sans-serif;font-size:0.85rem">
<a href="/" style="color:#8899aa;text-decoration:none;font-weight:400" aria-label="Zurück zur Übersicht">← Übersicht</a>
<div style="display:flex;gap:12px;align-items:center">
<a href="/impressum.html" style="color:#556677;text-decoration:none;font-size:0.72rem">Impressum</a>
<a href="/datenschutz.html" style="color:#556677;text-decoration:none;font-size:0.72rem">Datenschutz</a>
<button onclick="navigator.clipboard.writeText(location.href).then(()=>{this.textContent='Kopiert!';setTimeout(()=>this.textContent='Link kopieren',2000)})" style="padding:8px 16px;border:1px solid #1e2d3d;border-radius:10px;background:transparent;color:#8899aa;font-family:'Outfit',sans-serif;font-size:0.82rem;cursor:pointer" aria-label="Link dieser Seite kopieren">Link kopieren</button>
</div>
</nav>${analyticsScript}`;
}

function injectNavbar(html) {
  const navbar = buildNavbarHtml();
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (bodyMatch) {
    const insertPos = html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    return html.slice(0, insertPos) + '\n' + navbar + '\n' + html.slice(insertPos);
  }
  return html;
}

// ─── SEO Generation ─────────────────────────────────────────────────────────

function generateSitemap(articles) {
  const latestDate = articles.length > 0 ? articles[0].date : todayStr();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>${escapeXml(config.siteUrl)}/</loc>
<lastmod>${latestDate}</lastmod>
<priority>1.0</priority>
</url>`;

  for (const a of articles) {
    xml += `
<url>
<loc>${escapeXml(config.siteUrl + a.url)}</loc>
<lastmod>${a.date}</lastmod>
<priority>0.8</priority>
</url>`;
  }

  xml += '\n</urlset>\n';
  return xml;
}

function generateRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /index.json

Sitemap: ${config.siteUrl}/sitemap.xml
`;
}

// ─── Main Build ─────────────────────────────────────────────────────────────

async function build() {
  const startTime = performance.now();
  console.log('\nAthlete Wiki Build');
  console.log('──────────────────');

  // 1. Clean output
  if (!VALIDATE_ONLY) {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(path.join(OUTPUT_DIR, 'pages'), { recursive: true });
    await mkdir(path.join(OUTPUT_DIR, 'fonts'), { recursive: true });
  }

  // 2. Check required files
  if (!existsSync(PAGES_DIR)) {
    await mkdir(PAGES_DIR, { recursive: true });
  }
  if (!VALIDATE_ONLY) {
    for (const tpl of ['startseite.html', '404.html', 'impressum.html', 'datenschutz.html']) {
      if (!existsSync(path.join(TEMPLATES_DIR, tpl))) {
        console.error(`FATAL: Template nicht gefunden: ${TEMPLATES_DIR}/${tpl}`);
        process.exit(1);
      }
    }
  }

  // 3. Scan pages
  let files;
  try {
    files = await readdir(PAGES_DIR);
  } catch {
    files = [];
  }

  const htmlFiles = files.filter(f => f.endsWith('.html'));
  const nonHtmlFiles = files.filter(f => !f.endsWith('.html') && !f.startsWith('.'));
  for (const f of nonHtmlFiles) {
    warn(`${f}: Keine .html-Datei, ignoriert`);
  }

  console.log(`Gescannt:      ${htmlFiles.length} Dateien`);

  // 4. Parse articles
  const articles = [];
  const slugs = new Set();
  let draftCount = 0;
  let errorCount = 0;

  for (const filename of htmlFiles) {
    const filepath = path.join(PAGES_DIR, filename);

    // Size check
    const fileStat = await stat(filepath);
    if (fileStat.size === 0) {
      warn(`${filename}: Datei ist leer, übersprungen`);
      errorCount++;
      continue;
    }
    if (fileStat.size > MAX_FILE_SIZE) {
      warn(`${filename}: Datei zu groß (${(fileStat.size / 1024 / 1024).toFixed(1)} MB), übersprungen`);
      errorCount++;
      continue;
    }

    const html = await readFile(filepath, 'utf-8');

    // Parse meta block
    const meta = parseMetaBlock(html);
    if (!meta) {
      warn(`${filename}: Meta-Block fehlt, verwende Defaults`);
    }

    const title = meta?.title || filename.replace('.html', '');
    let date = meta?.date || todayStr();
    if (!isValidDate(date)) {
      warn(`${filename}: Ungültiges Datum "${date}", verwende heute`);
      date = todayStr();
    }

    const tags = meta?.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    let category = meta?.category || 'allgemein';
    if (!KNOWN_CATEGORIES[category]) {
      warn(`${filename}: Kategorie "${category}" unbekannt, Fallback "allgemein"`);
      category = 'allgemein';
    }

    const status = meta?.status || 'published';
    if (status === 'draft' && !config.buildDrafts) {
      draftCount++;
      continue;
    }

    // Slug (single word, no date prefix, no hyphens)
    let slug = meta?.slug ? meta.slug.replace(/[^a-z0-9]/gi, '').toLowerCase() : slugify(title);
    if (meta?.slug && meta.slug !== slug) {
      warn(`${filename}: Slug "${meta.slug}" enthielt ungültige Zeichen, bereinigt zu "${slug}"`);
    }
    if (slugs.has(slug)) {
      const origSlug = slug;
      let i = 2;
      while (slugs.has(slug)) { slug = `${origSlug}${i++}`; }
      warn(`${filename}: Slug-Kollision mit "${origSlug}", umbenannt zu "${slug}"`);
    }
    slugs.add(slug);

    const summary = meta?.summary || extractSummaryFromHtml(html);
    const keywords = meta?.keywords ? meta.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const content = extractContent(html);
    const url = `/pages/${slug}.html`;

    articles.push({ slug, url, title, date, tags, category, summary, keywords, content, _filename: filename, _html: html });
  }

  // Sort by date descending
  articles.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`Publiziert:    ${articles.length} Artikel`);
  if (draftCount > 0) console.log(`Drafts:        ${draftCount} übersprungen`);
  if (errorCount > 0) console.log(`Fehler:        ${errorCount} übersprungen`);

  // ─── Validate-only mode ─────────────────────────────────────────────

  if (VALIDATE_ONLY) {
    console.log('\n── Validierung ──');
    let allOk = true;
    for (const a of articles) {
      const issues = checkExternalResources(a._html, a._filename);
      if (issues.length > 0) {
        allOk = false;
        for (const issue of issues) warn(issue);
        console.log(`❌ ${a._filename}`);
      } else {
        console.log(`✅ ${a._filename} – ${a.title} [${a.category}]`);
      }
    }
    if (warnings.length > 0) {
      console.log(`\n${warnings.length} Warnung(en)`);
    }
    if (allOk) console.log('\nAlle Artikel valide.');
    return;
  }

  // ─── Build output ───────────────────────────────────────────────────

  // 5. Process and copy article pages
  for (const article of articles) {
    let html = article._html;

    // DSGVO: Replace Google Fonts links with local @font-face
    html = replaceGoogleFonts(html);

    // DSGVO check: verify no external resources remain
    const extIssues = checkExternalResources(html, article._filename);
    for (const issue of extIssues) warn(issue);

    // Inject OG tags + meta description + canonical + JSON-LD
    if (config.injectOgTags) {
      html = injectOgTags(html, article);
    }

    // Inject navbar
    if (config.injectNavbar) {
      html = injectNavbar(html);
    }

    await writeFile(path.join(OUTPUT_DIR, 'pages', `${article.slug}.html`), html);
  }

  // 6. Build search index (without internal fields)
  const index = articles.map(({ _filename, _html, ...rest }) => rest);
  const indexJson = JSON.stringify(index);
  await writeFile(path.join(OUTPUT_DIR, 'index.json'), indexJson);

  const indexSize = Buffer.byteLength(indexJson);
  console.log(`Index:         ${(indexSize / 1024).toFixed(0)} KB`);

  // 7. Generate startseite
  let startseite = await readFile(path.join(TEMPLATES_DIR, 'startseite.html'), 'utf-8');
  startseite = startseite.replace(/\{\{count\}\}/g, String(articles.length));
  startseite = startseite.replace(/\{\{siteUrl\}\}/g, config.siteUrl);
  startseite = startseite.replace(/\{\{siteName\}\}/g, config.siteName);
  if (config.analyticsToken) {
    startseite = startseite.replace('</body>',
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${config.analyticsToken}"}'></script>\n</body>`);
  }
  await writeFile(path.join(OUTPUT_DIR, 'index.html'), startseite);

  // 8. Copy templates (404, Impressum, Datenschutz)
  for (const tpl of ['404.html', 'impressum.html', 'datenschutz.html']) {
    let content = await readFile(path.join(TEMPLATES_DIR, tpl), 'utf-8');
    content = content.replace(/\{\{siteUrl\}\}/g, config.siteUrl);
    content = content.replace(/\{\{siteName\}\}/g, config.siteName);
    content = content.replace(/\{\{legalName\}\}/g, config.legal.name);
    content = content.replace(/\{\{legalAddress\}\}/g, config.legal.address);
    content = content.replace(/\{\{legalEmail\}\}/g, config.legal.email);
    await writeFile(path.join(OUTPUT_DIR, tpl), content);
  }

  // 9. Copy static assets
  if (existsSync(STATIC_DIR)) {
    const staticFiles = await readdir(STATIC_DIR, { withFileTypes: true });
    for (const entry of staticFiles) {
      if (entry.name === 'fonts') continue; // handled separately
      const src = path.join(STATIC_DIR, entry.name);
      const dest = path.join(OUTPUT_DIR, entry.name);
      await cp(src, dest, { recursive: true });
    }
  }

  // Copy fonts
  if (existsSync(path.join(STATIC_DIR, 'fonts'))) {
    await cp(path.join(STATIC_DIR, 'fonts'), path.join(OUTPUT_DIR, 'fonts'), { recursive: true });
  }

  // Copy fuse.js from node_modules (DSGVO: local bundling instead of CDN)
  const fusePath = path.join('node_modules', 'fuse.js', 'dist', 'fuse.min.js');
  if (existsSync(fusePath)) {
    await cp(fusePath, path.join(OUTPUT_DIR, 'fuse.min.js'));
  } else {
    warn('fuse.js nicht in node_modules gefunden');
  }

  // 10. Generate SEO files
  await writeFile(path.join(OUTPUT_DIR, 'sitemap.xml'), generateSitemap(articles));
  await writeFile(path.join(OUTPUT_DIR, 'robots.txt'), generateRobotsTxt());

  // 11. Consistency check
  let pagesCount = 0;
  try {
    pagesCount = (await readdir(path.join(OUTPUT_DIR, 'pages'))).length;
  } catch { /* empty */ }

  if (pagesCount !== articles.length) {
    warn(`Inkonsistenz: ${pagesCount} Dateien in public/pages/, aber ${articles.length} Index-Einträge`);
  }

  // ─── Build report ───────────────────────────────────────────────────

  const duration = (performance.now() - startTime).toFixed(0);
  console.log('──────────────────');
  if (warnings.length > 0) {
    console.log('Warnungen:');
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    console.log('──────────────────');
  }
  console.log(`Fertig in ${duration}ms\n`);
}

// ─── Watch Mode ─────────────────────────────────────────────────────────────

async function watch() {
  const { watch: chokidarWatch } = await import('chokidar');
  const { createServer } = await import('http');
  const { readFile: readFileSync } = await import('fs/promises');

  // Initial build
  await build();

  // Static file server
  const mimeTypes = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png',
    '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
  };

  const server = createServer(async (req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(OUTPUT_DIR, urlPath);
    const ext = path.extname(filePath);

    try {
      const content = await readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      try {
        const notFound = await readFileSync(path.join(OUTPUT_DIR, '404.html'));
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(notFound);
      } catch {
        res.writeHead(404);
        res.end('Not Found');
      }
    }
  });

  server.listen(3000, () => {
    console.log('Dev-Server: http://localhost:3000');
  });

  // Watch for changes
  let building = false;
  const watcher = chokidarWatch([PAGES_DIR, TEMPLATES_DIR, STATIC_DIR], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  watcher.on('all', async (event, changedPath) => {
    if (building) return;
    building = true;
    console.log(`\nÄnderung: ${changedPath} (${event})`);
    try {
      await build();
    } catch (err) {
      console.error('Build-Fehler:', err.message);
    }
    building = false;
  });
}

// ─── Entry Point ────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('build.mjs') || process.argv[1].replace(/\\/g, '/').endsWith('build.mjs'));

if (isDirectRun) {
  if (WATCH_MODE) {
    watch().catch(err => { console.error(err); process.exit(1); });
  } else {
    build().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
  }
}
