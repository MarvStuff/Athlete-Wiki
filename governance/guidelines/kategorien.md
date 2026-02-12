# Guideline: Kategorien im Athlete Wiki

Diese Guideline definiert die verbindlichen Kategorien, ihre Bedeutung, Zuordnungsregeln und Farbcodes. Sie gilt fuer alle Artikeltypen und MUSS bei jeder Artikelerstellung beachtet werden.

---

## 1. Verfuegbare Kategorien

| Kategorie | Label | Farbe | Hex |
|---|---|---|---|
| `ernaehrung` | Ernaehrung | Gruen | `#51cf66` |
| `training` | Training | Orange | `#ffa94d` |
| `regeneration` | Regeneration | Blau | `#74c0fc` |
| `gesundheit` | Gesundheit | Rot | `#ff6b6b` |
| `wettkampf` | Wettkampf | Gold | `#ffd43b` |
| `allgemein` | Allgemein | Grau | `#868e96` |

Es gibt **genau 6 Kategorien**. Neue Kategorien duerfen nur durch Aenderung von `build.mjs`, `startseite.html` (CSS + JS) und `CLAUDE.md` eingefuehrt werden.

---

## 2. Kategorie-Definitionen und Zuordnungskriterien

### 2.1 `training`

**Zweck:** Inhalte, die direkte Leistungssteigerung im Training betreffen.

**Zuordnen wenn:**
- Primaerer Nutzen ist Kraftsteigerung, Ausdauerverbesserung, Pump, Fokus im Training
- Artikel beschreibt Trainingsprinzipien, Uebungen, Periodisierung, Trainingsplanung
- Supplement mit direktem, akutem Leistungseffekt

**Beispiele:**
- Supplements: Kreatin, Koffein, Citrullin, Beta-Alanin, Arginin, Betain, Taurin, EAA
- Artikel: Trainingsplaene, Progressive Overload, Trainingsfrequenz

### 2.2 `regeneration`

**Zweck:** Inhalte rund um Erholung, Schlaf, Stressabbau und Wiederherstellung.

**Zuordnen wenn:**
- Primaerer Nutzen ist Erholung nach dem Training, Schlafqualitaet, Stressreduktion
- Artikel beschreibt Regenerationsmethoden, Schlafhygiene, Entspannungstechniken
- Supplement wirkt primaer auf Erholung, nicht auf akute Leistung

**Beispiele:**
- Supplements: Magnesium, Melatonin, Ashwagandha, Glutamin, L-Carnitin, GABA
- Artikel: Schlafoptimierung, Deload-Wochen, Saunaprotokolle

### 2.3 `gesundheit`

**Zweck:** Inhalte zu Immunsystem, Gelenkgesundheit, Organgesundheit und Mikronaehrstoff-Versorgung.

**Zuordnen wenn:**
- Primaerer Nutzen ist praeventive Gesundheit, Immunfunktion, Gelenkschutz, Entzuendungshemmung
- Supplement ist ein Mikronaehrstoff ohne direkte Trainings- oder Regenerationswirkung
- Artikel behandelt Gesundheitsthemen mit Sportbezug (Verletzungspraevention, Blutbild)

**Beispiele:**
- Supplements: Vitamin D, Vitamin C, Omega-3, Zink, Eisen, Curcumin, Boswellia Serrata, NAC, Glucosamin, Astaxanthin, Vitamin K2
- Artikel: Blutbild-Interpretation, Gelenkpflege, Immunsystem im Training

### 2.4 `ernaehrung`

**Zweck:** Inhalte zu Ernaehrungsstrategien, Makronaehrstoffen, Mahlzeitenplanung und Lebensmitteln.

**Zuordnen wenn:**
- Artikel behandelt Ernaehrungsprinzipien (Kalorien, Makros, Timing, Diaeten)
- Supplement ist primaer ein Makronaehrstoff-Lieferant (z.B. Proteinpulver, Gewichtszunahme-Shakes)
- Supplement laesst sich keiner der Kategorien training/regeneration/gesundheit klar zuordnen

**Beispiele:**
- Supplements: Proteinpulver, Kollagen, Krebs-/Braunalgenpraeparate (falls keine klare Zuordnung)
- Artikel: Ernaehrungsplaene, Meal-Prep, Kaloriendefizit, Makroverteilung

**Wichtig:** `ernaehrung` ist NICHT die Standardkategorie fuer alle Supplements. Supplements werden nach ihrem primaeren Nutzen kategorisiert (siehe Abschnitt 3).

### 2.5 `wettkampf`

**Zweck:** Inhalte spezifisch fuer Wettkampfvorbereitung und -durchfuehrung.

**Zuordnen wenn:**
- Artikel behandelt Wettkampfstrategien, Peak-Week, Posing, Gewichtmachen
- Mentale Wettkampfvorbereitung, Wettkampfernaehrung, Wettkampftag-Protokolle

**Beispiele:**
- Artikel: Wettkampfvorbereitung, Peak-Week, Carb-Loading, Mentaltraining im Wettkampf

### 2.6 `allgemein`

**Zweck:** Auffangkategorie fuer Inhalte, die keiner spezifischen Kategorie zuordenbar sind.

**Zuordnen wenn:**
- Artikel passt in keine der obigen Kategorien
- Uebergreifende Themen (z.B. Coaching-Philosophie, Sportlerportraets, allgemeine Tipps)

**Beispiele:**
- Artikel: FAQ, Glossar, Coaching-Ansaetze, Motivationsartikel

---

## 3. Entscheidungsbaum fuer die Kategorie-Zuordnung

Bei der Zuordnung eines Artikels diese Fragen der Reihe nach pruefen:

```
1. Geht es um Wettkampfvorbereitung/-durchfuehrung?
   → JA: wettkampf

2. Verbessert es direkt die Trainingsleistung (Kraft, Pump, Ausdauer, Fokus)?
   → JA: training

3. Unterstuetzt es primaer Erholung, Schlaf oder Stressabbau?
   → JA: regeneration

4. Betrifft es primaer Gesundheit, Immunsystem, Gelenke oder Mikronaehrstoffe?
   → JA: gesundheit

5. Behandelt es Ernaehrungsstrategien, Makros oder Mahlzeitenplanung?
   → JA: ernaehrung

6. Nichts davon trifft zu?
   → allgemein
```

**Regel:** Bei Supplements mit Mehrfachwirkung (z.B. Magnesium: Regeneration + Gesundheit) zaehlt der **primaere, bekannteste Nutzen** im Sportkontext.

---

## 4. Entfernte Kategorien

### `mindset` (entfernt am 2026-02-12)

**Grund:** Die Kategorie hatte keine publizierten Artikel und wuerde bei der aktuellen Artikelstruktur dauerhaft leer bleiben. Mentale Themen lassen sich sinnvoll unter `wettkampf` (Wettkampf-Mentalitaet), `training` (Trainingsdisziplin) oder `allgemein` (uebergreifende Motivation) einordnen.

**Migration:** Der einzige Draft-Artikel (`mentalestaerke`) wurde auf `allgemein` umkategorisiert.

---

## 5. Aktuelle Kategorie-Verteilung (Stand 2026-02-12)

| Kategorie | Anzahl publiziert |
|---|---|
| gesundheit | 13 |
| training | 9 |
| regeneration | 7 |
| ernaehrung | 5 |
| wettkampf | 0 |
| allgemein | 0 |

**Ziel:** Eine moeglichst gleichmaessige Verteilung ueber die aktiven Kategorien, damit die Filter-Chips auf der Startseite nuetzlich sind. Leere Kategorien werden als deaktivierte Chips angezeigt.

---

## 6. Technische Verankerung

Die Kategorien sind an folgenden Stellen im Code definiert und muessen synchron gehalten werden:

| Datei | Stelle | Zweck |
|---|---|---|
| `build.mjs` | `KNOWN_CATEGORIES` Objekt | Build-Validierung, Fallback |
| `templates/startseite.html` | CSS-Variablen `--cat-*` | Chip-Farben |
| `templates/startseite.html` | JS `CATEGORIES` Objekt | Chip-Rendering, Filterlogik |
| `CLAUDE.md` | Tabelle "Kategorien mit Farben" | Dokumentation, KI-Kontext |
| `governance/guidelines/kategorien.md` | Diese Datei | Verbindliche Guideline |

**Bei Aenderungen an den Kategorien muessen ALLE obigen Stellen aktualisiert werden.**

---

## 7. Aenderungshistorie

| Datum | Aenderung |
|---|---|
| 2026-02-12 | Initiale Version erstellt, Kategorie `mindset` entfernt |
