# Athlete Wiki – Usermanagement-Konzept

> **Status:** Entwurf
> **Datum:** 2026-02-12
> **Betrifft:** Einfuehrung eines Rollensystems mit vier Benutzertypen

---

## 1. Ausgangslage

Athlete Wiki ist eine rein statische Website, gehostet auf **Netlify**. Der Code liegt auf GitHub, jeder Push auf `main` loest automatisch einen Netlify-Build und ein Deployment aus. Es existiert kein Backend, keine Datenbank, keine Authentifizierung. Alle Inhalte sind oeffentlich zugaenglich. Der Build-Prozess (`build.mjs`) generiert aus HTML-Artikelseiten eine durchsuchbare Startseite.

**Aktueller Deployment-Flow:**

```
GitHub (main) → Netlify Auto-Build (npm run build) → Netlify CDN (public/)
```

Die Einfuehrung eines Usermanagements erfordert einen Architekturwechsel: von einer rein statischen Seite zu einer Anwendung mit Authentifizierung, Autorisierung und geschuetzten Inhalten. Netlify bietet dafuer serverlose Funktionen (Netlify Functions) und Edge Functions, die den bestehenden Flow erweitern, ohne einen separaten Server zu erfordern.

---

## 2. Rollenmodell

### 2.1 Uebersicht

| Rolle | Beschreibung | Zugang |
|-------|-------------|--------|
| **Admin** | Systemverwalter, volle Kontrolle | Login (E-Mail + Passwort) |
| **Coach** | Erstellt und verwaltet Inhalte, betreut Clients | Login (E-Mail + Passwort) |
| **Client** | Konsumiert Inhalte, eingeschraenkter Zugang | Login (E-Mail + Passwort) oder Einladungslink |
| **Anonym** | Oeffentlicher Besucher ohne Login | Kein Login erforderlich |

### 2.2 Rollendetails

#### Admin

- Verwaltet alle Benutzerkonten (anlegen, bearbeiten, deaktivieren, loeschen)
- Weist Rollen zu und entzieht sie
- Sieht alle Inhalte (oeffentlich, client-only, coach-only, entwuerfe)
- Zugriff auf Systemeinstellungen und Audit-Log
- Kann Coaches und Clients einladen
- Sieht Nutzungsstatistiken (welche Artikel wie oft aufgerufen)
- Maximal 2-3 Admins pro Installation

#### Coach

- Sieht alle veroeffentlichten Inhalte (oeffentlich + client-only + coach-only)
- Kann Artikel als Entwurf erstellen und zur Veroeffentlichung vorschlagen
- Verwaltet eigene Clients (einladen, deaktivieren)
- Kann Artikel bestimmten Clients oder Client-Gruppen zuweisen
- Sieht eigene Nutzungsstatistiken (welche Clients welche Artikel gelesen haben)
- Kein Zugriff auf Admin-Panel oder andere Coach-Accounts

#### Client

- Sieht alle oeffentlichen Inhalte
- Sieht zusaetzlich Inhalte mit Sichtbarkeit `client` (exklusive Fachartikel)
- Sieht persoenlich zugewiesene Inhalte des eigenen Coaches
- Kann Artikel als Favorit markieren (Lesezeichen)
- Kann Lesefortschritt sehen (gelesen/ungelesen)
- Kein Zugriff auf Entwuerfe, Coach-only-Inhalte oder Verwaltung

#### Anonym

- Sieht ausschliesslich oeffentliche Inhalte (Sichtbarkeit `public`)
- Vollzugriff auf Suche und Kategoriefilter fuer oeffentliche Artikel
- Sieht Impressum und Datenschutz
- Kann sich registrieren oder Login-Seite aufrufen
- Kein Zugriff auf geschuetzte Inhalte, Favoriten oder Fortschritt

### 2.3 Berechtigungsmatrix

| Aktion | Admin | Coach | Client | Anonym |
|--------|:-----:|:-----:|:------:|:------:|
| Oeffentliche Artikel lesen | x | x | x | x |
| Client-Artikel lesen | x | x | x | - |
| Coach-Artikel lesen | x | x | - | - |
| Entwuerfe sehen | x | x (eigene) | - | - |
| Artikel erstellen/bearbeiten | x | x | - | - |
| Artikel veroeffentlichen | x | - | - | - |
| Artikel zuweisen | x | x (eigene Clients) | - | - |
| Favoriten/Lesezeichen | x | x | x | - |
| Lesefortschritt tracken | x | x | x | - |
| Benutzer verwalten | x | - (eigene Clients) | - | - |
| Rollen zuweisen | x | - | - | - |
| Systemeinstellungen | x | - | - | - |
| Audit-Log einsehen | x | - | - | - |
| Nutzungsstatistiken | x | x (eigene Clients) | - | - |

---

## 3. Inhaltssichtbarkeit

### 3.1 Neues Meta-Feld: `visibility`

Das bestehende Meta-Block-Format in Artikelseiten wird um ein Feld `visibility` erweitert:

```html
<!--
title: Kreatin – Das wichtigste Supplement
date: 2026-02-10
tags: supplement, kraft, regeneration
category: ernaehrung
status: published
visibility: public
slug: kreatin
summary: Alles ueber Kreatin-Supplementierung.
keywords: creatine, kreatin monohydrat
-->
```

### 3.2 Sichtbarkeitsstufen

| Wert | Sichtbar fuer | Beschreibung |
|------|--------------|-------------|
| `public` | Alle (inkl. Anonym) | Standard-Sichtbarkeit, SEO-indexiert |
| `client` | Admin, Coach, Client | Exklusive Fachartikel fuer eingeloggte Clients |
| `coach` | Admin, Coach | Internes Wissen nur fuer Coaches |
| `private` | Admin | Systemnotizen, nur fuer Admins |

**Fallback:** Fehlt das Feld `visibility`, wird `public` angenommen (Abwaertskompatibilitaet).

### 3.3 Auswirkungen auf den Build

- Der Build generiert weiterhin **alle** Artikelseiten als statische HTML-Dateien
- Die Datei `index.json` erhaelt ein neues Feld `visibility` pro Artikel
- Die Startseite filtert Artikel clientseitig anhand der aktuellen Benutzerrolle
- Geschuetzte Artikelseiten werden durch eine Netlify Edge Function abgesichert (siehe Abschnitt 5)
- `sitemap.xml` enthaelt nur `public`-Artikel (SEO)
- Entwuerfe (`status: draft`) bleiben unabhaengig von `visibility` verborgen

---

## 4. Authentifizierung

### 4.1 Methode: JWT-basierte Authentifizierung

JSON Web Tokens (JWT) sind die bevorzugte Methode, da sie zustandslos sind und gut zur bestehenden statischen Architektur passen.

**Ablauf:**

```
1. Benutzer oeffnet Login-Seite
2. Eingabe von E-Mail + Passwort
3. Request an /.netlify/functions/auth-login (Netlify Function)
4. Server prueft Credentials gegen Datenbank (Turso)
5. Server erzeugt JWT (signiert mit Secret)
6. JWT wird als HttpOnly-Cookie gesetzt
7. Browser sendet Cookie automatisch bei jedem Request
8. Netlify Edge Function prueft JWT und entscheidet ueber Zugriff
```

### 4.2 JWT-Struktur

```json
{
  "sub": "user-uuid",
  "email": "coach@example.com",
  "role": "coach",
  "name": "Max Mustermann",
  "iat": 1739000000,
  "exp": 1739086400
}
```

- **Algorithmus:** HS256 (HMAC-SHA256)
- **Laufzeit:** 24 Stunden
- **Refresh:** Automatisch bei Aktivitaet (Sliding Window), neuer Token nach 12h
- **Secret:** Gespeichert als Netlify Environment Variable (`JWT_SECRET`)

### 4.3 Cookie-Konfiguration

```
Set-Cookie: aw_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

- `HttpOnly`: Kein JavaScript-Zugriff (XSS-Schutz)
- `Secure`: Nur ueber HTTPS
- `SameSite=Strict`: Kein Cross-Site-Versand (CSRF-Schutz)
- Kein `Domain`-Attribut (gilt nur fuer exakte Domain)

### 4.4 Login-Seite

Neue Template-Datei `templates/login.html`:

- E-Mail- und Passwort-Eingabe
- "Passwort vergessen"-Link
- Fehlermeldung bei falschen Credentials
- Weiterleitung nach erfolgreichem Login (zur vorherigen Seite oder Startseite)
- Gleiches Design-System wie Startseite (Dark Theme, Outfit/DM Serif Display)
- Barrierefreiheit: Labels, Fokus-Management, Fehler-Live-Region

### 4.5 Logout

- POST-Request an `/.netlify/functions/auth-logout`
- Cookie wird mit `Max-Age=0` ueberschrieben
- Weiterleitung zur Startseite

### 4.6 Passwort-Zuruecksetzen

- Benutzer gibt E-Mail-Adresse ein
- Server erzeugt zeitlich begrenzten Reset-Token (1 Stunde)
- E-Mail mit Reset-Link wird versendet (siehe Abschnitt 6.3)
- Reset-Seite ermoeglicht neues Passwort

---

## 5. Autorisierung und Zugriffskontrolle

### 5.1 Netlify Edge Functions als Middleware

Netlify Edge Functions laufen auf dem Deno-basierten Edge-Netzwerk und werden **vor** der Auslieferung statischer Dateien ausgefuehrt. Sie eignen sich ideal als Auth-Middleware, da sie jeden Request abfangen und pruefen koennen, bevor die statische HTML-Datei den Browser erreicht.

**Datei:** `netlify/edge-functions/auth-guard.js`

**Konfiguration in `netlify.toml`:**

```toml
[[edge_functions]]
  path = "/pages/*"
  function = "auth-guard"
```

**Entscheidungslogik:**

```
Request auf /pages/*.html
  │
  ├─ Cookie `aw_token` vorhanden?
  │    ├─ Ja → JWT validieren (Signatur + Ablauf)
  │    │    ├─ Gueltig → Rolle extrahieren
  │    │    │    ├─ Artikel-Visibility aus index.json pruefen
  │    │    │    ├─ Rolle >= Visibility? → Seite ausliefern
  │    │    │    └─ Rolle < Visibility? → 403 (Kein Zugriff)
  │    │    └─ Ungueltig/abgelaufen → Cookie loeschen, weiter als Anonym
  │    └─ Nein → Benutzer ist Anonym
  │         ├─ Artikel public? → Seite ausliefern
  │         └─ Artikel nicht public? → 302 Redirect zu /login.html?redirect=...
  │
  Andere Pfade (/, /impressum.html, /datenschutz.html, etc.)
  └─ Immer ausliefern (kein Auth-Check)
```

**Warum Edge Functions statt Netlify Functions?**
- Edge Functions laufen **vor** der statischen Dateiauslieferung (koennen blockieren)
- Netlify Functions sind nur fuer API-Endpunkte (POST/GET auf eigene Pfade)
- Edge Functions haben <1ms Latenz am Edge, fuegen kaum Verzoegerung hinzu
- Perfekt fuer Zugriffskontrolle auf statische Dateien

### 5.2 Visibility-Mapping fuer Autorisierung

```javascript
const ROLE_HIERARCHY = {
  admin: 4,
  coach: 3,
  client: 2,
  anonym: 1
};

const VISIBILITY_REQUIRED_ROLE = {
  public: 'anonym',
  client: 'client',
  coach: 'coach',
  private: 'admin'
};
```

Zugriff erlaubt wenn: `ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[VISIBILITY_REQUIRED_ROLE[articleVisibility]]`

### 5.3 Clientseitige Filterung (Startseite)

Die Startseite erhaelt die Benutzerrolle ueber einen API-Call an `/.netlify/functions/auth-me`. Der Suchindex wird clientseitig gefiltert:

```javascript
// Pseudocode
const userRole = await fetchUserRole(); // 'admin' | 'coach' | 'client' | 'anonym'
const visibleArticles = articles.filter(a => canAccess(userRole, a.visibility));
const fuse = new Fuse(visibleArticles, fuseOptions);
```

**Wichtig:** Die clientseitige Filterung ist nur UX – die Edge Function ist die eigentliche Sicherheitsschicht.

### 5.4 Angepasste Navbar

Die Navbar wird rollenabhaengig erweitert:

| Element | Admin | Coach | Client | Anonym |
|---------|:-----:|:-----:|:------:|:------:|
| Startseite-Link | x | x | x | x |
| Impressum | x | x | x | x |
| Datenschutz | x | x | x | x |
| Login-Button | - | - | - | x |
| Benutzername | x | x | x | - |
| Logout-Button | x | x | x | - |
| Admin-Panel | x | - | - | - |
| Meine Clients | - | x | - | - |
| Favoriten | x | x | x | - |

---

## 6. Technische Infrastruktur

### 6.1 Uebersicht der Architektur

```
┌─────────────────────────────────────────────────────────┐
│                      Netlify                             │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │ Edge Function │   │  Netlify     │   │  Statische  │ │
│  │ (Auth-Guard)  │──▶│  Functions   │   │  Dateien    │ │
│  │              │   │  (API)       │   │  (public/)  │ │
│  └──────────────┘   └──────┬───────┘   └─────────────┘ │
│                             │                            │
└─────────────────────────────│────────────────────────────┘
                              │
                     ┌────────▼────────┐
                     │     Turso       │
                     │  (SQLite DB)    │
                     │  Gehostet       │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │     Resend      │
                     │  (E-Mail API)   │
                     └─────────────────┘
```

**Deployment-Flow (erweitert):**

```
GitHub (main)
  → Netlify Auto-Build (npm run build)
  → Netlify CDN (public/)
  → Netlify Functions (netlify/functions/) automatisch deployed
  → Netlify Edge Functions (netlify/edge-functions/) automatisch deployed
```

### 6.2 Netlify Functions (API-Backend)

Netlify Functions sind serverlose Funktionen (AWS Lambda), die als API-Endpunkte dienen. Sie liegen im Verzeichnis `netlify/functions/` und werden automatisch beim Deploy bereitgestellt.

**API-Endpunkte:**

```
POST   /.netlify/functions/auth-login           Login, JWT erzeugen
POST   /.netlify/functions/auth-logout          Logout, Cookie loeschen
GET    /.netlify/functions/auth-me              Aktuelle Benutzerdaten + Rolle
POST   /.netlify/functions/auth-reset-request   Passwort-Reset anfordern
POST   /.netlify/functions/auth-reset           Passwort zuruecksetzen

GET    /.netlify/functions/users                Benutzerliste (Admin)
POST   /.netlify/functions/users                Benutzer anlegen (Admin)
GET    /.netlify/functions/users?id=<uuid>      Einzelnen Benutzer abrufen (Admin)
PUT    /.netlify/functions/users                Benutzer bearbeiten (Admin)
DELETE /.netlify/functions/users?id=<uuid>      Benutzer deaktivieren (Admin)

POST   /.netlify/functions/invite               Einladung versenden (Admin, Coach)
POST   /.netlify/functions/invite-accept        Einladung annehmen

GET    /.netlify/functions/bookmarks            Favoriten abrufen (eingeloggt)
POST   /.netlify/functions/bookmarks            Favorit hinzufuegen (eingeloggt)
DELETE /.netlify/functions/bookmarks?slug=<s>   Favorit entfernen (eingeloggt)

GET    /.netlify/functions/progress             Lesefortschritt abrufen (eingeloggt)
POST   /.netlify/functions/progress             Artikel als gelesen markieren (eingeloggt)

GET    /.netlify/functions/stats                Nutzungsstatistiken (Admin, Coach)
```

**Vereinfachte Pfade via Redirects in `netlify.toml`:**

```toml
# API-Pfade umleiten fuer sauberere URLs
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

Damit werden die Endpunkte unter `/api/auth-login`, `/api/users`, etc. erreichbar.

**Verzeichnisstruktur:**

```
netlify/
├── edge-functions/
│   └── auth-guard.js              Zugriffskontrolle auf /pages/*
├── functions/
│   ├── auth-login.mjs
│   ├── auth-logout.mjs
│   ├── auth-me.mjs
│   ├── auth-reset-request.mjs
│   ├── auth-reset.mjs
│   ├── users.mjs
│   ├── invite.mjs
│   ├── invite-accept.mjs
│   ├── bookmarks.mjs
│   ├── progress.mjs
│   ├── stats.mjs
│   └── lib/
│       ├── auth.mjs               JWT-Hilfsfunktionen
│       ├── db.mjs                 Turso-Datenbankzugriff
│       ├── validate.mjs           Eingabevalidierung
│       └── email.mjs              E-Mail-Versand (Resend)
```

### 6.3 Datenbank: Turso (gehostetes SQLite)

Da Netlify keine eigene Datenbank mitbringt, wird **Turso** als externe Datenbank verwendet. Turso ist ein gehosteter SQLite-Service, der ueber HTTP erreichbar ist und sich ideal fuer serverlose Umgebungen eignet.

**Warum Turso?**

| Kriterium | Turso | Supabase (Alternative) |
|-----------|-------|----------------------|
| Datenbank-Typ | SQLite (libSQL) | PostgreSQL |
| Free Tier | 9 GB, 500 DBs, 25 Mio. Reads/Monat | 500 MB, 2 Projekte |
| Latenz | Niedrig (Edge-Replicas moeglich) | Mittel (zentraler Server) |
| Komplexitaet | Gering (einfaches SQL) | Mittel (Postgres-Features) |
| JS-Client | `@libsql/client` | `@supabase/supabase-js` |
| Kompatibilitaet | Serverless-optimiert | Serverless-kompatibel |

**Empfehlung:** Turso – bleibt bei SQLite (wie im Projekt ueblich simpel), grosszuegiger Free Tier, einfache Integration.

**Verbindung aus Netlify Functions:**

```javascript
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL,       // z.B. libsql://athlete-wiki-user.turso.io
  authToken: process.env.TURSO_DB_TOKEN
});

const result = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
```

**Schema:**

```sql
-- Benutzer
CREATE TABLE users (
  id          TEXT PRIMARY KEY,        -- UUID
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,           -- bcrypt Hash
  role        TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'client')),
  coach_id    TEXT REFERENCES users(id),  -- NULL fuer Admin/Coach, Coach-UUID fuer Client
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Einladungen
CREATE TABLE invitations (
  id          TEXT PRIMARY KEY,        -- UUID
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('coach', 'client')),
  invited_by  TEXT NOT NULL REFERENCES users(id),
  token       TEXT UNIQUE NOT NULL,    -- Einladungs-Token
  expires_at  TEXT NOT NULL,
  accepted_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Passwort-Reset-Tokens
CREATE TABLE password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token       TEXT UNIQUE NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Favoriten / Lesezeichen
CREATE TABLE bookmarks (
  user_id     TEXT NOT NULL REFERENCES users(id),
  slug        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug)
);

-- Lesefortschritt
CREATE TABLE reading_progress (
  user_id     TEXT NOT NULL REFERENCES users(id),
  slug        TEXT NOT NULL,
  read_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug)
);

-- Artikelzuweisungen (Coach → Client)
CREATE TABLE assignments (
  id          TEXT PRIMARY KEY,
  coach_id    TEXT NOT NULL REFERENCES users(id),
  client_id   TEXT NOT NULL REFERENCES users(id),
  slug        TEXT NOT NULL,
  note        TEXT,                    -- Optionale Nachricht des Coaches
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (coach_id, client_id, slug)
);

-- Audit-Log
CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,           -- z.B. 'login', 'user.create', 'role.change'
  target_type TEXT,                    -- z.B. 'user', 'article'
  target_id   TEXT,
  details     TEXT,                    -- JSON mit zusaetzlichen Infos
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indizes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_coach ON users(coach_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_progress_user ON reading_progress(user_id);
CREATE INDEX idx_assignments_client ON assignments(client_id);
CREATE INDEX idx_assignments_coach ON assignments(coach_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
```

### 6.4 E-Mail-Versand

Fuer Einladungen und Passwort-Resets wird ein E-Mail-Service benoetigt.

**Optionen:**

| Service | Free Tier | Integration |
|---------|-----------|------------|
| Resend | 3.000 E-Mails/Monat | REST API, einfach |
| Mailgun | 1.000 E-Mails/Monat | REST API |
| SendGrid | 100 E-Mails/Tag | REST API |

**Empfehlung:** Resend – einfache API, grosszuegiges Free Tier, gute Zustellraten, einfache Anbindung aus Netlify Functions.

**E-Mail-Typen:**

1. **Einladung:** "Du wurdest zu Athlete Wiki eingeladen" mit Registrierungslink
2. **Passwort-Reset:** "Setze dein Passwort zurueck" mit zeitlich begrenztem Link
3. **Willkommen:** Nach erfolgreicher Registrierung (optional)

### 6.5 Passwort-Sicherheit

- **Hashing:** bcrypt (via `bcryptjs` – reine JavaScript-Implementierung, Lambda-kompatibel)
- **Salt Rounds:** 12
- **Mindestlaenge:** 8 Zeichen
- **Anforderungen:** Mindestens ein Grossbuchstabe, ein Kleinbuchstabe, eine Ziffer
- **Rate-Limiting:** Maximal 5 fehlgeschlagene Login-Versuche pro 15 Minuten pro IP (via Turso-Counter oder Upstash Redis)
- **Brute-Force-Schutz:** Exponentielles Backoff nach fehlgeschlagenen Versuchen

---

## 7. Aenderungen am Build-Prozess

### 7.1 Neues Meta-Feld

`build.mjs` wird erweitert um:

- Parsen des `visibility`-Feldes (Fallback: `public`)
- Validierung: Nur `public`, `client`, `coach`, `private` erlaubt
- Aufnahme in `index.json`

### 7.2 Erweitertes index.json

```json
[
  {
    "title": "Kreatin – Das wichtigste Supplement",
    "slug": "kreatin",
    "date": "2026-02-10",
    "tags": ["supplement", "kraft", "regeneration"],
    "category": "ernaehrung",
    "visibility": "public",
    "summary": "Alles ueber Kreatin-Supplementierung.",
    "content": "..."
  },
  {
    "title": "Periodisierung fuer Fortgeschrittene",
    "slug": "periodisierung",
    "date": "2026-02-11",
    "tags": ["training", "planung"],
    "category": "training",
    "visibility": "coach",
    "summary": "Interne Trainingsplanung fuer Coaches.",
    "content": "..."
  }
]
```

### 7.3 Sitemap

Nur Artikel mit `visibility: public` werden in `sitemap.xml` aufgenommen. Geschuetzte Inhalte sollen nicht von Suchmaschinen indexiert werden.

### 7.4 Navbar-Anpassung

Der Build injiziert weiterhin die Navbar, aber mit einem Platzhalter fuer den Login/Logout-Bereich. Die tatsaechliche Anzeige (Login-Button vs. Benutzername) wird clientseitig per JavaScript gerendert, basierend auf dem Ergebnis von `/api/auth-me`.

### 7.5 Neue Templates

| Datei | Zweck |
|-------|-------|
| `templates/login.html` | Login-Formular |
| `templates/register.html` | Registrierung via Einladungslink |
| `templates/reset-password.html` | Passwort-Zuruecksetzen-Formular |
| `templates/admin.html` | Admin-Dashboard (Benutzerverwaltung) |
| `templates/coach-dashboard.html` | Coach-Dashboard (Clients, Zuweisungen) |
| `templates/profil.html` | Eigenes Profil bearbeiten |

---

## 8. Netlify-Konfiguration

### 8.1 netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "public"
  functions = "netlify/functions"

# Sauberere API-Pfade
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Login-Seite fuer 401-Antworten der Edge Function
[[redirects]]
  from = "/login"
  to = "/login.html"
  status = 200

# SPA-artige Routen fuer Dashboard-Seiten
[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200

[[redirects]]
  from = "/profil"
  to = "/profil.html"
  status = 200

# Security-Headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.turso.io"

# Cache-Control fuer statische Assets
[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Kein Cache fuer API und HTML
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

# Edge Functions
[[edge_functions]]
  path = "/pages/*"
  function = "auth-guard"
```

### 8.2 Environment Variables (Netlify Dashboard)

Diese Variablen werden im Netlify Dashboard unter Site Settings → Environment Variables konfiguriert:

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `JWT_SECRET` | Geheimer Schluessel fuer JWT-Signatur (min. 32 Zeichen) | `a7f3b2...` (zufaellig generiert) |
| `TURSO_DB_URL` | Turso-Datenbank-URL | `libsql://athlete-wiki-user.turso.io` |
| `TURSO_DB_TOKEN` | Turso-Auth-Token | `eyJhbG...` |
| `EMAIL_API_KEY` | Resend API-Key | `re_abc123...` |
| `EMAIL_FROM` | Absender-Adresse fuer E-Mails | `noreply@athlete-wiki.de` |
| `SITE_URL` | Oeffentliche URL der Seite | `https://athlete-wiki.netlify.app` |
| `LEGAL_NAME` | Name fuer Impressum | `Max Mustermann` |
| `LEGAL_ADDRESS` | Adresse fuer Impressum | `Musterstr. 1, 12345 Berlin` |
| `LEGAL_EMAIL` | E-Mail fuer Impressum | `kontakt@example.com` |

---

## 9. DSGVO-Auswirkungen

### 9.1 Neue Anforderungen

Mit der Einfuehrung von Benutzerkonten werden **personenbezogene Daten** verarbeitet. Das hat folgende Konsequenzen:

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Personenbezogene Daten | Keine | E-Mail, Name, Passwort-Hash, IP (Audit) |
| Rechtsgrundlage | Nicht noetig | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| Cookie-Banner | Nicht noetig | Nicht noetig (technisch notwendiger Cookie) |
| Datenschutzerklaerung | Minimal | Erweitert um Kontodaten, Speicherdauer, Rechte |
| Auskunftsrecht | Nicht relevant | Muss implementiert werden |
| Loeschrecht | Nicht relevant | Account-Loeschung muss moeglich sein |
| Auftragsverarbeitung | Netlify-DPA | Netlify-DPA + Turso-DPA + Resend-DPA |
| Verarbeitungsverzeichnis | Optional | Empfohlen |

### 9.2 Auftragsverarbeiter

| Dienst | Zweck | Standort | DPA |
|--------|-------|----------|-----|
| **Netlify** | Hosting, Functions, Edge Functions | USA (EU-Routing moeglich) | Netlify DPA verfuegbar |
| **Turso** | Datenbank (Benutzerkonten) | Region waehlbar (EU moeglich) | Turso DPA verfuegbar |
| **Resend** | E-Mail-Versand | USA | Resend DPA verfuegbar |

**Empfehlung:** Turso-Datenbank in EU-Region erstellen (`turso db create athlete-wiki --location fra` fuer Frankfurt).

### 9.3 Datenschutzerklaerung – Ergaenzungen

Folgende Abschnitte muessen ergaenzt werden:

1. **Benutzerkonto:** Welche Daten werden gespeichert (E-Mail, Name), Zweck (Zugang zu geschuetzten Inhalten), Rechtsgrundlage (Vertragserfuellung), Speicherdauer (bis Kontoloesung + 30 Tage)
2. **Cookies:** Technisch notwendiger Auth-Cookie, keine Einwilligung erforderlich
3. **E-Mail-Versand:** Einladungen und Passwort-Reset via Resend (Auftragsverarbeiter, USA)
4. **Audit-Logging:** IP-Adresse und Zeitstempel bei Login-Vorgaengen (berechtigtes Interesse, Sicherheit)
5. **Auftragsverarbeiter:** Netlify (Hosting), Turso (Datenbank), Resend (E-Mail)
6. **Betroffenenrechte:** Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenportabilitaet

### 9.4 Technische DSGVO-Massnahmen

- Auth-Cookie ist `HttpOnly` + `Secure` + `SameSite=Strict` (kein Tracking)
- Passwoerter werden nur als Hash gespeichert (bcrypt, nicht umkehrbar)
- Audit-Log IP-Adressen werden nach 90 Tagen anonymisiert
- Account-Loesch-Funktion entfernt alle personenbezogenen Daten
- Datenexport-Funktion fuer Auskunftsrecht (JSON-Download)
- Keine Weitergabe an Dritte ausser den genannten Auftragsverarbeitern

---

## 10. Sicherheitsmassnahmen

### 10.1 Authentifizierung

- Passwoerter mit bcrypt gehasht (12 Salt Rounds)
- JWT mit HMAC-SHA256 signiert
- Token-Laufzeit: 24 Stunden mit Sliding Refresh
- HttpOnly-Cookie verhindert XSS-Token-Diebstahl
- SameSite=Strict verhindert CSRF-Angriffe
- Rate-Limiting fuer Login-Endpunkt (5 Versuche / 15 Min.)

### 10.2 Autorisierung

- Netlify Edge Function prueft jeden Request auf /pages/*
- Clientseitige Filterung ist nur UX, nie Sicherheitsbarriere
- Rollenhierarchie wird serverseitig durchgesetzt
- Coaches sehen nur eigene Clients (Isolation)
- Kein direkter Datenbankzugriff vom Client

### 10.3 Allgemein

- Alle Eingaben serverseitig validiert und sanitized
- SQL-Injection-Schutz durch Parameterized Queries (`@libsql/client`)
- XSS-Schutz: `Content-Security-Policy`-Header via `netlify.toml`
- HTTPS-Only (Netlify erzwingt dies automatisch)
- Security-Headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- Audit-Log fuer sicherheitsrelevante Aktionen

---

## 11. Neue Dependencies

### 11.1 Produktions-Dependencies

| Paket | Zweck | Groesse |
|-------|-------|---------|
| `bcryptjs` | Passwort-Hashing (Lambda-kompatibel) | ~30 KB |
| `jose` | JWT-Erzeugung und -Validierung (Edge-kompatibel) | ~45 KB |
| `@libsql/client` | Turso-Datenbank-Client | ~50 KB |
| `uuid` | UUID-Generierung fuer Datensaetze | ~5 KB |
| `resend` | E-Mail-Versand-Client | ~15 KB |

### 11.2 Dev-Dependencies

| Paket | Zweck |
|-------|-------|
| `netlify-cli` | Lokale Entwicklung mit Netlify Functions + Edge Functions |

**Lokale Entwicklung:**

```bash
npx netlify dev
```

Startet einen lokalen Server, der Netlify Functions, Edge Functions und den statischen Build simuliert. Ersetzt `npm run dev` waehrend der Usermanagement-Entwicklung.

### 11.3 Externe Services

| Service | Zweck | Kosten (Free Tier) |
|---------|-------|-------------------|
| Netlify Functions | API-Endpunkte | 125.000 Requests/Monat, 100h Laufzeit |
| Netlify Edge Functions | Auth-Middleware | 3 Mio. Aufrufe/Monat |
| Turso | SQLite-Datenbank | 9 GB, 25 Mio. Reads/Monat |
| Resend | E-Mail-Versand | 3.000 E-Mails/Monat |

---

## 12. Migrationsplan

### 12.1 Abwaertskompatibilitaet

- Bestehende Artikel ohne `visibility`-Feld bleiben `public` (Fallback)
- Die Seite funktioniert weiterhin ohne Login fuer anonyme Besucher
- Der Build-Prozess bleibt fuer rein statische Nutzung kompatibel
- Bestehende URLs aendern sich nicht
- Der GitHub → Netlify Deployment-Flow bleibt unveraendert

### 12.2 Phasenplan

#### Phase A – Grundlagen (Wochen 1-2)

1. Turso-Datenbank erstellen (EU-Region) und Schema deployen
2. `netlify.toml` erstellen (Redirects, Headers, Edge Functions)
3. Edge Function `auth-guard.js` implementieren (JWT-Pruefung auf /pages/*)
4. Netlify Functions: `auth-login`, `auth-logout`, `auth-me` implementieren
5. Login-Template erstellen
6. `build.mjs` um `visibility`-Feld erweitern
7. `index.json` um `visibility` erweitern
8. Ersten Admin-Account via Turso CLI anlegen
9. Tests fuer Auth-Funktionen schreiben
10. Environment Variables im Netlify Dashboard konfigurieren

#### Phase B – Benutzerverwaltung (Wochen 3-4)

11. Admin-Dashboard (Benutzerliste, Anlegen, Bearbeiten, Deaktivieren)
12. Einladungssystem (E-Mail mit Registrierungslink via Resend)
13. Registrierungs-Template
14. Passwort-Zuruecksetzen-Flow (`auth-reset-request`, `auth-reset`)
15. Profil-Seite (Name/Passwort aendern)
16. Navbar-Anpassung (Login/Logout/Benutzername)
17. Datenschutzerklaerung aktualisieren

#### Phase C – Coach-Features (Wochen 5-6)

18. Coach-Dashboard (eigene Clients verwalten)
19. Artikelzuweisung (Coach weist Client einen Artikel zu)
20. Lesefortschritt-Tracking
21. Favoriten/Lesezeichen-System
22. Coach-Statistiken (welche Clients haben was gelesen)

#### Phase D – Haertung (Woche 7)

23. Rate-Limiting implementieren (via Turso-Counter oder Upstash Redis)
24. Audit-Logging
25. Account-Loesch-Funktion (DSGVO)
26. Datenexport-Funktion (DSGVO)
27. Sicherheits-Review und Penetrationstest
28. End-to-End-Tests fuer alle Flows

---

## 13. Projektstruktur (nach Implementierung)

```
athlete-wiki/
├── pages/                              Artikelseiten (unveraendert)
├── templates/
│   ├── startseite.html                 Erweitert: Rollenbasierte Filterung
│   ├── 404.html                        Unveraendert
│   ├── impressum.html                  Unveraendert
│   ├── datenschutz.html                Erweitert: Kontodaten-Abschnitt
│   ├── login.html                      NEU: Login-Formular
│   ├── register.html                   NEU: Registrierung via Einladung
│   ├── reset-password.html             NEU: Passwort zuruecksetzen
│   ├── admin.html                      NEU: Admin-Dashboard
│   ├── coach-dashboard.html            NEU: Coach-Dashboard
│   └── profil.html                     NEU: Eigenes Profil
├── netlify/                            NEU: Netlify Serverless
│   ├── edge-functions/
│   │   └── auth-guard.js              Auth-Middleware fuer /pages/*
│   └── functions/
│       ├── auth-login.mjs
│       ├── auth-logout.mjs
│       ├── auth-me.mjs
│       ├── auth-reset-request.mjs
│       ├── auth-reset.mjs
│       ├── users.mjs
│       ├── invite.mjs
│       ├── invite-accept.mjs
│       ├── bookmarks.mjs
│       ├── progress.mjs
│       ├── stats.mjs
│       └── lib/
│           ├── auth.mjs               JWT-Hilfsfunktionen
│           ├── db.mjs                 Turso-Datenbankzugriff
│           ├── validate.mjs           Eingabevalidierung
│           └── email.mjs              E-Mail-Versand (Resend)
├── static/                             Unveraendert
├── tests/
│   ├── ...                             Bestehende Tests (unveraendert)
│   ├── auth.test.mjs                   NEU: Auth-Unit-Tests
│   ├── middleware.test.mjs             NEU: Edge-Function-Tests
│   ├── users-api.test.mjs             NEU: User-API-Tests
│   └── visibility.test.mjs            NEU: Visibility-Filterung
├── migrations/                         NEU: Turso-Datenbank-Migrationen
│   └── 0001_initial.sql
├── build.mjs                           Erweitert: visibility-Feld
├── site.config.mjs                     Erweitert: Auth-Konfiguration
├── netlify.toml                        NEU: Netlify-Konfiguration
├── package.json                        Erweitert: neue Dependencies + Scripts
└── ...
```

---

## 14. Konfiguration (site.config.mjs – erweitert)

```javascript
export default {
  siteUrl: process.env.SITE_URL || 'https://athlete-wiki.netlify.app',
  siteName: 'Athlete Wiki',
  injectNavbar: true,
  injectOgTags: true,
  buildDrafts: process.env.BUILD_DRAFTS === 'true',
  legal: {
    name: process.env.LEGAL_NAME || '[Name eintragen]',
    address: process.env.LEGAL_ADDRESS || '[Adresse eintragen]',
    email: process.env.LEGAL_EMAIL || '[E-Mail eintragen]',
  },
  // NEU: Auth-Konfiguration (nur fuer Build-relevante Einstellungen)
  auth: {
    enabled: true,
    passwordMinLength: 8,
  }
};
```

**Hinweis:** Sensible Konfiguration (JWT_SECRET, DB-Credentials, API-Keys) liegt ausschliesslich in Netlify Environment Variables, nicht in `site.config.mjs`.

---

## 15. Offene Entscheidungen

| Nr. | Frage | Optionen | Empfehlung |
|-----|-------|----------|------------|
| 1 | Sollen Clients sich selbst registrieren koennen oder nur via Einladung? | Selbstregistrierung / Nur Einladung | Nur Einladung (kontrollierter Zugang) |
| 2 | Soll es Coach-Gruppen geben (mehrere Coaches, geteilte Clients)? | Ja / Nein | Nein (spaeter erweiterbar) |
| 3 | Sollen Coaches Artikel direkt bearbeiten oder nur vorschlagen? | Direkt / Vorschlaege | Vorschlaege (Admin behaelt Kontrolle) |
| 4 | Wie soll der initiale Admin angelegt werden? | CLI-Tool / Turso Console / Seed-Script | Seed-Script (`npm run seed:admin`) |
| 5 | Soll es eine "Angemeldet bleiben"-Option geben? | Ja (30 Tage) / Nein (24h fix) | Ja, optionaler erweiterter Token |
| 6 | Welcher E-Mail-Provider? | Resend / Mailgun / SendGrid | Resend (einfach, grosszuegiges Free Tier) |
| 7 | Brauchen Clients eine eigene Dashboard-Seite? | Ja / Nein (nur Startseite mit Favoriten) | Nein in Phase 1 (Startseite reicht) |
| 8 | Soll Rate-Limiting ueber Turso oder Upstash Redis laufen? | Turso (einfacher) / Upstash Redis (schneller) | Turso in Phase 1, Redis bei Bedarf |

---

## 16. Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Netlify Functions Free-Tier-Limits | Niedrig | Hoch | Monitoring, ggf. Pro-Plan ($19/Monat) |
| Turso Free-Tier-Limits | Niedrig | Hoch | Monitoring, ggf. Scaler-Plan ($29/Monat) |
| JWT-Secret kompromittiert | Niedrig | Kritisch | Secret-Rotation, Netlify Env Vars |
| Brute-Force auf Login | Mittel | Mittel | Rate-Limiting, Account-Lockout |
| DSGVO-Verstoss durch Audit-Log | Niedrig | Hoch | IP-Anonymisierung nach 90 Tagen |
| Turso-Ausfall | Niedrig | Hoch | Turso hat 99.9% SLA, Retry-Logik |
| Komplexitaet ueberfordert Wartung | Mittel | Mittel | Schrittweise Einfuehrung, gute Tests |
| E-Mail-Zustellung scheitert | Niedrig | Mittel | Resend-Monitoring, manuelle Einladung als Fallback |
| Netlify Edge Functions Einschraenkungen | Niedrig | Mittel | Deno-API-Subset beachten, testen mit `netlify dev` |

---

## 17. Voraussetzungen vor Implementierung

Bevor mit der Implementierung begonnen werden kann, muessen die folgenden Punkte geklaert und vorbereitet sein.

### 17.1 Infrastruktur-Zugaenge

| Was | Warum | Aktion |
|-----|-------|--------|
| **Netlify Site-Name / URL** | Fuer `SITE_URL`, Redirects, CORS-Konfiguration | Aktuellen Netlify-URL ermitteln (z.B. `xyz.netlify.app`) |
| **Bestehendes `netlify.toml`?** | Muss erweitert oder neu erstellt werden | Pruefen ob bereits ein `netlify.toml` im Projekt existiert |
| **Turso-Account** | Datenbank fuer Benutzerkonten | Account bei turso.tech erstellen, DB in EU-Region anlegen (`turso db create athlete-wiki --location fra`), URL + Auth-Token generieren |
| **Resend-Account** (oder gewaehlte Alternative) | E-Mail-Versand fuer Einladungen und Passwort-Reset | Account bei resend.com erstellen, API-Key generieren |
| **Eigene Domain mit E-Mail-Verifizierung** | Absenderadresse fuer E-Mails (`EMAIL_FROM`) | Resend benoetigt eine verifizierte Domain, damit E-Mails nicht im Spam landen |
| **Netlify Environment Variables** | Alle Secrets muessen vor dem ersten Deploy konfiguriert sein | Im Netlify Dashboard unter Site Settings die Variablen aus Abschnitt 8.2 eintragen |

### 17.2 Geschaeftslogik-Entscheidungen

| Frage | Warum relevant | Antwort |
|-------|----------------|---------|
| Welche bestehenden Artikel sollen `public` / `client` / `coach` werden? | Bestimmt ob `visibility` in bestehende Artikel eingetragen werden muss und welche Inhalte ab Livegang geschuetzt sind | _Offen_ |
| Wie viele Coaches und Clients werden initial erwartet? | Beeinflusst ob Batch-Einladungen oder Einzel-Einladungen reichen | _Offen_ |
| Soll der Coach Artikel per UI erstellen koennen (WYSIWYG/Editor) oder weiterhin als HTML-Datei per Git? | UI-Editor waere ein eigenstaendiges grosses Feature, das den Scope erheblich erweitert | _Offen_ |
| Sollen Clients per E-Mail benachrichtigt werden wenn ihnen ein Artikel zugewiesen wird? | Beeinflusst E-Mail-Templates, -Logik und Resend-Volumen | _Offen_ |
| Gibt es mehrere Coaches oder ist nur ein einzelner Coach/Admin vorgesehen? | Bei nur einem Coach kann das Einladungssystem und die Client-Isolation deutlich vereinfacht werden | _Offen_ |

### 17.3 Design-Vorgaben fuer neue Templates

Fuer die 6 neuen Seiten muss entschieden werden, ob das bestehende Design-System (Dark Theme, Outfit/DM Serif Display, Teal-Accent `#38d9a9`) uebernommen wird oder spezifische Wuensche bestehen.

| Template | Zu klaerende Fragen |
|----------|-------------------|
| `login.html` | Einfaches Formular im bestehenden Stil oder spezielles Layout? |
| `register.html` | Welche Felder: nur Name + Passwort (E-Mail kommt aus Einladung) oder zusaetzliche Angaben? |
| `admin.html` | Einfache Tabelle mit allen Usern oder auch Statistiken/Grafiken? |
| `coach-dashboard.html` | Was soll der Coach auf einen Blick sehen? Client-Liste, zugewiesene Artikel, Lesefortschritt? |
| `profil.html` | Nur Name + Passwort aenderbar oder auch Avatar, Bio, etc.? |
| `reset-password.html` | Standard-Formular (neues Passwort + Bestaetigung) oder weitere Elemente? |

### 17.4 E-Mail-Inhalte

Fuer die automatisierten E-Mails muessen Texte und Absenderangaben definiert werden:

| E-Mail-Typ | Zu definieren |
|-------------|--------------|
| **Einladung** | Betreff, Anrede, Text, Absendername (z.B. "Athlete Wiki Team") |
| **Passwort-Reset** | Betreff, Text, Gueltigkeitsdauer-Hinweis |
| **Willkommen** (optional) | Ob gewuenscht, und wenn ja: Inhalt |
| **Artikelzuweisung** (optional) | Ob Clients per E-Mail ueber neue Zuweisungen informiert werden sollen |

### 17.5 Checkliste vor Implementierungsstart

- [ ] Alle 8 offenen Entscheidungen aus Abschnitt 15 beantwortet
- [ ] Geschaeftslogik-Fragen aus Abschnitt 17.2 geklaert
- [ ] Turso-Account erstellt, Datenbank angelegt, Credentials notiert
- [ ] Resend-Account erstellt (oder Alternative gewaehlt), API-Key generiert
- [ ] Domain bei Resend verifiziert (fuer E-Mail-Versand)
- [ ] Netlify Site-URL bekannt
- [ ] Geprueft ob `netlify.toml` bereits existiert
- [ ] Design-Entscheidung fuer neue Templates getroffen (Abschnitt 17.3)
- [ ] E-Mail-Texte definiert oder als "Standard" freigegeben (Abschnitt 17.4)
- [ ] `visibility`-Werte fuer bestehende Artikel festgelegt

---

## 18. Zusammenfassung

Die Einfuehrung des Usermanagements transformiert Athlete Wiki von einer rein statischen Website zu einer Anwendung mit rollenbasiertem Zugriff. Der Kern der Architektur bleibt erhalten: Artikel sind weiterhin eigenstaendige HTML-Dateien, der Build-Prozess generiert weiterhin statische Ausgaben, der Code liegt auf GitHub und wird automatisch von Netlify deployed.

**Kernprinzipien bleiben gewahrt:**
- Kein externes Framework, kein CMS
- DSGVO-Konformitaet (jetzt mit erweiterten Anforderungen)
- Barrierefreiheit
- Statische Artikel als Grundlage
- GitHub → Netlify Deployment-Flow

**Neu hinzu kommt:**
- Vier Benutzerrollen (Admin, Coach, Client, Anonym)
- Sichtbarkeitsstufen fuer Artikel (`public`, `client`, `coach`, `private`)
- JWT-basierte Authentifizierung mit HttpOnly-Cookies
- Netlify Edge Functions als Auth-Middleware
- Netlify Functions als API-Backend
- Turso (gehostetes SQLite) als Datenbank
- Resend als E-Mail-Provider
- Einladungssystem, Favoriten, Lesefortschritt, Artikelzuweisung
- Erweiterte DSGVO-Compliance (Auskunftsrecht, Loeschrecht, Auftragsverarbeiter-Dokumentation)
