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

  test('erweiterte DCAT-AP.de-Felder werden korrekt serialisiert', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const ds = await page.evaluate(() => {
      Object.assign(inventory[0], {
        issued: '2024-01-15', modified: '2024-06-01',
        temporalStart: '2023-01-01', temporalEnd: '2023-12-31',
        spatial: 'Stadt Musterstadt', geocodingKey: '05315000', geocodingLevel: 'gemeinde',
        contributorID: 'MUSTERSTADT',
      });
      return dcatDataset(inventory[0]);
    });
    expect(ds['dct:issued']).toBe('2024-01-15');
    expect(ds['dct:modified']).toBe('2024-06-01');
    expect(ds['dct:temporal']).toEqual({
      '@type': 'dct:PeriodOfTime', 'dcat:startDate': '2023-01-01', 'dcat:endDate': '2023-12-31',
    });
    expect(ds['dct:spatial']['skos:prefLabel']).toBe('Stadt Musterstadt');
    expect(ds['dcatde:politicalGeocodingURI'])
      .toBe('http://dcat-ap.de/def/politicalGeocoding/regionalKey/05315000');
    expect(ds['dcatde:politicalGeocodingLevelURI'])
      .toBe('http://dcat-ap.de/def/politicalGeocoding/Level/gemeinde');
    expect(ds['dcatde:contributorID'])
      .toBe('http://dcat-ap.de/def/contributors/MUSTERSTADT');
  });

  test('bereits vollständige contributorID-URI bleibt unverändert', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const uri = await page.evaluate(() => {
      inventory[0].contributorID = 'http://dcat-ap.de/def/contributors/EIGENE';
      return dcatDataset(inventory[0])['dcatde:contributorID'];
    });
    expect(uri).toBe('http://dcat-ap.de/def/contributors/EIGENE');
  });

  test('Vorschau in der Karte zeigt exakt den Export', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const karte = page.locator('.inv-card').first();
    await karte.locator('.inv-preview > summary').click();
    const gezeigt = await karte.locator('.inv-preview-json').textContent();
    const erwartet = await page.evaluate(() => JSON.stringify(dcatDataset(inventory[0]), null, 2));
    expect(gezeigt).toBe(erwartet);

    // Live mitziehen: sonst zeigt die Vorschau nicht mehr, was exportiert würde
    await karte.locator('[data-field="keywords"]').fill('vorschau-test');
    const danach = await karte.locator('.inv-preview-json').textContent();
    expect(JSON.parse(danach)['dcat:keyword']).toEqual(['vorschau-test']);
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
    // Auch die erweiterten Felder dürfen nicht als leere URI auftauchen
    for (const k of ['dct:issued', 'dct:modified', 'dct:temporal', 'dct:spatial',
                     'dcatde:politicalGeocodingURI', 'dcatde:politicalGeocodingLevelURI',
                     'dcatde:contributorID']) {
      expect(leer.keys).not.toContain(k);
    }
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
    for (const spalte of ['issued', 'modified', 'temporalStart', 'temporalEnd',
                          'spatial', 'geocodingKey', 'geocodingLevel', 'contributorID']) {
      expect(csv.text.split('\n')[0]).toContain(spalte);
    }
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
