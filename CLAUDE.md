# CLAUDE.md – DatenLotse

Dieses Dokument beschreibt Architektur, Konventionen und wichtige Implementierungsdetails für AI-gestützte Entwicklung. DatenLotse ist das Schwester-Tool zu **DatenGraf** und spiegelt dessen Philosophie, Stack und Konventionen.

---

## Projektübersicht

**DatenLotse** ist eine browserbasierte Single-Page-Application, die von der kartierten Datenökosystem-Map (DatenGraf) in die operative Open-Data-Umsetzung führt: Dateninventar nach DCAT-AP.de, Risiko-Clearing, client-seitige Pseudonymisierung. Kein Backend, kein Build-Prozess, kein Framework — nur HTML, CSS und Vanilla JS.

- **Einstiegspunkt:** `index.html`
- **Styles:** `css/styles.css` (Layout & Komponenten) + `css/tokens.css` (Design-Tokens)
- **Logik:** `js/app.js` (eine einzige Datei)
- **Aktuelle Version:** `v19` (Script-Tag: `<script src="js/app.js?v=19">`)

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

Fünf Views: `home` (Hero + Akkordeon + Modul-Grid), `kompass` (Daten-Kompass), `inventory` (Inventar/Clearing-Tabs), `governance` (RACI + Reifegrad) und `pseudo` (Textbereinigung). Zentral über `showView(name)` umgeschaltet (blendet die Home-Elemente per `style.display` aus, toggelt `.hidden` an `#kompass-view`/`#inventory-view`/`#governance-view`/`#pseudo-view`, blendet den Phase-4&5-Beratungsblock `.consult-cta` außerhalb von `home` aus, scrollt nach oben). `navTo(target)` kapselt die Navigations-Einstiege (Topbar-Brand → home, Hero-CTA + Topbar-„Loslegen" → kompass, Sidebar-Links `data-view`, Modul-Buttons; „Dateninventar" öffnet ohne Daten das Erklär-Modal, `kompass`/`governance`/`pseudo` jederzeit).

**Phasen-Wegweiser:** Jede Unterseite trägt im Header eine `.phase-badge` (Phase 1 Governance, Phase 2 Inventar, Phase 3 Risiko & Pseudonymisierung; Kompass = „Überblick") und – außer Phase 1/Kompass – einen `.phase-back`-Zurück-Link. Am Seitenende steht statt des globalen Phase-4&5-Blocks ein kontextueller `.view-next`-Block mit einer oder mehreren `.next-card`s (genau die sinnvollen Folgeschritte). `goTo(target)` (Wrapper um `navTo`) bedient alle `[data-go]`-Elemente: Standard-Targets gehen an `navTo`, `clearing` öffnet die Inventar-View mit aktivem Clearing-Tab (bzw. das Erklär-Modal ohne Daten), `phase45` öffnet das Phase-4&5-Modal.

### Globaler State

| Variable | Typ | Bedeutung |
|---|---|---|
| `grafRows` | `Row[]` | Importierte DatenGraf-Zeilen (Row-Schema) |
| `inventory` | `Dataset[]` | Abgeleitete DCAT-AP.de-Inventar-Einträge |
| `clearing` | am Eintrag | `d.clearing = { ampel, begruendung, empfehlung }` + `d._clearing = { pb, art9, recht, anon }` (Antworten, Modul 3a) |
| `governanceAnswers` | `Object` | Fragebogen-Antworten Modul 1 (`{ id: 'ja'\|'teilweise'\|'nein' }`); Domänen + RACI werden live aus `inventory` abgeleitet |

### LocalStorage-Schlüssel

Präfix `datenlotse_` (analog DatenGrafs `datengraf_`). Immer try/catch um JSON-Parsing. `saveState()` schreibt nach jeder Mutation (Import, Inventar-Edit, Clearing-Antwort, Governance-Antwort), `loadState()` stellt beim Laden wieder her, `clearState()` (Sidebar „Gespeicherte Daten löschen") leert alles.

| Schlüssel | Inhalt |
|---|---|
| `datenlotse_inventory` | Inventar inkl. Clearing-Antworten/-Ergebnis (`d._clearing`, `d.clearing`) als JSON |
| `datenlotse_governance` | Governance-Fragebogen-Antworten (`governanceAnswers`) als JSON |
| `datenlotse_kompass` | Daten-Kompass-Status je Checklisten-Item (`kompassState`, `"dim.item" → status`) als JSON |

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

### Suche, Filter & Sortierung (Inventar)

`renderInventory()` setzt View/Tab und ruft `renderInventoryBody()`; nur Letzteres rendert die Kartenliste neu und wird bei jeder Sucheingabe/Filter-/Sortieränderung erneut aufgerufen (die `.inv-controls` selbst werden **einmalig** gebunden, nicht neu gerendert → kein Fokusverlust im Suchfeld). Zustand in `invFilter = { q, schutz, ampel, sort }`. `filteredInventory()` projiziert `inventory` auf `{ d, idx }`-Paare (der **echte** Index bleibt erhalten), filtert über Volltext (`title/publisher/sourceSystem/description`), `Schutzbedarf` (Regex, `oeffentlich` matcht ö/oe) und Clearing-Ampel (`ensureAllClearing()` davor) und sortiert nach Titel oder Vollständigkeit. Da der `idx` durch den Filter mitgeführt wird, schreiben die `input`-Listener weiterhin korrekt nach `inventory[idx]` — Editieren über einer gefilterten Teilmenge trifft immer den richtigen Datensatz. `invMetaText()` zeigt „X von Y Datensätzen · Ø Z %"; leeres Ergebnis ⇒ `.inv-empty`-Hinweis.

### Clearing-Ampel (Modul 3a)

Zweiter Tab in der Inventar-View (`#tab-clearing` → `#clearing-panel`), operiert auf denselben `inventory`-Einträgen. Pro Datensatz ein kompakter Fragebogen; das Ergebnis ist ein **deterministischer** Entscheidungsbaum (kein ML) in `evaluateClearing(a)`. Antworten liegen unter `d._clearing = { pb, art9, recht, anon }`, das Ergebnis unter `d.clearing = { ampel, begruendung, empfehlung }`.

- **Vorbelegung:** `initClearing(d)` leitet Frage 1 (`pb`) aus `Schutzbedarf` ab: `DSGVO` ⇒ `ja`, `Öffentlich` ⇒ `nein`, sonst `unklar`. Frage 2–4 sind Nutzer-Eingaben.
- **Regeln (geordnet):** `pb=nein` ⇒ **Grün**; `pb=unklar` ⇒ **Gelb** (nie automatisch Grün); `art9=ja` ⇒ **Rot**; `pb=ja` + `recht=nein` ⇒ **Rot**; `pb=ja` + `recht=ja` + `anon=ja` ⇒ **Gelb** (Brücke zu Modul 3b), `anon=nein` ⇒ **Rot**. Greift keine Regel eindeutig ⇒ **Gelb, manuelle Prüfung**.
- **Progressive Anzeige:** Folgefragen erscheinen nur, wenn relevant; `renderClearing()` rendert bei jeder Antwort neu und setzt entfallende Folgeantworten zurück.
- **Export:** `buildInventoryCSV()` ruft `ensureAllClearing()` und ergänzt die Spalten `clearingAmpel` + `clearingEmpfehlung`. `accessRights` im DCAT-JSON bleibt nutzergesteuert (keine stille Überschreibung).

### Pseudonymisierung (Modul 3b)

Eigene View „Textbereinigung" (`#pseudo-view`). **Reines Regex-Pack, kein ML/NER** (harte Sperre). `pseudonymize(text)` arbeitet in drei Schritten:

1. **`collectSpans`** wendet `PSEUDO_PATTERNS` (in Prioritätsreihenfolge: IBAN, Sozialversicherungsnummer, Steuer-ID *kontextgetriggert*, E-Mail, Telefon, Kfz-Kennzeichen, Aktenzeichen/Geschäftszeichen, Geburtsdatum *im Kontext*, Straße+Hausnr., PLZ+Ort, Name *anrede-getriggert*) an und sammelt `{start, end, type, value}`. Bei Capture-Gruppen (Name, Geburtsdatum, Steuer-ID) wird via `d`-Flag nur der Kernwert erfasst (Anrede/„geb."/Schlüsselwort bleiben stehen). Stark strukturierte/kontextgetriggerte Muster stehen **vor** dem greedy Telefon-Muster, damit sie es bei Überlappung gewinnen.
2. **`selectSpans`** sortiert nach Position, dann längstem Span, dann Priorität, und verwirft Überlappungen (Longest/First-match-wins) → **keine Doppel-Ersetzung**.
3. Aufbau in **einem** Durchlauf: pro Entitätstyp ein Zähler + `Map(original → platzhalter)` → gleicher Wert ⇒ **immer derselbe** Platzhalter (`[PERSON_1]`, `[ADRESSE_1]`, `[ORT_1]`, `[AZ_1]`, `[IBAN_1]`, `[EMAIL_1]`, `[TELEFON_1]`, `[GEBURTSDATUM_1]`, `[SVNR_1]`, `[STEUERID_1]`, `[KFZ_1]`). Rückgabe: `{ text, html (hervorgehoben), mapping, count }`.

**Deterministisch & strukturerhaltend:** identischer Input ⇒ identischer Output; Platzhalter enthalten keine Kommas/Quotes/Zeilenumbrüche → CSV-Struktur bleibt erhalten. **Freistehende Datumsangaben** (ohne „geb."/„geboren am"/„Geburtsdatum"/„Geburtstag") bleiben unangetastet. Grenzen-Liste ist im UI sichtbar; manuelle Nachkontrolle bleibt Pflicht. `PSEUDO_DEMO` liefert einen Beispieltext. **Mapping-Export:** `buildPseudoMappingCSV(mapping)` erzeugt eine CSV (`Platzhalter,Typ,Original`) für die Reidentifizierung/Dokumentation; Button erscheint im Mapping-Kopf, sobald Treffer vorliegen.

> **Zukunft (NICHT gebaut):** optionales client-seitiges NER-Modell (Transformers.js/WASM) ist reiner Roadmap-Text – kein Code, auch nicht opt-in.

### Governance & Rollen (Modul 1)

Eigene View `#governance-view`. **Datendomänen** werden aus dem Inventar abgeleitet (`deriveDomains()`: Schlüssel `sourceSystem`, Fallback `publisher`; pro Domäne `count` + `dsgvo`-Flag aus `Schutzbedarf`/Clearing). Ohne Import zeigt die View einen Empty-State mit Import-Button.

- **Reifegrad:** `GOV_QUESTIONS` (8 gewichtete Fragen, Σ Gewichte = 100). `reifegrad()` summiert `weight × factor` (Ja = 1, Teilweise = 0,5, Nein = 0) → 0–100. Ampel: ≥ 80 grün/„Reif", ≥ 50 gelb/„Im Aufbau", sonst rot/„Lückenhaft". Live-Balken je Kategorie.
- **RACI-Matrix:** festes, transparentes Template (`raciFor()`) – Owner = **A**, Steward = **R**, Fachbereich/IT = **C**, DSB = **C** bei DSGVO-Domänen sonst **I**. `roleGap()` markiert Rollen, deren zuständige Fragebogen-Frage nicht mit „Ja" beantwortet wurde (Owner/Steward/DSB).
- **Export:** `buildRaciCSV()` (Domänen × Rollen + Reifegrad-Zeile) und `printGovReport()` (eigenständiges HTML im Druckfenster → PDF, inline-styled).

### Daten-Kompass

Eigene View `#kompass-view` und **Haupt-CTA** (Hero-Button + Topbar-„Loslegen"). Eine ausführliche Open-Data-Reifegrad-Checkliste nach anerkannten Modellen: **World-Bank ODRA**, **EU Open Data Maturity**, **5-Sterne-Open-Data** (Berners-Lee), **DCAT-AP.de** und **DSGVO/FAIR** (Quellen im UI unter „Methodik & Quellen").

- **Struktur:** `KOMPASS_DIMENSIONS` (7 Dimensionen × je 3–4 Items). Status je Item: `offen` / `teilweise` / `erfuellt` / `na`.
- **Score:** `kompassDimScore()` und `kompassOverall()` = Ø der Faktoren (erfüllt 1, teilweise 0,5, offen 0; `na` ausgenommen), 0–100. Ampel `kompassAmpel()`: ≥ 80 „Fortgeschritten", ≥ 50 „Im Aufbau", sonst „Am Anfang".
- **Vorbelegung:** `kompassDerived()` leitet einige Items aus dem App-Stand ab (Inventar vorhanden, Ø-Vollständigkeit, Clearing gesetzt, Governance beantwortet). Nutzer-Entscheidungen (`kompassState`) haben Vorrang und werden persistiert (`datenlotse_kompass`).
- **Adaptive Empfehlungen:** unvollständige Dimensionen mit `action` zeigen einen Sprung in den passenden Baustein (`kompassAction()` → `navTo`/`openPhase3Wizard`/Phase-4&5-Modal).
- **Export:** `printKompass()`/`buildKompassReportHTML()` (Druckfenster → PDF).

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
| CSV-Import (DatenGraf-Brücke) | `importGrafCSV(text)`, `pickAndImport()`, `loadSampleData(file)`, `parseCSV(text)`, `splitCSVLine(line)` | `#btn-import-graf`, `#btn-import-again`, `[data-sample]` |
| Inventar-Ableitung | `deriveInventory(rows)`, `mapSchutzToAccess(schutz)`, `mapHaeufigkeit(h)`, `slug(s)` | — |
| Inventar-Rendering | `renderInventory()`, `renderInventoryBody()`, `completeness(d)`, `optionsHTML(opts, sel)` | `#inventory-view`, `#inventory-body`, `.inv-card`, `[data-field]` |
| Inventar Suche/Filter/Sortierung | `filteredInventory()`, `invMetaText()`, `invFilter` (State) | `.inv-controls`, `#inv-search`, `#inv-filter-schutz`, `#inv-filter-ampel`, `#inv-sort`, `.inv-empty` |
| DCAT-Export | `buildDcatJSON()`, `buildInventoryCSV()`, `csvCell(v)`, `downloadBlob()` | `#btn-export-json`, `#btn-export-csv` |
| PDF-Bericht Inventar/Clearing | `buildInventoryReportHTML()`, `printInventoryReport()` | `#btn-print-inventory` |
| Clearing-Ampel (Modul 3a) | `evaluateClearing(a)`, `renderClearing()`, `initClearing(d)`, `ensureAllClearing()`, `showInventoryTab(name)` | `#tab-clearing`, `#clearing-panel`, `#clearing-summary`, `.clear-card`, `[data-q]` |
| Pseudonymisierung (Modul 3b) | `pseudonymize(text)`, `collectSpans`, `selectSpans`, `runPseudonymize()`, `buildPseudoMappingCSV(mapping)`, `showView(name)`, `navTo(target)` | `#pseudo-view`, `#pseudo-input`, `#pseudo-output`, `#pseudo-mapping`, `#pseudo-map-csv-btn` |
| Phase-3-Wizard (Modal-Stepper) | `openPhase3Wizard()`, `renderPhase3()`, `openClearing()` | `#open-phase3-btn`, `#phase3-backdrop`, `#p3-body`, `[data-check]` |
| Governance/RACI (Modul 1) | `deriveDomains()`, `raciFor(d)`, `reifegrad()`, `renderGovernance()`, `buildRaciCSV()`, `printGovReport()` | `#governance-view`, `#gov-questions`, `#gov-matrix`, `#gov-score-badge`, `#open-gov-btn` |
| Daten-Kompass | `renderKompass()`, `kompassStatus()`, `kompassDerived()`, `kompassOverall()`, `kompassAction()`, `buildKompassReportHTML()` | `#kompass-view`, `#kompass-score`, `#kompass-dims`, `#hero-kompass-btn`, `#cta-btn` |
| Persistenz | `saveState()`, `loadState()`, `clearState()` | `datenlotse_*`, `#reset-data-btn` |
| Seitenleiste (Off-Canvas) | `openSidebar()`, `closeSidebar()` | `#app-sidebar`, `#sidebar-toggle-btn`, `#sidebar-overlay` |
| Modals (FAQ/Inventar/Phase-3/Phase-4&5) | `showModal(id, show)`, `openInventoryModal()`, `openPhase3Wizard()` (+ Backdrop-Klick, Escape, Fokus-Management; `MODALS`-Liste) | `#faq-backdrop`, `#inventory-backdrop`, `#phase3-backdrop`, `#phase45-backdrop` |

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
| v5 | Footer identisch zu DatenGraf: `.footer-links`-Nav (Impressum · Datenschutz · Kontakt · GitHub-Icon), rechtsbündige `.footer-version` (subtil) statt einfachem `<span>`; Markup & CSS gespiegelt, Text/Links auf DatenLotse angepasst |
| v6 | Homepage-Ausbau im DatenGraf-Stil: Topbar mit Hamburger (Off-Canvas-Seitenleiste, Scaffold), lila CTA „Loslegen" (Platzhalter-Modal) und FAQ-„?"-Button (FAQ-Modal); Subtitle aus der Marke entfernt, Logo größer (Topbar 44px, Hero 172px), Hero-Headline + Modul-Titel lila & größer; Akkordeon „Mehr über den DatenLotsen erfahren" mit fancy Feature-Grid vor den Modul-Karten; Modul-Karten mit Hover (Schatten + leichte Vergrößerung); Phase-4&5-Block (Beratungs-CTA) mit lila Hintergrund; Footer-Links rechtsbündig |
| v7 | Modul 3a – Risiko-Clearing: zweiter Tab in der Inventar-View; pro Datensatz ein deterministischer Rot/Gelb/Grün-Entscheidungsbaum (`evaluateClearing`) mit Schutzbedarf-Vorbelegung, progressivem Fragebogen, Begründung/Empfehlung je Eintrag und Gesamtübersicht („x grün · y gelb · z rot"); Ampel-Spalten im CSV-Export ergänzt |
| v8 | Modul 3b – Client-Side-Pseudonymisierung: eigene View „Textbereinigung" mit Regex-Pack für DE-Verwaltung (Name, Adresse, PLZ+Ort, Aktenzeichen, IBAN, E-Mail, Telefon, kontextgebundenes Geburtsdatum), strukturerhaltende & deterministische Platzhalter (Longest-match-wins, keine Doppel-Ersetzung), hervorgehobene Ausgabe + Mapping-Tabelle + Download + sichtbare Grenzen-Liste; `showView`/`navTo`-Routing (3 Views), Topbar-Brand → Start, Modul-3-Button + Sidebar-Link |
| v9 | Modul 1 – Governance & Rollen: eigene View mit 8-Fragen-Reifegrad-Check (gewichtet, 0–100, Ampel) und RACI-Matrix (Domänen aus Inventar abgeleitet, festes Rollen-Template, DSB abhängig von DSGVO-Relevanz, Lücken-Markierung aus dem Fragebogen); Export als RACI-CSV und PDF/Druck-Bericht; vierte View im `showView`-Routing |
| v10 | Schritt 4 (1/n) – Beispieldaten: `data/sample-kommune.csv` (12 Datensätze einer fiktiven Stadtverwaltung, gemischter Schutzbedarf) + `data/template.csv`; „Beispiel laden"-Buttons (`[data-sample]` → `loadSampleData()` via `fetch`) auf der Modul-2-Karte und im Governance-Empty-State – speist Inventar, Clearing & Governance zugleich |
| v11 | Schritt 4 (2/n) – LocalStorage-Persistenz: `saveState()`/`loadState()`/`clearState()` sichern Inventar (inkl. Clearing-Antworten) und Governance-Antworten unter `datenlotse_*` und stellen sie beim Laden wieder her; „Gespeicherte Daten löschen" in der Seitenleiste; `navTo('inventory')` rendert nach Reload neu |
| v12 | Schritt 4 (3/n) – PDF-Bericht für Inventar + Clearing (`buildInventoryReportHTML`/`printInventoryReport`, Druckfenster) + A11y-/SEO-Feinschliff: `<main>`-Landmark, Skip-Link, `:focus-visible`, Modal-Fokusmanagement (Fokus rein/zurück), `prefers-reduced-motion`, `robots`-Meta, `aria-label` an Titel-Feld |
| v13 | Onboarding (1/n) – Dateninventar-Erklär-Modal (`#inventory-backdrop`): Klick auf „Dateninventar starten" (Karte) bzw. Sidebar „Dateninventar" ohne Daten öffnet erst einen Erklär-Dialog (was/warum DCAT-AP.de, 5-Schritt-Ablauf, Local-First), der am Ende „Beispiel laden" + „DatenGraf-CSV importieren" anbietet |
| v14 | Onboarding (2/n) – Phase-3-Prozess-Wizard (`#phase3-backdrop`, 4-stufiger Modal-Stepper): Modul-3-Karte „Phase 3 starten" erklärt erst den Clearing→Pseudonymisierung-Prozess (Worum geht es / Ablauf / Bereitschafts-Check mit Checkboxen / Nächste Schritte) und schlägt am Ende die Tools vor – „Risiko-Clearing öffnen" und (bei personenbezogenen Freitexten hervorgehoben) „Textbereinigung öffnen"; Tools bleiben über Sidebar direkt erreichbar |
| v15 | Onboarding (3/n) – Phase-4/5-Erklär-Modal (`#phase45-backdrop`): Button „Was bedeuten Phase 4 & 5?" vor „Umsetzung besprechen" im Beratungs-Block öffnet einen Erklär-Dialog zu Pipeline (ETL/Container/CKAN) und zirkulärem Ökosystem (Feedback/Qualität) inkl. Begründung, warum Phase 4 & 5 Beratung statt generischer Software erfordern |
| v16 | Daten-Kompass (Herzstück) – eigene View + Hero-Haupt-CTA (Topbar-„Loslegen" zeigt ebenfalls darauf): ausführliche Open-Data-Reifegrad-Checkliste nach ODRA / EU Open Data Maturity / 5-Sterne / DCAT-AP.de / DSGVO·FAIR (7 Dimensionen, Quellenangaben), Status je Item mit Score & Ampel, Vorbelegung aus dem App-Stand, adaptive Sprünge in die passenden Bausteine, Persistenz (`datenlotse_kompass`) und PDF-Export; leeres „Loslegen"-Platzhalter-Modal entfernt |
| v17 | Weiterer Ausbau (1/4) – Inventar Suche, Filter & Sortierung: `renderInventory()` in `renderInventory()` + `renderInventoryBody()` aufgeteilt; `.inv-controls` (Volltextsuche + Schutzbedarf-/Clearing-Ampel-Filter + Sortierung Titel/Vollständigkeit) über `invFilter`-State und `filteredInventory()`; der echte `idx` wird durch den Filter mitgeführt, sodass Editieren über gefilterten Teilmengen weiterhin den richtigen Datensatz trifft; Live-Meta „X von Y" + Empty-State |
| v18 | Weiterer Ausbau (2/4) – Pseudonymisierung erweitert: drei neue Muster (Sozialversicherungsnummer, Steuer-ID *kontextgetriggert*, Kfz-Kennzeichen), Aktenzeichen um Geschäftszeichen/„Gz." und buchstabenhaltige Kerne erweitert, zusätzliche Geburtsdatum-Trigger („Geburtsdatum"/„Geburtstag"); Mapping-Export als CSV (`buildPseudoMappingCSV` + Button im Mapping-Kopf); Demo-Text und Grenzen-Liste aktualisiert; verifiziert auf Determinismus, Platzhalter-Konsistenz und Null-Falschtreffer auf neutralem Verwaltungstext |
| v19 | UX-/Design-Überarbeitung der Unterseiten: neuer Hero-Text (DatenLotse im Vordergrund – Datenmanagement verstehen/aufbauen/vertiefen); Unterseiten-Überschriften größer & lila inkl. lila Icons; Phasen-Wegweiser je View (`.phase-badge` + `.phase-back`-Zurück-Link) und kontextueller `.view-next`-Block mit `.next-card`s statt global immer sichtbarem Phase-4&5-Block (`goTo`/`[data-go]`-Navigation, `.consult-cta` nur noch auf `home`); Intro-/Hinweistexte als gut lesbare weiße Karten (`.inventory-hint`); Unterseiten-Aktionsbuttons bleiben weiß (kein Lila-Hover); Phase-4&5 als zwei gleich breite Container (lila „Pipeline & zirkuläres Ökosystem" mit weißem Info-Button + schwarzer „Umsetzung besprechen"-CTA-Block); Seitenleiste mit weißem Hintergrund, größeren lila Menüpunkten (Icon+Text) und Kachel-artigem Hover; „Beispiel laden" über „Dateninventar starten" |
