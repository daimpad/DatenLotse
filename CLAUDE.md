# CLAUDE.md – DatenLotse

Dieses Dokument beschreibt Architektur, Konventionen und wichtige Implementierungsdetails für AI-gestützte Entwicklung. DatenLotse ist das Schwester-Tool zu **DatenGraf** und spiegelt dessen Philosophie, Stack und Konventionen.

---

## Projektübersicht

**DatenLotse** ist eine browserbasierte Single-Page-Application, die von der kartierten Datenökosystem-Map (DatenGraf) in die operative Open-Data-Umsetzung führt: Dateninventar nach DCAT-AP.de, Risiko-Clearing, client-seitige Pseudonymisierung. Kein Backend, kein Build-Prozess, kein Framework — nur HTML, CSS und Vanilla JS.

- **Einstiegspunkt:** `index.html`
- **Styles:** `css/styles.css` (Layout & Komponenten) + `css/tokens.css` (Design-Tokens)
- **Logik:** `js/app.js` (eine einzige Datei)
- **Aktuelle Version:** `v5` (Script-Tag: `<script src="js/app.js?v=5">`)

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

`file://` funktioniert nicht, da `FileReader`/`fetch()` (Import, später Beispieldaten) nötig sind. Kein `npm install`, kein Bundler, keine Build-Pipeline zur Laufzeit.

**Cache-Busting:** Nach Änderungen an `app.js` die Versionsnummer im Script-Tag in `index.html` erhöhen und die sichtbare `v{N}` im Footer mitziehen:
```html
<script src="js/app.js?v=2"></script>
```

**Fonts/Icons:** Lokal unter `assets/fonts/` — **kein CDN**. Inter (woff2, 400/500/600/700) + Font Awesome 6.7.2 (solid/regular/brands). Ziel sind **null externe Laufzeit-Aufrufe**.

---

## Architektur

### Datenfluss

```
CSV-Import (DatenGraf-CSV)
        ↓
   grafRows (Array<Row>)        ← parseCSV / splitCSVLine (identisch zu DatenGraf)
        ↓
   deriveInventory(grafRows)
        ↓
   inventory (Array<Dataset>)   ← DCAT-AP.de-Kandidaten
        ↓
   renderInventory()            ← editierbare Karten, Live-Vollständigkeit, Export
```

Spätere Module hängen sich an `inventory` an: Modul 3a (Clearing) bewertet dieselben Einträge und speichert das Ergebnis am Eintrag (`d.clearing = {...}`); Modul 3b (Pseudonymisierung) arbeitet auf freiem Text; Modul 1 (Governance) leitet Datendomänen aus `inventory` ab.

### View-Umschaltung

Beim Import wird Hero + Modul-Grid ausgeblendet und die Arbeits-View eingeblendet. Sobald mehr als zwei Views existieren, eine gemeinsame `showView(id)`-Helper-Funktion einführen statt überall `style.display` zu setzen.

### Globaler State

| Variable | Typ | Bedeutung |
|---|---|---|
| `grafRows` | `Row[]` | Importierte DatenGraf-Zeilen (Row-Schema) |
| `inventory` | `Dataset[]` | Abgeleitete DCAT-AP.de-Inventar-Einträge |
| `clearing` *(geplant)* | am Eintrag | `d.clearing = { ampel, begruendung, empfehlung }` (Modul 3a) |
| `governance` *(geplant)* | `Object` | RACI-/Reifegrad-Ergebnisse (Modul 1) |

### LocalStorage-Schlüssel

Präfix `datenlotse_` (analog DatenGrafs `datengraf_`). Immer try/catch um JSON-Parsing. *(Persistenz folgt in Schritt 4.)*

| Schlüssel | Inhalt |
|---|---|
| `datenlotse_inventory` | Inventar inkl. Clearing-Ergebnisse (JSON) |

---

## DatenGraf Row-Schema (`GRAF_COLUMNS`)

```
Quelle, QuelleAbteilung, QuelleBereich, QuelleOrganisation, QuelleRolle,
Beziehung, Ziel, Datentyp, Häufigkeit, Format, Schutzbedarf, Erfassungsart,
Anmerkungen, Ansprechpartner
```

Das Schema ist die **öffentliche API** zwischen DatenGraf und DatenLotse und 1:1 übernommen. **Bei Schemaänderungen in DatenGraf muss `GRAF_COLUMNS` hier mitgezogen werden.** Das Schema kennt **kein** explizites „personenbezogen"- oder „Art.-9"-Feld; das nächstliegende Risikosignal ist **`Schutzbedarf`** (DSGVO-relevant / Intern / Öffentlich) – relevant für Modul 3a.

### DCAT-AP.de-Mapping (Auszug)

| DatenGraf-Feld | DCAT-AP.de |
|---|---|
| `Datentyp` / `Quelle` | `dct:title` |
| `QuelleOrganisation` | `dct:publisher` → `foaf:Organization` |
| `Ansprechpartner` | `dcat:contactPoint` |
| `Quelle` | `dcatde:sourceSystem` |
| `Format` | `dcat:distribution` → `dct:format` |
| `Schutzbedarf` | `dct:accessRights` (PUBLIC/RESTRICTED/NON_PUBLIC) |
| `Häufigkeit` | `dct:accrualPeriodicity` |

`deriveInventory()` dedupliziert über den Schlüssel `Quelle__Datentyp`; Mehrfach-Ziele werden in `_recipients` (Set) gesammelt. Pro Dataset entsteht ein Objekt mit:

```
{ id, title, description, publisher, contactPoint, sourceSystem, format,
  accrualPeriodicity, license, accessRights, _grafSchutzbedarf, _recipients }
```

`id` wird via `slug()` aus `QuelleOrganisation`-`Datentyp` gebildet. Vorbelegung der kontrollierten Vokabulare: `mapSchutzToAccess()` → `accessRights`, `mapHaeufigkeit()` → `accrualPeriodicity`. `license` bleibt leer (Nacherfassung). UI-Dropdowns kommen aus den Konstanten `FREQ_OPTIONS` / `LICENSE_OPTIONS` / `ACCESS_OPTIONS`.

### Vollständigkeit (Ampel)

`completeness(d)` misst den Anteil gefüllter `REQUIRED_FIELDS` (`title, publisher, contactPoint, accrualPeriodicity, license, accessRights`) als 0–100 %. Schwellen für die Badge-Farbe: ≥ 80 % `--ampel-gruen`, ≥ 50 % `--ampel-gelb`, sonst `--ampel-rot`. Eingaben werden per `input`-Listener live in `inventory[idx]` zurückgeschrieben und Badge + Durchschnitt sofort aktualisiert.

---

## Wichtige Konventionen

### XSS-Schutz

**Immer `esc(value)` für Import-/User-Daten in `innerHTML` verwenden:**
```js
card.innerHTML = `<div>${esc(d.title)}</div>`;
```

**Niemals `esc()` in `textContent`** — `textContent` ist bereits sicher; `esc()` würde HTML-Entities literal anzeigen. `esc()` escaped `&`, `<`, `>`, `"`.

### CSS-Tokens

Immer Design-Tokens verwenden, nie hardcodierte Farben:
```css
color: var(--c-accent);   /* #420093 */
background: var(--glass-bg);
box-shadow: var(--shadow-md);
border-radius: var(--radius);   /* 10px */
```

**Token-Herkunft:** DatenGraf hält seine Tokens im `:root` von `css/styles.css` – es gibt dort **keine** separate `tokens.css`. DatenLotse hat die Tokens nach `css/tokens.css` extrahiert. Die **Kern-Token-Werte** (`--c-accent`, `--radius`, `--shadow-sm/md/lg`, `--glass-bg`, Body-Gradient) sind mit DatenGrafs `:root` abzugleichen. **DatenLotse-spezifisch** sind `--ampel-rot` / `--ampel-gelb` / `--ampel-gruen` (in DatenGraf nicht vorhanden).

### Hidden-Pattern

Kein globales `.hidden` — jede Komponente definiert ihre eigene Regel:
```css
.meine-komponente.hidden { display: none; }
```

### Falsy-sicheres CSV

Beim Serialisieren `v == null || v === ''` prüfen (nicht `!v`), damit der String `"0"` korrekt exportiert wird.

### Cache-Busting & Versionierung

Nach Änderungen an `app.js` `?v=N` im Script-Tag **und** die `v{N}` im Footer erhöhen. Die Version steigt um **+1 pro gemergtem PR** (nicht pro Edit). DatenLotse startet bei **v1**.

---

## Feature-Übersicht

| Feature | Schlüsselfunktionen | Schlüssel-IDs |
|---|---|---|
| CSV-Import (DatenGraf-Brücke) | `importGrafCSV(text)`, `pickAndImport()`, `parseCSV(text)`, `splitCSVLine(line)` | `#btn-import-graf`, `#btn-import-again` |
| Inventar-Ableitung | `deriveInventory(rows)`, `mapSchutzToAccess(schutz)`, `mapHaeufigkeit(h)`, `slug(s)` | — |
| Inventar-Rendering | `renderInventory()`, `completeness(d)`, `optionsHTML(opts, sel)` | `#inventory-view`, `#inventory-body`, `.inv-card`, `[data-field]` |
| DCAT-Export | `buildDcatJSON()`, `buildInventoryCSV()`, `csvCell(v)`, `downloadBlob()` | `#btn-export-json`, `#btn-export-csv` |
| Clearing-Ampel | `runClearing()` *(geplant, Modul 3a)* | — |
| Pseudonymisierung | `pseudonymize(text)` *(geplant, Modul 3b)* | — |
| Governance/RACI | `buildRaci()` *(geplant, Modul 1)* | — |

---

## Bekannte Fallstricke

- **DatenGraf-Schema-Sync:** `GRAF_COLUMNS` ist 1:1 aus DatenGraf übernommen – bei dortigen Schemaänderungen hier mitziehen.
- **`file://`-Protokoll:** `FileReader`/`fetch()` schlagen fehl → App nicht korrekt nutzbar. Immer über `python3 -m http.server` testen.
- **Cache-Busting:** Nach `app.js`-Änderung unbedingt `?v=N` + Footer erhöhen, sonst liefert GitHub Pages den alten Stand.
- **Squash-Merge-Konflikte:** Jeder PR-Merge erzeugt Squash-Commits; beim nächsten Branch-Merge entstehen scheinbare Konflikte. Auflösung analog DatenGraf: `git fetch origin main && git merge origin/main` → Konflikte → `git checkout --ours index.html js/app.js css/styles.css` → `git add` → `git commit` → `git push`.
- **Kein `tokens.css` in DatenGraf:** Sync-Abgleich erfolgt gegen DatenGrafs `:root` in `css/styles.css`, nicht gegen eine (nicht existierende) `tokens.css`.
- **Keine externe Runtime-Library:** Anders als DatenGraf (Cytoscape/LZ-String per CDN) hat DatenLotse **null** externe Laufzeit-Abhängigkeiten. Insbesondere **keine** ML-/NER-/WASM-Bibliothek für die Pseudonymisierung – reines Regex-Pack.

---

## Erledigte Entwicklungsschritte (Chronologie)

| Version | Was wurde gemacht |
|---|---|
| v1 | Projekt-Skelett Modul 2: DatenGraf-CSV-Import (`importGrafCSV` → `parseCSV`/`deriveInventory`) + Design-Tokens & Layout im DatenGraf-Stil (Import endete zunächst mit einer `alert()`-Zusammenfassung). |
| v2 | Repo-Fundament & Deployment-Parität: Fonts lokal (Inter + Font Awesome, kein CDN), Favicon-Set + `site.webmanifest`, vollständige `<head>`-Meta (OG/Twitter/Favicons/theme-color), `social-preview.svg`/`robots.txt`/`sitemap.xml`, `LICENSE`/`SECURITY.md`/`CONTRIBUTING.md`/`.gitignore`/`package.json`, README & CLAUDE.md ausgebaut, GitHub-Pages-Workflow (`static.yml`) |
| — | **Modul-2-MVP** (Direkt-Commit auf `main`, zwischen v2 und v3): `renderInventory()` mit editierbaren Karten, Live-Vollständigkeits-% (Ampel) und Dropdowns für Zyklus/Lizenz/Zugriffsrechte; DCAT-AP.de-Export `buildDcatJSON()` + flacher CSV-Export `buildInventoryCSV()` via `downloadBlob()`; Import mit Schema-Validierung auf Spalte „Quelle". |
| v3 | Marken-Assets: neues `logo.svg` (DatenLotse-Mark, lila/gold) + aktualisiertes Favicon-Set; Logo auf der Seite platziert wie bei DatenGraf – `.topbar-logo` (36px neben dem Brand-Text) und `.hero-logo` (rund, mit Border + Schatten, zentriert über der Headline; mobil 110px) |
| v4 | Doku-Sync: CLAUDE.md & README an den real gebauten Modul-2-MVP angeglichen (Feature-Tabelle, Dataset-Shape, kontrollierte Vokabulare, Vollständigkeits-Ampel, Chronologie) |
| v5 | Footer identisch zu DatenGraf: `.footer-links`-Nav (Impressum · Datenschutz · Kontakt · GitHub-Icon) mit `space-between`-Layout, rechtsbündige `.footer-version` (subtil) statt einfachem `<span>`; Markup & CSS gespiegelt, Text/Links auf DatenLotse angepasst |
