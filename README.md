# DatenLotse

**Von der Datenökosystem-Map zur Open-Data-Umsetzung.**

DatenLotse ist das Operationalisierungs-Tool im Anschluss an [DatenGraf](https://datengraf.nozilla.net/). Wo DatenGraf zeigt, *wie* Datenflüsse in einer Organisation aussehen, führt DatenLotse durch den nächsten Schritt: Dateninventar aufbauen, Risiken klären, datenschutzkonform standardisieren und als Open Data bereitstellen.

- **URL:** https://datenlotse.nozilla.net/
- **Tech:** Vanilla HTML/CSS/JS, kein Build, kein Backend — alles lokal im Browser (gleiche Philosophie wie DatenGraf)
- **DSGVO:** Keine Datenübertragung. Verarbeitung ausschließlich client-seitig.

---

## Philosophie

> Eine Sache gut: Aus einer kartierten Map einen umsetzbaren Open-Data-Fahrplan machen.

- Single-File-App (`js/app.js`), wie DatenGraf
- Design-Tokens in `css/tokens.css` — **synchron mit DatenGraf halten**, nicht divergieren lassen
- Kein LLM-Chat im Kern. Strukturierte Fragebögen + Templates + Klassifikator. LLM höchstens opt-in (API-Key), wie bei DatenGraf

---

## Module (Phasen 1–3)

| Modul | Phase | Status | Inhalt |
|---|---|---|---|
| **2 Dateninventar** | Asset Management | **MVP / zuerst** | DatenGraf-CSV importieren → DCAT-AP.de-Metadaten ergänzen → Export JSON/CSV für GovData & CKAN |
| **3a Risiko-Clearing** | Clearing | Next | Rot/Gelb/Grün-Entscheidungsbaum je Datensatz |
| **3b Pseudonymisierung** | Clearing | Next | Client-Side-NER für DE-Verwaltungstexte, strukturerhaltend (`[PERSON_1]`) |
| **1 Governance** | Fundament | Zuletzt | Fragebogen → RACI-Matrix + Reifegrad-Ampel |

**Phase 4 (ETL/Container/CKAN) & Phase 5 (Feedback-Schleifen)** sind bewusst **kein** Self-Service-Tool, sondern Beratungs-/Workshop-Angebot (CTA → nozilla.de/kontakt).

---

## Bau-Reihenfolge (MVP-first)

1. **Modul 2** — Inventar-Import + DCAT-Export. Beweist sofort den Nutzen der DatenGraf-Verkettung. *(Andockpunkt: `importGrafCSV()` in `app.js` ist bereits da.)*
2. **Modul 3a** — Risiko-Ampel (billig, hoher gefühlter Wert)
3. **Modul 3b** — Pseudonymisierung (Marketing-Highlight; mit Regex-Pack starten, ML später)
4. **Modul 1** — Governance (auch als PDF-Template denkbar)

---

## Die DatenGraf-Brücke

DatenLotse importiert exakt das CSV-Format, das DatenGraf via `toCSV()` exportiert. Das Row-Schema (`GRAF_COLUMNS` in `app.js`) ist 1:1 übernommen. `deriveInventory()` mappt die Datenflüsse auf DCAT-AP.de-Dataset-Kandidaten.

**Wichtig:** Bei Schema-Änderungen in DatenGraf muss `GRAF_COLUMNS` hier mitgezogen werden.

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

`file://` funktioniert nicht (FileReader/fetch). Cache-Busting wie DatenGraf: `?v=N` in `index.html` erhöhen.

---

## Deployment

Custom Domain `datenlotse.nozilla.net`:

- **Netlify (empfohlen):** Repo verbinden → Custom Domain → DNS-CNAME `datenlotse` auf Netlify zeigen. Auto-Deploy bei Push.
- **GitHub Pages:** `CNAME`-Datei mit `datenlotse.nozilla.net` ins Repo + DNS-CNAME `datenlotse` → `daimpad.github.io`.

---

## TODO vor dem ersten Deploy

- [ ] Fonts lokal hosten (`assets/fonts/` aus DatenGraf übernehmen) — aktuell Font Awesome per CDN als Übergang
- [ ] Favicon-Set ergänzen
- [ ] `datengraf.nozilla.net`-Link prüfen (aktuelle DatenGraf-Domain einsetzen)
- [ ] Modul 2 (MVP) bauen
