<img width="auto" height="150" alt="DatenLotse Logo" src="https://raw.githubusercontent.com/daimpad/datenlotse/main/logo.svg" />

# DatenLotse – von der Datenkartierung zur Open-Data-Umsetzung

**DatenLotse** ist ein browserbasiertes, datenbankfreies Werkzeug, das Organisationen vom kartierten Datenökosystem in die konkrete Open-Data-Umsetzung führt – Behörden, die einer Veröffentlichungspflicht unterliegen, ebenso wie Vereine, Stiftungen und Initiativen, die freiwillig offenlegen oder umgekehrt an Daten kommen wollen. Es ist das Schwester-Tool zu [DatenGraf](https://datengraf.nozilla.net/): Wo DatenGraf zeigt, *wie* die Datenflüsse aussehen, beantwortet DatenLotse die Frage *„Was tue ich jetzt konkret?"* – Dateninventar nach DCAT-AP.de aufbauen, Risiken klären, Texte datenschutzkonform pseudonymisieren. Alles läuft lokal im Browser: kein Server, kein Account, **Ihre Inhalte werden nicht übertragen**.

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

> **Externe Aufrufe:** genau einer – eine anonyme Seitenzählung (GoatCounter), ohne Cookies, ohne Kennung, ohne geräteübergreifendes Verfolgen. Sie sieht Adresse, Referrer, Bildschirmgröße und Land. **Inhalte können nicht abfließen**, weil die App nie Zustand in die URL schreibt: es gibt genau eine Adresse. Ein Test hält beides fest – die Liste der erlaubten Hosts und die URL-Freiheit. Die statischen Wissensseiten laden gar kein JavaScript.

## Features

| | Feature | Beschreibung |
|---|---|---|
| 🗺️ | **Onboarding-Rundgang** | Elf Schritte durch alle Bausteine – der Rundgang wechselt selbst in die passende Ansicht und hebt hervor, worum es gerade geht. Wird **angeboten statt aufgedrängt** (wegklickbarer Hinweis, jederzeit über die Seitenleiste wiederholbar); Schritte, die Daten brauchen, bieten den Beispielimport an, statt ihn heimlich auszuführen |
| 📈 | **Kompass-Verlauf** | Reifegrad-Stände auf Knopfdruck festhalten und die Entwicklung als Balken samt Trend sehen – belegbarer Fortschritt gegenüber Leitung oder Gremium. Bewusst **kein automatischer Mitschnitt**: festgehalten wird, was man festhalten will |
| 🧭 | **Daten-Kompass** | Open-Data-Reifegrad-Checkliste nach anerkannten Modellen (ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de, DSGVO/FAIR, Data Orchard Data Maturity): **8 Dimensionen mit 33 Prüfpunkten**, Score + Ampel, Vorbelegung aus dem aktuellen Stand, adaptive Empfehlungen der nächsten Bausteine und PDF-Export – der Haupteinstieg |
| ⚖️ | **Rechtspflicht der Organisation** | Eine einzige, **optionale** Angabe: Unterliegt Ihre Organisation einem Informationsfreiheits- oder Open-Data-Gesetz? Wer *nein* wählt (Verein, Stiftung, gGmbH), bekommt den Prüfpunkt zu den Rechtsgrundlagen als *nicht relevant* vorbelegt – er zählt dann nicht in den Reifegrad –, keine Vorschläge zu hochwertigen Datensätzen, weil die EU-Verordnung dazu öffentliche Stellen bindet, und einen Fehler bei der Lizenz „Amtliches Werk nach § 5 UrhG", deren Lizenzfreiheit an der amtlichen Herkunft hängt und nicht an einer Entscheidung des Herausgebers. Bewusst **nicht** die Frage „Behörde oder NGO": dazwischen liegen Stadtwerke, Hochschulen und Belehnte, die ein Zwei-Wege-Schalter falsch einsortiert. Alles Übrige gilt unverändert |
| 🛡️ | **Re-Identifikationsrisiko (k-Anonymität)** | Bereinigte Spalten sagen, *was* ersetzt wurde – nicht, ob das Ergebnis noch auf einzelne Personen zurückführt. Diese Prüfung bildet Gruppen aus den Merkmalen, die Sie wählen, und zählt, wie viele Zeilen in der kleinsten Gruppe stehen (**k-Anonymität**); optional misst sie die Vielfalt eines sensiblen Merkmals innerhalb dieser Gruppen (**l-Diversität**). Sie **misst nur** – generalisiert und unterdrückt wird nichts, denn das wäre eine Entscheidung über fremde Daten. Rein arithmetisch, kein ML |
| 🔗 | **DatenGraf-CSV-Import** | Liest exakt das CSV-Schema, das DatenGraf exportiert – die Datenkartierung wird ohne Umweg zur Umsetzungsgrundlage |
| 📦 | **Dateninventar (DCAT-AP.de)** | Aus jedem Datenfluss wird ein Dataset-Kandidat abgeleitet und in editierbaren Karten dargestellt: Beschreibung, Publisher, Ansprechpartner, **Kategorie** (EU-Datenthemen), **Schlagwörter**, Aktualisierungszyklus, **Lizenz** (volles DCAT-AP.de-Register), Zugriffsrechte und Info-/Zugriffs-URL – mit Live-Vollständigkeits-% in Ampelfarben. Dazu ein ausklappbarer Block **erweiterter DCAT-AP.de-Felder** (Veröffentlichungs-/Änderungsdatum, zeitliche und räumliche Abdeckung, Regionalschlüssel samt Gebietsebene, Kontributor-Kennung) und eine **Live-Vorschau des JSON-LD** je Datensatz. Der Export schreibt kontrollierte Werte als offizielle NAL-/Register-URIs |
| ✏️ | **Massenbearbeitung** | Mehrere Datensätze markieren und Publisher, Ansprechpartner, Lizenz, Kategorie, Zugriffsrechte, Zyklus oder Schlagwörter in einem Zug setzen – oder Einträge entfernen, die nicht ins Inventar gehören. „Alle auswählen" meint dabei die **sichtbare** Teilmenge, wirkt also mit den Filtern zusammen |
| 📥 | **DCAT-AP.de-Katalog einlesen** | Wer bereits veröffentlicht, braucht kein Erstinventar, sondern eine Prüfung des Bestands: einen vorhandenen JSON-LD-Katalog einlesen, gegen die Qualitätsprüfung halten und mit Clearing und Governance verbinden. Zusammengeführt über die `id` – bereits gegebene Clearing-Antworten bleiben |
| ♻️ | **Rückimport der Inventar-CSV** | Die exportierte Liste außerhalb bearbeiten (Tabellenkalkulation, Zuarbeit aus den Fachbereichen) und wieder einlesen. Der Import **führt über die `id` zusammen statt zu ersetzen** – bereits gegebene Clearing-Antworten bleiben erhalten |
| 🗂️ | **Verteilungen je Datensatz** | Ein Datensatz kann in mehreren Formaten vorliegen – CSV *und* JSON *und* GeoJSON, je mit eigener Zugriffs-URL und Lizenz. Genau so modelliert es DCAT-AP.de; die Vollständigkeit verlangt entsprechend eine Lizenz **je** Verteilung |
| 📐 | **Metadaten-Güte (MQA)** | Statt gefüllte Pflichtfelder zu zählen, bewertet DatenLotse die Beschreibung graduell nach dem Schema der **Metadata Quality Assurance** von data.europa.eu: fünf FAIR-Dimensionen, 405 Punkte, 18 Prüfungen. Der Qualitäts-Tab zeigt, **wo** das Inventar schwach ist – „Auffindbarkeit 20 %" ist ein Arbeitsauftrag, ein Durchschnitt ist nur eine Zahl. ⚠️ Nicht identisch mit dem Wert des Portals: dort werden Adressen tatsächlich abgerufen, DatenLotse macht keine Netzaufrufe und prüft nur Vorhandensein und Wohlgeformtheit |
| 🔍 | **Suche, Filter & Sortierung** | Inventar live durchsuchen (Titel/Publisher/Quellsystem), nach Schutzbedarf, Clearing-Ampel oder **Publikationsreife** filtern und nach Titel, Vollständigkeit oder **Publikationsreife** sortieren – Editieren bleibt auch über gefilterten Teilmengen korrekt |
| 📊 | **Status-Dashboard** | Startseite zeigt – sobald Daten vorliegen – Live-Kennzahlen über alle Bausteine (Kompass-Reifegrad, Inventar-Anzahl & Ø-Vollständigkeit, Clearing-Ampelverteilung, Governance-Reifegrad) mit Schnellsprung direkt zum Weiterarbeiten |
| 📤 | **DCAT-Export (JSON-LD, RDF/Turtle, CSV)** | DCAT-AP.de-konformes JSON-LD (`dcat:Catalog`/`dcat:Dataset` mit `@context`) zum Harvesting durch GovData/CKAN, dieselbe Ausgabe als **RDF/Turtle** (`.ttl`, für Portale die RDF direkt harvesten) sowie eine flache CSV-Liste |
| 🪪 | **Lizenz-Wegweiser** | Zwei Fragen (Namensnennung? national/international?) führen deterministisch zur passenden **offenen** Lizenz (DL-DE-BY/-Zero, CC-BY, CC0) inkl. Begründung und amtlichem Link; auf Wunsch für alle Datensätze ohne Lizenz übernehmbar. Das vollständige Register mit **20 Lizenzen** steht im Inventar-Dropdown |
| ⚖️ | **Lizenz-Kompatibilität** | Zwei Bestände zusammenführen? Die Prüfung benennt, welche Pflichten sich aus beiden Lizenztexten ergeben und wo sie einander widersprechen – zwei verschiedene Copyleft-Lizenzen (CC BY-SA und ODbL) schließen sich gegenseitig aus, „keine Bearbeitung" schließt jede Zusammenführung aus, und NC färbt das Ergebnis so ein, dass es nicht mehr als offen gilt. Ausdrücklich ein Hinweis auf Grundlage der Lizenztexte, **keine Rechtsberatung** |
| 🔗 | **Konsistenzprüfung über den Bestand** | Findet, was der Blick auf den einzelnen Datensatz nicht sieht: doppelte Identifier, doppelte Titel, zweimal dieselbe Zugriffs-URL und Schreibvarianten beim Publisher. Gemeldet wird jeweils der Abweichler, mit Sprung zur betroffenen Karte |
| ⚖️ | **Hochwertige Datensätze (HVD)** | Für Datensätze, die unter die Durchführungsverordnung (EU) 2023/138 fallen, gelten **verbindliche** Vorgaben: kostenfrei, maschinenlesbar, über eine API, Lizenz nicht restriktiver als CC BY 4.0. Die Qualitätsprüfung meldet Verstöße deshalb als Fehler statt als Warnung. Zur Auswahl steht das **vollständige amtliche Vokabular** der EU-Publikationsstelle (96 Konzepte, gruppiert nach den sechs Kategorien) – die Spezifikation empfiehlt den genauesten Begriff. Das Werkzeug **schlägt eine Einstufung vor, nimmt sie aber niemandem ab**: ob die Verordnung greift, ist eine Rechtsfrage |
| ✅ | **DCAT-AP.de-Qualitätsprüfung** | Publish-Ready-Check je Datensatz: fehlende Pflichtfelder als **Fehler**, fehlende Empfehlungsfelder und Werteprüfungen (offene Lizenz, kontrolliertes Vokabular, E-Mail im Ansprechpartner) als **Warnungen** – mit Ampel-Übersicht und direktem Sprung zum Bearbeiten im Inventar |
| 📚 | **Wissens- & Methodik-Center** | In-App-Nachschlagewerk mit Live-Filter über alles: **20 Glossar-Begriffe**, **11 Rechtsgrundlagen** (Bund/EU mit amtlichen Links zu gesetze-im-internet.de bzw. EUR-Lex, inklusive der HVD-Durchführungsverordnung), **alle 16 Landesregelungen** (Transparenz- vs. Informationsfreiheitsgesetz, jeweils mit amtlicher Fundstelle und eigenem Bundesland-Filter), **kommunale Informationsfreiheitssatzungen** für die Länder ohne Landesgesetz, **9 Prüfwerkzeuge & Normtexte** (offizieller EU-SHACL-Validator, DCAT-AP.de-Spezifikation und Konventionenhandbuch, GovData-Metadatenschema, Musterdatenkatalog, ARX, OParl, Initiative Transparente Zivilgesellschaft, Praxisleitfaden zu offenen Daten der Zivilgesellschaft) und die **7 Reifegrad-Modelle** hinter dem Kompass – lokal, ausdrücklich keine Rechtsberatung. Die Landesgesetze stehen bewusst in **beiden Leserichtungen** da: als Veröffentlichungspflicht der informationspflichtigen Stelle *und* als Werkzeug, mit dem alle anderen an Daten kommen, die noch nicht offen liegen |
| 🧾 | **Status auf einen Blick** | Einseitige Zusammenfassung über alle Bausteine – Reifegrade, Inventar, Publikationsreife, Clearing-Verteilung und die nächsten Schritte. Für Leitungsrunden und Gremien; funktioniert auch ohne Inventar, weil der leere Stand ebenfalls eine Aussage ist |
| 🔒 | **Eigene Datenschutzerklärung** | Unter `/datenschutz/`, aus demselben Generator wie die Wissensseiten. Sie beschreibt, was das Werkzeug wirklich tut: Local Storage statt Server, GitHub Pages als Hoster samt US-Transfer, die anonyme Seitenzählung mit dem, was sie sieht und was nicht, keine Cookies, keine Schriften-CDN, kein KI-Dienst – und der Hinweis, dass sich all das im Quelltext nachprüfen lässt |
| 📄 | **Vorlagen & Musterdokumente** | Fertige Dokumente lokal erzeugt: Open-Data-Richtlinie und DSFA-Kurz-Checkliste (Muster) sowie aus dem Inventar generierte Veröffentlichungs-Freigabe-Formulare und ein VVT-Auszug der DSGVO-relevanten Datensätze – als PDF druckbar oder als Markdown/CSV ladbar |
| 📝 | **Notiz zur Clearing-Entscheidung** | Die automatische Begründung sagt, warum die Ampel so steht – für die Akte lässt sich je Datensatz eine eigene Notiz ergänzen (Abstimmung mit dem Datenschutz, vereinbarte Auflage). Sie geht nicht in den Entscheidungsbaum ein und erscheint im Bericht und im Freigabeformular |
| 🚦 | **Clearing-Ampel (Rot-Gelb-Grün)** | Transparenter, deterministischer Entscheidungsbaum je Datensatz (Schutzbedarf-Vorbelegung, Art.-9-/Rechtsgrundlage-/Anonymisierbarkeit-Prüfung) mit nachvollziehbarer Begründung, Gesamtübersicht und Ampel-Spalte im CSV-Export |
| 🛡️ | **Client-Side-Pseudonymisierung** | Strukturerhaltende, deterministische Bereinigung deutschsprachiger Texte über **11 Muster**: Name (anrede-getriggert, akademische Titel werden übersprungen), Adresse, PLZ+Ort, Aktenzeichen/Geschäftszeichen, IBAN, E-Mail, Telefon, Geburtsdatum, Steuer-ID und Kfz-Kennzeichen (beide kontextgetriggert), Sozialversicherungsnummer. Konsistente Platzhalter, Mapping-Tabelle samt **CSV-Export** – rein per Regex, nichts verlässt den Browser |
| 🧮 | **Spaltenweise CSV-Bereinigung** | Zweiter Modus für strukturierte Daten: CSV laden, je Spalte entscheiden – unverändert lassen, Muster erkennen oder **ganze Spalte ersetzen** (für Spalten wie „Name", die ohne Anrede kein Muster auslösen). Gleiche Werte erhalten zeilenübergreifend denselben Platzhalter; die CSV-Struktur bleibt erhalten und das Ergebnis ist wieder importierbar |
| 👥 | **Governance & RACI** | 8-Fragen-Reifegrad-Check (gewichtet, 0–100, **auch ohne Inventar nutzbar**) + automatisch aus dem Inventar abgeleitete RACI-Matrix (Domänen × Rollen) mit Lücken-Markierung; Export als CSV und PDF/Druck-Bericht. Jede Frage lässt sich als **„nicht relevant"** abwählen und fällt dann aus der Wertung, statt mit 0 zu zählen – wer nach § 38 BDSG rechtmäßig keine Datenschutzbeauftragte hat, bekommt dafür keinen Abzug |
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

### Erzeugte Dateien neu bauen

Zwei Teile des Auslieferungsstands werden aus den Daten der App erzeugt und liegen mit im Repo. Beide haben einen Test, der rot wird, wenn jemand die Quelle ändert und nicht neu baut.

```bash
npm run wissen        # statische Seiten unter /wissen/ und /datenschutz/ + sitemap.xml
npm run icons         # Font Awesome auf die verwendeten Icons zuschneiden
```

**Wissensseiten:** die Inhalte des Wissens-Centers gibt es zusätzlich als eigenständige, crawlbare Seiten unter `/wissen/` – aus denselben Daten erzeugt, die auch die App rendert. Nach jeder Änderung an Glossar, Rechtsgrundlagen, Lizenzregister oder Kompass-Punkten neu bauen.

**Datenschutzerklärung:** `/datenschutz/` entsteht im selben Lauf. Sie hängt bewusst am Generator statt als lose Datei im Repo zu liegen, damit sie Seitengerüst, Sitemap und Veralterungsprüfung erbt. **Wenn sich am Verhalten der App etwas ändert – Speicherorte, externe Aufrufe, Hosting –, muss die Erklärung mit.** Der Text steht in `tools/generate-wissen.js` unter `eigenstaendigeSeiten()`.

**Icons:** Font Awesome bringt rund 1.900 Icons und 300 KB Schrift mit; DatenLotse benutzt knapp 80 davon. Ausgeliefert wird deshalb nur die Teilmenge (`assets/fonts/fa/icons.min.css`, `fa-*.subset.woff2`). Nach jedem neuen Icon im Markup neu bauen, sonst erscheint an seiner Stelle ein leeres Kästchen. Das Zuschneiden braucht einmalig `pip install fonttools brotli` – die App und die Tests nicht.

### Option C – eigene DatenGraf-CSV verwenden

DatenLotse liest exakt das Schema, das DatenGraf via Export erzeugt:

```
Quelle,QuelleAbteilung,QuelleBereich,QuelleOrganisation,QuelleRolle,
Beziehung,Ziel,Datentyp,Häufigkeit,Format,Schutzbedarf,Erfassungsart,Anmerkungen,Ansprechpartner
```

Importieren Sie Ihre Datei über den Button **DatenGraf-CSV importieren**. Jede eindeutige `(Quelle | Datentyp)`-Kombination wird zu einem DCAT-AP.de-Dataset-Kandidaten.

### Option D – Tests ausführen

Die App selbst bleibt abhängigkeitsfrei; für die Tests wird einmalig Playwright installiert.

```bash
npm install                      # nur Dev: @playwright/test
npx playwright install chromium
npm test                         # 376 Tests, ~150 s
npm run test:ui                  # interaktiver Modus
```

Getestet wird die **ausgelieferte** App – genau die Dateien, die GitHub Pages statisch serviert. Die Konfiguration startet den Webserver selbst, es muss also nichts vorab laufen. Die Suite deckt Import und Ableitung, Inventar und Qualitätsprüfung, Risiko-Clearing, Pseudonymisierung, Governance und Kompass, Exporte und Persistenz sowie Barrierefreiheit und Responsive-Verhalten ab; jeder frühere Review-Befund ist als Regressionstest hinterlegt. CI läuft bei jedem Push auf `main` und jedem Pull Request.

---

## Von der Map zur Umsetzung

DatenLotse begleitet den Weg von der fertigen DatenGraf-Karte in die operative Open-Data-Bereitstellung. **Die Phasen 1–3 sind vollständig gebaut und nutzbar:**

| Phase | Baustein | Was passiert |
|---|---|---|
| **Überblick** | 🧭 Daten-Kompass | Reifegrad-Standortbestimmung über 8 Dimensionen (33 Prüfpunkte) – der Haupteinstieg, empfiehlt die nächsten Bausteine |
| **1 · Fundament** | 👥 Governance & Rollen | 8-Fragen-Reifegrad-Check (gewichtet auf 100) + RACI-Matrix aus den Datendomänen. Der Fragebogen ist **unabhängig vom Inventar** und sofort ausfüllbar |
| **2 · Asset Management** | 📦 Dateninventar | DatenGraf-CSV importieren, Datenflüsse zu DCAT-AP.de-Datasets verdichten, Metadaten ergänzen, Qualität prüfen, als JSON-LD/CSV exportieren |
| **3 · Clearing** | 🚦 Risiko-Clearing | Rot/Gelb/Grün-Entscheidungsbaum je Datensatz – deterministisch, ohne ML |
| **3 · Pseudonymisierung** | 🛡️ Textbereinigung | Deutschsprachige Texte und CSV-Spalten strukturerhaltend von personenbezogenen Daten befreien und anschließend das Re-Identifikationsrisiko messen – vollständig client-seitig |

Begleitend: 📊 **Status-Dashboard** auf der Startseite, 📚 **Wissens- & Methodik-Center** (Glossar, Rechtsgrundlagen, Modelle) und 📄 **Vorlagen & Musterdokumente** (Richtlinie, DSFA-Checkliste, Freigabe-Formulare, VVT-Auszug).

**Die DatenGraf-Brücke:** Das Row-Schema (`GRAF_COLUMNS` in `js/app.js`) ist 1:1 aus DatenGraf übernommen. So wird der Export des einen Tools ohne Konvertierung zum Import des anderen.

**Phase 4 (ETL/Container/CKAN) & Phase 5 (Feedback-Schleifen)** sind bewusst **kein** Self-Service-Tool, sondern ein Beratungs- und Workshop-Angebot → [nozilla.de/kontakt](https://nozilla.de/kontakt/).

---

## Einsatzszenarien

**Standortbestimmung vor dem ersten Schritt.** Eine Kommune, ein Landkreis oder eine Fachbehörde will wissen, wie weit sie beim Thema offene Daten tatsächlich ist – nicht gefühlt, sondern entlang etablierter Modelle. Der Kompass liefert in einer Sitzung einen belastbaren Score mit Quellenangabe und einen priorisierten nächsten Schritt.

**Vorbereitung einer Veröffentlichung auf GovData oder einem Landesportal.** Aus der vorhandenen Datenkartierung entsteht ein DCAT-AP.de-konformer Katalog, der vor dem Harvesting auf Pflichtfelder, kontrollierte Vokabulare und Lizenzoffenheit geprüft wurde. Der typische Schmerzpunkt – Datensätze werden abgelehnt oder erscheinen unvollständig – wird nach vorn verlagert.

**Rollen- und Verantwortungsklärung.** Der Reifegrad-Check macht in acht Fragen sichtbar, wo Governance-Lücken sind; die abgeleitete RACI-Matrix gibt der Diskussion „wer ist eigentlich zuständig?" eine konkrete Grundlage statt einer Grundsatzdebatte.

**Risikoabschätzung vor der Freigabe.** Statt jeden Datensatz einzeln juristisch zu prüfen, sortiert die Ampel vor: Grün ist unstrittig, Rot ist gesperrt, und die Prüfkapazität konzentriert sich auf das Gelb. Weil der Entscheidungsbaum offengelegt ist, lässt sich das Ergebnis gegenüber Datenschutzbeauftragten und Rechtsamt begründen – was bei einem Modell mit undurchsichtiger Entscheidungslogik nicht möglich wäre.

**Vorbereitung von Freitext zur Veröffentlichung.** Protokolle, Bescheide, Anfragen, Freitextspalten aus Fachverfahren – überall dort, wo personenbezogene Angaben in unstrukturiertem Text stecken, nimmt die Textbereinigung den mechanischen Teil der Arbeit ab und dokumentiert, was ersetzt wurde. Als Vorstufe zur menschlichen Prüfung, nicht als deren Ersatz.

**Schulung und Befähigung.** Weil das Wissens-Center Begriffe, Rechtsgrundlagen und Methodik direkt neben dem Werkzeug hält, eignet sich DatenLotse für Workshops mit Fachbereichen, die den Standard nicht kennen – die Erklärung steht dort, wo die Arbeit stattfindet.

**Erzeugung der Verwaltungsdokumente.** Freigabeformular, VVT-Auszug, Richtlinienentwurf und DSFA-Checkliste entstehen aus dem bereits erfassten Stand, statt separat geschrieben zu werden.

**Freiwillige Transparenz jenseits der Pflicht.** Ein Verein, eine Stiftung oder eine gGmbH unterliegt keinem Informationsfreiheitsgesetz und arbeitet trotzdem an derselben Sache – etwa entlang der Initiative Transparente Zivilgesellschaft, die strukturell dasselbe ist wie ein Transparenzgesetz: ein fester Katalog, den man abarbeitet, nur eben freiwillig. Der Kompass rechnet dann nur, was zählbar ist (die Angabe zur Rechtspflicht nimmt die Punkte heraus, die ohne Pflicht nicht erreichbar sind), der Governance-Check lässt Fragen als *nicht relevant* abwählen, und `data/sample-verein.csv` zeigt einen Bestand mit Spenden, Verwendungsnachweisen, Ehrenamtsstunden und Wirkungskennzahlen statt Bürgeramt und Kämmerei.

**Sensible Kontexte allgemein.** Überall dort, wo ein Upload auf einen fremden Dienst ausscheidet – Personaldaten, Sozialdaten, Verschlusssachen-nahe Bestände –, ist die Local-First-Architektur nicht bloß angenehm, sondern die Bedingung dafür, das Werkzeug überhaupt einsetzen zu dürfen.

---

## Was DatenLotse bewusst *nicht* ist

- **Keine Rechtsberatung.** Alle Muster und Bewertungen sind Entscheidungshilfen ohne Gewähr; die fachliche und rechtliche Verantwortung bleibt beim Haus.
- **Kein Datenportal.** DatenLotse veröffentlicht nichts – es bereitet die Veröffentlichung vor.
- **Keine Pipeline.** Automatisierte Aktualisierung, ETL-Strecken und die technische Portal-Anbindung sind Phase 4 und 5: erklärt, aber nicht als Software geliefert.
- **Keine Erkennung mit maschinellem Lernen.** Weder Clearing noch Pseudonymisierung nutzen ein Modell. Das ist eine bewusste Entscheidung zugunsten von Nachvollziehbarkeit, Determinismus und der Zusage, dass nichts den Browser verlässt – und bedeutet zugleich, dass die Pseudonymisierung nur findet, was ihre Muster beschreiben. Die Nachkontrolle bleibt Pflicht.
- **Kein Ersatz für die Datenkartierung.** Die Ausgangsdaten kommen aus DatenGraf oder einer eigenen CSV im selben Schema.

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
| `dct:license` | Lizenz aus dem DCAT-AP.de-Register – **je Verteilung**, als offizielle Register-URI |
| `dcat:distribution` | Mindestens eine Verteilung je Datensatz (Format, Zugriffs-URL, Lizenz, optional Bezeichnung) |

**Empfehlungsfelder** (fehlen sie, gibt es eine Warnung):

| Feld | Zweck |
|---|---|
| `dcat:theme` | Kategorie aus den 13 EU-Datenthemen – als NAL-URI, per Heuristik vorbelegt |
| `dcat:keyword` | Schlagwörter (kommagetrennt erfasst, als Array exportiert) |
| `dct:accrualPeriodicity` | Aktualisierungszyklus – als NAL-URI (CONT/DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUAL/IRREG/NEVER) |
| `dct:format` | Format je Verteilung |
| `dcat:landingPage` / `dcat:accessURL` | Info- bzw. Zugriffs-URL |

**Erweiterte Felder** (optional, je Karte ausklappbar – gefüllt werden sie exportiert, leer bleiben sie weg):

| Feld | Zweck |
|---|---|
| `dct:issued` / `dct:modified` | Veröffentlichungs- und Änderungsdatum (JJJJ-MM-TT) |
| `dct:temporal` → `dcat:startDate`/`endDate` | Zeitliche Abdeckung des Datensatzes |
| `dct:spatial` → `dct:Location` | Räumliche Abdeckung als Klartext-Label |
| `dcatde:politicalGeocodingURI` | Aus dem amtlichen Regionalschlüssel gebildete Register-URI |
| `dcatde:politicalGeocodingLevelURI` | Gebietsebene (Bund/Land/Regierungsbezirk/Kreis/VG/Gemeinde) |
| `dcatde:contributorID` | Kontributor-Kennung; GovData vergibt sie bei der Anbindung. Als **Empfehlungsfeld** geführt – ohne sie harvestet GovData nicht, ein Pflichtfeld würde aber jedes bestehende Inventar schlagartig auf Rot setzen |

Zusätzlich: `dct:identifier` (eindeutig, kollidierende Kennungen werden durchnummeriert) und `dcatde:sourceSystem` (Quellsystem aus der DatenGraf-Kartierung).

**Live-Vorschau:** Jede Inventar-Karte zeigt auf Wunsch das JSON-LD, das für genau diesen Datensatz exportiert würde – erzeugt von derselben Funktion wie der Katalog-Export und bei jeder Eingabe sofort aktualisiert, damit Vorschau und Export nicht auseinanderlaufen können.

**Lizenz-Register:** 20 Lizenzen in zwei Gruppen – 14 **offene** (DL-DE BY/Zero, CC BY, CC0, CC BY-SA, GeoNutzV, Amtliches Werk nach § 5 UrhG, ODC-BY/ODbL/PDDL, GFDL …) und 6 eingeschränkte (NC-/ND-Varianten, geschlossen). Jede trägt ein `open`-Flag nach der Open Definition: **NC und ND gelten nicht als offen; Share-Alike ist offen, aber Copyleft.**

Die Ausgabe erfolgt als JSON-LD mit `@context` auf das DCAT-AP.de-Profil, als **RDF/Turtle** und als flache CSV-Liste. Kontrollierte Werte werden dabei als offizielle URIs geschrieben, nicht als Kurzcodes.

**Zum Turtle-Export:** DCAT-AP.de verlangt auflösbare Datensatz-URIs – und welche das sind, weiß nur die veröffentlichende Stelle. Der Export schreibt deshalb relative IRIs gegen ein `@base`, das in genau einer Zeile durch die eigene Adresse ersetzt wird; Datensätze mit eigener Info-/Zugriffs-URL nutzen diese direkt. Erfundene URIs wären hier schlechter als eine sichtbare Platzhalter-Zeile.

---

## Technischer Stack

| Technologie | Version | Zweck |
|---|---|---|
| **Vanilla JS** | ES2020+ | Gesamte Anwendungslogik ohne Framework, eine Datei (`js/app.js`) |
| **CSS Custom Properties** | — | Design-System mit Glasmorphismus, Tokens in `css/tokens.css` |
| **Inter** | lokal | Schriftart (latin + latin-ext, 400/500/600/700) |
| **Font Awesome** | 6.7.2 (lokal, zugeschnitten) | Icon-Library – ausgeliefert werden nur Solid und Regular als Teilmenge; die Brands-Familie steckte nur wegen des GitHub-Zeichens im Fuß in der Auslieferung und ist seit v45 ein Inline-SVG |
| **FileReader API** | — | Lokaler CSV-/Textimport ohne Upload |
| **LocalStorage API** | — | Persistenz ohne Backend |
| **Blob API** | — | DCAT-JSON-, CSV- und Text-Downloads |
| **Playwright** | 1.62 (nur Dev) | End-to-End-Tests gegen die ausgelieferte App |

> Keine Build-Tools, keine Runtime-Library nötig – nur HTML, CSS und JS. Inter und Font Awesome werden lokal aus `assets/fonts/` ausgeliefert, nicht per CDN. Der einzige externe Aufruf ist eine anonyme Seitenzählung (GoatCounter, ohne Cookies und ohne Kennung); Ihre Daten werden nicht übertragen – die App schreibt nie Zustand in die URL.

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

**11 Muster** für deutschsprachige Texte ersetzen erkannte Entitäten durch konsistente Platzhalter (`[PERSON_1]`, `[ADRESSE_1]`, `[STEUERID_1]` …). Pro Entitätstyp ein Zähler + Map `Originalwert → Platzhalter`: gleicher Wert ⇒ immer derselbe Platzhalter, deterministisch über das ganze Dokument.

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
<summary><strong>Publish-Ready-Check neben der Metadaten-Güte</strong></summary>

Die Prozentanzeige ist ein **gradueller** Wert nach dem MQA-Schema (fünf FAIR-Dimensionen, 405 Punkte) – sie sagt, wie gut ein Datensatz beschrieben ist, aber nicht, ob er durchs Harvesting kommt. Der dritte Inventar-Tab prüft deshalb zusätzlich **hart gegen die Werte**: Ist die Lizenz nach der Open Definition offen? Stammen `accessRights`, `theme` und `accrualPeriodicity` aus dem kontrollierten Vokabular? Enthält der Ansprechpartner eine E-Mail-Adresse? Ist die Info-URL eine gültige http(s)-Adresse? Sind Titel und Beschreibung aussagekräftig lang?

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
│   ├── sample-landkreis.csv    # Beispiel: fiktive Kreisverwaltung (12 Datensätze)
│   ├── sample-landesbehoerde.csv # Beispiel: fiktive Landesebene (12 Datensätze)
│   ├── sample-verein.csv       # Beispiel: fiktiver gemeinnütziger Träger (12 Datensätze)
│   └── template.csv            # Leere Vorlage zum eigenen Befüllen
├── tests/                      # Playwright-End-to-End-Tests (376 Tests in 14 Dateien)
│   ├── helpers.js              # openApp/loadSample/Download-Helfer
│   ├── smoke.spec.js           # Views, Routing, Dashboard, HTML-Validität, Anrede
│   ├── import.spec.js          # CSV-Parser, Ableitung, Formel-Injection
│   ├── inventory.spec.js       # Karten, Filter, MQA-Güte, Lizenz-Register & -Kompatibilität
│   ├── clearing.spec.js        # Entscheidungsbaum Modul 3a
│   ├── pseudonymize.spec.js    # Regex-Pack Modul 3b
│   ├── risiko.spec.js          # k-Anonymität & l-Diversität
│   ├── quality.spec.js         # DCAT-AP.de-Publish-Ready-Check
│   ├── governance.spec.js      # Modul 1, Kompass, Wissen, Vorlagen
│   ├── export.spec.js          # DCAT-URIs, Downloads, Persistenz
│   ├── a11y.spec.js            # Fokus, ARIA, Kontrast, Responsive
│   ├── hvd.spec.js             # hochwertige Datensätze (DVO (EU) 2023/138)
│   ├── tour.spec.js            # Onboarding-Rundgang, Schritt-Ziele
│   ├── seo.spec.js             # statische Wissensseiten, Metadaten, Sitemap
│   └── assets.spec.js          # Icon-Zuschnitt, Ladegewicht der Startseite
├── playwright.config.js        # Testkonfiguration (startet den Webserver selbst)
├── tools/
│   ├── generate-wissen.js      # erzeugt /wissen/ + sitemap.xml aus den App-Daten
│   └── build-icons.py          # schneidet Font Awesome auf die verwendeten Icons zu
├── wissen/                     # statische, crawlbare Wissensseiten (erzeugt)
├── datenschutz/                # eigene Datenschutzerklärung (erzeugt)
├── assets/
│   └── fonts/
│       ├── fa/all.min.css      # Font Awesome 6.7.2 – Quelle für den Zuschnitt
│       ├── fa/icons.min.css    # ausgeliefert: nur die verwendeten Icons (erzeugt)
│       ├── webfonts/           # Font Awesome woff2 – Original + *.subset.woff2 (erzeugt)
│       └── inter/              # Inter-Schriftdateien (woff2) + inter.css
├── .github/
│   ├── workflows/
│   │   ├── static.yml          # GitHub Pages Deployment
│   │   └── tests.yml           # Playwright-Tests (Push auf main + Pull Requests)
│   └── CONTRIBUTING.md         # Beitragsrichtlinien
├── logo.svg                    # Marken-Logo (Topbar + Hero)
├── favicon.svg / .ico / *.png  # Favicon-Set
├── site.webmanifest            # PWA-Manifest
├── social-preview.svg/.png     # Open-Graph-/Twitter-Vorschaubild (PNG wird ausgeliefert)
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
