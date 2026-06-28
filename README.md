<img width="auto" height="150" alt="DatenLotse Logo" src="https://raw.githubusercontent.com/daimpad/datenlotse/main/logo.svg" />

# DatenLotse – von der Datenkartierung zur Open-Data-Umsetzung

**DatenLotse** ist ein browserbasiertes, datenbankfreies Werkzeug, das Organisationen – insbesondere die öffentliche Verwaltung – vom kartierten Datenökosystem in die konkrete Open-Data-Umsetzung führt. Es ist das Schwester-Tool zu [DatenGraf](https://datengraf.nozilla.net/): Wo DatenGraf zeigt, *wie* die Datenflüsse aussehen, beantwortet DatenLotse die Frage *„Was tue ich jetzt konkret?"* – Dateninventar nach DCAT-AP.de aufbauen, Risiken klären, Texte datenschutzkonform pseudonymisieren. Alles läuft lokal im Browser: kein Server, kein Account, kein Datentransfer.

<br>

[![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20JS-420093?style=flat-square&logo=javascript&logoColor=white)](https://github.com/daimpad/datenlotse)
[![Lizenz](https://img.shields.io/badge/Lizenz-GPL--3.0-420093?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-aktiv-420093?style=flat-square)](https://github.com/daimpad/datenlotse)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-bereit-420093?style=flat-square&logo=github&logoColor=white)](https://datenlotse.nozilla.net)
[![Privacy](https://img.shields.io/badge/Privacy-Local--First-420093?style=flat-square&logo=shield&logoColor=white)](https://github.com/daimpad/datenlotse)
[![Zero Server](https://img.shields.io/badge/Zero--Server-100%25%20lokal-black?style=flat-square)](https://nozilla.de)
[![nozilla](https://img.shields.io/badge/by-nozilla-00FF9C?style=flat-square)](https://nozilla.de)

<br>

[**→ Jetzt starten**](https://datenlotse.nozilla.net) · [Sicherheit](SECURITY.md) · [Mitmachen](.github/CONTRIBUTING.md)

---

## Features

| | Feature | Beschreibung |
|---|---|---|
| 🧭 | **Daten-Kompass** | Ausführliche Open-Data-Reifegrad-Checkliste (ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de, DSGVO/FAIR) über 7 Dimensionen mit Score, Vorbelegung aus dem Stand und adaptiven Empfehlungen der nächsten Bausteine – der Haupteinstieg |
| 🔗 | **DatenGraf-CSV-Import** | Liest exakt das CSV-Schema, das DatenGraf exportiert – die Datenkartierung wird ohne Umweg zur Umsetzungsgrundlage |
| 📦 | **Dateninventar (DCAT-AP.de)** | Aus jedem Datenfluss wird ein Dataset-Kandidat abgeleitet und in editierbaren Karten dargestellt; Publisher/Ansprechpartner als Freitext, Aktualisierungszyklus/Lizenz/Zugriffsrechte als Dropdowns – mit Live-Vollständigkeits-% in Ampelfarben |
| 📤 | **DCAT-Export (JSON + CSV)** | DCAT-AP.de-konformes JSON-LD (`dcat:Catalog`/`dcat:Dataset` mit `@context`) zum Harvesting durch GovData/CKAN sowie eine flache CSV-Liste |
| 🚦 | **Clearing-Ampel (Rot-Gelb-Grün)** | Transparenter, deterministischer Entscheidungsbaum je Datensatz (Schutzbedarf-Vorbelegung, Art.-9-/Rechtsgrundlage-/Anonymisierbarkeit-Prüfung) mit nachvollziehbarer Begründung, Gesamtübersicht und Ampel-Spalte im CSV-Export |
| 🛡️ | **Client-Side-Pseudonymisierung** | Strukturerhaltende, deterministische Bereinigung deutscher Verwaltungstexte (Namen anrede-getriggert, Adressen, PLZ+Ort, Aktenzeichen, IBAN, E-Mail, Telefon, Geburtsdatum im Kontext) mit konsistenten Platzhaltern, Mapping-Tabelle und Download – rein per Regex, nichts verlässt den Browser |
| 👥 | **Governance & RACI** | 8-Fragen-Reifegrad-Check (gewichtet, 0–100) + automatisch aus dem Inventar abgeleitete RACI-Matrix (Domänen × Rollen) mit Lücken-Markierung; Export als CSV und PDF/Druck-Bericht |
| 🔒 | **Local-First / No-Database** | Alle Daten bleiben im Browser – kein Backend, kein Account, keine externen Laufzeit-Aufrufe |
| 📱 | **Mobile-First** | Responsives Layout: Buttons in voller Breite, Grids brechen auf eine Spalte |

---

## Quick Start

### Option A – direkt im Browser

```
https://datenlotse.nozilla.net
```

Importiere eine DatenGraf-CSV über **Dateninventar → DatenGraf-CSV importieren** und reichere die abgeleiteten Datensätze um DCAT-AP.de-Metadaten an.

### Option B – lokal ausführen

```bash
git clone https://github.com/daimpad/datenlotse.git
cd datenlotse
python3 -m http.server 8080
# → http://localhost:8080
```

> **Hinweis:** `index.html` muss über HTTP(S) geöffnet werden, damit `FileReader`/`fetch()` und die Beispieldaten funktionieren. Ein direktes Öffnen als `file://` startet die App nicht korrekt.

### Option C – eigene DatenGraf-CSV verwenden

DatenLotse liest exakt das Schema, das DatenGraf via Export erzeugt:

```
Quelle,QuelleAbteilung,QuelleBereich,QuelleOrganisation,QuelleRolle,
Beziehung,Ziel,Datentyp,Häufigkeit,Format,Schutzbedarf,Erfassungsart,Anmerkungen,Ansprechpartner
```

Importiere deine Datei über den Button **DatenGraf-CSV importieren**. Jede eindeutige `(Quelle | Datentyp)`-Kombination wird zu einem DCAT-AP.de-Dataset-Kandidaten.

---

## Von der Map zur Umsetzung

DatenLotse begleitet den Weg von der fertigen DatenGraf-Karte in die operative Open-Data-Bereitstellung:

1. **Inventar (Phase 2 · MVP)** – DatenGraf-CSV importieren, Datenflüsse zu DCAT-AP.de-Datasets verdichten, Metadaten ergänzen, als JSON/CSV exportieren.
2. **Clearing (Phase 3a)** – Risikobewertung je Datensatz über einen transparenten Rot/Gelb/Grün-Entscheidungsbaum.
3. **Pseudonymisierung (Phase 3b)** – Deutsche Verwaltungstexte strukturerhaltend von personenbezogenen Daten befreien, vollständig client-seitig.
4. **Governance (Phase 1, Ausblick)** – geführter Fragebogen zu Zuständigkeiten → RACI-Matrix + Reifegrad-Ampel.

**Die DatenGraf-Brücke:** Das Row-Schema (`GRAF_COLUMNS` in `js/app.js`) ist 1:1 aus DatenGraf übernommen; CSV-Parser und Quoting sind identisch. So wird der Export des einen Tools ohne Konvertierung zum Import des anderen.

**Phase 4 (ETL/Container/CKAN) & Phase 5 (Feedback-Schleifen)** sind bewusst **kein** Self-Service-Tool, sondern ein Beratungs- und Workshop-Angebot → [nozilla.de/kontakt](https://nozilla.de/kontakt/).

---

## DCAT-AP.de

Das Inventar-Modul erzeugt zu jedem Datensatz Metadaten nach dem deutschen DCAT-AP.de-Profil – damit die Datasets durch [GovData](https://www.govdata.de/) und CKAN-basierte Portale geharvestet werden können. Erzeugt bzw. nacherfassbar sind u. a.:

| Feld | Zweck |
|---|---|
| `dct:title` / `dct:description` | Titel und Beschreibung des Datasets |
| `dct:identifier` | Eindeutige Kennung |
| `dct:publisher` → `foaf:Organization` | Veröffentlichende Stelle |
| `dcat:contactPoint` | Ansprechpartner (vCard) |
| `dct:accrualPeriodicity` | Aktualisierungszyklus (CONT/DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUAL/IRREG/NEVER) |
| `dct:accessRights` | Zugriffsrechte (PUBLIC/RESTRICTED/NON_PUBLIC) |
| `dcat:distribution` → `dct:format` + `dct:license` | Format und Lizenz (dl-de/by-2-0, dl-de/zero-2-0, cc-by-4.0, cc-zero …) |
| `dcatde:sourceSystem` | Quellsystem aus der DatenGraf-Kartierung |

Die Ausgabe erfolgt als JSON-LD mit `@context` auf das DCAT-AP.de-Profil sowie als flache CSV-Liste.

---

## Technischer Stack

| Technologie | Version | Zweck |
|---|---|---|
| **Vanilla JS** | ES2020+ | Gesamte Anwendungslogik ohne Framework, eine Datei (`js/app.js`) |
| **CSS Custom Properties** | — | Design-System mit Glasmorphismus, Tokens in `css/tokens.css` |
| **Inter** | lokal | Schriftart (latin + latin-ext, 400/500/600/700) |
| **Font Awesome** | 6.7.2 (lokal) | Icon-Library (solid, regular, brands) |
| **FileReader API** | — | Lokaler CSV-/Textimport ohne Upload |
| **LocalStorage API** | — | Persistenz ohne Backend |
| **Blob API** | — | DCAT-JSON-, CSV- und Text-Downloads |

> Keine Build-Tools, keine Runtime-Library nötig – nur HTML, CSS und JS. Inter und Font Awesome werden lokal aus `assets/fonts/` ausgeliefert, nicht per CDN.

---

## Methodik / Konzepte

<details>
<summary><strong>DCAT-AP.de-Mapping</strong></summary>

`deriveInventory(rows)` verdichtet die DatenGraf-Zeilen: Jede eindeutige `(Quelle | Datentyp)`-Kombination wird zu einem DCAT-AP.de-Dataset-Kandidaten. Vorbelegungen werden aus der Kartierung abgeleitet – `Schutzbedarf` → `dct:accessRights`, `Häufigkeit` → `dct:accrualPeriodicity`. DCAT-Pflichtfelder, die DatenGraf nicht kennt (Lizenz, Zyklus), werden im UI nacherfasst.

</details>

<details>
<summary><strong>3-Klassen-Clearing-Modell (Rot/Gelb/Grün)</strong></summary>

Eine geordnete, deterministische Regelmenge bildet die Freigabeempfehlung je Datensatz ab – ohne ML, vollständig nachvollziehbar. Besondere Kategorien nach Art. 9 DSGVO oder fehlende Rechtsgrundlage bei personenbezogenen Daten führen zu **Rot**; anonymisierbare personenbezogene Daten zu **Gelb** (erst nach Bearbeitung freigabefähig); rein öffentliche Daten zu **Grün**. Bei Unklarheit gilt der konservative Default **Gelb (manuelle Prüfung)**, nie Grün.

</details>

<details>
<summary><strong>Strukturerhaltende Pseudonymisierung</strong></summary>

Ein Regex-Pack für DE-Verwaltungstexte (Namen anrede-getriggert, Adressen, Aktenzeichen, IBAN, E-Mail, Telefon, kontextgebundene Geburtsdaten) ersetzt erkannte Entitäten durch konsistente Platzhalter (`[PERSON_1]`, `[ADRESSE_1]` …). Pro Entitätstyp ein Zähler + Map `Originalwert → Platzhalter`: gleicher Wert ⇒ immer derselbe Platzhalter, deterministisch über das ganze Dokument. Erkannte Spans werden nach Position sortiert, Überlappungen verworfen (Longest-match-wins), erst dann ersetzt – so bleibt die relationale Maschinenlesbarkeit erhalten und nichts verlässt den Browser.

</details>

<details>
<summary><strong>RACI-Matrix & Reifegrad</strong></summary>

Ein geführter Fragebogen leitet aus den Datendomänen des Inventars eine RACI-Matrix (Responsible / Accountable / Consulted / Informed) ab und berechnet einen gewichteten Reifegrad-Score (0–100) – analog zum Vollständigkeits-Score von DatenGraf.

</details>

---

## Dateistruktur

```
datenlotse/
├── index.html                  # Einstiegspunkt – HTML-Struktur
├── css/
│   ├── tokens.css              # Design-Tokens (Kernwerte aus DatenGraf + --ampel-*)
│   └── styles.css              # Layout & Komponenten
├── js/
│   └── app.js                  # Gesamte Anwendungslogik (eine Datei)
├── data/
│   ├── sample-kommune.csv      # Beispiel: fiktive Stadtverwaltung (12 Datensätze)
│   └── template.csv            # Leere Vorlage zum eigenen Befüllen
├── assets/
│   └── fonts/
│       ├── fa/all.min.css      # Font Awesome 6.7.2 CSS
│       ├── webfonts/           # Font Awesome woff2-Dateien (solid/regular/brands)
│       └── inter/              # Inter-Schriftdateien (woff2) + inter.css
├── .github/
│   ├── workflows/
│   │   └── static.yml          # GitHub Pages Deployment
│   └── CONTRIBUTING.md         # Beitragsrichtlinien
├── CNAME                       # datenlotse.nozilla.net
├── CLAUDE.md                   # AI-Entwicklungs-Kontext & Architektur
├── SECURITY.md                 # Sicherheitsrichtlinie
├── LICENSE                     # GPL-3.0
└── README.md                   # Diese Datei
```

---

## Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](LICENSE).

---

<div align="center">

Ein Projekt von **[nozilla](https://nozilla.de)** — bits & bytes mit ❤

</div>
