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
| 🧭 | **Daten-Kompass** | Open-Data-Reifegrad-Checkliste nach anerkannten Modellen (ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de, DSGVO/FAIR): **7 Dimensionen mit 27 Prüfpunkten**, Score + Ampel, Vorbelegung aus dem aktuellen Stand, adaptive Empfehlungen der nächsten Bausteine und PDF-Export – der Haupteinstieg |
| 🔗 | **DatenGraf-CSV-Import** | Liest exakt das CSV-Schema, das DatenGraf exportiert – die Datenkartierung wird ohne Umweg zur Umsetzungsgrundlage |
| 📦 | **Dateninventar (DCAT-AP.de)** | Aus jedem Datenfluss wird ein Dataset-Kandidat abgeleitet und in editierbaren Karten dargestellt: Beschreibung, Publisher, Ansprechpartner, **Kategorie** (EU-Datenthemen), **Schlagwörter**, Aktualisierungszyklus, **Lizenz** (volles DCAT-AP.de-Register), Zugriffsrechte und Info-/Zugriffs-URL – mit Live-Vollständigkeits-% in Ampelfarben. Der Export schreibt kontrollierte Werte als offizielle NAL-/Register-URIs |
| 🔍 | **Suche, Filter & Sortierung** | Inventar live durchsuchen (Titel/Publisher/Quellsystem), nach Schutzbedarf oder Clearing-Ampel filtern und nach Titel bzw. Vollständigkeit sortieren – Editieren bleibt auch über gefilterten Teilmengen korrekt |
| 📊 | **Status-Dashboard** | Startseite zeigt – sobald Daten vorliegen – Live-Kennzahlen über alle Bausteine (Kompass-Reifegrad, Inventar-Anzahl & Ø-Vollständigkeit, Clearing-Ampelverteilung, Governance-Reifegrad) mit Schnellsprung direkt zum Weiterarbeiten |
| 📤 | **DCAT-Export (JSON + CSV)** | DCAT-AP.de-konformes JSON-LD (`dcat:Catalog`/`dcat:Dataset` mit `@context`) zum Harvesting durch GovData/CKAN sowie eine flache CSV-Liste |
| 🪪 | **Lizenz-Wegweiser** | Zwei Fragen (Namensnennung? national/international?) führen deterministisch zur passenden **offenen** Lizenz (DL-DE-BY/-Zero, CC-BY, CC0) inkl. Begründung und amtlichem Link; auf Wunsch für alle Datensätze ohne Lizenz übernehmbar. Das vollständige Register mit **20 Lizenzen** steht im Inventar-Dropdown |
| ✅ | **DCAT-AP.de-Qualitätsprüfung** | Publish-Ready-Check je Datensatz: fehlende Pflichtfelder als **Fehler**, fehlende Empfehlungsfelder und Werteprüfungen (offene Lizenz, kontrolliertes Vokabular, E-Mail im Ansprechpartner) als **Warnungen** – mit Ampel-Übersicht und direktem Sprung zum Bearbeiten im Inventar |
| 📚 | **Wissens- & Methodik-Center** | In-App-Nachschlagewerk mit Live-Filter über alles: **20 Glossar-Begriffe**, **8 Rechtsgrundlagen** (Bund/EU mit amtlichen Links zu gesetze-im-internet.de bzw. EUR-Lex) und die **5 Reifegrad-Modelle** hinter dem Kompass – lokal, ausdrücklich keine Rechtsberatung |
| 📄 | **Vorlagen & Musterdokumente** | Fertige Dokumente lokal erzeugt: Open-Data-Richtlinie und DSFA-Kurz-Checkliste (Muster) sowie aus dem Inventar generierte Veröffentlichungs-Freigabe-Formulare und ein VVT-Auszug der DSGVO-relevanten Datensätze – als PDF druckbar oder als Markdown/CSV ladbar |
| 🚦 | **Clearing-Ampel (Rot-Gelb-Grün)** | Transparenter, deterministischer Entscheidungsbaum je Datensatz (Schutzbedarf-Vorbelegung, Art.-9-/Rechtsgrundlage-/Anonymisierbarkeit-Prüfung) mit nachvollziehbarer Begründung, Gesamtübersicht und Ampel-Spalte im CSV-Export |
| 🛡️ | **Client-Side-Pseudonymisierung** | Strukturerhaltende, deterministische Bereinigung deutscher Verwaltungstexte über **11 Muster**: Name (anrede-getriggert, akademische Titel werden übersprungen), Adresse, PLZ+Ort, Aktenzeichen/Geschäftszeichen, IBAN, E-Mail, Telefon, Geburtsdatum, Steuer-ID und Kfz-Kennzeichen (beide kontextgetriggert), Sozialversicherungsnummer. Konsistente Platzhalter, Mapping-Tabelle samt **CSV-Export** – rein per Regex, nichts verlässt den Browser |
| 👥 | **Governance & RACI** | 8-Fragen-Reifegrad-Check (gewichtet, 0–100, **auch ohne Inventar nutzbar**) + automatisch aus dem Inventar abgeleitete RACI-Matrix (Domänen × Rollen) mit Lücken-Markierung; Export als CSV und PDF/Druck-Bericht |
| 💾 | **Projekt speichern & laden (.json)** | Kompletter Arbeitsstand (Inventar inkl. Clearing, Governance, Kompass und importierte DatenGraf-Zeilen) als eine versionierte JSON-Datei exportier- und wieder importierbar – für Backup, Gerätewechsel oder zum Teilen; Import prüft Herkunft und fragt vor dem Überschreiben |
| 🔒 | **Local-First / No-Database** | Alle Daten bleiben im Browser – kein Backend, kein Account, keine externen Laufzeit-Aufrufe |
| 📱 | **Mobile-First** | Responsives Layout ab 360 px überlauffrei; Grids brechen auf eine Spalte |
| ♿ | **Barrierefreiheit** | Skip-Link, Fokus-Falle in allen Modals, ARIA-Tabs mit Pfeiltasten-Navigation, beschriftete Formularfelder, sichtbarer Fokus, `prefers-reduced-motion`, WCAG-AA-Kontraste |

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

DatenLotse begleitet den Weg von der fertigen DatenGraf-Karte in die operative Open-Data-Bereitstellung. **Die Phasen 1–3 sind vollständig gebaut und nutzbar:**

| Phase | Baustein | Was passiert |
|---|---|---|
| **Überblick** | 🧭 Daten-Kompass | Reifegrad-Standortbestimmung über 7 Dimensionen (27 Prüfpunkte) – der Haupteinstieg, empfiehlt die nächsten Bausteine |
| **1 · Fundament** | 👥 Governance & Rollen | 8-Fragen-Reifegrad-Check (gewichtet auf 100) + RACI-Matrix aus den Datendomänen. Der Fragebogen ist **unabhängig vom Inventar** und sofort ausfüllbar |
| **2 · Asset Management** | 📦 Dateninventar | DatenGraf-CSV importieren, Datenflüsse zu DCAT-AP.de-Datasets verdichten, Metadaten ergänzen, Qualität prüfen, als JSON-LD/CSV exportieren |
| **3 · Clearing** | 🚦 Risiko-Clearing | Rot/Gelb/Grün-Entscheidungsbaum je Datensatz – deterministisch, ohne ML |
| **3 · Pseudonymisierung** | 🛡️ Textbereinigung | Deutsche Verwaltungstexte strukturerhaltend von personenbezogenen Daten befreien, vollständig client-seitig |

Begleitend: 📊 **Status-Dashboard** auf der Startseite, 📚 **Wissens- & Methodik-Center** (Glossar, Rechtsgrundlagen, Modelle) und 📄 **Vorlagen & Musterdokumente** (Richtlinie, DSFA-Checkliste, Freigabe-Formulare, VVT-Auszug).

**Die DatenGraf-Brücke:** Das Row-Schema (`GRAF_COLUMNS` in `js/app.js`) ist 1:1 aus DatenGraf übernommen. So wird der Export des einen Tools ohne Konvertierung zum Import des anderen.

**Phase 4 (ETL/Container/CKAN) & Phase 5 (Feedback-Schleifen)** sind bewusst **kein** Self-Service-Tool, sondern ein Beratungs- und Workshop-Angebot → [nozilla.de/kontakt](https://nozilla.de/kontakt/).

---

## DCAT-AP.de

Das Inventar-Modul erzeugt zu jedem Datensatz Metadaten nach dem deutschen DCAT-AP.de-Profil – damit die Datasets durch [GovData](https://www.govdata.de/) und CKAN-basierte Portale geharvestet werden können.

**Pflichtfelder** (fehlen sie, meldet die Qualitätsprüfung einen Fehler):

| Feld | Zweck |
|---|---|
| `dct:title` | Titel des Datasets |
| `dct:description` | Beschreibung |
| `dct:publisher` → `foaf:Organization` | Veröffentlichende Stelle |
| `dcat:contactPoint` | Ansprechpartner (vCard) |
| `dct:accessRights` | Zugriffsrechte – als NAL-URI (PUBLIC / RESTRICTED / NON_PUBLIC) |
| `dct:license` | Lizenz aus dem DCAT-AP.de-Register – als offizielle Register-URI |

**Empfehlungsfelder** (fehlen sie, gibt es eine Warnung):

| Feld | Zweck |
|---|---|
| `dcat:theme` | Kategorie aus den 13 EU-Datenthemen – als NAL-URI, per Heuristik vorbelegt |
| `dcat:keyword` | Schlagwörter (kommagetrennt erfasst, als Array exportiert) |
| `dct:accrualPeriodicity` | Aktualisierungszyklus – als NAL-URI (CONT/DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUAL/IRREG/NEVER) |
| `dct:format` | Format der Distribution |
| `dcat:landingPage` / `dcat:accessURL` | Info- bzw. Zugriffs-URL |

Zusätzlich: `dct:identifier` (eindeutig, kollidierende Kennungen werden durchnummeriert) und `dcatde:sourceSystem` (Quellsystem aus der DatenGraf-Kartierung).

**Lizenz-Register:** 20 Lizenzen in zwei Gruppen – 14 **offene** (DL-DE BY/Zero, CC BY, CC0, CC BY-SA, GeoNutzV, Amtliches Werk nach § 5 UrhG, ODC-BY/ODbL/PDDL, GFDL …) und 6 eingeschränkte (NC-/ND-Varianten, geschlossen). Jede trägt ein `open`-Flag nach der Open Definition: **NC und ND gelten nicht als offen; Share-Alike ist offen, aber Copyleft.**

Die Ausgabe erfolgt als JSON-LD mit `@context` auf das DCAT-AP.de-Profil sowie als flache CSV-Liste. Kontrollierte Werte werden dabei als offizielle URIs geschrieben, nicht als Kurzcodes.

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

`deriveInventory(rows)` verdichtet die DatenGraf-Zeilen: Jede eindeutige `(Quelle | Datentyp)`-Kombination wird zu einem DCAT-AP.de-Dataset-Kandidaten. Vorbelegungen werden aus der Kartierung abgeleitet – `Schutzbedarf` → `dct:accessRights`, `Häufigkeit` → `dct:accrualPeriodicity`, Stichwort-Heuristik über Datentyp/Bereich/Quelle → `dcat:theme`. Felder, die DatenGraf nicht kennt (Lizenz, Schlagwörter, Info-URL), werden im UI nacherfasst.

Die Auswertung des Freitextfelds `Schutzbedarf` läuft über **eine** Funktion (`schutzKategorie`), die **Verneinungen zuerst** prüft: Eine reine Teilstring-Suche nach „öffentlich" würde „**Nicht** öffentlich" als `PUBLIC` einstufen und im Clearing automatisch **Grün** ergeben.

</details>

<details>
<summary><strong>3-Klassen-Clearing-Modell (Rot/Gelb/Grün)</strong></summary>

Eine geordnete, deterministische Regelmenge bildet die Freigabeempfehlung je Datensatz ab – ohne ML, vollständig nachvollziehbar. Besondere Kategorien nach Art. 9 DSGVO oder fehlende Rechtsgrundlage bei personenbezogenen Daten führen zu **Rot**; anonymisierbare personenbezogene Daten zu **Gelb** (erst nach Bearbeitung freigabefähig); rein öffentliche Daten zu **Grün**. Bei Unklarheit gilt der konservative Default **Gelb (manuelle Prüfung)**, nie Grün.

</details>

<details>
<summary><strong>Strukturerhaltende Pseudonymisierung</strong></summary>

**11 Muster** für DE-Verwaltungstexte ersetzen erkannte Entitäten durch konsistente Platzhalter (`[PERSON_1]`, `[ADRESSE_1]`, `[STEUERID_1]` …). Pro Entitätstyp ein Zähler + Map `Originalwert → Platzhalter`: gleicher Wert ⇒ immer derselbe Platzhalter, deterministisch über das ganze Dokument.

**Konservativ durch Kontext-Trigger:** Namen nur nach Anrede (optionale akademische Titel werden übersprungen, damit bei „Frau Dr. Anna Beispiel" nicht der Titel statt des Namens erfasst wird), Geburtsdaten nur nach „geb."/„geboren am", Steuer-ID und Kfz-Kennzeichen nur nach Schlüsselwort. Letzteres verhindert, dass Lizenz- und Normkürzel wie `DL-DE 2.0` oder `DIN-EN 1090` zerstört werden – eine Sperrliste scheidet aus, weil `DL` und `EN` echte Unterscheidungszeichen sind.

**Prioritätsgarantie durch Maskierung:** Nach jedem Muster werden dessen Treffer im Suchtext längengleich maskiert, bevor das nächste läuft; das greedy Telefon-Muster steht zuletzt. So kann es keine bereits erkannte PLZ oder Sozialversicherungsnummer mehr halb verschlucken. Die Platzhalter enthalten keine Kommas, Quotes oder Zeilenumbrüche – die CSV-Struktur bleibt erhalten.

Die Zuordnung Platzhalter ↔ Original lässt sich als CSV exportieren (für Reidentifizierung/Dokumentation). Eine **manuelle Nachkontrolle bleibt Pflicht**; die Grenzen der Erkennung sind im UI aufgelistet.

</details>

<details>
<summary><strong>RACI-Matrix & Reifegrad</strong></summary>

Acht gewichtete Fragen (Summe der Gewichte = 100) ergeben einen Reifegrad-Score von 0–100 mit Ampel: ab 80 „Reif", ab 50 „Im Aufbau", darunter „Lückenhaft". Der Fragebogen läuft **ohne Inventar** – er hängt allein an den Antworten.

Liegt ein Inventar vor, kommt die **RACI-Matrix** hinzu: Die Datendomänen werden aus Quellsystem bzw. Publisher abgeleitet, die Rollen folgen einem festen, transparenten Template (Owner = *Accountable*, Steward = *Responsible*, Fachbereich/IT = *Consulted*). Die Datenschutz-Spalte ist bei DSGVO-relevanten Domänen *Consulted*, sonst *Informed*. Rollen, deren zuständige Fragebogen-Frage nicht mit „Ja" beantwortet wurde, werden als Lücke markiert. Export als CSV und PDF/Druck-Bericht.

</details>

<details>
<summary><strong>Publish-Ready-Check statt reiner Vollständigkeits-%</strong></summary>

Die Prozentanzeige sagt nur, *wie viele* Felder gefüllt sind. Der dritte Inventar-Tab prüft zusätzlich die **Werte**: Ist die Lizenz nach der Open Definition offen? Stammen `accessRights`, `theme` und `accrualPeriodicity` aus dem kontrollierten Vokabular? Enthält der Ansprechpartner eine E-Mail-Adresse? Ist die Info-URL eine gültige http(s)-Adresse? Sind Titel und Beschreibung aussagekräftig lang?

Fehlende Pflichtfelder sind **Fehler** (rot), fehlende Empfehlungsfelder und Wertprobleme **Warnungen** (gelb). Die Karten sind nach Schwere sortiert, jede springt per Klick zur betroffenen Stelle im Inventar. Deterministisch, kein ML.

</details>

---

## Dateistruktur

```
datenlotse/
├── index.html                  # Einstiegspunkt – alle sieben Views in einer Datei
├── css/
│   ├── tokens.css              # Design-Tokens (mit DatenGraf synchron zu halten)
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
├── logo.svg                    # Marken-Logo (Topbar + Hero)
├── favicon.svg / .ico / *.png  # Favicon-Set
├── site.webmanifest            # PWA-Manifest
├── social-preview.svg          # Open-Graph-/Twitter-Vorschaubild
├── robots.txt / sitemap.xml    # SEO
├── CNAME                       # datenlotse.nozilla.net
├── CLAUDE.md                   # AI-Entwicklungs-Kontext & Architektur
├── SECURITY.md                 # Sicherheitsrichtlinie
├── LICENSE                     # GPL-3.0
└── README.md                   # Diese Datei
```

> **Cache-Busting:** Nach Änderungen an `app.js` **oder** am CSS die Versionsnummer in `index.html` erhöhen – sowohl an den `?v=N`-Parametern von Script und Stylesheets als auch an der sichtbaren `v{N}` im Footer. Sonst liefert GitHub Pages den alten Stand aus.

---

## Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](LICENSE).

---

<div align="center">

Ein Projekt von **[nozilla](https://nozilla.de)** — bits & bytes mit ❤

</div>
