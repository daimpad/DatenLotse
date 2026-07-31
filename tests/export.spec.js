const { test, expect } = require('@playwright/test');
const { openApp, loadSample, lastAlert, grabDownload } = require('./helpers');

test.describe('DCAT-AP.de-Export', () => {
  test('kontrollierte Werte werden als offizielle URIs serialisiert', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const ds = await page.evaluate(() => {
      const d = inventory.find(x => x.title === 'Baumkataster');
      Object.assign(d, {
        license: 'dl-de/by-2-0', keywords: 'baum, kataster, grünflächen',
        landingPage: 'https://opendata.musterstadt.de/baumkataster',
      });
      const cat = buildDcatJSON();
      return cat['dcat:dataset'].find(x => x['dct:title'] === 'Baumkataster');
    });
    expect(ds['dcat:theme']).toEqual(['http://publications.europa.eu/resource/authority/data-theme/ENVI']);
    expect(ds['dct:accrualPeriodicity']).toBe('http://publications.europa.eu/resource/authority/frequency/QUARTERLY');
    expect(ds['dct:accessRights']).toBe('http://publications.europa.eu/resource/authority/access-right/PUBLIC');
    expect(ds['dcat:distribution'][0]['dct:license']).toBe('http://dcat-ap.de/def/licenses/dl-by-de/2.0');
    expect(ds['dcat:keyword']).toEqual(['baum', 'kataster', 'grünflächen']);
    expect(ds['dct:publisher']['@type']).toBe('foaf:Organization');
    expect(errors).toEqual([]);
  });

  test('leere Felder erzeugen keine leeren URIs', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const leer = await page.evaluate(() => {
      const d = inventory[0];
      d.theme = ''; d.accrualPeriodicity = ''; d.accessRights = ''; d.license = ''; d.landingPage = '';
      const ds = buildDcatJSON()['dcat:dataset'][0];
      return {
        keys: Object.keys(ds),
        dist: Object.keys(ds['dcat:distribution'][0]),
      };
    });
    expect(leer.keys).not.toContain('dcat:theme');
    expect(leer.keys).not.toContain('dct:accessRights');
    expect(leer.dist).not.toContain('dct:license');
  });

  test('Katalog-Publisher folgt dem häufigsten Publisher', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const name = await page.evaluate(() => buildDcatJSON()['dct:publisher']['foaf:name']);
    expect(name).toBe('Stadt Musterstadt');
  });

  test('JSON- und CSV-Download werden ausgelöst', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));

    const json = await grabDownload(page, () => page.locator('#btn-export-json').click());
    expect(json.name).toBe('datenlotse-inventar-dcat-ap-de.json');
    expect(JSON.parse(json.text)['dcat:dataset'].length).toBe(12);

    const csv = await grabDownload(page, () => page.locator('#btn-export-csv').click());
    expect(csv.name).toBe('datenlotse-inventar.csv');
    expect(csv.text.split('\n').length).toBe(13);
  });
});

test.describe('Persistenz & Projektdatei', () => {
  test('LocalStorage-Schlüssel tragen das Präfix datenlotse_', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    expect(keys).toContain('datenlotse_inventory');
    expect(keys.every(k => k.startsWith('datenlotse_'))).toBe(true);
  });

  test('Inventar, Governance und Kompass überleben den Reload', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory[0].keywords = 'merker';
      governanceAnswers['owner'] = 'ja';
      kompassState['strategie.leitlinie'] = 'erfuellt';
      saveState();
    });
    await page.reload();
    await page.waitForFunction(() => inventory.length > 0);
    const wieder = await page.evaluate(() => ({
      kw: inventory[0].keywords,
      gov: governanceAnswers.owner,
      kom: kompassState['strategie.leitlinie'],
    }));
    expect(wieder).toEqual({ kw: 'merker', gov: 'ja', kom: 'erfuellt' });
  });

  test('„Gespeicherte Daten löschen“ räumt vollständig auf', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.locator('#sidebar-toggle-btn').click();
    await page.locator('#reset-data-btn').click();
    const leer = await page.evaluate(() => ({
      ls: Object.keys(localStorage).filter(k => k.startsWith('datenlotse_')).length,
      inv: inventory.length,
      gov: Object.keys(governanceAnswers).length,
    }));
    expect(leer).toEqual({ ls: 0, inv: 0, gov: 0 });
    await expect(page.locator('#dashboard')).toBeHidden();
  });

  test('Projekt-Round-Trip stellt den kompletten Stand wieder her', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const json = await page.evaluate(() => {
      inventory[0].keywords = 'projekt-merker';
      governanceAnswers['owner'] = 'teilweise';
      kompassState['strategie.leitlinie'] = 'teilweise';
      return buildProjectJSON();
    });
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('DatenLotse');
    // Regression v30: die Version war hartkodiert statt aus APP_VERSION
    expect(parsed.version).toBe(await page.evaluate(() => APP_VERSION));
    expect(parsed.data.grafRows.length).toBe(12);   // grafRows liegen NICHT im LocalStorage

    await page.evaluate(() => clearState());
    const ok = await page.evaluate(t => importProject(t), json);
    expect(ok).toBe(true);
    const wieder = await page.evaluate(() => ({
      inv: inventory.length, rows: grafRows.length,
      kw: inventory[0].keywords, gov: governanceAnswers.owner,
    }));
    expect(wieder).toEqual({ inv: 12, rows: 12, kw: 'projekt-merker', gov: 'teilweise' });
  });

  test('fremde und neuere Projektdateien werden abgelehnt', async ({ page }) => {
    await openApp(page);
    expect(await page.evaluate(() => importProject('kein json'))).toBe(false);
    expect(await lastAlert(page)).toContain('JSON');

    expect(await page.evaluate(() => importProject('{"app":"DatenGraf","data":{}}'))).toBe(false);
    expect(await lastAlert(page)).toContain('DatenLotse-Projekt');

    expect(await page.evaluate(() =>
      importProject(JSON.stringify({ app: 'DatenLotse', schema: 99, data: {} })))).toBe(false);
    expect(await lastAlert(page)).toContain('neueren');
  });

  test('Export ohne Daten meldet sich statt eine leere Datei zu erzeugen', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => exportProject());
    expect(await lastAlert(page)).toContain('noch keinen Stand');
  });

  test('Import füllt fehlende Teile defensiv', async ({ page }) => {
    await openApp(page);
    const ok = await page.evaluate(() =>
      importProject(JSON.stringify({ app: 'DatenLotse', schema: 1, data: { inventory: null } })));
    expect(ok).toBe(true);
    const state = await page.evaluate(() => ({
      inv: Array.isArray(inventory), rows: Array.isArray(grafRows),
      gov: typeof governanceAnswers, kom: typeof kompassState,
    }));
    expect(state).toEqual({ inv: true, rows: true, gov: 'object', kom: 'object' });
  });
});
