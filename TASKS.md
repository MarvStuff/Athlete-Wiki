# Athlete Wiki – Aufgabenbeschreibung

Detaillierter Umsetzungsplan fuer eine produktionsreife Webanwendung.
Vollstaendige Spezifikation: `docs/athlete-wiki-konzept-erweitert.md`

---

## Phase 1 – Produktions-MVP

### 1.1 Projektstruktur + Konfiguration

- [ ] Git-Repository initialisieren
- [ ] Ordnerstruktur anlegen: `pages/`, `templates/`, `static/`, `static/fonts/`, `tests/`, `docs/`, `.github/workflows/`
- [ ] `package.json` erstellen:
  - dependencies: cheerio, fuse.js
  - devDependencies: vitest, chokidar
  - scripts: build, dev, preview, validate, test, test:watch, clean
- [ ] `site.config.mjs` erstellen (siteUrl, analyticsToken, legal-Daten, Flags)
- [ ] `.gitignore` (public/, node_modules/)
- [ ] `.editorconfig` (UTF-8, LF, 2 Spaces)

### 1.2 Fonts herunterladen

- [ ] WOFF2 via google-webfonts-helper:
  - DM Serif Display (Regular)
  - Outfit (300, 400, 500, 600, 700)
- [ ] Ablegen in `static/fonts/`

### 1.3 Build-Script (`build.mjs`)

#### Clean + Setup
- [ ] `public/` komplett loeschen vor jedem Build (Idempotenz)
- [ ] `public/`, `public/pages/`, `public/fonts/` erstellen
- [ ] Konfiguration aus `site.config.mjs` laden

#### Artikelseiten scannen + parsen
- [ ] Alle `pages/*.html` einlesen
- [ ] Nicht-.html-Dateien ignorieren (warnen)
- [ ] Dateien > 2 MB oder 0 Bytes ueberspringen (warnen)
- [ ] Meta-Block parsen (Regex: `/<!--\s*\n([\s\S]*?)\n\s*-->/`)
- [ ] Fallbacks fuer fehlende Felder anwenden
- [ ] Datum validieren (parsbares ISO-Datum)
- [ ] Kategorie validieren (bekannte Kategorie oder Fallback "allgemein")
- [ ] Drafts ueberspringen (loggen)

#### Slug-Generierung
- [ ] Slugify: lowercase, Umlaute aufloesen, Sonderzeichen weg, max 80 Zeichen
- [ ] Datum voranstellen: YYYY-MM-DD-
- [ ] Kollisionsschutz: Suffix "-2" bei Duplikaten

#### Content-Extraktion
- [ ] HTML mit cheerio laden
- [ ] script, style, svg, noscript entfernen
- [ ] Tags strippen → reiner Text
- [ ] Whitespace normalisieren, max 20.000 Zeichen

#### Suchindex (index.json)
- [ ] Pro Artikel: slug, url, title, date, tags[], category, summary, keywords[], content
- [ ] Nach Datum absteigend sortieren
- [ ] Kompaktes JSON schreiben (kein Pretty-Print)

#### Artikelseiten kopieren + modifizieren
- [ ] Datei kopieren nach `public/pages/slug.html`
- [ ] Google Fonts Links ersetzen durch @font-face (Regex, global, multiline)
- [ ] Pruefung nach Replacement: keine fonts.googleapis.com/gstatic.com Reste
- [ ] OG-Tags + meta description + canonical injizieren (nach erstem `<meta>`)
- [ ] Deduplizierung: bestehende OG-Tags ersetzen, nicht doppelt einfuegen
- [ ] JSON-LD Article Schema injizieren (vor `</head>`)
- [ ] Navigationsleiste injizieren (am Anfang von `<body>`):
  - Zurueck-Link, Impressum, Datenschutz, Copy-Button
  - Nur Inline-Styles

#### Startseite generieren
- [ ] Template laden, Artikelanzahl einsetzen
- [ ] Fuse.js lokal referenzieren (`/fuse.min.js`)
- [ ] Lokale Font-Referenzen + Preload
- [ ] OG-Tags fuer Startseite
- [ ] JSON-LD WebSite + SearchAction Schema
- [ ] Als `public/index.html` schreiben

#### SEO-Dateien generieren
- [ ] `public/sitemap.xml` (alle Artikel + Startseite, lastmod)
- [ ] `public/robots.txt` (Allow, Disallow /index.json, Sitemap-URL)

#### Assets kopieren
- [ ] `static/*` → `public/` (Favicon, Icons, OG-Image, Manifest)
- [ ] `static/fonts/*` → `public/fonts/`
- [ ] `node_modules/fuse.js/dist/fuse.min.js` → `public/fuse.min.js`
- [ ] Templates: 404, Impressum, Datenschutz → `public/`

#### Konsistenzpruefung + Build-Report
- [ ] Anzahl Dateien in public/pages/ === Eintraege in index.json
- [ ] Jede URL in index.json zeigt auf existierende Datei
- [ ] Pruefung auf verbliebene externe Font-/CDN-Referenzen
- [ ] Report: Gescannt, Publiziert, Drafts, Fehler, Warnungen, Index-Groesse, Dauer

### 1.4 Startseite (`templates/startseite.html`)

#### HTML-Struktur
- [ ] Semantisches HTML: `<main>`, `<header>`, `<section>`, `<nav>`, `<footer>`
- [ ] Skip-Link ("Zum Suchfeld springen")
- [ ] `<html lang="de">`
- [ ] Meta-Tags: title, description, canonical, OG, Favicon, Apple-Touch-Icon, Manifest, Theme-Color
- [ ] Font-Preload fuer Outfit 400 + DM Serif Display
- [ ] `<noscript>` Fallback

#### CSS (vollstaendig inline)
- [ ] @font-face Deklarationen (alle Gewichte)
- [ ] Reset + CSS Custom Properties
- [ ] Hero-Bereich: Gradient-Text h1, Subtitle, Artikelanzahl
- [ ] Suchfeld: Full-Width, Dark BG, Teal Focus-State
- [ ] Filter-Chips: Horizontal, Scrollbar hidden, role="radiogroup", aria-checked
- [ ] Ergebnis-Header: Uppercase, aria-live="polite"
- [ ] Artikel-Karten: Dark Card, Hover-Effekte, focus-visible
- [ ] Stagger-Animation (fadeUp, per JS delay gesetzt)
- [ ] Leerer Zustand (Lupe + Hinweis)
- [ ] Footer mit Impressum/Datenschutz Links
- [ ] Responsive: Tablet (768px), Mobile (480px)
- [ ] prefers-reduced-motion: reduce (alle Animationen aus)
- [ ] focus-visible Styles fuer alle interaktiven Elemente

#### JavaScript
- [ ] index.json fetch mit Error Handling (try/catch, Fehlermeldung)
- [ ] Fuse.js Init mit Fallback (falls nicht geladen)
- [ ] Filter-Chips aus Artikeldaten rendern (mit Anzahl)
- [ ] Suchlogik: Debounce 150ms, min 2 Zeichen, Fuse.search + Kategorie-Filter
- [ ] URL-State: ?q= und ?cat= per replaceState/pushState
- [ ] popstate-Handler fuer Browser-Zurueck
- [ ] URL-State beim Laden wiederherstellen
- [ ] Karten rendern mit escapeHtml() fuer alle Nutzerdaten
- [ ] Ergebnis-Header kontextabhaengig aktualisieren
- [ ] Autofokus nur Desktop (innerWidth > 768)
- [ ] Escape-Taste leert Suchfeld
- [ ] Datumsformatierung: "10. Feb 2026"

### 1.5 404-Seite (`templates/404.html`)

- [ ] "Seite nicht gefunden" im Wiki-Design
- [ ] Suchformular das zur Startseite mit ?q= weiterleitet
- [ ] Link zur Uebersicht
- [ ] Impressum/Datenschutz Links

### 1.6 Impressum (`templates/impressum.html`)

- [ ] Wiki-Design (gleicher Dark-Theme Stil)
- [ ] Platzhalter fuer: Name, Anschrift, E-Mail (aus site.config.mjs)
- [ ] Link zurueck zur Startseite

### 1.7 Datenschutzerklaerung (`templates/datenschutz.html`)

- [ ] Wiki-Design
- [ ] Inhalt: Verantwortlicher, Hosting (Cloudflare + DPA), Keine Cookies, Fonts lokal, SSL, Betroffenenrechte
- [ ] Link zurueck zur Startseite

### 1.8 Statische Assets

- [ ] `static/favicon.ico`
- [ ] `static/icon-192.png` und `static/icon-512.png`
- [ ] `static/og-default.png` (WhatsApp-Vorschau)
- [ ] `static/manifest.json` (PWA-Grundlage)

### 1.9 Tests

#### Unit Tests (Vitest)
- [ ] `tests/slugify.test.mjs` – Umlaute, Sonderzeichen, Laenge, Kollisionen
- [ ] `tests/meta-parser.test.mjs` – Gueltiger Block, fehlender Block, fehlende Felder, unbekannte Kategorie
- [ ] `tests/date-format.test.mjs` – Deutsche Monatsnamen, Edge Cases
- [ ] `tests/content-extract.test.mjs` – HTML → Text, Script/Style Entfernung, Laengenbegrenzung
- [ ] `tests/font-replace.test.mjs` – Einzeiliger Link, mehrzeiliger Link, Keine Dopplung
- [ ] `tests/og-inject.test.mjs` – Einfuegen, Deduplizierung, Korrekte Position

#### Integration Test
- [ ] `tests/build.integration.test.mjs` – Kompletter Build mit Test-Artikeln:
  - index.json ist gueltiges JSON
  - Korrekte Anzahl Eintraege
  - OG-Tags in kopierten Artikeln vorhanden
  - Google Fonts Links entfernt
  - Drafts nicht im Output
  - sitemap.xml und robots.txt existieren

### 1.10 CI/CD Pipeline

- [ ] `.github/workflows/deploy.yml`:
  - Job 1 (test): checkout, node 22, npm ci, npm test
  - Job 2 (build-and-deploy, needs: test): Build mit Env-Vars, Cloudflare Pages Deploy
- [ ] GitHub Secrets konfigurieren: SITE_URL, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CF_ANALYTICS_TOKEN, LEGAL_*

### 1.11 Test-Artikel

- [ ] 2-3 Beispiel-Artikel in `pages/` erstellen (verschiedene Kategorien)
- [ ] 1 Draft-Artikel (zum Testen der Draft-Logik)
- [ ] Build lokal ausfuehren und Ergebnis pruefen
- [ ] Startseite im Browser testen (Suche, Filter, Karten, Links)

---

## Phase 2 – Polishing

### 2.1 Watch-Mode + Dev-Server
- [ ] `--watch` Flag in build.mjs
- [ ] Dateisystem-Watcher (chokidar) auf pages/, templates/, static/
- [ ] Auto-Rebuild bei Aenderung
- [ ] Lokaler HTTP-Server (Port 3000)

### 2.2 Validate-Command
- [ ] `npm run validate` prueft alle Artikel ohne Build-Output
- [ ] Report: Meta-Block, Kategorie, externe Ressourcen, Slug-Konflikte

### 2.3 PWA + Service Worker
- [ ] manifest.json vervollstaendigen
- [ ] Service Worker: Network First (HTML), Stale While Revalidate (JSON), Cache First (Fonts, JS)
- [ ] Offline-Fallback-Seite
- [ ] Cache-Versioning

### 2.4 Cloudflare Analytics
- [ ] Script in Startseite + Artikel-Navbar einbinden
- [ ] Token aus site.config.mjs
- [ ] In Datenschutzerklaerung dokumentiert

### 2.5 Lazy Rendering
- [ ] IntersectionObserver: Erste 20 Karten sofort, Rest bei Scroll
- [ ] Load-More-Sentinel Element

### 2.6 Font-Subsetting (optional)
- [ ] WOFF2 auf Latin + Deutsche Sonderzeichen reduzieren

---

## Phase 3 – Erweiterung

- [ ] `_redirects` fuer umbenannte Slugs
- [ ] Dark/Light Theme Toggle (LocalStorage)
- [ ] Lesezeichen / Favoriten (LocalStorage)
- [ ] Kategorie-Landingpages
- [ ] RSS/Atom Feed (Build-generiert)
- [ ] MiniSearch-Migration (ab 300+ Artikeln)
- [ ] Error-Reporting Endpoint (Cloudflare Workers)

---

## Vor-Launch-Checkliste

- [ ] Fonts self-hosted, keine Google Fonts Referenzen
- [ ] Fuse.js lokal, kein CDN
- [ ] Keine externen Requests (Build prueft automatisch)
- [ ] Impressum vollstaendig ausgefuellt
- [ ] Datenschutzerklaerung vollstaendig
- [ ] Impressum + Datenschutz von jeder Seite erreichbar
- [ ] Cloudflare DPA akzeptiert
- [ ] SSL/HTTPS aktiv
- [ ] sitemap.xml und robots.txt vorhanden
- [ ] OG-Tags auf allen Seiten
- [ ] Tests bestehen
- [ ] CI/CD Pipeline funktioniert
- [ ] Preview Deployment geprueft

---

## Performance-Ziele

| Metrik | Ziel |
|--------|------|
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 2.0s |
| Total Blocking Time | < 100ms |
| Cumulative Layout Shift | < 0.05 |
| index.json Ladezeit (4G) | < 0.3s |

---

## Technologie-Stack

| Komponente | Technologie |
|-----------|-------------|
| Runtime | Node.js 22+ (ESM) |
| Build | build.mjs (Plain Node.js, kein Bundler) |
| HTML-Parsing | cheerio |
| Suche (Client) | Fuse.js (lokal gebuendelt) |
| Tests | Vitest |
| Dev-Watch | chokidar |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions |
| Analytics | Cloudflare Web Analytics |
| Fonts | DM Serif Display + Outfit (WOFF2, self-hosted) |
