# Athlete Wiki

Statische Coaching-Website: Durchsuchbare Startseite + eigenstaendige HTML-Artikelseiten. Kein Backend, kein CMS, kein Framework. Reines HTML/CSS/JS auf Cloudflare Pages.

## Projektstruktur

```
athlete-wiki/
├── pages/               Artikelseiten (eigenstaendige HTML-Dateien mit Inline-Styling)
├── templates/           Startseite, 404, Impressum, Datenschutz
├── static/              Favicon, Icons, OG-Image, Manifest
│   └── fonts/           Selbst gehostete WOFF2-Fonts (DM Serif Display, Outfit)
├── tests/               Unit + Integration Tests (Vitest)
├── build.mjs            Build-Script (Node.js ESM)
├── site.config.mjs      Build-Konfiguration (URL, Analytics, Legal)
├── package.json         Dependencies: cheerio, fuse.js | DevDeps: vitest, chokidar
├── .editorconfig        Editor-Einstellungen
├── .gitignore           public/, node_modules/
├── docs/                Konzeptdokumente (Referenz, nicht Teil des Builds)
├── TASKS.md             Detaillierte Aufgabenbeschreibung
└── public/              GENERIERT durch Build (nicht committen!)
```

## Befehle

```bash
npm run build            # Produktions-Build → public/
npm run dev              # Watch-Mode mit Auto-Rebuild + lokaler Server (Port 3000)
npm run preview          # Statischen Server fuer public/ starten
npm run validate         # Artikelseiten pruefen ohne Build-Output
npm run test             # Unit + Integration Tests ausfuehren
npm run test:watch       # Tests im Watch-Mode
npm run clean            # public/ loeschen
```

## Architektur-Kernprinzipien

- Artikelseiten werden 1:1 kopiert, NICHT in ein Layout eingebettet
- Der Build liest nur Metadaten aus und erzeugt daraus Suchindex + Startseite
- Erlaubte Build-Modifikationen an Artikelseiten:
  1. Google Fonts Link ersetzen durch @font-face (alle externen Font-Requests entfernen)
  2. Open Graph Tags + meta description + canonical + JSON-LD in `<head>` injizieren
  3. Navigationsleiste am Anfang von `<body>` injizieren (konfigurierbar)
- Keine weiteren Aenderungen am Artikelinhalt oder -styling
- Build ist idempotent: `public/` wird vor jedem Build komplett geloescht

## Build-Konfiguration (site.config.mjs)

```javascript
export default {
  siteUrl: process.env.SITE_URL || 'https://wiki.deinedomain.de',
  siteName: 'Athlete Wiki',
  analyticsToken: process.env.CF_ANALYTICS_TOKEN || null,
  injectNavbar: true,
  injectOgTags: true,
  buildDrafts: process.env.BUILD_DRAFTS === 'true',
  legal: {
    name: process.env.LEGAL_NAME || '[Name eintragen]',
    address: process.env.LEGAL_ADDRESS || '[Adresse eintragen]',
    email: process.env.LEGAL_EMAIL || '[E-Mail eintragen]',
  }
};
```

## Artikelseiten

### Meta-Block (HTML-Kommentar am Dateianfang)

```html
<!--
title: Titel des Artikels
date: 2026-02-10
tags: tag1, tag2, tag3
category: ernaehrung
status: published
slug: 2026-02-10-kurzname
summary: 1-2 Saetze Zusammenfassung.
keywords: synonym1, synonym2
-->
```

Pflichtfelder: title, date, tags, category, status
Optional: slug, summary, keywords

### Fallbacks bei fehlenden Feldern

| Feld | Fallback |
|------|----------|
| title | Dateiname ohne Extension |
| date | Heutiges Datum |
| tags | Leere Liste |
| category | allgemein |
| status | published |
| slug | Auto aus slugify(title), ein Wort ohne Datum |
| summary | Erster `<p>` (max 200 Zeichen) |
| Meta-Block fehlt | Alle Defaults, Warnung |

### Kategorien mit Farben

| Kategorie | Hex |
|-----------|-----|
| ernaehrung | #51cf66 |
| training | #ffa94d |
| regeneration | #74c0fc |
| mindset | #cc5de8 |
| gesundheit | #ff6b6b |
| wettkampf | #ffd43b |
| allgemein | #868e96 |

### Slugify-Regeln

1. Lowercase
2. Umlaute: ae, oe, ue, ss
3. Sonderzeichen, Leerzeichen und Bindestriche entfernen
4. Nur a-z und 0-9 erlaubt
5. Ergebnis: ein einzelnes zusammenhaengendes Wort
6. Max 50 Zeichen
7. Kein Datum-Praefix
8. Kollisionsschutz: bei Duplikaten Suffix 2 anhaengen (ohne Bindestrich)

### Validierung im Build

Jeder Artikel wird geprueft: .html-Endung, > 0 Bytes, < 2 MB, gueltiges Datum, bekannte Kategorie, eindeutiger Slug, keine externen Font-Links. Fehlerhafte Artikel werden uebersprungen (Warnung), der Build bricht nicht ab.

## Design-System

### Farbschema Startseite

```css
--bg: #0c1117;
--bg-card: #1a2332;
--border: #1e2d3d;
--border-hover: #2a3f55;
--accent: #38d9a9;       /* Teal */
--accent-dim: rgba(56, 217, 169, 0.12);
--text: #e2e8f0;
--text-secondary: #8899aa;
--text-dim: #556677;
```

### Farbschema Artikelseiten

```css
--bg: #0f1923;
--card: #162231;
--card-border: #1e3044;
--accent-teal: #38d9a9;
--text: #e8edf2;
--text-muted: #8899aa;
--text-dim: #556677;
```

### Typografie

- Headlines: DM Serif Display 400 (serif)
- Body/UI: Outfit 300-700 (sans-serif)
- Fonts IMMER self-hosted via @font-face
- NIEMALS `<link>` zu fonts.googleapis.com
- Font-Preload fuer Outfit 400 und DM Serif Display Regular

### Responsive Breakpoints

- Desktop: > 768px
- Tablet: <= 768px
- Mobile: <= 480px
- Filter-Chips: horizontales Scrolling auf Mobile

## Startseite – JavaScript-Architektur

- URL-State: Suche und Filter in URL-Parametern (`?q=...&cat=...`)
- `history.replaceState` beim Tippen, `history.pushState` bei Filter-Klick
- `popstate`-Event fuer Browser-Zurueck
- Debounce: 150ms, min 2 Zeichen
- XSS-Schutz: `escapeHtml()` fuer alle Nutzerdaten
- Graceful Degradation: Fehlermeldung wenn index.json oder Fuse.js nicht laden
- Lazy Rendering: Ab 50+ Artikeln nur erste 20 rendern, Rest per IntersectionObserver
- Autofokus Suchfeld nur auf Desktop (innerWidth > 768)
- Escape-Taste leert Suchfeld

## Suchsystem

- Fuse.js (Client-Side Fuzzy-Search), lokal gebuendelt
- Gewichtung: title (0.30), slug (0.25), tags (0.20), category (0.10), keywords (0.10), content (0.05)
- threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2
- Kombination mit Kategorie-Filter: Fuse.search(query) ∩ Filter(category)

## SEO

Build generiert automatisch:
- `sitemap.xml` mit allen Artikel-URLs + Startseite
- `robots.txt` (Allow: /, Disallow: /index.json, Sitemap-Referenz)
- OG-Tags + `<meta name="description">` + `<link rel="canonical">` fuer alle Seiten
- JSON-LD Structured Data: WebSite (Startseite) + Article (Artikelseiten)
- SearchAction Schema fuer Google Sitelinks Searchbox

## Accessibility

- Skip-Link ("Zum Suchfeld springen")
- ARIA: `aria-label`, `aria-describedby`, `aria-live="polite"`, `role="radiogroup"`, `aria-checked`
- Keyboard: Tab-Navigation, Enter/Space fuer Filter, Escape leert Suche
- `focus-visible` Styles fuer alle interaktiven Elemente
- `prefers-reduced-motion: reduce` deaktiviert alle Animationen
- WCAG AA Farbkontrast fuer alle Text-Hintergrund-Kombinationen
- `<noscript>` Fallback-Hinweis

## Error Handling

### Build

| Situation | Verhalten |
|-----------|----------|
| Template fehlt | Exit 1 (fataler Fehler) |
| Einzelner Artikel kaputt | Warnung, ueberspringen |
| Unbekannte Kategorie | Fallback "allgemein", Warnung |
| Slug-Kollision | Suffix "-2", Warnung |
| Externe Font-Links gefunden | Ersetzen, Warnung |

### Runtime (Startseite)

| Situation | Verhalten |
|-----------|----------|
| index.json laed nicht | Fehlermeldung im Header |
| Fuse.js laed nicht | Karten ohne Suche anzeigen |
| JavaScript deaktiviert | `<noscript>` Hinweis |

## Datenschutz-Regeln (kompakt)

1. **Keine externen Requests zur Laufzeit** – Fonts, JS, CSS alles lokal
2. **Keine Cookies, kein Tracking** – Kein Cookie-Banner noetig
3. **Impressum + Datenschutz erreichbar** von jeder Seite (Footer + Navbar)
4. **Build prueft automatisch** auf verbotene externe Referenzen

## Testing

- Framework: Vitest
- Unit Tests: slugify, meta-parser, date-format, content-extract, font-replace, og-inject
- Integration Test: Kompletter Build-Durchlauf mit Test-Artikeln
- CI: Tests laufen vor dem Deployment in GitHub Actions

## Deployment

- Hosting: Cloudflare Pages (Free Tier)
- CI/CD: GitHub Actions (Test → Build → Deploy)
- Environment Variables: SITE_URL, CF_ANALYTICS_TOKEN, LEGAL_*
- Preview Deployments: Automatisch bei Pull Requests
- Branch-Strategie: main = Produktion

## Phasen

- **Phase 1 (Produktions-MVP):** Build-Script, Startseite (komplett mit A11y, SEO, Error Handling, URL-State), 404 (mit Suche), Impressum, Datenschutz, Tests, CI/CD
- **Phase 2 (Polishing):** PWA + Service Worker, Analytics, Watch-Mode, Validate-Command, Lazy Rendering, Font-Subsetting
- **Phase 3 (Erweiterung):** Redirects, Dark/Light Toggle, Lesezeichen, Kategorie-Seiten, RSS, MiniSearch, Error-Reporting

## Referenz-Dokumente

- `docs/athlete-wiki-webapp-konzept.md` – Technisches Basiskonzept
- `docs/athlete-wiki-konzept-erweitert.md` – Erweitertes Produktionskonzept (vollstaendige Spezifikation)
- `docs/athlete-wiki-dsgvo.md` – DSGVO-Anforderungen und Rechtstexte
- `docs/athlete-wiki-style-vorlage.md` – Design-System und Komponenten fuer Artikelseiten
