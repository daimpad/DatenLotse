/**
 * Gemeinsame Test-Helfer.
 *
 * Wichtig für alle Specs: `js/app.js` deklariert seinen State mit `let`/`const`
 * auf Modulebene eines klassischen Scripts. Solche Bindings landen NICHT auf
 * `window` – in `page.evaluate()` muss deshalb der blanke Bezeichner benutzt
 * werden (`inventory`, nicht `window.inventory`). Funktionsdeklarationen sind
 * über beide Wege erreichbar.
 */

/** Sammelt Konsolenfehler und Seitenfehler einer Seite in ein Array. */
function collectErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return errors;
}

/**
 * Öffnet die App mit gestubbten Dialogen. `addInitScript` läuft vor jedem
 * Dokument – die Stubs überleben damit auch `page.reload()` (in einer früheren
 * Fassung gingen sie beim Reload verloren und der Test schlug scheinbar fehl).
 *
 * Aufgezeichnet werden Aufrufe unter `window.__dialogs`; `confirm` antwortet
 * standardmäßig mit `true`, `window.open` liefert ein Dummy-Fenster, damit die
 * Druck-Exporte keinen echten Tab öffnen.
 */
async function openApp(page, { confirmResult = true } = {}) {
  const errors = collectErrors(page);
  await page.addInitScript(({ confirmResult }) => {
    window.__dialogs = { alert: [], confirm: [], print: 0 };
    window.alert = msg => { window.__dialogs.alert.push(String(msg)); };
    window.confirm = msg => { window.__dialogs.confirm.push(String(msg)); return confirmResult; };
    // printDoc() prüft document.readyState und hängt sich sonst an 'load' –
    // ohne beides liefe der Druck-Pfad im Stub ins Leere.
    window.open = () => ({
      document: { open() {}, write() {}, close() {}, readyState: 'complete' },
      addEventListener() {},
      focus() {}, print() { window.__dialogs.print++; }, close() {},
    });
  }, { confirmResult });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof pseudonymize === 'function');
  return errors;
}

/** Lädt den mitgelieferten Beispieldatensatz und wartet, bis das Inventar steht. */
async function loadSample(page) {
  await page.evaluate(() => loadSampleData('data/sample-kommune.csv'));
  await page.waitForFunction(() => inventory.length > 0);
}

/** Liest die zuletzt per `alert()` gezeigte Meldung. */
function lastAlert(page) {
  return page.evaluate(() => {
    const a = window.__dialogs.alert;
    return a.length ? a[a.length - 1] : null;
  });
}

/** Fängt einen per `downloadBlob()` ausgelösten Download ab und liefert den Text. */
async function grabDownload(page, trigger) {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf-8') };
}

module.exports = { openApp, loadSample, collectErrors, lastAlert, grabDownload };
