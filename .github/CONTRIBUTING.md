# Beitragen zu DatenLotse

Vielen Dank für Ihr Interesse! Beiträge sind willkommen – egal ob Bugfix, neue Funktion oder Dokumentationsverbesserung.

## Einstieg

```bash
git clone https://github.com/daimpad/datenlotse.git
cd datenlotse
python3 -m http.server 8080   # lokaler Entwicklungsserver
```

Es sind keine Build-Tools, keine npm-Pakete und keine Transpiler erforderlich. Änderungen an `css/styles.css`, `css/tokens.css` oder `js/app.js` sind nach einem Browser-Reload sofort sichtbar.

> **Hinweis:** Die App muss über HTTP(S) geöffnet werden (`python3 -m http.server`), damit `FileReader`/`fetch()` und die Beispieldaten funktionieren. Ein direktes Öffnen als `file://` startet die App nicht korrekt.

## Wie man beiträgt

1. **Fork** des Repositories erstellen.
2. Feature-Branch anlegen: `git checkout -b feature/mein-feature`
3. Änderungen durchführen und committen.
4. Branch pushen: `git push origin feature/mein-feature`
5. **Pull Request** gegen `main` öffnen.

## Richtlinien

### Code-Stil

- **JS:** Kein Framework, kein Transpiler, kein Bundler. Vanilla ES2020+ (`const`, `let`, Arrow Functions, `async/await`, optional chaining). Die gesamte Logik liegt in **einer** Datei: `js/app.js`.
- **Keine externen Laufzeit-Bibliotheken.** Ziel sind null externe Runtime-Calls – Fonts werden lokal ausgeliefert. Insbesondere **keine** ML-/NER-/WASM-Bibliothek für die Pseudonymisierung (reines Regex-Pack).
- **CSS:** Nur Design-Tokens verwenden (`var(--c-accent)` etc.), nie hardcodierte Farben. Kernwerte liegen in `css/tokens.css` und sind mit DatenGraf synchron zu halten.
- **XSS:** Jeden in `innerHTML` eingesetzten Import-/Nutzerwert mit `esc(value)` escapen. Niemals `esc()` in `textContent`.
- **Cache-Busting:** Nach Änderungen an `app.js` die Version im Script-Tag (`js/app.js?v=N`) und im Footer erhöhen.
- Keine unnötigen Kommentare – gut gewählte Namen erklären den Code selbst.
- Keine neuen externen Abhängigkeiten ohne Diskussion im Issue.

### CSV-Schema (öffentliche API)

Das DatenGraf-CSV-Schema (`GRAF_COLUMNS` in `js/app.js`) ist die **öffentliche Schnittstelle** zwischen DatenGraf und DatenLotse. Spaltennamen dürfen **nicht** umbenannt werden; bei Schemaänderungen in DatenGraf ist `GRAF_COLUMNS` hier mitzuziehen.

### Commits

Bitte aussagekräftige Commit-Nachrichten mit Präfix verwenden:

```
feat: neue Funktion beschreiben
fix: Fehler und Ursache beschreiben
docs: Dokumentationsänderung
style: rein formale Änderungen (Einrückung, Leerzeichen)
refactor: Umstrukturierung ohne Verhaltensänderung
```

## Bugs melden

Bitte ein [Issue](https://github.com/daimpad/datenlotse/issues) öffnen und folgende Informationen angeben:

- Browser und Version
- Schritte zur Reproduktion
- Erwartetes vs. tatsächliches Verhalten
- Falls möglich: minimales CSV-/Text-Beispiel

## Lizenz

Mit einem Beitrag stimmen Sie zu, dass Ihr Code unter der [GPL-3.0-Lizenz](../LICENSE) dieses Projekts veröffentlicht wird.
