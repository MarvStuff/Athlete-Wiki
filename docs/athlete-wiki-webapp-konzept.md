# Athlete Wiki – Web-Application-Konzept

---

## 1. Was die Anwendung ist

Athlete Wiki ist eine statische Website, die aus zwei Teilen besteht:

1. **Startseite** – eine durchsuchbare Übersicht aller Coaching-Artikel
2. **Artikelseiten** – eigenständige HTML-Dateien, die visuell aufbereitetes Coaching-Wissen zeigen (Infografiken, Erklärseiten, Pläne)

Die Artikelseiten werden extern erstellt und bringen ihr komplettes Layout und Styling bereits mit. Die Web-Anwendung hat die Aufgabe, diese Dateien zu indexieren, durchsuchbar zu machen und als zusammenhängende Seite zu präsentieren.

Es gibt kein Backend, keine Datenbank und kein CMS. Die gesamte Anwendung besteht aus statischen HTML-, CSS- und JSON-Dateien auf einem CDN.

---

## 2. Architektur-Überblick

```
Quell-Dateien                Build                    Auslieferung
─────────────               ─────                    ────────────

pages/                      node build.mjs           public/
  artikel-a.html  ──┐                                  index.html     ← Startseite
  artikel-b.html  ──┼──→  Scan → Parse → Index  ──→   index.json     ← Suchindex
  artikel-c.html  ──┘      Meta    Text    JSON        404.html       ← Fehlerseite
                                                       pages/
templates/                                               artikel-a.html
  startseite.html ───────→ Erzeuge Startseite ──→       artikel-b.html
  404.html        ───────→ Kopiere 404       ──→        artikel-c.html

static/
  favicon.ico     ───────→ Kopiere Assets    ──→     favicon.ico
  og-default.png                                     og-default.png
  manifest.json                                      manifest.json
```

**Kernprinzip:** Die Artikelseiten werden 1:1 kopiert, nicht verändert. Der Build liest nur ihre Metadaten aus und erzeugt daraus den Suchindex und die Startseite.

---

## 3. Artikelseiten

### 3.1 Format

Jede Artikelseite ist eine vollständige, eigenständige HTML-Datei. Sie enthält:
- Alle Styles inline (im `<style>`-Block)
- Alle Fonts (via Google Fonts `<link>`)
- Alle Grafiken als Inline-SVG
- Keine externen Abhängigkeiten (außer Google Fonts)

Die Dateien werden von einer KI-App generiert, die eine feste Style-Vorlage verwendet. Dadurch haben alle Artikel ein konsistentes visuelles Erscheinungsbild.

### 3.2 Metadaten-Block

Jede Datei beginnt mit einem HTML-Kommentar, der die Metadaten enthält:

```html
<!--
title: Blutzucker & Dopamin – Warum du dich schlapper fühlst
date: 2026-02-10
tags: ernährung, zucker, energie, blutzucker, dopamin
category: ernährung
status: published
slug: 2026-02-10-blutzucker-dopamin
summary: Warum du anfangs müde wirst, wenn du Zucker reduzierst – und warum das ein gutes Zeichen ist.
-->
<!DOCTYPE html>
<html lang="de">
...
```

### 3.3 Felder

**Pflichtfelder:**

| Feld | Format | Beispiel |
|------|--------|---------|
| `title` | Freitext | Blutzucker & Dopamin |
| `date` | YYYY-MM-DD | 2026-02-10 |
| `tags` | kommagetrennt | ernährung, zucker, energie |
| `category` | einzelnes Wort | ernährung |
| `status` | published \| draft | published |

**Optionale Felder:**

| Feld | Format | Zweck |
|------|--------|-------|
| `slug` | yyyy-mm-dd-kurzname | Überschreibt Auto-Slug |
| `summary` | 1-2 Sätze | WhatsApp-Vorschau, Suchkarten |
| `keywords` | kommagetrennt | Synonyme für Suche (z.B. „müdigkeit" findet Blutzucker-Artikel) |

### 3.4 Fallback-Verhalten

Was passiert, wenn Felder fehlen:

| Fehlendes Feld | Fallback |
|---------------|----------|
| `title` | Dateiname ohne Extension |
| `date` | Heutiges Datum |
| `tags` | Leere Liste |
| `category` | `allgemein` |
| `status` | `published` |
| `slug` | Auto-generiert aus `date` + `title` |
| `summary` | Erster `<p>`-Absatz aus dem HTML (max. 200 Zeichen) |
| Gesamter Meta-Block fehlt | Alle Defaults, Warnung im Build-Log |

### 3.5 Kategorien

Feste Kategorien mit zugeordneten Farben:

| Kategorie | Farbe | Hex |
|-----------|-------|-----|
| ernährung | Grün | #51cf66 |
| training | Orange | #ffa94d |
| regeneration | Blau | #74c0fc |
| mindset | Lila | #cc5de8 |
| gesundheit | Rot | #ff6b6b |
| wettkampf | Gold | #ffd43b |
| allgemein | Grau | #868e96 |

Diese Farben werden auf der Startseite verwendet (Kategorie-Chips, Karten-Akzente).

### 3.6 Dateinamen & Slugs

**Dateiname = Slug + `.html`**

Der Slug ist der sprechende Identifier der Seite und bestimmt die URL.

Aufbau: `YYYY-MM-DD-kurzname`

Beispiel:
```
Dateiname:  2026-02-10-blutzucker-dopamin.html
URL:        /pages/2026-02-10-blutzucker-dopamin.html
```

**Slugify-Regeln** (wenn der Slug automatisch aus dem Titel erzeugt wird):

```
1. Lowercase
2. Umlaute auflösen: ä→ae, ö→oe, ü→ue, ß→ss
3. Sonderzeichen entfernen
4. Leerzeichen → Bindestriche
5. Mehrfach-Bindestriche → ein Bindestrich
6. Max. 80 Zeichen (am Wortende abschneiden)
7. Datum voranstellen: YYYY-MM-DD-
```

**Kollisionsschutz:** Falls zwei Dateien denselben Slug erzeugen, wird `-2` angehängt.

---

## 4. Build-Prozess

### 4.1 Was der Build tut

Das Build-Script (`build.mjs`) läuft einmal und erzeugt die komplette Seite:

```
EINGABE:
  pages/*.html          (Artikelseiten)
  templates/            (Startseite, 404)
  static/               (Favicon, Icons, OG-Image)

AUSGABE:
  public/index.html     (Startseite mit Suche)
  public/index.json     (Suchindex)
  public/404.html       (Fehlerseite)
  public/pages/*.html   (Kopierte Artikelseiten)
  public/favicon.ico    (Kopierte Assets)
  public/manifest.json  (PWA-Manifest)
  public/og-default.png (Default WhatsApp-Vorschau)
```

### 4.2 Ablauf pro Datei

```
Für jede pages/*.html:

1. LESEN
   Datei einlesen

2. META-BLOCK PARSEN
   Regex: /<!--\s*\n([\s\S]*?)\n\s*-->/
   Zeilen aufsplitten nach key: value

3. STATUS PRÜFEN
   status === "draft" → überspringen

4. SLUG BESTIMMEN
   Wenn slug im Meta-Block: verwenden
   Sonst: auto-generieren aus date + slugify(title)
   Dann: Kollisionsprüfung

5. SUMMARY BESTIMMEN
   Wenn summary im Meta-Block: verwenden
   Sonst: ersten <p>-Tag extrahieren, auf 200 Zeichen kürzen

6. CONTENT-TEXT EXTRAHIEREN (für Volltextsuche)
   HTML laden (cheerio)
   <script>, <style>, <svg>, <noscript> entfernen
   HTML-Tags strippen → reiner Text
   Whitespace normalisieren
   Auf 20.000 Zeichen kürzen

7. INDEX-EINTRAG ERZEUGEN
   {
     slug, url, title, date, tags[], category,
     summary, keywords[], content
   }

8. DATEI KOPIEREN
   pages/datei.html → public/pages/slug.html
```

### 4.3 Nach der Schleife

```
1. INDEX SORTIEREN
   Nach Datum absteigend (neueste zuerst)

2. INDEX SCHREIBEN
   → public/index.json

3. STARTSEITE ERZEUGEN
   Template laden
   Artikelanzahl einsetzen
   → public/index.html

4. ASSETS KOPIEREN
   static/* → public/
   templates/404.html → public/404.html

5. BUILD-REPORT
   Anzahl veröffentlicht, Anzahl Drafts, Warnungen, Index-Größe
```

### 4.4 Suchindex (index.json)

Struktur:

```json
[
  {
    "slug": "2026-02-10-blutzucker-dopamin",
    "url": "/pages/2026-02-10-blutzucker-dopamin.html",
    "title": "Blutzucker & Dopamin – Warum du dich schlapper fühlst",
    "date": "2026-02-10",
    "tags": ["ernährung", "zucker", "energie", "blutzucker", "dopamin"],
    "category": "ernährung",
    "summary": "Warum du anfangs müde wirst, wenn du Zucker reduzierst.",
    "keywords": ["müdigkeit", "mittagstief", "glykämischer index"],
    "content": "Das hängt auf der einen Seite mit deinem Blutzuckerspiegel ..."
  }
]
```

**Größe:** ~2-5 KB pro Artikel (inkl. Content-Text). Bei 100 Artikeln ca. 250-500 KB (wird vom CDN komprimiert auf ~80-150 KB).

---

## 5. Startseite

### 5.1 Zweck

Die Startseite ist der Einstiegspunkt für Athleten. Sie hat genau eine Funktion: Coaching-Artikel finden. Kein Dashboard, keine Sidebar, keine Ablenkung. Ein Suchfeld, darunter die Ergebnisse.

### 5.2 Layout

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    Athlete Wiki                            │
│           Coaching-Wissen durchsuchen                      │
│                   42 Artikel                               │
│                                                            │
│     ┌────────────────────────────────────────────┐         │
│     │  🔍  Suche nach Thema, Tag, Stichwort ...  │         │
│     └────────────────────────────────────────────┘         │
│     Durchsucht Titel, Tags, Kategorien und Artikeltext     │
│                                                            │
│     ┌──────┐ ┌──────────┐ ┌─────────────┐ ┌────────┐     │
│     │ Alle │ │Ernährung │ │Regeneration │ │Training│     │
│     └──────┘ └──────────┘ └─────────────┘ └────────┘     │
│                                                            │
│     ALLE ARTIKEL                                           │
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │                                              │       │
│     │  10. Feb 2026 · ERNÄHRUNG                    │       │
│     │                                              │       │
│     │  Blutzucker & Dopamin – Warum du dich        │       │
│     │  schlapper fühlst                            │       │
│     │                                              │       │
│     │  Warum du anfangs müde wirst, wenn du        │       │
│     │  Zucker reduzierst...                        │       │
│     │                                              │       │
│     │  ┌──────────┐ ┌───────┐ ┌────────┐          │       │
│     │  │ernährung │ │zucker │ │energie │          │       │
│     │  └──────────┘ └───────┘ └────────┘          │       │
│     │                                          →   │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │  12. Feb 2026 · REGENERATION                 │       │
│     │  Schlafqualität richtig messen               │       │
│     │  ...                                         │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │  15. Feb 2026 · ERNÄHRUNG                    │       │
│     │  Proteinverteilung über den Tag              │       │
│     │  ...                                         │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
│     ──────────────────────────────────────────────────     │
│     Athlete Wiki · Coaching-Wissen                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.3 Design der Startseite

**Farbschema:** Konsistent mit den Artikelseiten.

```css
:root {
  --bg: #0c1117;          /* etwas dunkler als Artikel, um Kontrast zu schaffen */
  --bg-card: #1a2332;
  --border: #1e2d3d;
  --border-hover: #2a3f55;
  --accent: #38d9a9;      /* Teal als Primärfarbe der Startseite */
  --accent-dim: rgba(56, 217, 169, 0.12);
  --text: #e2e8f0;
  --text-secondary: #8899aa;
  --text-dim: #556677;
}
```

**Typografie:** Gleiche Fonts wie Artikelseiten (DM Serif Display + Outfit).

**Hero-Bereich:**
- Titel „Athlete Wiki" in DM Serif Display, Gradient-Text
- Untertitel in Outfit 300
- Dezenter radialer Glow im Hintergrund (Teal, sehr subtil)
- Artikelanzahl als Uppercase-Label

### 5.4 Suchfeld

**Aussehen:**
- Volle Breite (max. 640px)
- Dunkler Hintergrund (#111920)
- 1px Border (#1e2d3d)
- Border-Radius: 16px
- Padding: 18px, links 52px (Platz für Suchicon)
- Schrift: Outfit, 1.05rem
- Placeholder: „Suche nach Thema, Tag, Stichwort ..."
- Darunter: Hinweistext „Durchsucht Titel, Tags, Kategorien und Artikeltext"

**Verhalten:**
- Kein Autofokus auf Mobile (Keyboard soll nicht sofort aufgehen)
- Autofokus auf Desktop
- Live-Suche: Treffer erscheinen beim Tippen (nach 150ms Debounce)
- Minimum 2 Zeichen bevor Suche startet
- Leeres Suchfeld: alle Artikel chronologisch

**Fokus-Zustand:**
- Border-Farbe: Teal (#38d9a9)
- Glow: `box-shadow: 0 0 0 3px rgba(56, 217, 169, 0.12)`

### 5.5 Kategorie-Filter

**Aussehen:**
- Horizontal angeordnete Chips (Pillen-Form)
- Border: 1px solid var(--border)
- Transparenter Hintergrund
- Schrift: 0.82rem, Outfit 400
- Horizontales Scrolling auf Mobile (kein Umbruch)

**Verhalten:**
- Erster Chip „Alle" ist standardmäßig aktiv
- Klick auf Kategorie: filtert die Ergebnisse
- Nur eine Kategorie gleichzeitig aktiv (Toggle)
- Kombinierbar mit Textsuche
- Zeigt Artikelanzahl: `Ernährung (12)`

**Aktiver Zustand:**
- Border-Farbe: Kategoriefarbe (z.B. #51cf66 für Ernährung)
- Hintergrund: Kategoriefarbe mit 12% Opacity
- Textfarbe: Kategoriefarbe

### 5.6 Ergebnis-Header

Zeigt kontextabhängig an:

| Zustand | Anzeige |
|---------|---------|
| Kein Suchtext, kein Filter | „Alle Artikel" |
| Kein Suchtext, Filter aktiv | „8 Artikel in Ernährung" |
| Suchtext, kein Filter | „5 Treffer für ‚protein'" |
| Suchtext, Filter aktiv | „3 Treffer für ‚protein' in Ernährung" |

Schrift: 0.78rem, Uppercase, Letter-Spacing 1.5px, Farbe: var(--text-dim).

### 5.7 Artikel-Karten

**Aufbau einer Karte:**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  10. Feb 2026 · ERNÄHRUNG                        │  ← Meta-Zeile
│                                                  │
│  Blutzucker & Dopamin – Warum du dich            │  ← Titel
│  schlapper fühlst                                │
│                                                  │
│  Warum du anfangs müde wirst, wenn du            │  ← Summary
│  Zucker reduzierst...                            │     (max. 2 Zeilen)
│                                                  │
│  ┌──────────┐ ┌───────┐ ┌────────┐              │  ← Tags
│  │ernährung │ │zucker │ │energie │              │
│  └──────────┘ └───────┘ └────────┘           →  │  ← Pfeil
│                                                  │
└──────────────────────────────────────────────────┘
```

**Styling:**

```css
.article-card {
  display: block;
  background: var(--bg-card);       /* #1a2332 */
  border: 1px solid var(--border);  /* #1e2d3d */
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s, transform 0.15s, box-shadow 0.25s;
}
```

**Elemente:**

| Element | Schrift | Farbe |
|---------|---------|-------|
| Datum | Outfit 400, 0.82rem | var(--text-dim) |
| Kategorie-Badge | Outfit 500, 0.75rem, Uppercase | Kategoriefarbe auf Kategoriefarbe/12% BG |
| Titel | DM Serif Display 400, 1.3rem | var(--text), bei Hover: var(--accent) |
| Summary | Outfit 300, 0.9rem, max 2 Zeilen | var(--text-secondary) |
| Tags | Outfit 400, 0.72rem | var(--text-dim) auf Teal/8% BG |
| Pfeil (→) | 1.2rem | var(--text-dim), erscheint bei Hover |

**Hover-Verhalten:**
- Border-Farbe: var(--border-hover)
- Transform: translateY(-1px)
- Box-Shadow: `0 4px 24px rgba(0,0,0,0.3)`
- Titel-Farbe: Teal
- Pfeil: erscheint, bewegt sich 3px nach rechts

**Stagger-Animation:** Karten erscheinen mit `fadeUp`-Animation, zeitversetzt (40ms pro Karte):

```css
.article-card:nth-child(1) { animation-delay: 0.05s; }
.article-card:nth-child(2) { animation-delay: 0.10s; }
...
```

### 5.8 Leerer Zustand (keine Treffer)

```
┌──────────────────────────────────────┐
│                                      │
│               🔎                     │
│                                      │
│     Keine Artikel gefunden.          │
│     Versuch einen anderen            │
│     Suchbegriff oder entferne        │
│     den Filter.                      │
│                                      │
└──────────────────────────────────────┘
```

### 5.9 Footer

Einzeilig, dezent:
```
Athlete Wiki · Coaching-Wissen
```

Schrift: 0.8rem, Outfit 300, var(--text-dim). Oberer Border: 1px solid var(--border).

---

## 6. Suchsystem

### 6.1 Technologie

**Fuse.js** (Fuzzy-Search-Library) – läuft vollständig im Browser.

- Größe: ~7 KB (gzipped)
- Laden: via CDN (`cdn.jsdelivr.net/npm/fuse.js@7.0.0`)
- Tolerant bei Tippfehlern
- Gewichtetes Ranking über mehrere Felder
- Keine Server-Komponente nötig

### 6.2 Durchsuchte Felder

| Feld | Gewicht | Was es bewirkt |
|------|---------|---------------|
| `title` | 0.30 | Titel-Treffer stehen ganz oben |
| `slug` | 0.25 | Coach kann gezielt nach Slug suchen |
| `tags` | 0.20 | Hauptmechanismus für thematische Suche |
| `category` | 0.10 | Grobe Einordnung |
| `keywords` | 0.10 | Synonyme (z.B. „müdigkeit" findet Blutzucker-Artikel) |
| `content` | 0.05 | Volltext als Fallback, niedrig gewichtet |

### 6.3 Fuse.js-Konfiguration

```javascript
const fuse = new Fuse(articles, {
  keys: [
    { name: 'title',    weight: 0.30 },
    { name: 'slug',     weight: 0.25 },
    { name: 'tags',     weight: 0.20 },
    { name: 'category', weight: 0.10 },
    { name: 'keywords', weight: 0.10 },
    { name: 'content',  weight: 0.05 }
  ],
  threshold: 0.35,         // Tippfehler-Toleranz
  ignoreLocation: true,    // Treffer auch mitten im Text
  minMatchCharLength: 2,   // Mind. 2 Zeichen
  includeScore: true,      // Für Ranking
  findAllMatches: true      // Alle Vorkommen zählen
});
```

### 6.4 Suchbeispiele

| Eingabe | Trifft über | Ergebnis |
|---------|------------|---------|
| `blutzucker` | title, tags, slug | Blutzucker-Artikel sofort ganz oben |
| `müde` | keywords (`müdigkeit`) | Blutzucker-Artikel via Synonym |
| `ernährung` | category, tags | Alle Ernährungs-Artikel |
| `protein` | title, tags, content | Protein-bezogene Artikel |
| `2026-02-10` | slug | Alle Artikel vom 10. Feb |
| `schlfa` | title (fuzzy: „schlaf") | Schlaf-Artikel trotz Tippfehler |

### 6.5 Kombination mit Kategorie-Filter

Textsuche und Kategorie-Filter arbeiten zusammen:

```
Ergebnis = Fuse.search(query) ∩ Filter(category)
```

1. Fuse liefert alle Textreffer (oder alle Artikel, wenn leer)
2. Dann wird nach aktiver Kategorie gefiltert
3. Ergebnis wird angezeigt

### 6.6 Performance-Erwartung

| Artikelanzahl | index.json (gzipped) | Ladezeit (4G) | Suchzeit |
|--------------|---------------------|---------------|----------|
| 10 | ~15 KB | < 0.1s | < 1ms |
| 50 | ~70 KB | 0.2s | < 2ms |
| 100 | ~140 KB | 0.3s | < 5ms |
| 300 | ~400 KB | 0.5s | < 10ms |

### 6.7 Skalierung ab 300+ Artikel

Ab ~300 Artikeln wird der Wechsel zu **MiniSearch** empfohlen. MiniSearch baut einen pre-built Index, der schneller durchsucht werden kann. Dafür wird im Build-Step statt `index.json` ein `search-index.json` mit dem MiniSearch-Format erzeugt. Die Artikeldaten (für die Karten-Anzeige) bleiben in einer separaten, schlanken `articles.json` ohne `content`-Feld. Dieser Wechsel betrifft nur die Startseite – kein Artikel muss geändert werden.

---

## 7. Navigation & Seitenstruktur

### 7.1 URL-Schema

```
/                                            → Startseite (index.html)
/pages/2026-02-10-blutzucker-dopamin.html    → Artikelseite
/index.json                                  → Suchindex (intern)
/manifest.json                               → PWA-Manifest
```

### 7.2 Navigation zwischen Seiten

**Von der Startseite zum Artikel:**
- Klick auf Artikel-Karte → öffnet `/pages/slug.html`
- Standard-Navigation (kein SPA, kein Client-Side-Routing)

**Vom Artikel zurück zur Startseite:**
- Die Artikelseiten sind standalone und haben standardmäßig KEINEN Zurück-Link
- Das ist Absicht: der Nutzer kommt über WhatsApp-Links direkt zum Artikel
- Browser-Zurück-Button funktioniert natürlich
- Wer über die Startseite kam, nutzt den Browser-Zurück-Button

**Optionaler Zurück-Link in der Navigationsleiste:**
Falls gewünscht, kann der Build eine minimale Navigationsleiste am Anfang jeder Artikelseite injizieren. Das ist die einzige Modifikation am HTML, die der Build vornehmen würde:

```html
<!-- Wird VOR dem <body>-Inhalt eingefügt -->
<nav style="[inline styles]">
  <a href="/" style="[inline styles]">← Übersicht</a>
  <button onclick="copyLink()" style="[inline styles]">📋 Link kopieren</button>
</nav>
<script>
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    event.target.textContent = '✅ Kopiert!';
    setTimeout(() => event.target.textContent = '📋 Link kopieren', 2000);
  });
}
</script>
```

Diese Leiste verwendet ausschließlich Inline-Styles, damit sie keine Konflikte mit den Styles der Artikelseite verursacht. Sie wird am Anfang des `<body>` eingefügt, vor dem eigentlichen Inhalt.

**Entscheidung:** Die Navigationsleiste ist optional und kann im Build ein-/ausgeschaltet werden. Standardmäßig: EIN.

### 7.3 404-Seite

Wird angezeigt, wenn eine URL nicht existiert (z.B. ein alter WhatsApp-Link zu einem umbenannten Artikel):

```
┌────────────────────────────────────────┐
│                                        │
│          Seite nicht gefunden           │
│                                        │
│  Der Artikel existiert nicht           │
│  oder wurde verschoben.               │
│                                        │
│         → Zur Übersicht                │
│                                        │
└────────────────────────────────────────┘
```

Design: Konsistent mit Startseite (gleicher Hintergrund, gleiche Fonts).

---

## 8. WhatsApp-Vorschau (Open Graph)

### 8.1 Warum

Wenn du einen Artikellink in WhatsApp teilst, zeigt WhatsApp automatisch eine Vorschau an. Diese Vorschau wird durch Open Graph Meta-Tags im HTML bestimmt.

### 8.2 Implementierung

Der Build injiziert Open Graph Tags in den `<head>` jeder Artikelseite:

```html
<meta property="og:title" content="Blutzucker & Dopamin – Warum du dich schlapper fühlst">
<meta property="og:description" content="Warum du anfangs müde wirst, wenn du Zucker reduzierst.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://wiki.domain.de/pages/2026-02-10-blutzucker-dopamin.html">
<meta property="og:image" content="https://wiki.domain.de/og-default.png">
<meta property="og:site_name" content="Athlete Wiki">
<meta property="og:locale" content="de_DE">
```

**Quelle der Daten:**
- `og:title` ← Meta-Feld `title`
- `og:description` ← Meta-Feld `summary`
- `og:image` ← Default-Bild (`og-default.png`) oder kategoriespezifisches Bild

### 8.3 Wie der Build OG-Tags injiziert

Die Artikelseiten werden nicht verändert – mit einer Ausnahme: Der Build fügt die OG-Tags in den bestehenden `<head>`-Bereich ein, direkt nach dem `<meta charset>` Tag.

```
Original:                          Nach Build:
<head>                             <head>
<meta charset="UTF-8">             <meta charset="UTF-8">
<meta name="viewport"...>          <meta property="og:title" content="...">
<title>...</title>                  <meta property="og:description" content="...">
...                                 <meta property="og:image" content="...">
</head>                             <meta property="og:url" content="...">
                                    <meta property="og:type" content="article">
                                    <meta property="og:site_name" content="Athlete Wiki">
                                    <meta property="og:locale" content="de_DE">
                                    <meta name="viewport"...>
                                    <title>...</title>
                                    ...
                                    </head>
```

### 8.4 WhatsApp-Vorschau Ergebnis

```
┌──────────────────────────────────────┐
│  wiki.deinedomain.de                 │
│  ┌────────────────────────────────┐  │
│  │      [Athlete Wiki Logo]       │  │
│  └────────────────────────────────┘  │
│  Blutzucker & Dopamin – Warum du     │
│  dich schlapper fühlst               │
│  Warum du anfangs müde wirst...      │
└──────────────────────────────────────┘
```

---

## 9. Mobile Experience

### 9.1 Grundsätze

95%+ der Athleten-Nutzung erfolgt auf dem Handy. Jede Entscheidung ist Mobile-First:

- **Kein Autofokus auf Suchfeld** (auf Mobile) – damit die Tastatur nicht sofort aufgeht
- **Keine Sticky-Header** – maximaler Content-Bereich
- **Keine Hover-only-Features** – alles auch per Tap erreichbar
- **Touch-Targets mindestens 44×44px** – kein versehentliches Tippen
- **Schrift nie unter 16px für Fließtext** – damit iOS nicht hineinzoomt
- **Kein horizontales Scrollen** – außer bei Filter-Chips (bewusst)

### 9.2 Startseite Mobile

```
┌──────────────────────┐
│                      │
│   Athlete Wiki       │
│   Coaching-Wissen    │
│   durchsuchen        │
│   42 Artikel         │
│                      │
│ ┌──────────────────┐ │
│ │🔍 Suche...       │ │
│ └──────────────────┘ │
│                      │
│ Alle│Ernähr│Regen│Tr │
│      ← swipe →       │
│                      │
│ ┌──────────────────┐ │
│ │ 10. Feb · ERNÄHR │ │
│ │                  │ │
│ │ Blutzucker &     │ │
│ │ Dopamin          │ │
│ │                  │ │
│ │ Warum du anfangs │ │
│ │ müde wirst...    │ │
│ │                  │ │
│ │ ernährung zucker │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 12. Feb · REGEN. │ │
│ │ ...              │ │
│ └──────────────────┘ │
└──────────────────────┘
```

**Responsive Anpassungen:**
- Padding: 20px statt 30px
- Karten-Padding: 18px 20px statt 24px 28px
- Titel: `clamp()` skaliert automatisch
- Pfeil-Icon: auf Mobile ausgeblendet
- Filter-Chips: horizontales Scrolling (overflow-x: auto, no wrap)

### 9.3 Performance-Ziele

| Metrik | Ziel |
|--------|------|
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 2.0s |
| Total Blocking Time | < 100ms |
| Cumulative Layout Shift | < 0.05 |
| Index-Ladezeit (4G) | < 0.3s |

Diese Ziele werden durch die statische Architektur und die minimalen Abhängigkeiten (nur Fuse.js + Google Fonts) erreicht.

---

## 10. Progressive Web App (PWA)

### 10.1 Zweck

Athleten können die Seite zum Homescreen ihres Handys hinzufügen. Sie öffnet sich dann ohne Browser-Leiste, mit einem App-Icon und einem dunklen Splash-Screen.

### 10.2 manifest.json

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

### 10.3 Service Worker

Caching-Strategien:

| Asset | Strategie | Bedeutung |
|-------|----------|-----------|
| Startseite (index.html) | Network First | Immer aktuell, Fallback auf Cache |
| Suchindex (index.json) | Stale While Revalidate | Sofort aus Cache, im Hintergrund aktualisieren |
| Artikelseiten | Cache First (nach erstem Besuch) | Offline verfügbar, wenn einmal besucht |
| CSS, Fonts, Icons | Cache First | Einmal laden, dann immer aus Cache |
| Fuse.js (CDN) | Cache First | Einmal laden |

**Effekt:** Ein Athlet, der einen Artikel einmal gelesen hat, kann ihn auch offline wieder öffnen. Die Startseite und Suche funktionieren auch offline mit dem letzten bekannten Index.

---

## 11. Analytics

### 11.1 Empfehlung: Cloudflare Web Analytics

- Kostenlos bei Cloudflare Pages
- Kein Cookie, kein Tracking-Pixel → kein Cookie-Banner nötig
- DSGVO-konform

### 11.2 Was du siehst

- Seitenaufrufe pro Artikel
- Top-Seiten (welche Artikel werden am meisten gelesen?)
- Referrer (kommen Nutzer über WhatsApp, direkt, etc.?)
- Zeitverlauf (wann werden Artikel gelesen?)

### 11.3 Integration

Ein Script-Tag in der Startseite und in der Navigationsleiste der Artikelseiten:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "dein-token"}'></script>
```

---

## 12. Deployment

### 12.1 Hosting: Cloudflare Pages

| Aspekt | Detail |
|--------|--------|
| Build-Befehl | `npm install && npm run build` |
| Output-Verzeichnis | `public` |
| Custom Domain | z.B. `wiki.deinedomain.de` |
| SSL | Automatisch |
| CDN | Globales Edge-Netzwerk |
| Kosten | Kostenlos (Free Tier) |

### 12.2 Ordnerstruktur des Repos

```
athlete-wiki/
├── pages/                      ← Artikelseiten (dein Content)
│   ├── 2026-02-10-blutzucker-dopamin.html
│   ├── 2026-02-12-schlafqualitaet-messen.html
│   └── ...
│
├── templates/                  ← Vorlagen
│   ├── startseite.html         ← Startseiten-Template
│   └── 404.html                ← Fehlerseite
│
├── static/                     ← Statische Assets
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json
│   └── og-default.png
│
├── build.mjs                   ← Build-Script
├── package.json                ← Dependencies (cheerio, fuse.js)
├── .gitignore                  ← public/ ausschließen
│
├── .github/workflows/
│   └── deploy.yml              ← CI/CD Pipeline
│
└── public/                     ← GENERIERT (nicht im Repo)
    ├── index.html
    ├── index.json
    ├── 404.html
    ├── favicon.ico
    ├── manifest.json
    ├── og-default.png
    ├── icon-192.png
    ├── icon-512.png
    └── pages/
        ├── 2026-02-10-blutzucker-dopamin.html
        └── ...
```

### 12.3 Dependencies

```json
{
  "dependencies": {
    "cheerio": "^1.0.0"
  }
}
```

Fuse.js wird nicht als npm-Dependency installiert, sondern auf der Startseite via CDN geladen. Cheerio ist die einzige Build-Dependency – für HTML-Parsing und Text-Extraktion.

---

## 13. Build-Modifikationen an Artikelseiten

Die Artikel werden 1:1 kopiert – mit genau zwei optionalen Injektionen:

### 13.1 Open Graph Tags

**Wo:** Im `<head>`, nach `<meta charset="UTF-8">`

**Was:** 7 `<meta>`-Tags für WhatsApp-Vorschau

**Warum:** Damit Links in WhatsApp eine Vorschau mit Titel und Beschreibung zeigen

### 13.2 Navigationsleiste (optional)

**Wo:** Am Anfang des `<body>`, vor dem eigentlichen Inhalt

**Was:** Ein `<nav>`-Element mit Inline-Styles:
- „← Übersicht" Link zur Startseite
- „📋 Link kopieren" Button mit 10 Zeilen Inline-JavaScript
- Cloudflare Analytics Script (falls aktiviert)

**Warum:** Damit Nutzer zurück zur Startseite und den Link teilen können

**Styling-Isolation:** Alle Styles sind inline (`style="..."`), keine CSS-Klassen. Dadurch gibt es keine Konflikte mit den Styles der Artikelseite.

```html
<nav style="max-width:1100px;margin:0 auto;padding:16px 30px;display:flex;
  justify-content:space-between;align-items:center;font-family:'Outfit',sans-serif">
  <a href="/" style="color:#8899aa;text-decoration:none;font-size:0.9rem;
    font-weight:400">← Übersicht</a>
  <button onclick="navigator.clipboard.writeText(location.href).then(()=>{
    this.textContent='✅ Kopiert!';setTimeout(()=>this.textContent='📋 Link kopieren',2000)})"
    style="padding:8px 16px;border:1px solid #1e2d3d;border-radius:10px;
    background:transparent;color:#8899aa;font-family:'Outfit',sans-serif;
    font-size:0.82rem;cursor:pointer">📋 Link kopieren</button>
</nav>
```

### 13.3 Keine weiteren Modifikationen

Der Build verändert weder das Styling noch den Inhalt der Artikelseiten. Kein Wrapper, kein Layout-Template, kein zusätzliches CSS.

---

## 14. Feature-Übersicht & Phasenplan

### Phase 1 – MVP

| Feature | Beschreibung |
|---------|-------------|
| **Build-Script** | Scannt `pages/`, parst Meta-Blöcke, erzeugt Suchindex |
| **Startseite** | Hero + Suchfeld + Kategorie-Filter + Artikel-Karten |
| **Volltextsuche** | Fuse.js über alle Felder inkl. Content |
| **Kategorie-Filter** | Toggle-Chips, kombinierbar mit Suche |
| **Artikel-Kopie** | 1:1 Kopie mit OG-Tag-Injektion |
| **Navigationsleiste** | Zurück-Link + Copy-Link-Button (injiziert) |
| **404-Seite** | Fehlerseite im Wiki-Design |
| **Responsive Design** | Mobile-First, funktioniert auf allen Geräten |
| **Deployment** | Cloudflare Pages mit GitHub Actions |

### Phase 2 – Polishing

| Feature | Beschreibung |
|---------|-------------|
| **PWA** | manifest.json + Service Worker für Offline & Homescreen |
| **Analytics** | Cloudflare Web Analytics (kein Cookie-Banner) |
| **Kategorie-Artikelanzahl** | Filter-Chips zeigen `(n)` |
| **Stagger-Animationen** | Karten erscheinen zeitversetzt |
| **Suchfeld-Debounce** | 150ms Verzögerung für flüssigere UX |

### Phase 3 – Erweiterung

| Feature | Beschreibung |
|---------|-------------|
| **Dark/Light Toggle** | Helles Theme für Nutzer, die es bevorzugen |
| **Lesezeichen** | Artikel als Favorit markieren (LocalStorage) |
| **Redirect-Map** | `_redirects` Datei für umbenannte Slugs |
| **Kategorie-Seiten** | Eigene Landingpages pro Kategorie |
| **RSS-Feed** | Automatisch generierter Feed für neue Artikel |
