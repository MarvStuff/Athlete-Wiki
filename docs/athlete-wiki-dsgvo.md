# Athlete Wiki – DSGVO-Konzept

Ergänzung zum Web-Application-Konzept. Dieses Dokument beschreibt alle datenschutzrechtlich relevanten Aspekte der Anwendung, die notwendigen Architekturänderungen und die erforderlichen Rechtstexte.

---

## 1. Ausgangslage & Bewertung

### Was die Anwendung ist (datenschutzrechtlich)

Athlete Wiki ist eine statische Website ohne Backend. Es gibt keine Benutzerkonten, keine Formulare, keine Kommentarfunktion und keine serverseitige Datenverarbeitung. Die Seite wird über ein CDN ausgeliefert.

### Personenbezogene Daten, die verarbeitet werden

| Datum | Wo | Durch wen | Rechtsgrundlage |
|-------|-----|-----------|----------------|
| IP-Adresse | CDN-Auslieferung | Cloudflare (Auftragsverarbeiter) | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) |
| IP-Adresse | Web Analytics | Cloudflare Analytics (anonymisiert) | Art. 6 Abs. 1 lit. f DSGVO |
| User-Agent, Referrer | Web Analytics | Cloudflare Analytics (anonymisiert) | Art. 6 Abs. 1 lit. f DSGVO |

### Was NICHT verarbeitet wird

- Keine Cookies (kein Cookie-Banner nötig)
- Keine Tracking-Pixel
- Keine personenbezogenen Formulardaten
- Keine Registrierung oder Login
- Keine E-Mail-Adressen
- Kein Fingerprinting
- Keine Weitergabe an Werbenetzwerke
- Keine Social-Media-Plugins mit Datenabfluss

---

## 2. Kritische Probleme im aktuellen Konzept

### 2.1 Google Fonts (MUSS geändert werden)

**Problem:** Die Artikelseiten und die Startseite laden Fonts von `fonts.googleapis.com` und `fonts.gstatic.com`. Bei jedem Seitenaufruf wird die IP-Adresse des Nutzers an Google (USA) übertragen.

**Rechtslage:** Das LG München hat am 20.01.2022 (Az. 3 O 17493/20) entschieden, dass die Einbindung von Google Fonts über die Google-Server ohne Einwilligung des Nutzers einen Verstoß gegen die DSGVO darstellt. Google erhält personenbezogene Daten (IP-Adresse) ohne Rechtsgrundlage, da die Fonts auch lokal eingebunden werden können.

**Lösung: Fonts selbst hosten.**

Die Schriften DM Serif Display und Outfit werden beim Build als WOFF2-Dateien heruntergeladen und aus dem eigenen Domain ausgeliefert. Kein Request an Google.

**Umsetzung im Build:**

```
1. WOFF2-Dateien einmalig herunterladen:
   - DM Serif Display (Regular)
   - Outfit (300, 400, 500, 600, 700)

2. Ablegen in: static/fonts/
   - dm-serif-display-regular.woff2
   - outfit-300.woff2
   - outfit-400.woff2
   - outfit-500.woff2
   - outfit-600.woff2
   - outfit-700.woff2

3. @font-face Deklarationen statt Google Fonts Link
```

**Vorher (DSGVO-Verstoß):**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**Nachher (DSGVO-konform):**
```css
@font-face {
  font-family: 'DM Serif Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/dm-serif-display-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('/fonts/outfit-300.woff2') format('woff2');
}

/* ... weitere Gewichte ... */
```

**Auswirkung auf Artikelseiten:**

Die Artikelseiten enthalten aktuell den Google Fonts `<link>`-Tag. Hier gibt es zwei Optionen:

**Option A – Build ersetzt den Link (empfohlen):**
Der Build-Step ersetzt in jeder Artikelseite den Google Fonts `<link>`-Tag durch ein `<style>`-Block mit den `@font-face`-Deklarationen, die auf die selbst gehosteten WOFF2-Dateien verweisen.

```
Suche:   <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display...">
Ersetze: <style>@font-face { ... }</style>
```

Das ist eine zusätzliche Build-Modifikation, aber sie ist notwendig und eindeutig definiert.

**Option B – Style-Vorlage anpassen:**
Die KI-Style-Vorlage wird so geändert, dass neue Artikelseiten von vornherein die `@font-face`-Deklarationen enthalten statt des Google Fonts Links. Bestehende Dateien werden per Build nachträglich korrigiert.

**Empfehlung: Beide Optionen kombiniert.** Die Style-Vorlage wird aktualisiert (für neue Artikel), und der Build ersetzt den Google Fonts Link in allen Dateien als Sicherheitsnetz.

### 2.2 Fuse.js CDN (MUSS geändert werden)

**Problem:** Die Startseite lädt Fuse.js von `cdn.jsdelivr.net`. Bei jedem Aufruf der Startseite wird die IP-Adresse des Nutzers an jsDelivr (Drittperson) übertragen.

**Lösung: Fuse.js lokal bündeln.**

```
1. Fuse.js als npm-Dependency installieren:
   npm install fuse.js

2. Beim Build die minifizierte Datei kopieren:
   node_modules/fuse.js/dist/fuse.min.js → public/fuse.min.js

3. In der Startseite lokal referenzieren:
   <script src="/fuse.min.js"></script>
```

**Vorher:**
```html
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
```

**Nachher:**
```html
<script src="/fuse.min.js"></script>
```

### 2.3 Cloudflare Analytics Script (MUSS geprüft werden)

**Problem:** Das Cloudflare Analytics Script wird von `static.cloudflareinsights.com` geladen – einem Cloudflare-Server. Streng genommen ist das eine externe Ressource.

**Rechtliche Einordnung:** Cloudflare Web Analytics setzt keine Cookies, speichert keine IP-Adressen dauerhaft und erstellt keine Nutzerprofile. Es ist deutlich datenschutzfreundlicher als Google Analytics. Dennoch wird das Script von einem externen Server geladen, und dabei wird die IP-Adresse des Nutzers an Cloudflare übermittelt.

**Lösung:**

Da die Website ohnehin über Cloudflare Pages gehostet wird, verarbeitet Cloudflare die IP-Adresse bereits bei der Auslieferung der Seite. Das Analytics-Script erzeugt keinen zusätzlichen Datenabfluss an einen Dritten – Cloudflare IST der Hoster. Daher ist die Einbindung über Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Funktionsanalyse) gedeckt.

**Voraussetzungen:**
- In der Datenschutzerklärung wird Cloudflare Analytics explizit erwähnt
- Es wird erklärt, dass keine Cookies gesetzt werden
- Es wird auf die Cloudflare Privacy Policy verwiesen
- Es wird das berechtigte Interesse als Rechtsgrundlage benannt

**Alternativ:** Falls du auf maximale Sicherheit gehen willst, kann das Analytics-Script auch komplett weggelassen werden. Die Seite funktioniert ohne Analytics vollständig. Cloudflare Pages bietet auch serverbasierte Analytics (ohne Client-Script), die ausschließlich auf HTTP-Logs basiert.

### 2.4 Cloudflare als Auftragsverarbeiter

**Situation:** Cloudflare (US-Unternehmen) verarbeitet als CDN/Hoster die IP-Adressen aller Besucher.

**Rechtliche Absicherung:**
- Cloudflare bietet einen **Data Processing Addendum (DPA)** an
- Cloudflare verwendet **EU Standard Contractual Clauses (SCCs)** für Datentransfers in die USA
- Cloudflare ist unter dem **EU-US Data Privacy Framework** zertifiziert

**Zu tun:**
1. Cloudflare DPA akzeptieren (im Cloudflare Dashboard unter Account Settings → Legal)
2. In der Datenschutzerklärung Cloudflare als Auftragsverarbeiter benennen

### 2.5 GitHub (kein DSGVO-Problem für Nutzer)

GitHub wird nur für den Build-Prozess und die Quellcode-Verwaltung verwendet. Kein Nutzer (Athlet) hat Kontakt mit GitHub. Die IP-Adressen der Athleten werden nie an GitHub übertragen. Daher ist GitHub datenschutzrechtlich nicht relevant für die Besucher der Website.

---

## 3. Architekturänderungen: Zusammenfassung

### Geänderte Ordnerstruktur

```
athlete-wiki/
├── pages/                          ← Artikelseiten
├── templates/
│   ├── startseite.html             ← GEÄNDERT: lokale Font-Refs
│   ├── 404.html
│   ├── impressum.html              ← NEU
│   └── datenschutz.html            ← NEU
├── static/
│   ├── fonts/                      ← NEU: Selbst gehostete Fonts
│   │   ├── dm-serif-display-regular.woff2
│   │   ├── outfit-300.woff2
│   │   ├── outfit-400.woff2
│   │   ├── outfit-500.woff2
│   │   ├── outfit-600.woff2
│   │   └── outfit-700.woff2
│   ├── favicon.ico
│   ├── og-default.png
│   └── manifest.json
├── build.mjs                       ← GEÄNDERT: Font-Replacement, Fuse.js lokal
├── package.json                    ← GEÄNDERT: fuse.js als Dependency
└── ...
```

### Geändertes package.json

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "fuse.js": "^7.0.0"
  }
}
```

### Zusätzliche Build-Schritte

```
Bestehende Schritte:
  1. Artikelseiten scannen & parsen
  2. Suchindex erzeugen
  3. Startseite generieren
  4. Dateien kopieren

Neue Schritte:
  5. Google Fonts Link in Artikelseiten ersetzen durch @font-face
  6. Fuse.js aus node_modules nach public/ kopieren
  7. Font-Dateien nach public/fonts/ kopieren
  8. Impressum & Datenschutzerklärung nach public/ kopieren
```

### Geänderter Build-Output

```
public/
├── index.html              ← Startseite (lokale Fonts, lokales Fuse.js)
├── index.json              ← Suchindex
├── fuse.min.js             ← NEU: Lokal gebündelt
├── 404.html
├── impressum.html          ← NEU
├── datenschutz.html        ← NEU
├── fonts/                  ← NEU
│   ├── dm-serif-display-regular.woff2
│   ├── outfit-300.woff2
│   ├── outfit-400.woff2
│   ├── outfit-500.woff2
│   ├── outfit-600.woff2
│   └── outfit-700.woff2
├── favicon.ico
├── og-default.png
├── manifest.json
└── pages/
    └── *.html              ← Artikelseiten (Google Fonts Link ersetzt)
```

---

## 4. Erforderliche Rechtstexte

### 4.1 Impressum

Nach § 5 DDG (ehemals TMG) ist ein Impressum Pflicht für geschäftsmäßige Online-Dienste. Auch wenn die Seite kostenlos ist und keine Werbung enthält – als Coaching-Ergänzung ist sie geschäftsmäßig.

**Pflichtangaben:**
- Vollständiger Name
- Anschrift (kein Postfach)
- E-Mail-Adresse
- Ggf. Telefonnummer
- Ggf. Umsatzsteuer-ID
- Ggf. Berufsbezeichnung und zuständige Kammer (falls Coach als freier Beruf)

**Umsetzung:** Statische Seite unter `/impressum.html`, im gleichen Design wie die 404-Seite. Link im Footer der Startseite und in der Navigationsleiste der Artikelseiten.

### 4.2 Datenschutzerklärung

**Pflicht nach Art. 13 DSGVO.** Die Datenschutzerklärung muss informieren über:

1. **Verantwortlicher** (Name, Anschrift, E-Mail)
2. **Hosting & CDN** (Cloudflare als Auftragsverarbeiter, DPA, SCCs, EU-US DPF)
3. **Server-Logfiles** (IP-Adresse, Zeitstempel, aufgerufene Seite, Browser – Rechtsgrundlage Art. 6 Abs. 1 lit. f)
4. **Web Analytics** (Cloudflare Analytics, keine Cookies, keine Nutzerprofile, Rechtsgrundlage Art. 6 Abs. 1 lit. f)
5. **Schriftarten** (selbst gehostet, kein Datentransfer an Dritte)
6. **Keine Cookies** (expliziter Hinweis, dass keine Cookies gesetzt werden)
7. **Keine externen Ressourcen** (alle Assets werden vom eigenen Server geladen)
8. **Betroffenenrechte** (Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit)
9. **Beschwerderecht** bei der zuständigen Aufsichtsbehörde
10. **SSL-Verschlüsselung** (HTTPS)

**Umsetzung:** Statische Seite unter `/datenschutz.html`. Link im Footer der Startseite und in der Navigationsleiste der Artikelseiten.

### 4.3 Datenschutzerklärung – Textvorlage

```
Datenschutzerklärung

1. Verantwortlicher
[Dein Name]
[Deine Anschrift]
E-Mail: [deine E-Mail]

2. Hosting
Diese Website wird über Cloudflare Pages (Cloudflare, Inc., 
101 Townsend St, San Francisco, CA 94107, USA) bereitgestellt. 
Bei jedem Zugriff werden automatisch Server-Logfiles erfasst, 
die folgende Daten enthalten:

- IP-Adresse (anonymisiert)
- Datum und Uhrzeit des Zugriffs
- aufgerufene Seite
- übertragene Datenmenge
- Browser-Typ und -Version
- Betriebssystem

Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f 
DSGVO (berechtigtes Interesse an der sicheren und effizienten 
Bereitstellung der Website). Cloudflare ist unter dem EU-US 
Data Privacy Framework zertifiziert. Wir haben mit Cloudflare 
einen Auftragsverarbeitungsvertrag (DPA) abgeschlossen, der 
EU-Standardvertragsklauseln enthält.

3. Web Analytics
Wir verwenden Cloudflare Web Analytics zur anonymisierten 
Auswertung der Websitenutzung. Es werden keine Cookies 
gesetzt, keine IP-Adressen dauerhaft gespeichert und keine 
Nutzerprofile erstellt. Die Auswertung dient der Verbesserung 
unserer Inhalte. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.

4. Schriftarten
Die auf dieser Website verwendeten Schriftarten (DM Serif 
Display, Outfit) werden lokal von unserem eigenen Server 
geladen. Es findet kein Datentransfer an Google oder andere 
Drittanbieter statt.

5. Cookies
Diese Website verwendet keine Cookies.

6. Externe Ressourcen
Alle für die Darstellung der Website erforderlichen Ressourcen 
(Schriftarten, Scripts, Stylesheets) werden von unserem eigenen 
Server geladen. Es werden keine externen CDN-Dienste für die 
Auslieferung von Inhalten verwendet.

7. SSL-Verschlüsselung
Die Übertragung zwischen Ihrem Browser und unserem Server 
erfolgt über HTTPS (SSL/TLS-Verschlüsselung).

8. Ihre Rechte
Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung 
(Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der 
Verarbeitung (Art. 18 DSGVO), Widerspruch gegen die 
Verarbeitung (Art. 21 DSGVO) und Datenübertragbarkeit (Art. 20 
DSGVO). Sie können sich jederzeit an die zuständige 
Aufsichtsbehörde wenden.

9. Kontakt
Bei Fragen zum Datenschutz wenden Sie sich an:
[Dein Name], [deine E-Mail]
```

**Hinweis:** Diese Vorlage ist ein Ausgangspunkt. Für eine rechtssichere Datenschutzerklärung empfiehlt sich die Prüfung durch einen Rechtsanwalt oder die Verwendung eines Generators wie e-recht24.de oder datenschutz-generator.de.

---

## 5. Navigationsänderungen

### Footer der Startseite

Bisherig:
```
Athlete Wiki · Coaching-Wissen
```

Neu:
```
Athlete Wiki · Impressum · Datenschutz
```

Beide Links führen zu den jeweiligen statischen Seiten.

### Navigationsleiste in Artikelseiten

Die injizierte Navigationsleiste am Anfang jeder Artikelseite wird erweitert:

```html
<nav style="...">
  <a href="/" style="...">← Übersicht</a>
  <div style="display:flex;gap:12px;align-items:center">
    <a href="/impressum.html" style="color:#556677;text-decoration:none;
      font-size:0.72rem">Impressum</a>
    <a href="/datenschutz.html" style="color:#556677;text-decoration:none;
      font-size:0.72rem">Datenschutz</a>
    <button onclick="..." style="...">📋 Link kopieren</button>
  </div>
</nav>
```

Die Links zu Impressum und Datenschutz sind bewusst klein und dezent (0.72rem, dim-Farbe). Sie stören die Nutzung nicht, erfüllen aber die rechtliche Pflicht, dass von jeder Seite aus Impressum und Datenschutzerklärung erreichbar sind.

---

## 6. Änderungen an der KI-Style-Vorlage

Die Style-Vorlage, die du KI-Apps für die Erstellung neuer Artikelseiten mitgibst, muss angepasst werden:

### Bisheriger Font-Einbindung (ENTFERNEN):

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Neue Font-Einbindung (EINFÜGEN):

```html
<style>
  @font-face {
    font-family: 'DM Serif Display';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/dm-serif-display-regular.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 300;
    font-display: swap;
    src: url('/fonts/outfit-300.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/outfit-400.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('/fonts/outfit-500.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('/fonts/outfit-600.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('/fonts/outfit-700.woff2') format('woff2');
  }
</style>
```

### Build-Sicherheitsnetz

Auch wenn neue Artikel die korrekten `@font-face`-Deklarationen verwenden, ersetzt der Build zur Sicherheit in ALLEN Artikelseiten einen eventuell vorhandenen Google Fonts Link. So werden auch ältere Dateien automatisch korrigiert:

```
Suche (Regex):   <link[^>]*fonts\.googleapis\.com[^>]*>
Ersetze durch:   <style>[die @font-face Deklarationen]</style>
```

---

## 7. Fonts herunterladen: Einmalige Einrichtung

Die WOFF2-Dateien müssen einmalig heruntergeladen werden. Quelle: Google Fonts (der Download ist legal, nur die Laufzeit-Einbindung ist problematisch).

**Empfohlener Weg:**

1. https://gwfh.mranftl.com/fonts (Google Webfonts Helper)
2. DM Serif Display auswählen → Regular → WOFF2 herunterladen
3. Outfit auswählen → 300, 400, 500, 600, 700 → WOFF2 herunterladen
4. Dateien in `static/fonts/` ablegen

**Oder via google-webfonts-helper API im Build-Script automatisieren** (einmalig, Dateien werden dann ins Repo committed).

Dateigröße: ~120 KB total (alle 6 WOFF2-Dateien). Das ist weniger als ein einzelner Google Fonts Roundtrip.

---

## 8. DSGVO-Checkliste

### Vor dem Launch

- [ ] Fonts selbst gehostet (static/fonts/)
- [ ] Google Fonts `<link>` nirgends mehr vorhanden (Build prüft das)
- [ ] Fuse.js lokal gebündelt (public/fuse.min.js)
- [ ] Keine externen CDN-Referenzen in der gesamten Seite
- [ ] Impressum-Seite erstellt mit vollständigen Angaben
- [ ] Datenschutzerklärung erstellt mit allen Pflichtangaben
- [ ] Links zu Impressum & Datenschutz im Footer der Startseite
- [ ] Links zu Impressum & Datenschutz in der Artikelseiten-Navigation
- [ ] Cloudflare DPA im Dashboard akzeptiert
- [ ] Cloudflare Analytics Token konfiguriert (oder Analytics deaktiviert)
- [ ] SSL/HTTPS aktiv (automatisch bei Cloudflare Pages)
- [ ] Kein Cookie-Banner nötig (da keine Cookies → prüfen und bestätigen)

### Bei jedem neuen Artikel (automatisch durch Build)

- [ ] Google Fonts Link wird ersetzt (falls vorhanden)
- [ ] OG-Tags werden injiziert
- [ ] Navigationsleiste mit Impressum/Datenschutz-Links wird injiziert

### Jährlich (empfohlen)

- [ ] Datenschutzerklärung auf Aktualität prüfen
- [ ] Cloudflare DPA-Status prüfen
- [ ] Prüfen ob neue externe Ressourcen hinzugekommen sind

---

## 9. Änderungen an bestehenden Konzept-Kapiteln

Dieses DSGVO-Konzept erfordert Änderungen an folgenden Stellen des Web-Application-Konzepts:

### Kapitel 3.1 – Artikelseiten Format

Ändern von:
> Alle Fonts (via Google Fonts `<link>`)
> Keine externen Abhängigkeiten (außer Google Fonts)

Zu:
> Alle Fonts via @font-face (selbst gehostete WOFF2-Dateien)
> Keine externen Abhängigkeiten

### Kapitel 6.1 – Suchsystem Technologie

Ändern von:
> Laden: via CDN (`cdn.jsdelivr.net/npm/fuse.js@7.0.0`)

Zu:
> Laden: lokal gebündelt (`/fuse.min.js`, kopiert aus node_modules beim Build)

### Kapitel 10.3 – Service Worker

Ändern von:
> Fuse.js (CDN) | Cache First | Einmal laden

Zu:
> Fuse.js (lokal) | Cache First | Einmal laden

### Kapitel 11.3 – Analytics Integration

Ergänzen:
> Hinweis: Cloudflare Analytics muss in der Datenschutzerklärung erwähnt werden. Es werden keine Cookies gesetzt. Falls maximale DSGVO-Sicherheit gewünscht: Analytics komplett weglassen oder serverseitige Cloudflare Analytics nutzen (kein Client-Script).

### Kapitel 12.2 – Ordnerstruktur

Ergänzen um:
- `static/fonts/` (WOFF2-Dateien)
- `templates/impressum.html`
- `templates/datenschutz.html`

### Kapitel 13 – Build-Modifikationen

Ergänzen um:
- 13.4 Google Fonts Replacement (Link → @font-face in allen Artikelseiten)
- 13.5 Impressum & Datenschutz kopieren nach public/

### Kapitel 14 – Phasenplan Phase 1

Ergänzen:
| **DSGVO** | Fonts self-hosting, Fuse.js lokal, Impressum, Datenschutz, keine ext. CDN-Refs |

---

## 10. Zusammenfassung

| Thema | Status | Maßnahme |
|-------|--------|----------|
| Google Fonts | ❌ Aktuell DSGVO-Verstoß | Self-Hosting + Build-Replacement |
| Fuse.js CDN | ❌ Aktuell problematisch | Lokales Bundling |
| Cloudflare Analytics | ⚠️ Vertretbar | In Datenschutzerklärung erwähnen |
| Cloudflare Hosting | ✅ Okay mit DPA | DPA im Dashboard akzeptieren |
| Cookies | ✅ Keine vorhanden | Kein Cookie-Banner nötig |
| Impressum | ❌ Fehlt | Statische Seite erstellen |
| Datenschutzerklärung | ❌ Fehlt | Statische Seite erstellen |
| SSL/HTTPS | ✅ Automatisch | Durch Cloudflare Pages |
| Externe Ressourcen | ❌ → ✅ nach Umbau | Alle lokal nach Maßnahmen |

**Nach Umsetzung aller Maßnahmen:** Die Anwendung lädt keine externen Ressourcen zur Laufzeit. Alle Assets werden von der eigenen Domain ausgeliefert. Die einzige Datenverarbeitung erfolgt durch Cloudflare als Auftragsverarbeiter (DPA vorhanden). Es werden keine Cookies gesetzt. Die Anwendung ist DSGVO-konform.
