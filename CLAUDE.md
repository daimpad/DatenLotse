# CLAUDE.md – DatenLotse

Dieses Dokument beschreibt Architektur, Konventionen und wichtige Implementierungsdetails für AI-gestützte Entwicklung. DatenLotse ist das Schwester-Tool zu **DatenGraf** und spiegelt dessen Philosophie, Stack und Konventionen.

---

## Projektübersicht

**DatenLotse** ist eine browserbasierte Single-Page-Application, die von der kartierten Datenökosystem-Map (DatenGraf) in die operative Open-Data-Umsetzung führt: Dateninventar nach DCAT-AP.de, Risiko-Clearing, client-seitige Pseudonymisierung. Kein Backend, kein Build-Prozess, kein Framework — nur HTML, CSS und Vanilla JS.

- **Einstiegspunkt:** `index.html`
- **Styles:** `css/styles.css` (Layout & Komponenten) + `css/tokens.css` (Design-Tokens)
- **Logik:** `js/app.js` (eine einzige Datei)
- **Aktuelle Version:** `v30` (Script-Tag: `<script src="js/app.js?v=30">`)

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

`file://` funktioniert nicht, da `FileReader`/`fetch()` (Import, später Beispieldaten) nötig sind. Kein `npm install`, kein Bundler, keine Build-Pipeline zur Laufzeit.

**Cache-Busting:** Nach Änderungen an `app.js` die Versionsnummer im Script-Tag in `index.html` erhöhen und die sichtbare `v{N}` im Footer mitziehen. **Auch die CSS-Links (`css/tokens.css?v=N`, `css/styles.css?v=N`) tragen denselben `?v=N`** – bei reinen CSS-/Layout-Änderungen unbedingt mitziehen, sonst liefert GitHub Pages das alte Stylesheet:
```html
<script src="js/app.js?v=2"></script>
```

**Fonts/Icons:** Lokal unter `assets/fonts/` — **kein CDN**. Inter (woff2, 400/500/600/700) + Font Awesome 6.7.2 (solid/regular/brands). Ziel sind **null externe Laufzeit-Aufrufe**.

---

## Tests

Die App hat keinen Build-Schritt – getestet wird **die ausgelieferte App**, also genau die Dateien, die GitHub Pages statisch serviert. Playwright ist die einzige Dev-Abhängigkeit; zur Laufzeit bleibt DatenLotse abhängigkeitsfrei.

```bash
npm install                      # nur Dev: @playwright/test (exakt gepinnt)
npx playwright install chromium  # einmalig
npm test                         # 100 Tests, ~30 s
npm run test:ui                  # interaktiver Modus
```

`playwright.config.js` startet den Webserver selbst (`python3 -m http.server 8081`), es muss also nichts vorab laufen. In Umgebungen mit vorinstalliertem Browser lässt sich der Pfad über `PLAYWRIGHT_CHROMIUM_PATH` setzen. CI: `.github/workflows/tests.yml` (Push auf `main` + jeder Pull Request).

| Datei | Deckt ab |
|---|---|
| `tests/helpers.js` | `openApp()` (Dialog-Stubs via `addInitScript`, überleben `reload()`), `loadSample()`, Konsolenfehler-Sammler, `grabDownload()` |
| `tests/smoke.spec.js` | Views/Routing, Dashboard-Sichtbarkeit, genau eine `<h1>` je View, HTML-Validität der Buttons, **null externe Requests** |
| `tests/import.spec.js` | CSV-Parser (Umbruch im gequoteten Feld), Export-Round-Trip, Dedup + `_recipients`, Identifier-Kollision, Formel-Injection, Schutzbedarf→`accessRights` |
| `tests/inventory.spec.js` | Karten, Suche/Filter/Sortierung, Editieren über gefilterter Teilmenge, XSS, Tab-Umschaltung, Lizenz-Register + Wegweiser |
| `tests/clearing.spec.js` | `schutzKategorie()`, alle Pfade von `evaluateClearing()`, progressive Anzeige, Persistenz |
| `tests/pseudonymize.spec.js` | jedes Regex-Muster, Determinismus, Platzhalter-Konsistenz, Falschtreffer-Freiheit, Unicode-Indizes |
| `tests/quality.spec.js` | `validateDataset()` (Fehler vs. Warnung), Werteprüfungen, Sortierung, Sprung ins Inventar |
| `tests/governance.spec.js` | Reifegrad-Gewichtung, RACI, Kompass-Score, Wissens-Center, Vorlagen |
| `tests/export.spec.js` | DCAT-NAL-URIs, Downloads, LocalStorage, Projekt-Round-Trip + Ablehnungen |
| `tests/a11y.spec.js` | Skip-Link, Fokus-Falle, Tab-Order der Seitenleiste, ARIA-Tabs, Kontrast, Überlauf bei 360/375/390 px |

**Konvention:** Jeder Review-Befund bekommt einen Test, der die alte Fassung rot macht – die Kommentare im Test nennen die Version des Befunds (`Regression v28: …`). Bei App-Änderungen zuerst prüfen, ob ein bestehender Test die Regel absichert, statt sie doppelt zu implementieren.

**Wichtig für `page.evaluate()`:** `js/app.js` ist ein klassisches Script; `let`/`const` auf Modulebene landen **nicht** auf `window`. Im Seitenkontext deshalb den blanken Bezeichner benutzen (`inventory`, nicht `window.inventory`). Funktionsdeklarationen sind über beide Wege erreichbar.

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

Sieben Views: `home` (Hero + Akkordeon + Modul-Grid), `kompass` (Daten-Kompass), `inventory` (Inventar/Clearing/Qualität-Tabs), `governance` (RACI + Reifegrad), `pseudo` (Textbereinigung), `wissen` (Wissens- & Methodik-Center) und `vorlagen` (Vorlagen & Musterdokumente). Zentral über `showView(name)` umgeschaltet (blendet die Home-Elemente per `style.display` aus, toggelt `.hidden` an `#kompass-view`/`#inventory-view`/`#governance-view`/`#pseudo-view`/`#wissen-view`/`#vorlagen-view`, blendet den Phase-4&5-Beratungsblock `.consult-cta` außerhalb von `home` aus, scrollt nach oben). `navTo(target)` kapselt die Navigations-Einstiege (Topbar-Brand → home, Hero-CTA + Topbar-„Loslegen" → kompass, Sidebar-Links `data-view`, Modul-Buttons; „Dateninventar" öffnet ohne Daten das Erklär-Modal, `kompass`/`governance`/`pseudo`/`wissen`/`vorlagen` jederzeit).

**Status-Dashboard (Startseite):** `#dashboard` erscheint auf `home`, sobald Daten vorliegen (`hasAnyData()`), sonst bleibt es per `.hidden` ausgeblendet (Erstnutzer sehen Hero + Module). `refreshDashboard()` (in `showView('home')` und beim Laden nach `loadState()`) toggelt Sichtbarkeit und ruft `renderDashboard()`, das vier Live-Kennzahl-Karten füllt: Daten-Kompass (`kompassOverall()` % + `kompassAmpel`), Governance (`reifegrad().score` % + `reifeAmpel`, „offen" ohne Antworten), Inventar (Anzahl + Ø `completeness`), Risiko-Clearing (Ampelverteilung via `ensureAllClearing()`). Jede Karte ist ein `[data-go]`-Schnellsprung. **Wichtig:** `[data-go]` ist **delegiert** an `document` gebunden (nicht pro Element), damit dynamisch gerenderte Dashboard-Karten ebenfalls greifen.

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
| `datenlotse_tour` | `'done'`, sobald der Rundgang beendet oder der Hinweis weggeklickt wurde |
| `datenlotse_kompass_verlauf` | Festgehaltene Reifegrad-Stände (`kompassHistory`, `[{ date, score }]`) als JSON |

**Projekt-Export/-Import (.json):** `buildProjectJSON()` serialisiert den **gesamten** Arbeitsstand in einen versionierten Umschlag `{ app: 'DatenLotse', schema, version, exportedAt, data: { grafRows, inventory, governanceAnswers, kompassState } }` (inkl. `grafRows`, das im LocalStorage **nicht** liegt). `exportProject()` lädt das als Datei herunter (leerer Stand ⇒ Hinweis, kein Download). `importProject(text)` prüft Herkunft (`app === 'DatenLotse'`, `data`-Objekt), fragt bei vorhandenem Stand vor dem Überschreiben nach, füllt fehlende Teile defensiv, schreibt via `saveState()` und rendert die passende Ansicht. Einstiege in der Seitenleiste: `#project-save-btn` / `#project-load-btn` (Datei-Dialog via `pickAndImportProject()`).

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
| `Schutzbedarf` | `dct:accessRights` (NAL-URI PUBLIC/RESTRICTED/NON_PUBLIC) |
| `Häufigkeit` | `dct:accrualPeriodicity` (NAL-URI) |
| (Nacherfassung) | `dcat:keyword`, `dcat:theme` (EU-Datenthemen-URI), `dct:license` (Register-URI), `dcat:landingPage`/`dcat:accessURL` |
| (erweitert, optional) | `dct:issued`, `dct:modified`, `dct:temporal` (`dcat:startDate`/`endDate`), `dct:spatial` (`dct:Location`), `dcatde:politicalGeocodingURI` (aus `geocodingKey`), `dcatde:politicalGeocodingLevelURI` (aus `geocodingLevel`), `dcatde:contributorID` |

**`dcatDataset(d)`** serialisiert einen einzelnen Eintrag und ist die **einzige** Quelle der DCAT-Ausgabe: `buildDcatJSON()` mappt darüber, und die Live-Vorschau je Karte (`.inv-preview-json`) zeigt exakt dasselbe – sonst würde die Vorschau etwas anderes behaupten als der Export. Der `input`-Listener zieht die Vorschau live mit. Die erweiterten Felder werden **nur geschrieben, wenn gefüllt** (keine leeren URIs). `contributorID` wird als volle URI übernommen, wenn sie schon eine ist, sonst über `CONTRIBUTOR_NAL` gebildet.

`buildDcatJSON()` exportiert die kontrollierten Werte als **offizielle URIs**: `dcat:theme` → `…/authority/data-theme/<code>`, `dct:accrualPeriodicity` → `…/authority/frequency/<code>`, `dct:accessRights` → `…/authority/access-right/<code>`, `dct:license` → `LICENSE_META[id].uri`. `dcat:keyword` wird aus dem kommagetrennten `keywords`-Feld als Array serialisiert; `publisher` als `foaf:Organization` (`orgName()`).

`deriveInventory()` dedupliziert über den Schlüssel `Quelle__Datentyp`; Mehrfach-Ziele werden in `_recipients` (Set) gesammelt. Pro Dataset entsteht ein Objekt mit:

```
{ id, title, description, publisher, contactPoint, sourceSystem, format,
  keywords, theme, accrualPeriodicity, license, accessRights, landingPage,
  _grafSchutzbedarf, _recipients }
```

`id` wird via `slug()` aus `QuelleOrganisation`-`Datentyp` gebildet. Vorbelegung der kontrollierten Vokabulare: `mapSchutzToAccess()` → `accessRights`, `mapHaeufigkeit()` → `accrualPeriodicity`, `guessTheme()` → `theme` (konservative Stichwort-Heuristik über Datentyp/Bereich/Quelle; sonst leer). `license`, `keywords`, `landingPage` bleiben leer (Nacherfassung). UI-Dropdowns kommen aus `FREQ_OPTIONS` / `ACCESS_OPTIONS` / `DCAT_THEMES` bzw. `licenseSelectHTML()`.

**Editierbare DCAT-AP.de-Felder je Karte** (`renderInventoryBody()`): Titel, **Beschreibung** (`<textarea>`, Pflicht), Publisher, Ansprechpartner, **Kategorie** (`dcat:theme`, EU-Datenthemen), **Schlagwörter** (`dcat:keyword`, kommagetrennt), Aktualisierungszyklus, Zugriffsrechte, **Lizenz** (volles Register), **Info-/Zugriffs-URL** (`dcat:landingPage`/`accessURL`). Alle Änderungen (auch `<textarea>`) laufen über den einen `input`-Listener → `inventory[idx][field]`.

### RDF/Turtle-Export

`buildDcatTurtle()` serialisiert denselben Stand wie `buildDcatJSON()` als Turtle (`.ttl`, `text/turtle`) – manche Portale harvesten RDF direkt. Die Feldabdeckung ist bewusst identisch; ein Test hält beide Formate gegeneinander (jede URI aus dem JSON muss im Turtle stehen).

- **Datensatz-IRIs:** DCAT-AP.de verlangt auflösbare URIs, und welche das sind, weiß nur die veröffentlichende Stelle. Deshalb schreibt der Export **relative IRIs gegen ein `@base`** (`TTL_BASE_PLACEHOLDER`) – die Organisation ersetzt genau eine Zeile. Liegt eine `landingPage` vor, wird sie als absolute IRI bevorzugt.
- **`ttlStr(v)`** escaped `\`, `"`, `\r`, `\n`, `\t` – ohne das bricht eine mehrzeilige Beschreibung die Datei. **`ttlIri(v)`** prozent-kodiert alles, was in `<…>` unzulässig ist (Leerraum, spitze Klammern …), statt es zu entfernen. **`ttlDate(v)`** typisiert als `xsd:date`.
- Publisher, Ansprechpartner, Zeitraum, Ort und Distribution sind **Blank Nodes** (`[ a … ; … ]`) – dafür braucht es keine erfundenen IRIs.
- Präfixe in `TTL_PREFIXES`; `turtleDataset(d)` ist das Gegenstück zu `dcatDataset(d)`.

### Lizenz-Register (`LICENSE_CATALOG` / `LICENSE_META`)

Das vollständige DCAT-AP.de-Lizenz-Register (Auszug der gängigen Lizenzen) liegt in `LICENSE_CATALOG` (gruppiert: „Offene Lizenzen" / „Eingeschränkte Lizenzen"). Jede Lizenz trägt `{ id, label, open, uri, url }` – `id` = rückwärtskompatibler, **gespeicherter** Schlüssel (bestehende Werte wie `dl-de/by-2-0`, `cc-by-4.0`, `cc-zero`, `other-closed` unverändert), `uri` = offizielle `dct:license`-URI für den Export (`http://dcat-ap.de/def/licenses/…` bzw. Open-Data-Commons-URL), `open` = Open-Definition-konform (**NC/ND und geschlossen = nicht offen; Share-Alike/Copyleft = offen**). `LICENSE_META` ist die id→Metadaten-Map; `licenseIsOpen(id)` speist die Qualitätsprüfung; `licenseSelectHTML(selected)` rendert das Dropdown mit `<optgroup>`s und erhält unbekannte (legacy) Werte. `LICENSE_OPTIONS` bleibt als flache Liste ableitbar erhalten.

### Lizenz-Wegweiser (Modal)

Geführte Empfehlung einer **offenen** Lizenz über zwei Fragen (`licenseWiz = { attribution, scope }`): `recommendLicense()` bildet deterministisch ab – Namensnennung + DE ⇒ `dl-de/by-2-0`, Namensnennung + international ⇒ `cc-by-4.0`, ohne Bedingung + DE ⇒ `dl-de/zero-2-0`, ohne Bedingung + international ⇒ `cc-zero` (Schlüssel = `LICENSE_OPTIONS`-Werte). `LICENSE_INFO` liefert Label, amtlichen Link und Begründung; `renderLicenseWizard()` hebt aktive Optionen hervor und füllt Empfehlung + Aktionsbereich. Der Button „Für N Datensätze ohne Lizenz übernehmen" setzt die Lizenz auf alle Einträge mit leerem `license`, `saveState()` + Re-Render (deshalb steigt danach die `completeness`); ohne Inventar erscheint nur ein Hinweis. Einstieg: `#btn-license-wizard` in der Inventar-Kopfzeile; Modal `#license-backdrop` (in `MODALS`, Backdrop-Klick/Escape schließen). Der Wegweiser empfiehlt weiterhin die vier maximal nachnutzbaren Lizenzen; das **vollständige** Register steht im Inventar-Dropdown. UI-Hinweis (korrigiert): NC/ND gelten **nicht** als offen; Share-Alike ist offen, aber Copyleft.

### Vollständigkeit (Ampel)

`completeness(d)` misst den Anteil gefüllter `REQUIRED_FIELDS` (`title, description, publisher, contactPoint, accrualPeriodicity, license, accessRights`) als 0–100 %. Schwellen für die Badge-Farbe: ≥ 80 % `--ampel-gruen`, ≥ 50 % `--ampel-gelb`, sonst `--ampel-rot`. Eingaben werden per `input`-Listener live in `inventory[idx]` zurückgeschrieben und Badge + Durchschnitt sofort aktualisiert.

### Erweiterte DCAT-AP.de-Felder (`.inv-more`)

Pro Karte ein eingeklapptes `<details>` mit acht optionalen Feldern: `issued`, `modified`, `temporalStart`, `temporalEnd`, `spatial`, `geocodingKey`, `geocodingLevel`, `contributorID`. Sie laufen über denselben `input`-Listener wie die Pflichtfelder (also `[data-field]` → `inventory[idx][field]`) und stehen im CSV-Export als eigene Spalten.

Vokabulare/Register: `GEO_LEVELS` (Bund … Gemeinde), `GEO_REGIONAL_NAL`, `GEO_LEVEL_NAL`, `CONTRIBUTOR_NAL`; Format-Prüfer `ISO_DATE_RE` und `GEO_KEY_RE` (2/5/8/12-stelliger amtlicher Schlüssel).

**Bewusste Einordnung:** `dcatde:contributorID` ist in `DCAT_RECOMMENDED` (Warnung), nicht in `DCAT_REQUIRED`. GovData verlangt die Kennung zwar beim Harvesting, als Pflichtfeld würde sie aber jedes bestehende Inventar schlagartig auf Rot setzen. Die übrigen erweiterten Felder sind rein optional und werden nur auf **Werte** geprüft (Datumsformat, Reihenfolge von issued/modified bzw. Zeitraum, Schlüsselformat, Vokabular der Gebietsebene, Schlüssel+Ebene nur gemeinsam).

### DCAT-AP.de-Qualitätsprüfung (Publish-Ready-Check)

Dritter Tab der Inventar-View (`#tab-quality` → `#quality-panel`), operiert auf denselben `inventory`-Einträgen. `validateDataset(d)` liefert eine Liste `{ sev: 'error'|'warn', msg }`: fehlende **Pflichtfelder** (`DCAT_REQUIRED`: title, description, publisher, contactPoint, accessRights, license) sind **Fehler**, fehlende **Empfehlungsfelder** (`DCAT_RECOMMENDED`: theme, keywords, accrualPeriodicity, format, landingPage) sind **Warnungen**. Zusätzliche Werteprüfungen (Warnung/Fehler): Lizenz nicht offen (via `licenseIsOpen()`), `accessRights` außerhalb PUBLIC/RESTRICTED/NON_PUBLIC, `theme` außerhalb `DCAT_THEMES`, `accrualPeriodicity` außerhalb `FREQ_OPTIONS`, `contactPoint` ohne E-Mail, `landingPage` keine http(s)-URL, sehr kurzer Titel/Beschreibung. `qualityStatus()` mappt auf `rot` (≥1 Fehler) / `gelb` (nur Warnungen) / `gruen` (bereit). `renderQuality()` zeigt eine Ampel-Zusammenfassung + je Datensatz eine Karte (schlechteste zuerst) mit Issue-Liste und dem Button „Im Inventar bearbeiten" (`jumpToInventoryCard()`: Filter zurücksetzen, in den Inventar-Tab wechseln, Karte per `data-idx` scrollen + kurz `.inv-card--flash` hervorheben). Deterministisch, kein ML. Ergänzt die reine `completeness`-% um echte Wert-/Vokabular-Prüfungen.

### Suche, Filter & Sortierung (Inventar)

`renderInventory()` setzt View/Tab und ruft `renderInventoryBody()`; nur Letzteres rendert die Kartenliste neu und wird bei jeder Sucheingabe/Filter-/Sortieränderung erneut aufgerufen (die `.inv-controls` selbst werden **einmalig** gebunden, nicht neu gerendert → kein Fokusverlust im Suchfeld). Zustand in `invFilter = { q, schutz, ampel, sort }`. `filteredInventory()` projiziert `inventory` auf `{ d, idx }`-Paare (der **echte** Index bleibt erhalten), filtert über Volltext (`title/publisher/sourceSystem/description`), `Schutzbedarf` (Regex, `oeffentlich` matcht ö/oe) und Clearing-Ampel (`ensureAllClearing()` davor) und sortiert nach Titel oder Vollständigkeit. Da der `idx` durch den Filter mitgeführt wird, schreiben die `input`-Listener weiterhin korrekt nach `inventory[idx]` — Editieren über einer gefilterten Teilmenge trifft immer den richtigen Datensatz. `invMetaText()` zeigt „X von Y Datensätzen · Ø Z %"; leeres Ergebnis ⇒ `.inv-empty`-Hinweis.

### Massenbearbeitung (Inventar)

`invSelection` (Set) hält die **echten** Indizes in `inventory` – nicht die Position in der gefilterten Liste, sonst würde ein Filterwechsel plötzlich andere Datensätze meinen. Checkbox je Karte (`.inv-select[data-sel]`), `#inv-select-all` bezieht sich auf die **sichtbare** Teilmenge (`filteredInventory()`), `#inv-bulk` erscheint ab einer Auswahl.

`applyBulk(field, value)` setzt eines der `BULK_FIELDS` für alle Ausgewählten; das Wertfeld ist je nach Feld Freitext oder Register-Dropdown (`bulkValueControl()`). `removeSelected()` entfernt Einträge nach Rückfrage und **leert die Auswahl anschließend** – beim Filtern verschieben sich alle nachfolgenden Indizes, eine mitgeführte Auswahl zeigte danach auf falsche Datensätze.

Das Umschalten einer Checkbox rendert **nur die Leiste** neu (`renderBulkBar()`), nicht den Body – sonst ginge der Fokus verloren.

### Rückimport der bearbeiteten Inventar-CSV

`importAnyCSV(text)` ist der eine Einstieg für beide Formate: `looksLikeInventoryCSV()` (Spalten `id` + `title`) entscheidet zwischen DatenGraf-Rohdaten (`importGrafCSV`) und der eigenen, bearbeiteten Inventarliste (`importInventoryCSV`).

- **Zusammenführen statt Ersetzen:** vorhandene Einträge werden über die `id` aktualisiert. Die Clearing-Antworten (`d._clearing`) stehen **nicht** in der CSV und dürfen durch einen Rückimport nicht verloren gehen. Unbekannte ids kommen als neue Einträge dazu.
- `buildInventoryCSV()` schreibt zusätzlich die Spalte **`schutzbedarf`** (`_grafSchutzbedarf`) – ohne sie ginge beim Rückimport die Clearing-Vorbelegung verloren.
- `clearingAmpel`/`clearingEmpfehlung` sind **abgeleitete** Spalten und stehen bewusst nicht in `INV_CSV_FIELDS`: sonst stünde ein Ergebnis im Eintrag, zu dem die Antworten fehlen.

### Clearing-Ampel (Modul 3a)

Zweiter Tab in der Inventar-View (`#tab-clearing` → `#clearing-panel`), operiert auf denselben `inventory`-Einträgen. Pro Datensatz ein kompakter Fragebogen; das Ergebnis ist ein **deterministischer** Entscheidungsbaum (kein ML) in `evaluateClearing(a)`. Antworten liegen unter `d._clearing = { pb, art9, recht, anon }`, das Ergebnis unter `d.clearing = { ampel, begruendung, empfehlung }`.

- **Vorbelegung:** `initClearing(d)` leitet Frage 1 (`pb`) über `schutzKategorie()` aus `Schutzbedarf` ab: `dsgvo` ⇒ `ja`, `oeffentlich` ⇒ `nein`, sonst (`intern`, `nicht-oeffentlich`, unbekannt) ⇒ `unklar`. Frage 2–4 sind Nutzer-Eingaben.
- **`schutzKategorie(s)`** ist die **einzige** Auswertung des Freitext-Felds `Schutzbedarf` (genutzt von `mapSchutzToAccess()`, `initClearing()` und dem Inventar-Filter). Sie prüft **Verneinungen zuerst** – eine reine Teilstring-Suche nach `öffentlich` würde „Nicht öffentlich" als `PUBLIC` einstufen und im Clearing automatisch **Grün** ergeben. Kategorien: `dsgvo` → `NON_PUBLIC`/`pb=ja`, `nicht-oeffentlich` (auch `VS-NfD`, `Verschlusssache`, `geheim`) → `NON_PUBLIC`/`pb=unklar`, `intern`/`vertraulich` → `RESTRICTED`/`pb=unklar`, `oeffentlich` → `PUBLIC`/`pb=nein`.
- **Regeln (geordnet):** `pb=nein` ⇒ **Grün**; `pb=unklar` ⇒ **Gelb** (nie automatisch Grün); `art9=ja` ⇒ **Rot**; `pb=ja` + `recht=nein` ⇒ **Rot**; `pb=ja` + `recht=ja` + `anon=ja` ⇒ **Gelb** (Brücke zu Modul 3b), `anon=nein` ⇒ **Rot**. Greift keine Regel eindeutig ⇒ **Gelb, manuelle Prüfung**.
- **Progressive Anzeige:** Folgefragen erscheinen nur, wenn relevant; `renderClearing()` rendert bei jeder Antwort neu und setzt entfallende Folgeantworten zurück.
- **Export:** `buildInventoryCSV()` ruft `ensureAllClearing()` und ergänzt die Spalten `clearingAmpel` + `clearingEmpfehlung`. `accessRights` im DCAT-JSON bleibt nutzergesteuert (keine stille Überschreibung).

### Pseudonymisierung (Modul 3b)

Eigene View „Textbereinigung" (`#pseudo-view`). **Reines Regex-Pack, kein ML/NER** (harte Sperre). `pseudonymize(text)` arbeitet in drei Schritten:

1. **`collectSpans`** wendet `PSEUDO_PATTERNS` in Prioritätsreihenfolge an (IBAN, Sozialversicherungsnummer, Steuer-ID *kontextgetriggert*, E-Mail, Aktenzeichen/Geschäftszeichen, Geburtsdatum *im Kontext*, Kfz-Kennzeichen, Straße+Hausnr., PLZ+Ort, Name *anrede-getriggert*, **Telefon zuletzt**) und sammelt `{start, end, type, value}`. Bei Capture-Gruppen (Name, Geburtsdatum, Steuer-ID) wird via `d`-Flag nur der Kernwert erfasst (Anrede/Titel/„geb."/Schlüsselwort bleiben stehen). **Maskierung statt Positions-Vorrang:** nach jedem Muster werden dessen Treffer im Suchtext durch `PSEUDO_MASK` (`\u0000` = NUL, längengleich ⇒ Indizes bleiben gültig) ersetzt. Dadurch kann ein späteres, unspezifischeres Muster – insbesondere das greedy Telefon-Muster – eine bereits erkannte PLZ oder SVNR **nicht mehr verschlucken**. Das Namensmuster erlaubt zwischen Anrede und Name optionale akademische Titel (`Dr.`, `Prof.`, `med.` …), sonst würde bei „Frau Dr. Anna Beispiel" der Titel als Name erfasst und der echte Name stehen bleiben.
2. **`selectSpans`** sortiert nach Position, dann längstem Span, dann Priorität und verwirft Überlappungen (Longest/First-match-wins) → **keine Doppel-Ersetzung**. Durch die Maskierung in Schritt 1 sind Überlappungen praktisch ausgeschlossen; die Regel bleibt als Absicherung bestehen.
3. Aufbau in **einem** Durchlauf: pro Entitätstyp ein Zähler + `Map(original → platzhalter)` → gleicher Wert ⇒ **immer derselbe** Platzhalter (`[PERSON_1]`, `[ADRESSE_1]`, `[ORT_1]`, `[AZ_1]`, `[IBAN_1]`, `[EMAIL_1]`, `[TELEFON_1]`, `[GEBURTSDATUM_1]`, `[SVNR_1]`, `[STEUERID_1]`, `[KFZ_1]`). Rückgabe: `{ text, html (hervorgehoben), mapping, count }`.

**Deterministisch & strukturerhaltend:** identischer Input ⇒ identischer Output; Platzhalter enthalten keine Kommas/Quotes/Zeilenumbrüche → CSV-Struktur bleibt erhalten. **Freistehende Datumsangaben** (ohne „geb."/„geboren am"/„Geburtsdatum"/„Geburtstag") bleiben unangetastet. Grenzen-Liste ist im UI sichtbar; manuelle Nachkontrolle bleibt Pflicht. `PSEUDO_DEMO` liefert einen Beispieltext. **Mapping-Export:** `buildPseudoMappingCSV(mapping)` erzeugt eine CSV (`Platzhalter,Typ,Original`) für die Reidentifizierung/Dokumentation; Button erscheint im Mapping-Kopf, sobald Treffer vorliegen.

**Spaltenweise CSV-Bereinigung** (`#pseudo-csv-panel`, zweiter Tab der View): Die Muster sind bewusst kontextgetriggert und greifen in strukturierten Daten oft nicht – in einer Spalte „Name" steht der Name ohne Anrede. Hier liefert die **Spaltenauswahl** den Kontext, den im Freitext der Trigger liefert. Zwei Behandlungen je Spalte (`pseudoCsv.cols[i] = { mode, type }`): `muster` (Regex-Pack auf den Zellinhalt, für Freitextspalten) und `ganz` (ganze Zelle → ein Platzhalter des gewählten Typs). Leere Zellen bleiben leer.

`createPseudonymizer()` kapselt Zähler + `Map`s in einem Closure, sodass **alle Zellen dieselbe Zuordnung teilen** – derselbe Wert bekommt zeilenübergreifend denselben Platzhalter, sonst wäre die Ausgabe weder konsistent noch reidentifizierbar. `pseudonymize(text)` ist seither nur noch die Ein-Schuss-Form darüber (API unverändert). `parsePseudoCSV()` nutzt `parseCSVRecords` (quote-bewusst), `buildPseudoCSVResult()` serialisiert über `csvCell()` – Umbrüche in gequoteten Feldern überstehen den Durchlauf, die Ausgabe ist wieder importierbar. **Spaltenkonfiguration nach Index, nicht nach Name:** doppelte Überschriften sind in Verwaltungsexporten üblich und würden sich sonst eine Konfiguration teilen.

> **Zukunft (NICHT gebaut):** optionales client-seitiges NER-Modell (Transformers.js/WASM) ist reiner Roadmap-Text – kein Code, auch nicht opt-in.

### Governance & Rollen (Modul 1)

Eigene View `#governance-view`. **Datendomänen** werden aus dem Inventar abgeleitet (`deriveDomains()`: Schlüssel `sourceSystem`, Fallback `publisher`; pro Domäne `count` + `dsgvo`-Flag aus `Schutzbedarf`/Clearing). Ohne Import zeigt die View einen Empty-State mit Import-Button.

- **Reifegrad:** `GOV_QUESTIONS` (8 gewichtete Fragen, Σ Gewichte = 100). `reifegrad()` summiert `weight × factor` (Ja = 1, Teilweise = 0,5, Nein = 0) → 0–100. Ampel: ≥ 80 grün/„Reif", ≥ 50 gelb/„Im Aufbau", sonst rot/„Lückenhaft". Live-Balken je Kategorie.
- **RACI-Matrix:** festes, transparentes Template (`raciFor()`) – Owner = **A**, Steward = **R**, Fachbereich/IT = **C**, DSB = **C** bei DSGVO-Domänen sonst **I**. `roleGap()` markiert Rollen, deren zuständige Fragebogen-Frage nicht mit „Ja" beantwortet wurde (Owner/Steward/DSB).
- **Export:** `buildRaciCSV()` (Domänen × Rollen + Reifegrad-Zeile) und `printGovReport()` (eigenständiges HTML im Druckfenster → PDF, inline-styled).

### Vorlagen & Musterdokumente

Eigene View `#vorlagen-view` (Sidebar-Link `data-view="vorlagen"`). **Service-Center**, das fertige Dokumente lokal erzeugt: statische Muster (**Open-Data-Richtlinie**, **DSFA-Kurz-Checkliste**) und **datengetriebene** Formulare aus Inventar + Clearing (**Veröffentlichungs-Freigabe** je Datensatz, **VVT-Auszug** der DSGVO-relevanten Datensätze). `generateDoc(doc, fmt)` dispatcht: `pdf` öffnet über `printDoc()` ein Druckfenster mit `docShell(title, bodyHTML)` (gemeinsames `DOC_CSS`), `md`/`csv` laden via `downloadBlob()`. `orgName()` leitet den häufigsten `publisher` als Organisationsnamen ab (Fallback „Ihre Organisation"). Datengetriebene Dokumente rufen `ensureAllClearing()` und blockieren ohne Inventar mit Hinweis. Alle Muster tragen einen „ohne Gewähr / keine Rechtsberatung"-Disclaimer.

### Wissens- & Methodik-Center

Eigene View `#wissen-view` (Sidebar-Link `data-view="wissen"`). **Reiner Content-Service**, lokal gerendert: vier statische Datenlisten – `GLOSSARY` (Open-Data-Begriffe), `LEGAL_BASIS` (Rechtsgrundlagen Bund/EU mit amtlichen `gesetze-im-internet.de`/`eur-lex`-Links), **`LEGAL_BASIS_LAENDER`** (alle 16 Länder) und `METHOD_MODELS` (die Reifegrad-Modelle hinter dem Kompass). `renderWissen()` baut Glossar-Karten (`<dl>`/`.know-term`), Gesetzes-Karten (`.know-law`, externe Links), Länder-Karten und Modell-Karten; ein Live-Filter (`wissenFilter.q`, `#wissen-search`) durchsucht alle vier Listen zugleich, ein zweiter Filter (`wissenFilter.land`, `#wissen-land`) grenzt **nur** die Länder-Sektion ein. Leere Abschnitte (`.know-section.hidden`) bzw. ein `#wissen-noresult`-Hinweis werden ein-/ausgeblendet. Explizit **keine Rechtsberatung**.

**`LEGAL_BASIS_LAENDER`** – je Eintrag `{ land, name, abbr, kind, summary, url }`. `kind` ∈ `transparenz` (aktive Veröffentlichungspflicht) / `ifg` (Zugang auf Antrag) / `kein` (kein allgemeines Landesgesetz: Bayern, Niedersachsen); `LAENDER_KIND` liefert Label und Kurzhinweis, die Klassen `.know-kind--*` / `.know-law--*` die farbliche Unterscheidung (die Art steht immer auch als Text daneben, nie nur als Farbe).

⚠️ **Konvention für diese Liste:** jede `url` zeigt auf das **amtliche Landesrecht-Portal** (juris-Landesportale, BRAVORS, REVOSax, recht.nrw.de, gesetze-bayern.de, transparenz.bremen.de) – nie auf eine Sekundärquelle, und nie auf `gesetze-im-internet.de` (das ist Bundesrecht und steht in der anderen Sektion; ein Test prüft genau das). Die Einträge tragen **bewusst keine Jahreszahlen**: Novellen sind häufig, und ein veraltetes Datum im Werkzeug wäre schlechter als gar keines – der verlinkte amtliche Text ist die Autorität, die Zusammenfassung ordnet nur ein.

### Kompass-Verlauf

`kompassHistory = [{ date, score }]` unter `datenlotse_kompass_verlauf`, gedeckelt auf `KOMPASS_HIST_MAX` (24). **Schnappschüsse nur auf Knopfdruck** (`kompassSnapshot()` über `#kompass-snap`) – automatische Stände bei jeder Änderung würden die Kurve mit Zwischenständen zumüllen, und ein Verlauf, den niemand bestellt hat, ist stille Protokollierung des eigenen Arbeitens. Ein Eintrag je Tag: derselbe Tag ersetzt statt anzuhängen. `kompassTrend()` liefert die Differenz zwischen erstem und letztem Stand, `renderKompassHistory()` zeichnet die Balken (`.khist-*`).

Der Verlauf steckt **additiv** in `buildProjectJSON()` (kein Schema-Bump – ältere Projektdateien bleiben importierbar, `importProject()` füllt defensiv) und wird von `clearState()` mitgelöscht.

### Prüfwerkzeuge & Normtexte

`PRUEF_WERKZEUGE` + Sektion `#wissen-sec-tools`. Die eigene Qualitätsprüfung deckt die häufigsten Fehler ab, ist aber **keine vollständige SHACL-Validierung** – die bräuchte eine RDF-Bibliothek und damit eine Laufzeit-Abhängigkeit, die DatenLotse bewusst nicht hat. Statt das zu verschweigen, verlinkt das Werkzeug den offiziellen EU-SHACL-Validator, Spezifikation und Konventionenhandbuch sowie das GovData-Metadatenschema. Der Bundesland-Filter blendet die Sektion aus (wie die kommunale).

### Onboarding-Rundgang

Geführter Durchlauf durch die Bausteine (`TOUR_STEPS`, `tour = { i, active }`). `startTour()` / `tourGo(±1)` / `endTour()`; `renderTour()` navigiert je Schritt via `navTo()`, hebt ein Ziel per `.tour-highlight` hervor (z-index über dem abdunkelnden `#tour-layer`) und baut die Karte `#tour-card` (`role="dialog"`). Escape und Pfeiltasten sind gebunden.

**Bewusst kein Auto-Start als Modal beim ersten Laden** – das nimmt Erstnutzern die Kontrolle. Stattdessen ein wegklickbarer Hinweis `#tour-hint` auf der Startseite (`refreshTourHint()` in `showView('home')` + beim Laden) und ein Dauer-Einstieg `#sidebar-tour`. Gesehen-Status unter `datenlotse_tour` (`'done'`).

Schritte mit `needsData` brauchen ein Inventar. Statt still Beispieldaten zu laden – eine Nebenwirkung, die niemand bestellt hat – bietet der Schritt den Import an (`#tour-sample`) und lässt die Entscheidung beim Menschen. Ein Test prüft, dass jedes `target` in der jeweiligen View wirklich existiert; sonst zeigt der Rundgang ins Leere, sobald sich Markup ändert.

### Kommunale Informationsfreiheitssatzungen

`KOMMUNAL_SATZUNGEN` + Sektion `#wissen-sec-kommunal`. Wo ein Landesgesetz fehlt (Bayern, Niedersachsen), können Kommunen Informationsfreiheit über ihre Satzungsautonomie einführen.

⚠️ **Bewusst KEINE Liste der einzelnen Kommunen:** es sind mehrere Dutzend, der Stand ändert sich laufend, und eine eingefrorene Momentaufnahme wäre nach kurzer Zeit falsch. Verlinkt werden gepflegte Übersichten plus ein amtliches Beispiel. Das Feld `amtlich` unterscheidet die amtliche Fundstelle von zivilgesellschaftlichen Sammlungen – die Herkunft steht sichtbar an jeder Karte. Der Bundesland-Filter blendet diese Sektion aus, weil er Landesrecht meint.

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
| Massenbearbeitung | `renderBulkBar()`, `applyBulk()`, `removeSelected()`, `updateSelectAllLabel()`, `invSelection`, `BULK_FIELDS` | `#inv-select-all`, `#inv-bulk`, `.inv-select`, `#bulk-field`, `#bulk-value`, `#bulk-apply`, `#bulk-remove` |
| Rückimport Inventar-CSV | `importAnyCSV()`, `importInventoryCSV()`, `looksLikeInventoryCSV()`, `INV_CSV_FIELDS` | `#btn-import-again` |
| DCAT-Export | `dcatDataset(d)`, `buildDcatJSON()`, `buildInventoryCSV()`, `csvCell(v)`, `downloadBlob()` | `#btn-export-json`, `#btn-export-csv` |
| RDF/Turtle-Export | `buildDcatTurtle()`, `turtleDataset(d)`, `ttlStr()`, `ttlIri()`, `ttlDate()`, `TTL_PREFIXES`, `TTL_BASE_PLACEHOLDER` | `#btn-export-ttl` |
| Erweiterte DCAT-Felder + Live-Vorschau | `dcatDataset(d)`, `GEO_LEVELS`, `GEO_KEY_RE`, `ISO_DATE_RE`, `CONTRIBUTOR_NAL` | `.inv-more`, `.inv-prop`, `.inv-preview`, `.inv-preview-json`, `[data-field="issued/modified/temporalStart/temporalEnd/spatial/geocodingKey/geocodingLevel/contributorID"]` |
| Lizenz-Register & -Wegweiser | `LICENSE_CATALOG`, `LICENSE_META`, `licenseIsOpen()`, `licenseSelectHTML()`, `recommendLicense()`, `renderLicenseWizard()`, `LICENSE_INFO` | `#btn-license-wizard`, `#license-backdrop`, `[data-field="license"]`, `.lic-opt`, `#lic-apply` |
| DCAT-AP.de-Felder (Nacherfassung) | `guessTheme()`, `DCAT_THEMES`, `keywordList()`, `buildDcatJSON()` (NAL-URIs) | `[data-field="description/theme/keywords/landingPage"]`, `.inv-desc-label` |
| DCAT-AP.de-Qualitätsprüfung | `validateDataset(d)`, `qualityStatus()`, `renderQuality()`, `jumpToInventoryCard(idx)` | `#tab-quality`, `#quality-panel`, `#quality-summary`, `.qual-card`, `.qual-fix` |
| Wissens- & Methodik-Center | `renderWissen()`, `GLOSSARY`, `LEGAL_BASIS`, `LEGAL_BASIS_LAENDER`, `LAENDER_KIND`, `KOMMUNAL_SATZUNGEN`, `METHOD_MODELS`, `wissenFilter` | `#wissen-view`, `#wissen-search`, `#wissen-land`, `#wissen-glossary`, `#wissen-laws`, `#wissen-laender`, `#wissen-kommunal`, `#wissen-models` |
| Onboarding-Rundgang | `startTour()`, `endTour()`, `tourGo()`, `renderTour()`, `refreshTourHint()`, `TOUR_STEPS`, `tour` (State) | `#tour-layer`, `#tour-card`, `#tour-hint`, `#sidebar-tour`, `.tour-highlight`, `datenlotse_tour` |
| Vorlagen & Musterdokumente | `generateDoc(doc, fmt)`, `printDoc()`, `docShell()`, `policyBodyHTML/Markdown`, `dsfaBodyHTML/Markdown`, `freigabeBodyHTML`, `vvtBodyHTML/CSV`, `orgName()` | `#vorlagen-view`, `.vorlage-card`, `[data-doc][data-fmt]` |
| PDF-Bericht Inventar/Clearing | `buildInventoryReportHTML()`, `printInventoryReport()` | `#btn-print-inventory` |
| Clearing-Ampel (Modul 3a) | `evaluateClearing(a)`, `renderClearing()`, `initClearing(d)`, `ensureAllClearing()`, `showInventoryTab(name)` | `#tab-clearing`, `#clearing-panel`, `#clearing-summary`, `.clear-card`, `[data-q]` |
| Pseudonymisierung (Modul 3b) | `createPseudonymizer()`, `pseudonymize(text)`, `collectSpans`, `selectSpans`, `runPseudonymize()`, `buildPseudoMappingCSV(mapping)`, `showView(name)`, `navTo(target)` | `#pseudo-view`, `#pseudo-input`, `#pseudo-output`, `#pseudo-mapping`, `#pseudo-map-csv-btn` |
| Spaltenweise CSV-Bereinigung | `parsePseudoCSV()`, `buildPseudoCSVResult()`, `renderPseudoCsv()`, `runPseudoCsv()`, `showPseudoTab()`, `pseudoCsv` (State) | `#pseudo-tab-text`, `#pseudo-tab-csv`, `#pseudo-csv-input`, `#pseudo-csv-cols`, `#pseudo-csv-run`, `#pseudo-csv-out`, `[data-col-mode]`, `[data-col-type]` |
| Phase-3-Wizard (Modal-Stepper) | `openPhase3Wizard()`, `renderPhase3()`, `openClearing()` | `#open-phase3-btn`, `#phase3-backdrop`, `#p3-body`, `[data-check]` |
| Governance/RACI (Modul 1) | `deriveDomains()`, `raciFor(d)`, `reifegrad()`, `renderGovernance()`, `buildRaciCSV()`, `printGovReport()` | `#governance-view`, `#gov-questions`, `#gov-matrix`, `#gov-score-badge`, `#open-gov-btn` |
| Daten-Kompass | `renderKompass()`, `kompassStatus()`, `kompassDerived()`, `kompassOverall()`, `kompassAction()`, `buildKompassReportHTML()` | `#kompass-view`, `#kompass-score`, `#kompass-dims`, `#hero-kompass-btn`, `#cta-btn` |
| Kompass-Verlauf | `kompassSnapshot()`, `kompassTrend()`, `renderKompassHistory()`, `loadKompassHistory()`, `clearKompassHistory()`, `kompassHistory` (State) | `#kompass-history`, `#kompass-snap`, `#kompass-hist-clear`, `.khist-bar`, `datenlotse_kompass_verlauf` |
| Prüfwerkzeuge & Normtexte | `PRUEF_WERKZEUGE`, `renderWissen()` | `#wissen-sec-tools`, `#wissen-tools` |
| Persistenz | `saveState()`, `loadState()`, `clearState()` | `datenlotse_*`, `#reset-data-btn` |
| Projekt speichern & laden (.json) | `buildProjectJSON()`, `exportProject()`, `importProject(text)`, `pickAndImportProject()` | `#project-save-btn`, `#project-load-btn`, `.sidebar-project` |
| Status-Dashboard (Startseite) | `refreshDashboard()`, `renderDashboard()`, `hasAnyData()` | `#dashboard`, `#dashboard-cards`, `.dash-card[data-go]` |
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
| v37 | **Massenbearbeitung + Rückimport der Inventar-CSV.** Checkbox je Karte, „Alle auswählen" bezieht sich auf die **sichtbare** Teilmenge; Publisher, Ansprechpartner, Lizenz, Kategorie, Zugriffsrechte, Zyklus und Schlagwörter lassen sich für die Auswahl in einem Zug setzen, Einträge nach Rückfrage entfernen. Die Auswahl merkt sich den **echten** Index (ein Filterwechsel darf nicht plötzlich andere Datensätze meinen) und wird nach dem Entfernen geleert, weil sich alle nachfolgenden Indizes verschieben. Dazu der **Rückimport**: `importAnyCSV()` erkennt am Header, ob eine DatenGraf-Rohdatei oder die eigene, bearbeitete Inventarliste vorliegt. Der Rückimport **führt zusammen statt zu ersetzen** – die Clearing-Antworten stehen nicht in der CSV und dürfen nicht verloren gehen; der Export trägt jetzt zusätzlich die Spalte `schutzbedarf`, sonst ginge die Clearing-Vorbelegung verloren. Die abgeleiteten Clearing-Spalten werden bewusst **nicht** zurückgeschrieben. |\n| v36 | **Drei Beispielorganisationen, Kompass-Verlauf, Prüfwerkzeuge.** Neben der Stadtverwaltung jetzt auch **Landkreis** (Gesundheitsamt, Jobcenter, Kataster, Bauaufsicht) und **Landesbehörde** (Statistik, Umweltmessnetz, Geobasisdaten, Archiv) – je zwölf Datensätze mit anderem Zuschnitt und anderer Schutzbedarfsverteilung; beide neuen Sätze enthalten einen „Nicht öffentlich"-Fall, der die v28-Regression an echten Daten absichert. Auswahl über drei Karten im Erklär-Modal (der tote `#inv-modal-sample`-Handler ist entfallen). **Kompass-Verlauf**: festgehaltene Stände als Balken plus Trendangabe, bewusst **nur auf Knopfdruck** statt automatisch – ein ungefragt mitgeschriebener Verlauf wäre stille Protokollierung; ein Eintrag je Tag, gedeckelt auf 24, additiv in der Projektdatei (kein Schema-Bump). **Prüfwerkzeuge & Normtexte** im Wissens-Center: die eigene Qualitätsprüfung ist keine vollständige SHACL-Validierung – statt das zu verschweigen, verlinkt das Werkzeug den offiziellen EU-Validator, Spezifikation, Konventionenhandbuch und GovData-Metadatenschema. |\n| v35 | **Onboarding-Rundgang + kommunale Satzungen.** Geführter Durchlauf in elf Schritten durch alle Bausteine (`TOUR_STEPS`): navigiert selbst in die passende View, hebt das jeweilige Element hervor, Escape und Pfeiltasten inklusive. **Kein Auto-Start als Modal** – ein wegklickbarer Hinweis auf der Startseite plus Dauer-Einstieg in der Seitenleiste; der Status liegt unter `datenlotse_tour`. Schritte, die Daten brauchen, **bieten den Import an, statt still Beispieldaten zu laden**. Ein Test prüft, dass jedes Schritt-Ziel im Markup wirklich existiert. Dazu die Sektion **Kommunale Informationsfreiheitssatzungen**: wo ein Landesgesetz fehlt (Bayern, Niedersachsen), können Kommunen über ihre Satzungsautonomie selbst eines schaffen. Bewusst **keine Liste der Kommunen** – der Stand ändert sich laufend, eine eingefrorene Momentaufnahme wäre bald falsch; verlinkt werden gepflegte Übersichten plus ein amtliches Beispiel, und jede Karte legt offen, ob die Quelle amtlich oder zivilgesellschaftlich ist. |\n| v34 | **RDF/Turtle-Export.** `buildDcatTurtle()` schreibt denselben Stand wie der JSON-LD-Export als `.ttl` – für Portale, die RDF direkt harvesten. Datensatz-IRIs entstehen **relativ gegen ein `@base`**, das die Organisation in genau einer Zeile durch ihre eigene, auflösbare Adresse ersetzt (Datensätze mit `landingPage` nutzen diese als absolute IRI) – erfundene URIs wären hier schlimmer als eine Platzhalter-Zeile. `ttlStr()` escaped Backslash, Anführungszeichen, Zeilenumbruch und Tab (eine mehrzeilige Beschreibung hätte die Datei sonst gebrochen), `ttlIri()` prozent-kodiert unzulässige Zeichen, Datumsangaben sind als `xsd:date` typisiert. Publisher, Ansprechpartner, Zeitraum, Ort und Distribution sind Blank Nodes. Ein Test prüft die Struktur ohne externe Bibliothek (Präfix-Deklarationen, Literal-Abschluss, Klammer-Balance, Leerraum in IRIs) und hält Turtle und JSON gegeneinander; ein Mutationstest (Escaping entfernt) machte ihn rot. |\n| v33 | **Spaltenweise CSV-Bereinigung.** Zweiter Tab in der Textbereinigung: CSV laden oder einfügen, je Spalte entscheiden – unverändert lassen, Muster erkennen oder ganze Spalte durch einen Platzhalter des gewählten Typs ersetzen. Letzteres schließt die konzeptionelle Lücke, dass die Muster kontextgetriggert sind und in strukturierten Daten deshalb oft nicht greifen: die Spaltenüberschrift IST der Kontext, den der Mensch bei der Auswahl liefert. `createPseudonymizer()` teilt Zähler und Zuordnung über alle Zellen, damit derselbe Wert zeilenübergreifend denselben Platzhalter bekommt; `pseudonymize()` ist nur noch die Ein-Schuss-Form darüber (API unverändert). Ausgabe über `csvCell()`, Eingabe über `parseCSVRecords` – Umbrüche in gequoteten Feldern überstehen den Durchlauf, das Ergebnis ist wieder importierbar. Nebenbei korrigiert: die Grenzen-Liste behauptete noch, das Kfz-Muster greife kontextfrei (seit v29 falsch). |
| v32 | **Länderspezifische Rechtsgrundlagen.** Vierte Liste im Wissens-Center (`LEGAL_BASIS_LAENDER`): alle 16 Bundesländer mit amtlicher Fundstelle, unterschieden nach Transparenzgesetz (aktive Veröffentlichungspflicht), Informationsfreiheitsgesetz (Zugang auf Antrag) und „kein allgemeines Landesgesetz" (Bayern, Niedersachsen). Zusätzlicher Bundesland-Filter (`#wissen-land`), der nur diese Sektion eingrenzt; die Volltextsuche greift auch auf Land, Abkürzung und Art zu. Jede Fundstelle wurde einzeln gegen das amtliche Landesrecht-Portal recherchiert statt aus dem Gedächtnis geschrieben; bewusst ohne Jahreszahlen, weil Novellen häufig sind und ein veraltetes Datum schlechter wäre als keines. |
| v32 | **DCAT-AP.de vertieft + Live-Vorschau.** Acht erweiterte, optionale Felder je Karte in einem eingeklappten `<details>` (`.inv-more`): `dct:issued`/`dct:modified`, `dct:temporal` (Start/Ende), `dct:spatial`, `dcatde:politicalGeocodingURI` (aus dem amtlichen Regionalschlüssel) samt `…LevelURI`, `dcatde:contributorID`. `buildDcatJSON()` wurde auf **`dcatDataset(d)`** heruntergebrochen – dieselbe Funktion speist die neue **Live-Vorschau des JSON-LD** je Karte, die bei jeder Eingabe mitläuft; Vorschau und Export können damit nicht auseinanderlaufen. Werteprüfungen für Datumsformat, Reihenfolge (modified vor issued, Zeitraum-Ende vor -Beginn), Schlüsselformat und Gebietsebene; Schlüssel und Ebene werden nur gemeinsam akzeptiert. `contributorID` bewusst als **Empfehlung** statt Pflicht (sonst wäre jedes bestehende Inventar schlagartig rot). CSV-Export um acht Spalten erweitert. Layout: die langen Property-Namen (`dcatde:politicalGeocodingLevelURI`) stehen als eigene, umbruchfähige Zeile – inline liefen sie aus ihrer Grid-Zelle heraus. README um **Einsatzszenarien** und **„Was DatenLotse bewusst nicht ist"** ergänzt. |
| v31 | **Testsuite ins Repo.** 100 Playwright-Tests unter `tests/` (10 Dateien + `helpers.js`), `playwright.config.js` mit eigenem Webserver (`python3 -m http.server 8081`), npm-Skripte (`test`, `test:ui`, `test:headed`) und CI-Workflow `.github/workflows/tests.yml` (Push auf `main` + jeder Pull Request). Einzige Dev-Abhängigkeit: `@playwright/test` exakt gepinnt – die App bleibt zur Laufzeit abhängigkeitsfrei (ein Test prüft genau das: null externe Requests). Die Suite kodiert die Befunde der Reviews v28–v30 als Regressionstests; ein Mutationstest (drei Befunde absichtlich wieder eingebaut) machte 7 Tests rot. Ein echter Befund kam aus der Suite selbst: `#sidebar-toggle-btn` trug `aria-expanded` erst nach der ersten Interaktion – jetzt initial `aria-expanded="false"` + `aria-controls`. |
| v30 | **Geringe Review-Befunde + Hero-Umbau.** Hero: der lange graue Fließtext wurde zu vier klickbaren Schritt-Chips (`.hero-steps`/`.hero-step`, je Icon + Titel + Untertitel, `[data-go]`) plus einem Trust-Badge (`.hero-trust`). Dashboard: „x von y bewertet" zeigte immer 100 % (ensureAllClearing belegt alles vor) → `clearingSelbstBewertet()` zählt nur wirklich vom Nutzer beantwortete Einträge, sonst „aus Schutzbedarf vorbelegt". Empty-States in Clearing- und Qualitäts-Tab. Projekt-Export: `APP_VERSION` statt hartkodiertem `v20`, Import lehnt neuere `schema`-Versionen ab. `csvCell()` neutralisiert Formel-Injection (führende `=+-@`). `_recipients` ist ein **Array** (Set wurde bei JSON-Roundtrip zu `{}`). Unbekannte Legacy-Lizenz meldet „im Register unbekannt" statt fälschlich „nicht offen". `guessTheme`: `ÖPNV` war wegen `toLowerCase()` toter Code. HTML-Validität: `<button>` enthält kein `<div>`/`<p>` mehr (`.next-card`, `.dash-card` → `<span>`); Unterseiten-Titel sind `<h1>` (der Hero-`<h1>` ist dort ausgeblendet); Kompass hat einen `.phase-back`; `<main tabindex="-1">` für den Skip-Link. Tote Handler (`btn-import-graf`, `open-pseudo-btn`) entfernt. Semikolon-CSV (deutsches Excel) erzeugt einen konkreten Hinweis. **Kontrast:** `--c-muted` `#7a7591` → `#6f6a87` (4,39:1 → 5,14:1, WCAG AA) und `.footer-version` von 1,79:1 auf 5,44:1 – ⚠️ die `--c-muted`-Änderung ist eine **bewusste Abweichung zu DatenGraf** und dort nachzuziehen |
| v29 | **Mittlere Review-Befunde + Startseiten-Layout.** Pseudonymisierung: Kfz-Muster ist jetzt **kontextgetriggert** (zerstörte sonst Lizenz-/Normkürzel wie „DL-DE 2.0", „DIN-EN 1090" – eine Kürzel-Sperrliste scheidet aus, weil DL und EN echte Unterscheidungszeichen sind); PLZ+Ort schließt Zähl-/Maßeinheiten aus („50000 Datensätze"), bewusst per Sperrliste statt Positionsregel, damit „wohnhaft in 12345 Musterstadt" nicht übersehen wird; Telefon erlaubt Bindestriche nur direkt vor Ziffern („0800 - 1600 Uhr" ist eine Zeitspanne). **CSV-Parser** trennt Datensätze quote-bewusst (`parseCSVRecords`) – ein Umbruch im gequoteten Feld erzeugte Phantom-Zeilen, der eigene Export war nicht reimportierbar. `deriveInventory` nummeriert kollidierende `dct:identifier` durch. `DCAT_REQUIRED` ist **einzige Quelle** für Pflicht vs. Empfehlung (`REQUIRED_FIELDS` leitet daraus ab); UI-Texte angeglichen. Governance: Reifegrad-Check ist vom Inventar entkoppelt, nur `#gov-raci` hängt daran. Lizenz-Massenübernahme aktualisiert den aktiven Tab. A11y: eingeklappte Seitenleiste per `visibility:hidden` aus dem Tab-Order, `aria-expanded`, `aria-selected`/`aria-controls`/`role="tabpanel"` + Pfeiltasten-Navigation, `aria-label` an Kompass-Selects, `aria-pressed` im Lizenz-Wegweiser, **Fokus-Falle** (`trapFocus`) für alle Modals, `.pseudo-mini-btn[hidden]`. Responsive: alle Karten-Grids auf `minmax(min(100%, X), 1fr)`, `min-width: 0` an Grid-/Flex-Kindern, fehlende Views in der 600px-Query – 360/375/390 px überlauffrei. Veraltete „geplant"-Badges und FAQ-Antwort korrigiert. **Startseite:** einheitlicher Rhythmus über `--home-gap` (vorher 8/6/24 px nebeneinander, „Dein Fortschritt" klebte mit 6 px am Akkordeon) und eigenes `.dashboard-panel`, das die Status-Karten von der darunter liegenden Modul-Kartenreihe abgrenzt |
| v28 | **Fehlerbehebung nach Code-/UX-Review** (4 kritische Befunde, je durch einen Playwright-Test abgesichert): (1) **Pseudonymisierung – Datenleck:** Anrede + akademischer Titel („Frau Dr. Anna Beispiel") ließ `Dr` als Namen erfassen, der echte Name blieb im „bereinigten" Text; Namensmuster erlaubt jetzt optionale Titel zwischen Anrede und Name. (2) **Pseudonymisierung – Teil-Leak:** Das greedy Telefon-Muster verschluckte angrenzende PLZ/SVNR (Rest blieb stehen), weil `prio` in `selectSpans` nur der dritte Tiebreaker nach der Startposition war; `collectSpans` **maskiert** jetzt bereits belegte Stellen und Telefon steht zuletzt – die in der Doku behauptete Prioritätsgarantie ist damit tatsächlich implementiert. (3) **Falsche Freigabe:** „Nicht öffentlich" wurde per Teilstring als `PUBLIC` gelesen ⇒ Clearing automatisch **Grün**; neue `schutzKategorie()` prüft Verneinungen zuerst und ist die einzige Auswertung des Freitextfelds (auch für den Inventar-Filter). (4) **Drei-Tab-Logik defekt:** `.quality-panel.hidden` fehlte in der CSS-Regelgruppe ⇒ Qualitätsprüfung blieb dauerhaft unter dem Inventar sichtbar (auch mit veralteten Karten nach einem Neuimport) |
| v27 | DCAT-AP.de-Teil vervollständigt: **volles Lizenz-Register** (`LICENSE_CATALOG`/`LICENSE_META`, ~20 Lizenzen in Optgroups „offen"/„eingeschränkt" mit `open`-Flag, offizieller `dct:license`-URI und Lizenztext-Link; `licenseSelectHTML()` erhält Legacy-Werte). Neue editierbare Pflicht-/Empfehlungsfelder je Karte: **Beschreibung** (Pflicht, `<textarea>`), **Kategorie** (`dcat:theme`, EU-Datenthemen, via `guessTheme()` vorbelegt), **Schlagwörter** (`dcat:keyword`), **Info-/Zugriffs-URL** (`dcat:landingPage`/`accessURL`). `completeness` + Qualitätsprüfung um diese Felder erweitert (description = Pflicht; theme/keywords/landingPage = Empfehlung; „nicht offen" jetzt über `licenseIsOpen()` für NC/ND/geschlossen). `buildDcatJSON()` exportiert kontrollierte Werte als **NAL-/Register-URIs** (data-theme, frequency, access-right, Lizenz) + `dcat:keyword`-Array + `foaf:Organization`. CSV-Export + Projekt-Export tragen die neuen Felder. Verifiziert: 21 Lizenz-Optionen/2 Optgroups, Theme-Vorbelegung, NC-Lizenz → „nicht offen", DCAT-URIs korrekt, Round-Trips, keine Konsolenfehler |
| v26 | Inhaltlicher Ausbau (4/4) – Vorlagen & Musterdokumente: neue View `#vorlagen-view` (siebte View; Sidebar-Link + `navTo('vorlagen')`) als Service-Center für fertige Dokumente. Statische Muster (Open-Data-Richtlinie, DSFA-Kurz-Checkliste) und datengetriebene Formulare (Veröffentlichungs-Freigabe je Datensatz, VVT-Auszug DSGVO-relevanter Datensätze) aus Inventar + Clearing. `generateDoc(doc,fmt)`: `pdf` → `printDoc()`/`docShell()` (Druckfenster), `md`/`csv` → `downloadBlob()`; `orgName()` (häufigster Publisher); ohne Inventar Hinweis; „ohne Gewähr"-Disclaimer. Verifiziert: 4 Karten, Policy/DSFA-PDF+MD, Freigabe (12 Formulare, korrekter Org-Name), VVT (6 DSGVO-Zeilen + CSV), Leer-Guards, keine Konsolenfehler |
| v25 | Inhaltlicher Ausbau (3/4) – Wissens- & Methodik-Center: neue View `#wissen-view` (sechste View; Sidebar-Link + `navTo('wissen')`) als reiner Content-Service – Glossar (`GLOSSARY`, 20 Begriffe), Rechtsgrundlagen-Bibliothek (`LEGAL_BASIS`, Bund/EU mit amtlichen Links) und Reifegrad-Modelle (`METHOD_MODELS`); `renderWissen()` mit Live-Filter (`#wissen-search`) über alle drei Listen, leere Abschnitte + No-Result-Hinweis werden ein-/ausgeblendet; Disclaimer „keine Rechtsberatung". Verifiziert: 20/8/5 Einträge, Filter „dsgvo" → 5 Begriffe + 2 Gesetze, No-Result-Banner, Folge-Karten-Navigation, keine Konsolenfehler |
| v24 | Inhaltlicher Ausbau (2/4) – DCAT-AP.de-Qualitätsprüfung: dritter Inventar-Tab (`#tab-quality`) mit echtem Publish-Ready-Check statt nur Vollständigkeits-%. `validateDataset()` trennt Pflichtfeld-**Fehler** (rot) von Empfehlungs-**Warnungen** (gelb) und prüft Werte/Vokabulare (offene Lizenz, PUBLIC/RESTRICTED/NON_PUBLIC, `FREQ_OPTIONS`, E-Mail im contactPoint, kurze Titel/Beschreibung); Ampel-Zusammenfassung + Karten (schlechteste zuerst) mit Issue-Liste und „Im Inventar bearbeiten"-Sprung (`jumpToInventoryCard`: Filter-Reset, Tab-Wechsel, Scroll + `.inv-card--flash`). `showInventoryTab()` auf drei Tabs generalisiert. Verifiziert: frisch 12 Fehler (Lizenz fehlt), nach Lizenz-Übernahme 1 bereit / 11 Warnungen / 0 Fehler, Sprung-Highlight, keine Konsolenfehler |
| v23 | Inhaltlicher Ausbau (1/4) – Lizenz-Wegweiser: geführtes Modal (`#license-backdrop`) mit zwei Fragen (Namensnennung? national/international?) → deterministische Empfehlung einer offenen Lizenz (`recommendLicense()` → DL-DE-BY/-Zero, CC-BY, CC0; Schlüssel = `LICENSE_OPTIONS`), Begründung + amtlicher Link (`LICENSE_INFO`), „Für N Datensätze ohne Lizenz übernehmen"-Bulk-Aktion (setzt `license`, `saveState()`, hebt `completeness`), Hinweis zu NC/ND/Share-Alike (nicht offen); Einstieg `#btn-license-wizard` in der Inventar-Kopfzeile. Verifiziert: alle vier Empfehlungen, Bulk-Übernahme (12→0), Leer-Hinweis ohne Inventar, Button-Disable bei 0 |
| v22 | Seitenleiste & Hamburger nach **rechts** verlegt: Off-Canvas-Panel dockt rechts (`right: 0`, `border-left`) und klappt von rechts auf (`.collapsed → translateX(100%)`); Hamburger-Button als letztes Topbar-Element (ganz rechts), Brand bleibt links; Hover-Verschiebungen der Sidebar-Links/-Buttons nach innen (links) gedreht. CSS-Cache-Busting via `?v=N` an den Stylesheet-Links ergänzt (für reine CSS-Änderungen) |
| v21 | Weiterer Ausbau (4/4) – Status-Dashboard auf der Startseite: `#dashboard` zeigt (sobald Daten vorliegen, `hasAnyData()`) vier Live-Kennzahl-Karten – Daten-Kompass-Reifegrad, Governance-Reifegrad, Inventar-Anzahl + Ø-Vollständigkeit, Clearing-Ampelverteilung – je mit `[data-go]`-Schnellsprung; `[data-go]` auf Delegation umgestellt (für dynamische Karten); `refreshDashboard()` in `showView('home')` + beim Laden. Verifiziert: leer ⇒ versteckt, Kennzahlen korrekt (12 Datensätze · Ø 83 % · 6/6/0 Clearing), Karten-Navigation, nach Reset wieder versteckt |
| v20 | Weiterer Ausbau (3/4) – Projekt speichern & laden (.json): kompletter Arbeitsstand (`grafRows`, `inventory` inkl. Clearing, `governanceAnswers`, `kompassState`) portabel als eine Datei. `buildProjectJSON()` (versionierter Umschlag), `exportProject()` (Datei-Download, leer ⇒ Hinweis), `importProject()` (Herkunfts-/Schema-Prüfung, Überschreib-Bestätigung, defensives Füllen, `saveState()` + Re-Render), `pickAndImportProject()`; Einstiege in der Seitenleiste (`#project-save-btn`/`#project-load-btn`). Verifiziert: Round-Trip-Restore (Karten/LocalStorage/Titel), Ablehnung fremder/ungültiger Dateien, Leer-Schutz |
| v19 | UX-/Design-Überarbeitung der Unterseiten: neuer Hero-Text (DatenLotse im Vordergrund – Datenmanagement verstehen/aufbauen/vertiefen); Unterseiten-Überschriften größer & lila inkl. lila Icons; Phasen-Wegweiser je View (`.phase-badge` + `.phase-back`-Zurück-Link) und kontextueller `.view-next`-Block mit `.next-card`s statt global immer sichtbarem Phase-4&5-Block (`goTo`/`[data-go]`-Navigation, `.consult-cta` nur noch auf `home`); Intro-/Hinweistexte als gut lesbare weiße Karten (`.inventory-hint`); Unterseiten-Aktionsbuttons bleiben weiß (kein Lila-Hover); Phase-4&5 als zwei gleich breite Container (lila „Pipeline & zirkuläres Ökosystem" mit weißem Info-Button + schwarzer „Umsetzung besprechen"-CTA-Block); Seitenleiste mit weißem Hintergrund, größeren lila Menüpunkten (Icon+Text) und Kachel-artigem Hover; „Beispiel laden" über „Dateninventar starten" |
