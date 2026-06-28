# Security Policy – DatenLotse

## Datenschutz-Grundsatz: Local-First

**DatenLotse** ist eine **vollständig browserbasierte Anwendung ohne Backend**. Das hat direkte Sicherheitsimplikationen:

- **Keine Daten verlassen Ihr Gerät.** Alle importierten DatenGraf-CSVs, alle abgeleiteten Inventar-Einträge, alle Clearing-Ergebnisse und alle für die Pseudonymisierung eingegebenen Texte verbleiben ausschließlich im Browser (Speicher der laufenden Sitzung bzw. LocalStorage des Nutzers).
- **Kein Server, keine Datenbank, kein Account.** Es existiert keine serverseitige Komponente, die Nutzerdaten empfangen oder speichern könnte.
- **Kein Tracking, keine Telemetrie, keine externen Laufzeit-Aufrufe.** Die Anwendung sendet **keinerlei** Anfragen an Dritte. Schriften (Inter) und Icons (Font Awesome) werden **lokal** aus `assets/fonts/` ausgeliefert – kein CDN, keine Google Fonts, keine externe Bibliothek zur Laufzeit.

---

## Datenschutz bei der Textbereinigung (Modul 3b)

Die client-seitige Pseudonymisierung deutscher Verwaltungstexte findet **vollständig im Browser** statt:

- Der eingegebene oder hochgeladene Text wird **nicht** übertragen, nicht zwischengespeichert auf einem Server und nicht an einen Dienstleister weitergereicht.
- Es entsteht **keine Auftragsverarbeitung im Sinne des Art. 28 DSGVO** – es ist **kein AV-Vertrag** erforderlich, da kein Dritter Zugriff auf die Daten erhält.
- Die Erkennung beruht ausschließlich auf **Regex/Heuristik** – es wird **kein** ML-/NER-Modell geladen, weder lokal noch remote.

> **Hinweis zur Restmenge:** Regex-basierte Erkennung ist konservativ und erkennt **nicht** jeden personenbezogenen Bezug. Eine manuelle Nachkontrolle des bereinigten Texts ist vor jeder Veröffentlichung zwingend erforderlich.

---

## Unterstützte Versionen

Sicherheitsupdates werden ausschließlich für die aktuelle Version im `main`-Branch bereitgestellt.

| Version | Support |
|---|---|
| `main` (aktuell) | Aktiv |
| Ältere Commits | Kein Support |

---

## Bekannte Angriffsflächen

### XSS via CSV-Import

Da DatenLotse beliebige DatenGraf-CSVs einliest und deren Inhalt als HTML rendert, ist **Cross-Site Scripting (XSS)** die relevanteste Angriffsfläche. Alle Werte werden vor dem Einfügen in den DOM durch die Funktion `esc()` in `js/app.js` escaped:

```js
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

`esc()` escaped `&`, `<`, `>`, `"`. Werte, die in `textContent` geschrieben werden, sind bereits sicher und werden **nicht** zusätzlich escaped. Trotzdem könnten Bypässe existieren, etwa durch:

- Nicht gecoverte DOM-Einfüge-Pfade (z. B. `innerHTML` ohne `esc()`)
- Attribut-Injection in dynamisch generiertem HTML
- Prototype-Pollution beim CSV-Parsing

---

## Sicherheitslücke melden

Bitte melden Sie Sicherheitsprobleme **nicht** als öffentliches GitHub-Issue.

**Kontakt:** contact@nozilla.de

Bitte senden Sie folgende Informationen:

1. **Beschreibung** der Schwachstelle
2. **Reproduktionsschritte** (minimales CSV-/Text-Beispiel, Browser und Version)
3. **Mögliche Auswirkung** (welche Daten könnten betroffen sein?)
4. Optional: einen Vorschlag zur Behebung

Sie erhalten innerhalb von **5 Werktagen** eine Antwort. Öffentliche Bekanntmachung wird nach Abstimmung und Bereitstellung eines Fixes koordiniert (Responsible Disclosure).

---

## Nicht im Scope

Folgende Punkte sind **kein** Sicherheitsproblem im Kontext dieser Anwendung:

- Daten, die ein Nutzer bewusst selbst in das Tool eingibt (keine fremden Daten involviert)
- Fehlende HTTPS-Erzwingung (liegt beim Hosting-Anbieter / GitHub Pages)
- Fehlende Rate-Limits (kein Server vorhanden)
- Content Security Policy (CSP) des Hosting-Anbieters
- Unvollständige Treffer der Regex-basierten Pseudonymisierung (siehe Hinweis oben – manuelle Nachkontrolle ist Teil des vorgesehenen Workflows)
