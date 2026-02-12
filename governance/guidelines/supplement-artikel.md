# Guideline: Supplement- und Mikronaehrstoff-Artikel

Diese Guideline definiert verbindliche Regeln fuer die Erstellung und Pflege von Supplement- und Mikronaehrstoff-Artikeln im Athlete Wiki. Sie MUSS bei jeder Artikelerstellung, Ueberarbeitung und Validierung beachtet werden.

---

## 1. Primaere Datenquelle

**Die `wissen/Supplement_DB V1.2.csv` ist die primaere Referenz fuer alle Supplement-Artikel.**

- Alle Angaben zu Wirkung, Nebenwirkungen, Dosierung, Synergien und Herkunft MUESSEN mit den Daten aus der CSV abgeglichen werden
- Die CSV-Spalten und ihre Zuordnung zu Artikelabschnitten:

| CSV-Spalte | Artikelabschnitt |
|---|---|
| Wirkstoff | `<h1>` Titel |
| Kurzbeschreibung | Header `<p>` Beschreibung |
| Tags | Meta-Block `tags` und `keywords` |
| Wirkung | Abschnitt "So wirkt es" (info-cards) |
| Nebenwirkungen | Abschnitt "Moegliche Nachteile" (info-cards bad) |
| Herkunft | Warning-Box Inhalt |
| Vorteile | Abschnitt "So wirkt es" (info-cards good) |
| Moegliche Nachteile | Abschnitt "Moegliche Nachteile" (info-cards bad/info) |
| Synergistisch Wirkende Stoffe | Abschnitt "Synergien" (synergy-list) |
| Dosierung | Abschnitt "Dosierung" (dose-grid) |
| Sonstiges | Ergaenzende Details in passenden Abschnitten |

- Abweichungen von der CSV sind NUR erlaubt, wenn sie:
  1. Offensichtliche Fehler in der CSV korrigieren (dokumentieren!)
  2. Zusaetzliche sportspezifische Details ergaenzen, die in der CSV nicht enthalten sind
  3. Nuancen und Kontext hinzufuegen, die fuer die Zielgruppe (Sportler) relevant sind
- Bei Widerspruch zwischen CSV und externem Wissen: CSV-Daten haben Vorrang, Abweichungen muessen begruendet werden

---

## 2. Artikel-Struktur (verbindlich)

Jeder Supplement-Artikel folgt dieser exakten Reihenfolge:

```
1. Meta-Block (HTML-Kommentar)
2. <!DOCTYPE html> + <head> mit Inline-CSS
3. <body>
   a. Header (h1 + Beschreibung)
   b. Abschnitt "So wirkt es" (section-label teal + info-grid)
   c. Abschnitt "Dosierung" (section-label green + chart-card mit dose-grid)
   d. Abschnitt "Synergien" (section-label teal + chart-card mit synergy-list)
   e. Abschnitt "Moegliche Nachteile" (section-label orange + info-grid)
   f. Warning-Box (Herkunft / Sicherheit / Wichtiger Hinweis)
   g. Summary (Fazit mit highlight-Span)
```

### 2.1 Meta-Block

```html
<!--
title: [Wirkstoff] – [Kurzcharakterisierung]
date: [YYYY-MM-DD]
tags: [kategorie], [wirkstoff-slug], supplement, [3-6 weitere relevante tags]
category: [kategorie]
status: published
slug: [wirkstoff-slug]
summary: [1-2 Saetze aus CSV-Kurzbeschreibung, sportspezifisch formuliert]
keywords: [wirkstoff, alternative namen, englische begriffe, synonyme]
-->
```

**Regeln:**
- `category` wird nach dem **primaeren Nutzen** des Supplements vergeben:

| Kategorie | Kriterium | Beispiele |
|---|---|---|
| `training` | Direkte Leistungssteigerung im Training (Kraft, Pump, Ausdauer, Fokus) | kreatin, koffein, citrullin, betaalanin |
| `regeneration` | Primaer Erholung, Schlaf, Stressabbau | magnesium, melatonin, ashwagandha, glutamin |
| `gesundheit` | Primaer Immunsystem, Gelenke, Organgesundheit, Mikronaehrstoff-Versorgung | vitamind, omega3, zink, curcumin |
| `ernaehrung` | Nur wenn Supplement keiner der obigen Kategorien klar zuordenbar ist | (Ausnahmefall) |

- `slug` ist der Wirkstoffname, slugifiziert (lowercase, umlaute aufloesen, keine sonderzeichen/bindestriche, max 50 zeichen)
- `tags` MUESSEN enthalten: die Kategorie (z.B. `training`), den Wirkstoff-Slug, `supplement`, sowie 3-6 weitere relevante Tags aus der CSV-Tags-Spalte
- `keywords` MUESSEN enthalten: den Wirkstoffnamen, englische Bezeichnung, gaengige Synonyme, chemische Namen
- Tags werden kleingeschrieben, Umlaute aufgeloest (ae, oe, ue, ss), nur a-z, 0-9 und Bindestriche erlaubt

### 2.2 Abschnitt "So wirkt es"

- Mindestens 3, maximal 4 info-cards
- Klassen-Verteilung: ueberwiegend `.good` fuer Vorteile, `.info` fuer neutrale Fakten
- Inhalte aus CSV-Spalten "Wirkung" und "Vorteile" ableiten
- Texte sportspezifisch formulieren (Bezug zu Training, Regeneration, Leistung)

### 2.3 Abschnitt "Dosierung"

- Exakt 4 dose-items im dose-grid
- Typische Aufteilung:
  1. Tagessdosis (Menge) – aus CSV "Dosierung"
  2. Beste Form / Zeitpunkt
  3. Einnahmehinweis
  4. Besonderheit (Form, Dauer, Haeufigkeit)
- Dosierungsangaben MUESSEN mit CSV uebereinstimmen

### 2.4 Abschnitt "Synergien"

- Synergien aus CSV-Spalte "Synergistisch Wirkende Stoffe" uebernehmen
- **VERLINKUNG PFLICHT:** Wenn ein Synergie-Partner einen eigenen Artikel hat, MUSS er verlinkt werden:
  ```html
  <a href="/pages/[slug].html" class="synergy-name">[Name]</a>
  ```
- Wenn kein Artikel existiert, als `<span class="synergy-name">` belassen
- Synergy-Badge beschreibt den Bereich der Synergie (z.B. "Immunsystem", "Kraft", "Aufnahme")

**Aktuell existierende Artikel-Slugs (fuer Verlinkung):**
- kreatin, betaalanin, citrullin, curcumin, koffein
- arginin, ashwagandha, magnesium, omega3, vitamind
- zink, taurin, melatonin, vitaminc, eisen
- lcarnitin, glutamin, boswelliaserrata, betain, nac
- glucosamin, astaxanthin, eaa, gaba, vitamink2
- coenzymq10, chondroitin, ltyrosin, bacopamonnieri, selen
- bcaas, berberin, ecdysteroide, ginkgobiloba, gruenteeextrakt
- hmb, mariendistel, resveratrol, msm, cordyceps
- opc, apigenin, leucin, tryptophan, ginseng

**Bei jedem neuen Artikel pruefen:**
1. Welche bestehenden Artikel verlinken auf einen Stoff, der jetzt einen eigenen Artikel hat? → Diese Artikel aktualisieren (span → a)
2. Verlinkt der neue Artikel auf bestehende Artikel? → Links setzen

### 2.5 Abschnitt "Moegliche Nachteile"

- 2 info-cards (`.bad` oder `.info`)
- Inhalte aus CSV-Spalten "Nebenwirkungen" und "Moegliche Nachteile"
- Ehrlich und nuanciert formulieren, keine Verhaemlosung

### 2.6 Warning-Box

- Hintergrundinfo zu Herkunft, Sicherheit oder wichtigem Kontext
- Aus CSV-Spalte "Herkunft" und "Sonstiges" ableiten
- Immer mit Warning-Icon `&#9888;&#65039;`

### 2.7 Summary

- Ein Satz mit `<span class="highlight">` fuer die Kernaussage
- Konkrete Dosierungsempfehlung nennen
- Sportbezug herstellen

---

## 3. CSS und Design

- Alle Artikel verwenden identisches Inline-CSS (kein externes Stylesheet)
- Template-Referenz: `pages/kreatin.html`
- Pflicht-CSS-Variablen:

```css
:root{
  --bg:#0f1923;
  --card:#162231;
  --card-border:#1e3044;
  --accent-orange:#ffa94d;
  --accent-teal:#38d9a9;
  --accent-red:#ff6b6b;
  --accent-green:#51cf66;
  --accent-blue:#74c0fc;
  --accent-purple:#cc5de8;
  --text:#e8edf2;
  --text-muted:#8899aa;
  --text-dim:#556677
}
```

- Synergy-Links CSS MUSS enthalten sein:
```css
.synergy-name{font-weight:500;font-size:0.95rem;color:var(--text);text-decoration:none}
a.synergy-name:hover{color:var(--accent-teal)}
```

- Fonts: Ausschliesslich self-hosted @font-face (DM Serif Display, Outfit 300-700)
- KEINE externen Font-Links (`<link>` zu fonts.googleapis.com ist verboten)
- Responsive: `@media(max-width:700px)` fuer Grids

---

## 4. Tags-System

### 4.1 Pflicht-Tags fuer Supplement-Artikel

Jeder Supplement-Artikel MUSS diese Tags enthalten:
1. Kategorie-Tag (z.B. `training`, `regeneration`, `gesundheit`, `ernaehrung`) – muss mit `category` uebereinstimmen
2. `supplement` (Typ-Tag)
3. Wirkstoff-Slug (z.B. `kreatin`, `magnesium`, `vitaminc`)
4. 3-6 kontextuelle Tags basierend auf CSV-Tags und Wirkungsbereichen

### 4.2 Gaengige kontextuelle Tags

| Wirkungsbereich | Tags |
|---|---|
| Muskelaufbau/Kraft | `muskelaufbau`, `kraft`, `training` |
| Ausdauer | `ausdauer`, `kondition` |
| Regeneration | `regeneration`, `erholung`, `schlaf` |
| Immunsystem | `immunsystem`, `abwehrkraefte` |
| Gelenke/Knochen | `gelenke`, `knochen`, `kollagen` |
| Entzuendung | `entzuendungshemmend`, `antioxidans` |
| Hormone | `testosteron`, `cortisol`, `hormone` |
| Energie/Fokus | `energie`, `fokus`, `konzentration` |
| Herz-Kreislauf | `herzgesundheit`, `durchblutung` |
| Mikronaehrstoff-Typ | `spurenelement`, `mineral`, `vitamin`, `aminosaeure`, `adaptogen` |

### 4.3 Keywords

- Immer deutsche UND englische Bezeichnung
- Chemische/wissenschaftliche Namen
- Gaengige Markenbezeichnungen (z.B. "kreatin monohydrat", "ksm-66")
- Synonyme und alternative Schreibweisen

---

## 5. Qualitaetspruefung

Vor der Fertigstellung jedes Artikels:

- [ ] CSV-Abgleich: Dosierung, Synergien, Nebenwirkungen stimmen mit CSV ueberein
- [ ] Synergien verlinkt: Alle Stoffe mit eigenem Artikel sind als `<a>` verlinkt
- [ ] Rueckwaerts-Verlinkung: Bestehende Artikel, die diesen Stoff als Synergie nennen, wurden aktualisiert
- [ ] Tags vollstaendig: kategorie-tag + supplement + wirkstoff-slug + 3-6 kontextuelle Tags
- [ ] Keywords vollstaendig: deutsch + englisch + synonyme + chemische namen
- [ ] Slug korrekt: slugify-Regeln eingehalten (keine bindestriche, nur a-z0-9)
- [ ] `npm run validate` laeuft fehlerfrei
- [ ] Keine externen Font-Links
- [ ] Responsive Design getestet (700px Breakpoint)
- [ ] Texte sportspezifisch und fuer Laien verstaendlich

---

## 6. Workflow: Neuen Supplement-Artikel erstellen

1. **CSV pruefen:** Wirkstoff in `wissen/Supplement_DB V1.2.csv` nachschlagen
2. **Slug bestimmen:** Wirkstoffname slugifizieren
3. **Bestehendes pruefen:** Existiert bereits ein Artikel mit diesem Slug?
4. **Artikel schreiben:** Template (`pages/kreatin.html`) als Basis, Inhalte aus CSV
5. **Synergien verlinken:** Alle Stoffe mit eigenem Artikel als `<a href="/pages/[slug]">` verlinken
6. **Rueckwaerts-Links setzen:** In allen bestehenden Artikeln pruefen, ob der neue Stoff als Synergy-Partner erwaehnt wird, und dort ebenfalls verlinken
7. **Tags und Keywords setzen:** Gemaess Abschnitt 4
8. **Validieren:** `npm run validate` ausfuehren
9. **Slug-Liste aktualisieren:** Diese Guideline um den neuen Slug ergaenzen (Abschnitt 2.4)

---

## 7. Aenderungshistorie

| Datum | Aenderung |
|---|---|
| 2026-02-12 | Initiale Version erstellt |
