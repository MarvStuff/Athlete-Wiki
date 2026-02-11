# Athlete Wiki – Erweitertes Produktionskonzept

Dieses Dokument erweitert das Basiskonzept (`athlete-wiki-webapp-konzept.md`) um alles, was fuer eine produktionsreife, professionelle Webanwendung noetig ist. DSGVO-relevante Anforderungen sind direkt an der jeweiligen Stelle eingebunden, nicht als separates Kapitel.

---

## 1. Build-Konfiguration

### 1.1 Umgebungsvariablen

Das Build-Script liest Konfiguration aus einer `site.config.mjs`:

```javascript
export default {
  // Pflicht
  siteUrl: process.env.SITE_URL || 'https://wiki.deinedomain.de',
  siteName: 'Athlete Wiki',

  // Optional
  analyticsToken: process.env.CF_ANALYTICS_TOKEN || null,
  injectNavbar: true,
  injectOgTags: true,
  buildDrafts: process.env.BUILD_DRAFTS === 'true',

  // Impressum-Daten (Pflicht fuer Produktion)
  legal: {
    name: process.env.LEGAL_NAME || '[Name eintragen]',
    address: process.env.LEGAL_ADDRESS || '[Adresse eintragen]',
    email: process.env.LEGAL_EMAIL || '[E-Mail eintragen]',
  }
};
```

Cloudflare Pages Environment Variables fuer Produktion:
- `SITE_URL` – Die tatsaechliche Domain
- `CF_ANALYTICS_TOKEN` – Cloudflare Analytics Token (optional)
- `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` – Impressumsangaben

### 1.2 Build-Script Erweiterungen

#### Clean-Build

Vor jedem Build wird `public/` komplett geloescht (Idempotenz). Keine Reste alter Dateien:

```javascript
// Erster Schritt im Build
import { rm } from 'fs/promises';
await rm('public', { recursive: true, force: true });
```

#### Exit-Codes

| Code | Bedeutung |
|------|-----------|
| 0 | Erfolg |
| 1 | Fataler Fehler (kein Output erzeugt) |

Fehler in einzelnen Artikeln sind KEIN fataler Fehler. Der Build warnt und ueberspringt die Datei. Fatale Fehler: Template nicht gefunden, `public/` nicht erstellbar, `index.json` nicht schreibbar.

#### Build-Report (stdout)

```
Athlete Wiki Build
──────────────────
Gescannt:      25 Dateien
Publiziert:    22 Artikel
Drafts:         2 uebersprungen
Fehler:         1 uebersprungen (siehe Warnungen)
Index:         48 KB (geschaetzt 15 KB gzipped)
──────────────────
Warnungen:
  ⚠ pages/broken-file.html: Meta-Block fehlt, uebersprungen
  ⚠ pages/old-article.html: Kategorie "sport" unbekannt, Fallback "allgemein"
  ⚠ pages/dupe.html: Slug-Kollision mit "2026-02-10-test", umbenannt zu "2026-02-10-test-2"
──────────────────
Fertig in 340ms
```

### 1.3 Artikel-Validierung im Build

Jede Datei in `pages/` durchlaeuft diese Pruefung:

```
1. Ist es eine .html-Datei? (andere Dateien ignorieren, warnen)
2. Ist die Datei lesbar und > 0 Bytes? (sonst warnen, ueberspringen)
3. Ist die Datei < 2 MB? (sonst warnen, ueberspringen)
4. Existiert ein Meta-Block? (sonst: alle Defaults, warnen)
5. Ist das Datum valide (YYYY-MM-DD, parsbares Datum)? (sonst: heute, warnen)
6. Ist die Kategorie bekannt? (sonst: "allgemein", warnen)
7. Ist der Status "draft"? (ueberspringen, loggen)
8. Gibt es eine Slug-Kollision? (anhaengen "-2", warnen)
9. Enthaelt die Datei Google Fonts Links? (ersetzen, warnen)
```

Warnungen verhindern den Build nicht. Sie erscheinen im Build-Report und im CI-Log.

### 1.4 Google Fonts Replacement (DSGVO)

Alle externen Font-Links werden automatisch entfernt und durch lokale @font-face Deklarationen ersetzt:

```
Suche (Regex):  <link[^>]*fonts\.googleapis\.com[^>]*\/?>
Flags:          global, case-insensitive, multiline
```

Ersetzung: Ein `<style>`-Block mit den @font-face Deklarationen fuer DM Serif Display und Outfit (alle Gewichte). Falls der Block bereits existiert (Datei hat schon @font-face), wird nur der Link entfernt.

Pruefung nach dem Replacement: Der Build sucht erneut nach `fonts.googleapis.com` und `fonts.gstatic.com`. Falls noch vorhanden → Warnung.

### 1.5 OG-Tag-Injection

Einfuegen nach `<meta charset="UTF-8">` (oder nach dem ersten `<meta`-Tag):

```html
<meta property="og:title" content="[title]">
<meta property="og:description" content="[summary]">
<meta property="og:type" content="article">
<meta property="og:url" content="[siteUrl]/pages/[slug].html">
<meta property="og:image" content="[siteUrl]/og-default.png">
<meta property="og:site_name" content="Athlete Wiki">
<meta property="og:locale" content="de_DE">
<meta name="description" content="[summary]">
<link rel="canonical" href="[siteUrl]/pages/[slug].html">
```

Deduplizierung: Der Build prueft, ob bereits `og:title` existiert. Falls ja, werden die Tags ueberschrieben, nicht doppelt eingefuegt.

### 1.6 SEO-Generierung im Build

Der Build erzeugt zusaetzlich:

#### sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wiki.deinedomain.de/</loc>
    <lastmod>2026-02-10</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://wiki.deinedomain.de/pages/2026-02-10-blutzucker-dopamin.html</loc>
    <lastmod>2026-02-10</lastmod>
    <priority>0.8</priority>
  </url>
  <!-- ... -->
</urlset>
```

`lastmod` der Startseite = Datum des neuesten Artikels.

#### robots.txt

```
User-agent: *
Allow: /
Disallow: /index.json

Sitemap: https://wiki.deinedomain.de/sitemap.xml
```

### 1.7 Asset-Optimierung

Der Build fuehrt folgende Optimierungen durch:

| Asset | Optimierung |
|-------|-------------|
| HTML (Startseite, 404, Impressum, Datenschutz) | Whitespace-Minifizierung (optional, via Flag) |
| Artikelseiten | KEINE Minifizierung (1:1 Kopie bleibt Prinzip) |
| index.json | Kompaktes JSON (kein Pretty-Print) |
| Fuse.js | Bereits minifiziert aus node_modules |

Fuer die Startseite wird ein `<link rel="preload">` fuer die wichtigsten Fonts generiert:

```html
<link rel="preload" href="/fonts/outfit-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dm-serif-display-regular.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 2. Startseite – Vollstaendige Spezifikation

### 2.1 HTML-Struktur

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Athlete Wiki – Coaching-Wissen durchsuchen</title>
  <meta name="description" content="Durchsuche {{count}} Coaching-Artikel zu Ernaehrung, Training, Regeneration und mehr.">
  <link rel="canonical" href="{{siteUrl}}/">

  <!-- OG Tags -->
  <meta property="og:title" content="Athlete Wiki">
  <meta property="og:description" content="Coaching-Wissen durchsuchen – {{count}} Artikel">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{siteUrl}}/">
  <meta property="og:image" content="{{siteUrl}}/og-default.png">
  <meta property="og:site_name" content="Athlete Wiki">
  <meta property="og:locale" content="de_DE">

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/icon-192.png">

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#38d9a9">

  <!-- Font Preload -->
  <link rel="preload" href="/fonts/outfit-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/dm-serif-display-regular.woff2" as="font" type="font/woff2" crossorigin>

  <style>
    /* @font-face, Reset, vollstaendiges CSS hier inline */
  </style>
</head>
<body>
  <a href="#search" class="skip-link">Zum Suchfeld springen</a>

  <main>
    <header class="hero" role="banner">
      <h1>Athlete Wiki</h1>
      <p class="hero-subtitle">Coaching-Wissen durchsuchen</p>
      <p class="hero-count">{{count}} Artikel</p>
    </header>

    <section class="search-section" aria-label="Artikelsuche">
      <div class="search-wrapper">
        <svg class="search-icon" aria-hidden="true"><!-- Lupe --></svg>
        <input
          id="search"
          type="search"
          placeholder="Suche nach Thema, Tag, Stichwort ..."
          autocomplete="off"
          aria-label="Artikel durchsuchen"
          aria-describedby="search-hint"
        >
      </div>
      <p id="search-hint" class="search-hint">Durchsucht Titel, Tags, Kategorien und Artikeltext</p>
    </section>

    <nav class="filter-section" aria-label="Kategorie-Filter">
      <div class="filter-chips" role="radiogroup" aria-label="Kategorie waehlen">
        <!-- Chips werden per JS aus index.json generiert -->
      </div>
    </nav>

    <section class="results-section" aria-label="Suchergebnisse">
      <p id="results-header" class="results-header" aria-live="polite" aria-atomic="true">
        Alle Artikel
      </p>
      <div id="results" class="results-list" role="list">
        <!-- Karten werden per JS gerendert -->
      </div>
      <div id="empty-state" class="empty-state" hidden>
        <span class="empty-icon" aria-hidden="true">&#128270;</span>
        <p>Keine Artikel gefunden.</p>
        <p class="empty-hint">Versuch einen anderen Suchbegriff oder entferne den Filter.</p>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <span>Athlete Wiki</span>
    <nav aria-label="Rechtliches">
      <a href="/impressum.html">Impressum</a>
      <a href="/datenschutz.html">Datenschutz</a>
    </nav>
  </footer>

  <script src="/fuse.min.js" defer></script>
  <script>
    // App-Logik (siehe 2.5)
  </script>
</body>
</html>
```

### 2.2 Vollstaendiges CSS

#### Reset und Basis

```css
@font-face { /* DM Serif Display Regular */ }
@font-face { /* Outfit 300-700 */ }

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0c1117;
  --bg-card: #1a2332;
  --border: #1e2d3d;
  --border-hover: #2a3f55;
  --accent: #38d9a9;
  --accent-dim: rgba(56, 217, 169, 0.12);
  --text: #e2e8f0;
  --text-secondary: #8899aa;
  --text-dim: #556677;

  --cat-ernaehrung: #51cf66;
  --cat-training: #ffa94d;
  --cat-regeneration: #74c0fc;
  --cat-mindset: #cc5de8;
  --cat-gesundheit: #ff6b6b;
  --cat-wettkampf: #ffd43b;
  --cat-allgemein: #868e96;

  --font-heading: 'DM Serif Display', serif;
  --font-body: 'Outfit', sans-serif;
  --radius: 16px;
  --max-width: 720px;
}

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 400;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }
}
```

#### Skip-Link (Accessibility)

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  background: var(--accent);
  color: var(--bg);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 100;
  text-decoration: none;
}
.skip-link:focus {
  top: 16px;
}
```

#### Hero

```css
.hero {
  text-align: center;
  padding: 80px 20px 40px;
}
.hero h1 {
  font-family: var(--font-heading);
  font-size: clamp(2.2rem, 6vw, 3.5rem);
  font-weight: 400;
  line-height: 1.1;
  background: linear-gradient(135deg, #fff 0%, #8899aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-subtitle {
  font-size: clamp(1rem, 2.5vw, 1.15rem);
  color: var(--text-secondary);
  font-weight: 300;
  margin-top: 12px;
}
.hero-count {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-top: 20px;
}
```

#### Suchfeld

```css
.search-section {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 20px;
}
.search-wrapper {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-dim);
  pointer-events: none;
}
#search {
  width: 100%;
  padding: 18px 20px 18px 52px;
  background: #111920;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 1.05rem;
  font-weight: 400;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
#search::placeholder { color: var(--text-dim); }
#search:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.search-hint {
  font-size: 0.78rem;
  color: var(--text-dim);
  margin-top: 10px;
  text-align: center;
}
```

#### Filter-Chips

```css
.filter-section {
  max-width: var(--max-width);
  margin: 28px auto 0;
  padding: 0 20px;
}
.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.filter-chips::-webkit-scrollbar { display: none; }

.filter-chip {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 400;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  white-space: nowrap;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
/* Aktiver Zustand wird per JS mit data-color gesetzt */
.filter-chip[aria-checked="true"] {
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  color: var(--chip-color);
}
.filter-chip .chip-count {
  font-size: 0.72rem;
  opacity: 0.7;
}
```

#### Ergebnis-Header

```css
.results-section {
  max-width: var(--max-width);
  margin: 32px auto 0;
  padding: 0 20px 80px;
}
.results-header {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 20px;
}
```

#### Artikel-Karten

```css
.article-card {
  display: block;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 28px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s, transform 0.15s, box-shadow 0.25s;
  position: relative;
}
.article-card:hover, .article-card:focus-visible {
  border-color: var(--border-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
.article-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.article-card:hover .card-title { color: var(--accent); }
.article-card:hover .card-arrow { opacity: 1; transform: translateX(3px); }

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.card-date {
  font-size: 0.82rem;
  color: var(--text-dim);
}
.card-category {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 6px;
}
.card-title {
  font-family: var(--font-heading);
  font-size: clamp(1.15rem, 2vw, 1.3rem);
  font-weight: 400;
  line-height: 1.3;
  transition: color 0.2s;
  margin-bottom: 8px;
}
.card-summary {
  font-size: 0.9rem;
  font-weight: 300;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 14px;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.card-tag {
  font-size: 0.72rem;
  color: var(--text-dim);
  background: var(--accent-dim);
  padding: 3px 10px;
  border-radius: 6px;
}
.card-arrow {
  position: absolute;
  right: 24px;
  bottom: 24px;
  font-size: 1.2rem;
  color: var(--text-dim);
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
}
```

#### Stagger-Animation

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.article-card {
  opacity: 0;
  animation: fadeUp 0.4s ease-out forwards;
}
/* Delays werden per JS gesetzt: style="animation-delay: ${i * 0.04}s" */
```

#### Leerer Zustand

```css
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 16px;
}
.empty-state p {
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 400;
}
.empty-hint {
  color: var(--text-dim);
  font-size: 0.88rem;
  font-weight: 300;
  margin-top: 8px;
}
```

#### Footer

```css
.site-footer {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-dim);
  font-weight: 300;
}
.site-footer a {
  color: var(--text-dim);
  text-decoration: none;
  transition: color 0.2s;
}
.site-footer a:hover { color: var(--text-secondary); }
.site-footer nav { display: flex; gap: 16px; }
```

#### Responsive Breakpoints

```css
/* Tablet */
@media (max-width: 768px) {
  .hero { padding: 60px 20px 32px; }
  .article-card { padding: 18px 20px; }
  .card-arrow { display: none; }
}

/* Mobile */
@media (max-width: 480px) {
  .hero { padding: 48px 16px 24px; }
  .hero-count { margin-top: 14px; }
  .search-section, .filter-section, .results-section { padding-left: 16px; padding-right: 16px; }
  .site-footer { flex-direction: column; gap: 8px; text-align: center; }
}
```

### 2.3 Datumsformatierung

Deutsche Datumsanzeige auf den Karten:

```javascript
function formatDate(dateStr) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}. ${months[m - 1]} ${y}`;
}
// "2026-02-10" → "10. Feb 2026"
```

### 2.4 URL-State-Management

Such- und Filterzustand werden in der URL abgebildet:

```
/                                    → Alle Artikel
/?q=protein                          → Suche nach "protein"
/?cat=ernaehrung                     → Kategorie-Filter
/?q=protein&cat=ernaehrung           → Beides kombiniert
```

Verhalten:
- Beim Tippen im Suchfeld wird die URL per `history.replaceState` aktualisiert (kein neuer History-Eintrag pro Tastendruck)
- Beim Klick auf einen Filter-Chip wird per `history.pushState` ein neuer Eintrag erzeugt
- Browser-Zurueck-Button: `popstate`-Event setzt den vorherigen Zustand wieder her
- Beim Laden der Seite: URL-Parameter auslesen und Zustand wiederherstellen
- Dadurch sind Suchzustaende teilbar und Reload-sicher

### 2.5 JavaScript-Architektur

Die gesamte Startseiten-Logik in einer einzigen Datei (inline im Template oder als separates `app.js`), strukturiert in klare Abschnitte:

```javascript
(async function() {
  'use strict';

  // ─── Konfiguration ────────────────────────────
  const DEBOUNCE_MS = 150;
  const MIN_CHARS = 2;
  const CATEGORIES = {
    ernaehrung:    { label: 'Ernährung',    color: '#51cf66' },
    training:      { label: 'Training',     color: '#ffa94d' },
    regeneration:  { label: 'Regeneration', color: '#74c0fc' },
    mindset:       { label: 'Mindset',      color: '#cc5de8' },
    gesundheit:    { label: 'Gesundheit',   color: '#ff6b6b' },
    wettkampf:     { label: 'Wettkampf',    color: '#ffd43b' },
    allgemein:     { label: 'Allgemein',    color: '#868e96' },
  };

  // ─── State ────────────────────────────────────
  let articles = [];
  let fuse = null;
  let activeCategory = null;
  let searchQuery = '';

  // ─── DOM-Referenzen ───────────────────────────
  const searchInput = document.getElementById('search');
  const resultsHeader = document.getElementById('results-header');
  const resultsContainer = document.getElementById('results');
  const emptyState = document.getElementById('empty-state');
  const filterContainer = document.querySelector('.filter-chips');

  // ─── Initialisierung ─────────────────────────
  try {
    const res = await fetch('/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    articles = await res.json();
  } catch (err) {
    resultsHeader.textContent = 'Artikel konnten nicht geladen werden.';
    console.error('Index laden fehlgeschlagen:', err);
    return; // Graceful degradation: Seite bleibt stehen, zeigt Fehlermeldung
  }

  // Fuse.js initialisieren (Fuse muss ueber <script> geladen sein)
  if (typeof Fuse === 'undefined') {
    resultsHeader.textContent = 'Suche nicht verfügbar.';
    renderCards(articles); // Zeige alle Karten ohne Suchfunktion
    return;
  }

  fuse = new Fuse(articles, {
    keys: [
      { name: 'title',    weight: 0.30 },
      { name: 'slug',     weight: 0.25 },
      { name: 'tags',     weight: 0.20 },
      { name: 'category', weight: 0.10 },
      { name: 'keywords', weight: 0.10 },
      { name: 'content',  weight: 0.05 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: MIN_CHARS,
    includeScore: true,
    findAllMatches: true,
  });

  // ─── Filter-Chips rendern ─────────────────────
  renderFilterChips();

  // ─── URL-State wiederherstellen ───────────────
  restoreFromUrl();

  // ─── Autofokus (nur Desktop) ──────────────────
  if (window.innerWidth > 768) {
    searchInput.focus();
  }

  // ─── Event-Listener ───────────────────────────
  searchInput.addEventListener('input', debounce(onSearch, DEBOUNCE_MS));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchQuery = '';
      updateUrl();
      render();
    }
  });
  window.addEventListener('popstate', restoreFromUrl);

  // ─── Kernfunktionen ───────────────────────────
  function onSearch() {
    searchQuery = searchInput.value.trim();
    updateUrl('replace');
    render();
  }

  function onFilterClick(category) {
    activeCategory = (activeCategory === category) ? null : category;
    updateUrl('push');
    render();
    updateChipStates();
  }

  function render() {
    let results;

    if (searchQuery.length >= MIN_CHARS) {
      results = fuse.search(searchQuery).map(r => r.item);
    } else {
      results = articles;
    }

    if (activeCategory) {
      results = results.filter(a => a.category === activeCategory);
    }

    updateResultsHeader(results.length);

    if (results.length === 0) {
      resultsContainer.innerHTML = '';
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      renderCards(results);
    }
  }

  function renderCards(items) {
    resultsContainer.innerHTML = items.map((article, i) => `
      <a href="${escapeHtml(article.url)}"
         class="article-card"
         role="listitem"
         style="animation-delay: ${i * 0.04}s">
        <div class="card-meta">
          <span class="card-date">${formatDate(article.date)}</span>
          <span class="card-category"
                style="color: ${getCatColor(article.category)};
                       background: ${getCatColor(article.category)}1f">
            ${escapeHtml(getCatLabel(article.category))}
          </span>
        </div>
        <div class="card-title">${escapeHtml(article.title)}</div>
        ${article.summary ? `<div class="card-summary">${escapeHtml(article.summary)}</div>` : ''}
        <div class="card-tags">
          ${(article.tags || []).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <span class="card-arrow" aria-hidden="true">→</span>
      </a>
    `).join('');
  }

  function updateResultsHeader(count) {
    const catLabel = activeCategory ? getCatLabel(activeCategory) : null;
    let text;

    if (!searchQuery && !activeCategory) {
      text = 'Alle Artikel';
    } else if (!searchQuery && activeCategory) {
      text = `${count} ${count === 1 ? 'Artikel' : 'Artikel'} in ${catLabel}`;
    } else if (searchQuery && !activeCategory) {
      text = `${count} ${count === 1 ? 'Treffer' : 'Treffer'} für „${escapeHtml(searchQuery)}"`;
    } else {
      text = `${count} ${count === 1 ? 'Treffer' : 'Treffer'} für „${escapeHtml(searchQuery)}" in ${catLabel}`;
    }

    resultsHeader.textContent = text;
  }

  // ─── URL-State ────────────────────────────────
  function updateUrl(mode) {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeCategory) params.set('cat', activeCategory);
    const url = params.toString() ? `?${params}` : location.pathname;
    if (mode === 'push') {
      history.pushState(null, '', url);
    } else {
      history.replaceState(null, '', url);
    }
  }

  function restoreFromUrl() {
    const params = new URLSearchParams(location.search);
    searchQuery = params.get('q') || '';
    activeCategory = params.get('cat') || null;
    searchInput.value = searchQuery;
    updateChipStates();
    render();
  }

  // ─── Hilfsfunktionen ─────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d}. ${months[m - 1]} ${y}`;
  }

  function getCatColor(cat) { return CATEGORIES[cat]?.color || '#868e96'; }
  function getCatLabel(cat) { return CATEGORIES[cat]?.label || cat; }

  function renderFilterChips() { /* ... Chips aus CATEGORIES + Artikelanzahl rendern ... */ }
  function updateChipStates() { /* ... aria-checked updaten ... */ }
})();
```

**Wichtig:**

- `escapeHtml()` wird fuer ALLE Nutzerdaten verwendet (Titel, Tags, Summary) → kein XSS
- Debounce verhindert Race-Conditions bei schnellem Tippen
- Graceful Degradation: Falls `index.json` oder Fuse.js nicht laden, bleibt die Seite nutzbar
- Alle DOM-Manipulationen verwenden `textContent` oder escaping wo noetig

### 2.6 Edge Cases

| Situation | Verhalten |
|-----------|----------|
| 0 Artikel | Hero zeigt "0 Artikel", leerer Zustand wird angezeigt |
| 1 Artikel | "1 Artikel" (Singular und Plural sind im Deutschen identisch) |
| Langer Titel | Wird mehrzeilig angezeigt, kein Abschneiden |
| 20+ Tags | Chips wrappen, kein Limit |
| XSS in Suchfeld | `escapeHtml()` neutralisiert Eingabe |
| index.json 404 | Fehlermeldung statt leere Seite |
| Fuse.js laed nicht | Alle Karten werden angezeigt, Suche deaktiviert |
| Offline (ohne SW) | Browser zeigt Standard-Fehler |

---

## 3. Accessibility (Barrierefreiheit)

### 3.1 Startseite

| Element | ARIA | Keyboard |
|---------|------|----------|
| Skip-Link | — | Sichtbar bei Tab-Focus |
| Suchfeld | `aria-label`, `aria-describedby` | Enter/Escape |
| Filter-Chips | `role="radiogroup"`, `aria-checked` | Tab, Enter/Space |
| Ergebnis-Header | `aria-live="polite"`, `aria-atomic="true"` | — |
| Ergebnisliste | `role="list"` | — |
| Artikel-Karte | `role="listitem"` als `<a>` | Tab, Enter |
| Leerer Zustand | `hidden` Attribut | — |

### 3.2 Farbkontrast

Alle Text-Hintergrund-Kombinationen muessen WCAG AA (4.5:1 fuer normalen Text, 3:1 fuer grossen Text) erfuellen:

| Text | Hintergrund | Kontrast | WCAG AA |
|------|-------------|----------|---------|
| --text (#e2e8f0) | --bg (#0c1117) | ~14:1 | Bestanden |
| --text-secondary (#8899aa) | --bg (#0c1117) | ~6:1 | Bestanden |
| --text-dim (#556677) | --bg (#0c1117) | ~3.5:1 | Nur grosse Texte |
| --text (#e2e8f0) | --bg-card (#1a2332) | ~10:1 | Bestanden |
| --text-secondary (#8899aa) | --bg-card (#1a2332) | ~4.5:1 | Bestanden |

`--text-dim` darf NUR fuer grosse Texte (>= 18px oder >= 14px bold), dekorative Elemente oder Hinweistexte verwendet werden, die nicht kritisch sind. Fuer den Ergebnis-Header (0.78rem, uppercase) ist das grenzwertig – im Zweifelsfall auf `--text-secondary` hochstufen.

### 3.3 Reduced Motion

Alle Animationen werden deaktiviert per `prefers-reduced-motion: reduce` (siehe CSS oben). Das betrifft:
- Stagger-Animation der Karten
- Hover-Transitionen
- Smooth Scroll

### 3.4 Artikelseiten

Die Artikelseiten werden von externen KI-Tools erstellt. Der Build kann folgendes NICHT automatisieren (muss in der Style-Vorlage stehen):
- `<html lang="de">`
- Sinnvolle Heading-Hierarchie (h1 → h2 → h3)
- SVGs mit `aria-hidden="true"` oder `<title>` + `role="img"`

Was der Build automatisieren kann:
- Die injizierte Navigationsleiste hat korrekte ARIA-Labels

---

## 4. SEO

### 4.1 Startseite

```html
<title>Athlete Wiki – Coaching-Wissen durchsuchen</title>
<meta name="description" content="...">
<link rel="canonical" href="{{siteUrl}}/">
<meta property="og:title" content="Athlete Wiki">
<meta property="og:description" content="...">
<meta property="og:type" content="website">
<!-- ... weitere OG Tags -->
```

### 4.2 Artikelseiten (per Build injiziert)

```html
<meta name="description" content="[summary]">
<link rel="canonical" href="{{siteUrl}}/pages/[slug].html">
<meta property="og:title" content="[title]">
<meta property="og:description" content="[summary]">
<meta property="og:type" content="article">
<!-- ... weitere OG Tags -->
```

### 4.3 Structured Data (JSON-LD)

Auf der Startseite:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Athlete Wiki",
  "url": "{{siteUrl}}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "{{siteUrl}}/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
```

Auf Artikelseiten (per Build injiziert):
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[title]",
  "datePublished": "[date]",
  "description": "[summary]",
  "url": "{{siteUrl}}/pages/[slug].html",
  "publisher": {
    "@type": "Organization",
    "name": "Athlete Wiki"
  }
}
</script>
```

### 4.4 sitemap.xml und robots.txt

Werden vom Build automatisch generiert (siehe Kapitel 1.6).

---

## 5. Error Handling

### 5.1 Build-Fehler

| Fehlertyp | Verhalten |
|-----------|----------|
| Template fehlt | Build bricht ab (Exit 1) |
| pages/ leer | Build laeuft, leerer Index |
| Einzelner Artikel kaputt | Warnung, Artikel wird uebersprungen |
| Unbekannte Kategorie | Fallback "allgemein", Warnung |
| Ungueltiges Datum | Fallback heute, Warnung |
| Slug-Kollision | Auto-Suffix "-2", Warnung |
| Datei zu gross (>2MB) | Ueberspringen, Warnung |
| public/ nicht erstellbar | Build bricht ab (Exit 1) |

### 5.2 Runtime-Fehler (Startseite)

| Fehlertyp | Verhalten |
|-----------|----------|
| index.json 404 | Fehlermeldung im Ergebnis-Header |
| index.json korrupt | Fehlermeldung im Ergebnis-Header |
| Fuse.js laed nicht | Karten ohne Suche, Suchfeld deaktiviert |
| JavaScript deaktiviert | Statischer Inhalt im `<noscript>` |

Minimaler `<noscript>`-Fallback:
```html
<noscript>
  <p style="text-align:center;padding:40px;color:#8899aa">
    Bitte aktiviere JavaScript, um die Artikelsuche zu nutzen.
  </p>
</noscript>
```

### 5.3 404-Seite

Die 404-Seite enthaelt ein einfaches Suchfeld, das zur Startseite mit Suchparameter weiterleitet:

```html
<form action="/" method="get">
  <input type="search" name="q" placeholder="Artikel suchen ...">
  <button type="submit">Suchen</button>
</form>
```

So kann ein Athlet, der ueber einen alten WhatsApp-Link kommt, direkt nach dem Artikel suchen.

---

## 6. Developer Experience

### 6.1 npm Scripts

```json
{
  "scripts": {
    "build": "node build.mjs",
    "dev": "node build.mjs --watch",
    "preview": "npx serve public -l 3000",
    "clean": "rm -rf public",
    "validate": "node build.mjs --validate-only",
    "lint": "npx htmlhint pages/*.html"
  }
}
```

### 6.2 Watch-Mode (`npm run dev`)

Das Build-Script akzeptiert ein `--watch` Flag:

```
1. Normaler Build ausfuehren
2. Lokalen HTTP-Server starten (Port 3000)
3. Dateisystem-Watcher auf pages/, templates/, static/
4. Bei Aenderung: Rebuild + Browser-Reload (per LiveReload oder manuell)
```

Implementation: `fs.watch()` oder `chokidar` (optionale devDependency). Bei jeder Aenderung wird ein Rebuild getriggert. Der Rebuild ist inkrementell moeglich (nur geaenderte Dateien), aber fuer < 300 Artikel ist ein vollstaendiger Rebuild schnell genug (< 500ms).

### 6.3 Validate-Mode (`npm run validate`)

Prueft alle Artikelseiten ohne Build-Output:

```
✅ pages/2026-02-10-blutzucker-dopamin.html
   Title: Blutzucker & Dopamin
   Category: ernaehrung
   Tags: 5
   External resources: keine

⚠️ pages/2026-02-12-schlafqualitaet.html
   Warnung: Google Fonts Link gefunden (wird beim Build ersetzt)

❌ pages/broken.html
   Fehler: Meta-Block fehlt
```

### 6.4 Dependencies

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "chokidar": "^4.0.0"
  }
}
```

Minimal gehalten. Kein TypeScript, kein Bundler, kein Framework. Plain Node.js ESM.

---

## 7. Testing

### 7.1 Test-Framework

Vitest (schnell, ESM-nativ, zero-config):

```json
{
  "devDependencies": {
    "vitest": "^3.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 7.2 Unit Tests

```
tests/
├── slugify.test.mjs         Slug-Generierung
├── meta-parser.test.mjs     Meta-Block Parsing
├── date-format.test.mjs     Deutsche Datumsformatierung
├── content-extract.test.mjs HTML → Plain-Text Extraktion
├── font-replace.test.mjs    Google Fonts Replacement
└── og-inject.test.mjs       OG-Tag Injection + Deduplizierung
```

Kritischste Tests:

**Slugify:**
```javascript
test('Umlaute werden aufgeloest', () => {
  expect(slugify('Über Öl und Süßes')).toBe('ueber-oel-und-suesses');
});
test('Sonderzeichen werden entfernt', () => {
  expect(slugify('Test & Versuch!')).toBe('test-versuch');
});
test('Max 80 Zeichen am Wortende', () => {
  const long = 'a '.repeat(50);
  expect(slugify(long).length).toBeLessThanOrEqual(80);
});
```

**Meta-Parser:**
```javascript
test('Parst gueltigen Meta-Block', () => { /* ... */ });
test('Gibt Defaults bei fehlendem Block', () => { /* ... */ });
test('Handhabt fehlende Pflichtfelder', () => { /* ... */ });
test('Unbekannte Kategorie wird zu allgemein', () => { /* ... */ });
```

**Font-Replacement:**
```javascript
test('Ersetzt Google Fonts Link', () => { /* ... */ });
test('Ersetzt mehrzeiligen Link', () => { /* ... */ });
test('Verdoppelt nicht bei bestehendem @font-face', () => { /* ... */ });
```

### 7.3 Integration Tests

```
tests/
└── build.integration.test.mjs
```

Erstellt temporaere Test-Artikel, fuehrt den Build aus, prueft:
- `public/index.json` ist gueltiges JSON mit korrekten Eintraegen
- `public/pages/*.html` existieren und enthalten OG-Tags
- Google Fonts Links sind entfernt
- `public/sitemap.xml` ist valides XML
- `public/robots.txt` existiert
- Draft-Artikel sind NICHT im Output

### 7.4 CI-Integration

Tests laufen VOR dem Deployment in der GitHub Actions Pipeline:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
  build:
    needs: test
    # ... Deployment
```

---

## 8. Content Workflow

### 8.1 Neuer Artikel

```
1. Artikel-HTML erstellen (per KI mit Style-Vorlage)
2. In pages/ ablegen (Dateiname = Slug)
3. npm run validate (prueft Meta-Block, externe Ressourcen)
4. git add + git commit + git push
5. CI Pipeline: Test → Build → Deploy
6. Cloudflare Pages Preview Deployment (bei Pull Request)
7. Merge in main → Live-Deployment
```

### 8.2 Artikel aktualisieren

Gleiche Datei in `pages/` ueberschreiben. Slug und URL bleiben gleich. Der Build uebernimmt die Aenderung automatisch.

### 8.3 Artikel entfernen

Datei aus `pages/` loeschen. Beim naechsten Build verschwindet der Artikel aus dem Index. Optional: `_redirects`-Eintrag fuer alte URLs.

### 8.4 Preview Deployments

Cloudflare Pages erzeugt automatisch Preview-URLs fuer Pull Requests:

```
https://abc123.athlete-wiki.pages.dev
```

Damit kann der Artikel vor dem Merge geprueft werden – Startseiten-Integration, Suche, OG-Tags, Navigationsleiste.

### 8.5 Branch-Strategie

- `main` = Produktion (Auto-Deploy)
- Feature-Branches fuer neue Artikel oder aenderungen
- Pull Requests fuer Review (optional, bei Solo-Projekt nicht zwingend)

---

## 9. Performance

### 9.1 Kritischer Rendering-Pfad

```
1. HTML (index.html)           ~5 KB gzipped
2. CSS (inline im <head>)      0 KB extra
3. Fonts (preloaded)           ~40 KB (2 Dateien)
────────────────────────────── First Contentful Paint
4. fuse.min.js (defer)         ~7 KB gzipped
5. index.json (async fetch)    ~15-150 KB gzipped
────────────────────────────── Interactive
```

Alles CSS ist inline → kein render-blocking Stylesheet. Fonts sind preloaded → minimaler FOUT. JavaScript ist deferred → blockiert nicht das Rendering.

### 9.2 Lazy Rendering (ab 50+ Artikel)

Bei vielen Artikeln werden nur die ersten 20 Karten sofort gerendert. Ein Intersection Observer triggert das Nachladen:

```javascript
const INITIAL_RENDER = 20;
const BATCH_SIZE = 20;

function renderCards(items) {
  const initial = items.slice(0, INITIAL_RENDER);
  resultsContainer.innerHTML = initial.map(renderCard).join('');

  if (items.length > INITIAL_RENDER) {
    const sentinel = document.createElement('div');
    sentinel.className = 'load-more-sentinel';
    resultsContainer.appendChild(sentinel);

    let loaded = INITIAL_RENDER;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const next = items.slice(loaded, loaded + BATCH_SIZE);
        sentinel.insertAdjacentHTML('beforebegin', next.map(renderCard).join(''));
        loaded += BATCH_SIZE;
        if (loaded >= items.length) observer.disconnect();
      }
    });
    observer.observe(sentinel);
  }
}
```

### 9.3 index.json Laden

Das JSON wird erst geladen, wenn die Seite bereit ist (`defer`-Script). Bei zukuenftiger Skalierung (300+ Artikel):

- **Phase 1-2:** Gesamter Index in einer Datei (akzeptabel bis ~300 Artikel)
- **Phase 3:** Aufteilen in `articles.json` (Metadaten fuer Karten, ~1 KB/Artikel) und `search-index.json` (MiniSearch pre-built Index)

### 9.4 Font-Subsetting

Die WOFF2-Dateien koennen auf den benotigten Zeichensatz reduziert werden (Latin + Deutsche Sonderzeichen). Tool: `pyftsubset` oder `glyphhanger`. Reduziert die Fontgroesse um ~50%.

Das ist optional und kann jederzeit nachtraeglich gemacht werden.

---

## 10. Progressive Web App

### 10.1 manifest.json

```json
{
  "name": "Athlete Wiki",
  "short_name": "Wiki",
  "description": "Coaching-Wissen durchsuchen",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0c1117",
  "theme_color": "#38d9a9",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 10.2 Service Worker

Caching-Strategien:

| Asset | Strategie |
|-------|-----------|
| index.html | Network First, Fallback Cache |
| index.json | Stale While Revalidate |
| pages/*.html | Cache First (nach erstem Besuch) |
| fonts/*.woff2 | Cache First |
| fuse.min.js | Cache First |
| icon-*.png, favicon.ico | Cache First |

Cache-Versioning: Der Service Worker hat eine Version-Konstante. Bei neuem Deploy wird der alte Cache geloescht.

### 10.3 Offline-Fallback

Falls eine Seite offline nicht im Cache ist, zeigt der Service Worker eine Offline-Seite:

```
Du bist offline. Bereits besuchte Artikel sind weiterhin verfügbar.
→ Zur Übersicht
```

---

## 11. Monitoring

### 11.1 Client-Side Error Logging

Minimaler Error-Handler auf der Startseite:

```javascript
window.addEventListener('error', (e) => {
  console.error('[Athlete Wiki]', e.message, e.filename, e.lineno);
  // Optional: An Cloudflare Workers Endpoint senden
});
```

In Phase 1 reicht `console.error`. Falls spaeter noetig: Cloudflare Workers Endpoint fuer Error-Collection.

### 11.2 Build-Konsistenzpruefung

Am Ende des Builds wird geprueft:

```
1. Anzahl Dateien in public/pages/ === Anzahl Eintraege in index.json
2. Jede URL in index.json zeigt auf eine existierende Datei
3. index.json ist gueltiges JSON
4. sitemap.xml ist valides XML (optional: xmllint)
```

### 11.3 Cloudflare Analytics

Liefert ohne zusaetzliche Konfiguration:
- Seitenaufrufe pro URL
- Top-Seiten
- Referrer-Quellen
- Zeitverlaeufe

Kein Cookie, kein Tracking-Pixel. Muss in der Datenschutzerklaerung erwaehnt werden (Art. 6 Abs. 1 lit. f DSGVO).

---

## 12. DSGVO – Kompaktregeln

Keine separaten langen Rechtstexte. Stattdessen drei einfache Regeln, die im gesamten Projekt gelten:

### Regel 1: Keine externen Requests

Die Website darf zur Laufzeit KEINE Requests an externe Server machen. Alles wird von der eigenen Domain geladen:
- Fonts: `/fonts/*.woff2` (nicht Google Fonts)
- Fuse.js: `/fuse.min.js` (nicht jsDelivr CDN)
- Kein externes CSS, kein externes JS

Einzige Ausnahme: Cloudflare Analytics Script (kommt von `static.cloudflareinsights.com`, aber Cloudflare ist ohnehin der Hoster → kein zusaetzlicher Datentransfer an Dritte).

### Regel 2: Keine Cookies, kein Tracking

Die Website setzt keine Cookies. Kein Cookie-Banner noetig. Cloudflare Analytics erstellt keine Nutzerprofile und speichert keine IPs dauerhaft.

### Regel 3: Impressum und Datenschutz erreichbar

Von jeder Seite muessen Impressum und Datenschutzerklaerung erreichbar sein:
- Startseite: Footer-Links
- Artikelseiten: Links in der injizierten Navigationsleiste
- 404-Seite: Footer-Links

### Pflicht-Seiten

**Impressum** (`/impressum.html`):
Platzhalter fuer Name, Anschrift, E-Mail. Wird aus `site.config.mjs` befuellt.

**Datenschutz** (`/datenschutz.html`):
Erklaert: Cloudflare als Hoster (DPA vorhanden), keine Cookies, Fonts self-hosted, Betroffenenrechte. Textvorlage liegt in `docs/athlete-wiki-dsgvo.md`.

### Vor-Launch-Check

Der Build prueft automatisch:
- [ ] Keine `fonts.googleapis.com` Referenzen
- [ ] Keine `fonts.gstatic.com` Referenzen
- [ ] Keine `cdn.jsdelivr.net` Referenzen
- [ ] `impressum.html` und `datenschutz.html` existieren

Falls eine Pruefung fehlschlaegt → Warnung im Build-Report.

---

## 13. Deployment Pipeline

### 13.1 GitHub Actions Workflow

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          CF_ANALYTICS_TOKEN: ${{ secrets.CF_ANALYTICS_TOKEN }}
          LEGAL_NAME: ${{ secrets.LEGAL_NAME }}
          LEGAL_ADDRESS: ${{ secrets.LEGAL_ADDRESS }}
          LEGAL_EMAIL: ${{ secrets.LEGAL_EMAIL }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public --project-name=athlete-wiki
```

### 13.2 Preview Deployments

Pull Requests erzeugen automatisch Preview-URLs ueber Cloudflare Pages. Kein zusaetzliches Setup noetig.

---

## 14. Erweiterter Phasenplan

### Phase 1 – Produktions-MVP

| Aufgabe | Beschreibung |
|---------|-------------|
| Projektstruktur | Ordner, package.json, .gitignore, site.config.mjs |
| Fonts herunterladen | WOFF2 in static/fonts/ |
| Build-Script | Scan, Parse, Validate, Index, Copy, Inject, SEO-Generierung |
| Startseite | Vollstaendiges HTML/CSS/JS inkl. Accessibility |
| Suchsystem | Fuse.js lokal, gewichtete Suche, Kategorie-Filter, URL-State |
| 404-Seite | Mit eingebettetem Suchformular |
| Impressum + Datenschutz | Statische Seiten mit Platzhaltern |
| Responsive Design | Mobile-First, alle Breakpoints |
| Error Handling | Build-Warnungen, Runtime-Fallbacks |
| SEO | sitemap.xml, robots.txt, OG-Tags, JSON-LD, Meta-Tags |
| Accessibility | Skip-Link, ARIA, Keyboard-Nav, Reduced Motion, Kontrast |
| Tests | Unit Tests (Slugify, Parser, Replacement), Integration Test |
| CI/CD | GitHub Actions mit Test → Build → Deploy |
| 2-3 Test-Artikel | Verschiedene Kategorien, Build verifizieren |

### Phase 2 – Polishing

| Aufgabe | Beschreibung |
|---------|-------------|
| PWA | Service Worker, Offline-Fallback, Homescreen |
| Analytics | Cloudflare Web Analytics einbinden |
| Watch-Mode | `npm run dev` mit Auto-Rebuild |
| Validate-Command | `npm run validate` fuer Artikelpruefung |
| Lazy Rendering | Intersection Observer fuer 50+ Artikel |
| Font-Subsetting | WOFF2 auf Latin + DE reduzieren |

### Phase 3 – Erweiterung

| Aufgabe | Beschreibung |
|---------|-------------|
| Redirect-Map | `_redirects` fuer umbenannte Slugs |
| Dark/Light Toggle | Theme-Wechsel mit LocalStorage |
| Lesezeichen | Favoriten per LocalStorage |
| Kategorie-Seiten | Landingpages pro Kategorie |
| RSS-Feed | Automatisch generierter Atom/RSS Feed |
| MiniSearch | Migration ab 300+ Artikeln |
| Error-Reporting | Cloudflare Workers Endpoint |

---

## 15. Vollstaendige Ordnerstruktur (nach Phase 1)

```
athlete-wiki/
├── pages/
│   ├── 2026-02-10-blutzucker-dopamin.html
│   ├── 2026-02-12-schlafqualitaet-messen.html
│   └── ...
│
├── templates/
│   ├── startseite.html
│   ├── 404.html
│   ├── impressum.html
│   └── datenschutz.html
│
├── static/
│   ├── fonts/
│   │   ├── dm-serif-display-regular.woff2
│   │   ├── outfit-300.woff2
│   │   ├── outfit-400.woff2
│   │   ├── outfit-500.woff2
│   │   ├── outfit-600.woff2
│   │   └── outfit-700.woff2
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── og-default.png
│   └── manifest.json
│
├── tests/
│   ├── slugify.test.mjs
│   ├── meta-parser.test.mjs
│   ├── date-format.test.mjs
│   ├── content-extract.test.mjs
│   ├── font-replace.test.mjs
│   ├── og-inject.test.mjs
│   └── build.integration.test.mjs
│
├── build.mjs
├── site.config.mjs
├── package.json
├── .gitignore
├── .editorconfig
├── CLAUDE.md
├── TASKS.md
│
├── docs/                              (Referenz, nicht Teil des Builds)
│   ├── athlete-wiki-webapp-konzept.md
│   ├── athlete-wiki-dsgvo.md
│   ├── athlete-wiki-style-vorlage.md
│   └── athlete-wiki-konzept-erweitert.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
└── public/                            (GENERIERT – nicht committen)
    ├── index.html
    ├── index.json
    ├── fuse.min.js
    ├── 404.html
    ├── impressum.html
    ├── datenschutz.html
    ├── sitemap.xml
    ├── robots.txt
    ├── favicon.ico
    ├── icon-192.png
    ├── icon-512.png
    ├── og-default.png
    ├── manifest.json
    ├── fonts/
    │   └── *.woff2
    └── pages/
        └── *.html
```
