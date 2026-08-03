const { test, expect } = require('@playwright/test');
const { openApp, loadSample, lastAlert, grabDownload } = require('./helpers');

test.describe('DCAT-AP.de-Export', () => {
  test('kontrollierte Werte werden als offizielle URIs serialisiert', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const ds = await page.evaluate(() => {
      const d = inventory.find(x => x.title === 'Baumkataster');
      Object.assign(d, {
        keywords: 'baum, kataster, grünflächen',
        landingPage: 'https://opendata.musterstadt.de/baumkataster',
      });
      d.distributions[0].license = 'dl-de/by-2-0';
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
      d.theme = ''; d.accrualPeriodicity = ''; d.accessRights = ''; d.landingPage = '';
      d.distributions = [{ title: '', format: '', accessURL: '', license: '' }];
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

test.describe('RDF/Turtle-Export', () => {
  /** Strukturprüfung ohne externe Bibliothek – die App bleibt abhängigkeitsfrei. */
  function pruefeTurtle(ttl) {
    const fehler = [];
    const zeilen = ttl.split('\n');

    // Alle benutzten Präfixe müssen deklariert sein
    const deklariert = new Set([...ttl.matchAll(/^@prefix\s+([a-z]+):/gm)].map(m => m[1]));
    const inhalt = zeilen.filter(z => !z.startsWith('@') && !z.startsWith('#')).join('\n');
    // Literale ausblenden, damit Text wie "z. B." nicht als Präfix gilt
    const ohneLiterale = inhalt.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const m of ohneLiterale.matchAll(/\b([a-z]+):[A-Za-z]/g)) {
      if (!deklariert.has(m[1])) fehler.push(`Präfix nicht deklariert: ${m[1]}`);
    }
    // Kein unescapter Zeilenumbruch bzw. Anführungszeichen in Literalen
    for (const m of inhalt.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
      if (m[0].includes('\n')) fehler.push('Zeilenumbruch in einem Literal');
    }
    // Ungerade Anzahl nicht-escapter Anführungszeichen ⇒ Literal nicht geschlossen
    const quotes = (inhalt.replace(/\\"/g, '').match(/"/g) || []).length;
    if (quotes % 2 !== 0) fehler.push('Ungleiche Anzahl Anführungszeichen');
    // Eckige Klammern (Blank Nodes) und Statement-Abschluss
    if ((inhalt.match(/\[/g) || []).length !== (inhalt.match(/\]/g) || []).length) {
      fehler.push('Unbalancierte Blank-Node-Klammern');
    }
    // IRIs dürfen keinen Leerraum enthalten
    for (const m of ohneLiterale.matchAll(/<([^>]*)>/g)) {
      if (/\s/.test(m[1])) fehler.push(`Leerraum in IRI: ${m[1]}`);
    }
    // Jedes Subjekt-Statement endet mit " ."
    const bloecke = inhalt.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    for (const b of bloecke) if (!b.endsWith(' .')) fehler.push(`Block nicht terminiert: ${b.slice(0, 40)}`);
    return fehler;
  }

  test('Beispieldaten erzeugen strukturell gültiges Turtle', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const ttl = await page.evaluate(() => buildDcatTurtle());
    expect(pruefeTurtle(ttl)).toEqual([]);
    expect(ttl).toContain('@base <https://beispiel.de/>');
    expect(ttl).toContain('a dcat:Catalog');
    expect((ttl.match(/a dcat:Dataset/g) || []).length).toBe(12);
    expect(errors).toEqual([]);
  });

  test('Sonderzeichen in Literalen werden escaped statt die Datei zu brechen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const ttl = await page.evaluate(() => {
      inventory[0].description = 'Zeile 1\nZeile "zwei" mit \\ Backslash\tund Tab';
      inventory[0].title = 'Titel mit "Zitat"';
      return buildDcatTurtle();
    });
    expect(pruefeTurtle(ttl)).toEqual([]);
    expect(ttl).toContain('\\n');
    expect(ttl).toContain('\\"zwei\\"');
    expect(ttl).toContain('\\\\');
  });

  test('Leerraum in einer URL bricht keine IRI', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const ttl = await page.evaluate(() => {
      inventory[0].landingPage = 'https://example.org/pfad mit leerzeichen';
      return buildDcatTurtle();
    });
    expect(pruefeTurtle(ttl)).toEqual([]);
    expect(ttl).toContain('pfad%20mit%20leerzeichen');
  });

  test('erweiterte Felder und kontrollierte Vokabulare erscheinen als URIs', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const ttl = await page.evaluate(() => {
      inventory[0].distributions[0].license = 'dl-de/by-2-0';
      Object.assign(inventory[0], {
        keywords: 'baum, kataster', theme: 'ENVI',
        issued: '2024-01-15', modified: '2024-06-01',
        temporalStart: '2023-01-01', temporalEnd: '2023-12-31',
        spatial: 'Stadt Musterstadt', geocodingKey: '05315000', geocodingLevel: 'gemeinde',
        contributorID: 'MUSTERSTADT',
      });
      return buildDcatTurtle();
    });
    expect(ttl).toContain('<http://publications.europa.eu/resource/authority/data-theme/ENVI>');
    expect(ttl).toContain('<http://dcat-ap.de/def/licenses/dl-by-de/2.0>');
    expect(ttl).toContain('<http://dcat-ap.de/def/politicalGeocoding/regionalKey/05315000>');
    expect(ttl).toContain('<http://dcat-ap.de/def/contributors/MUSTERSTADT>');
    expect(ttl).toContain('dcat:keyword "baum", "kataster"');
    expect(ttl).toContain('"2024-01-15"^^xsd:date');
    expect(ttl).toContain('dcat:startDate "2023-01-01"^^xsd:date');
    expect(pruefeTurtle(ttl)).toEqual([]);
  });

  test('Turtle und JSON decken dieselben Felder ab', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].distributions[0].license = 'cc-by-4.0';
      Object.assign(inventory[0], {
        keywords: 'a', theme: 'ENVI', issued: '2024-01-15',
        modified: '2024-06-01', temporalStart: '2023-01-01', temporalEnd: '2023-12-31',
        spatial: 'Musterstadt', geocodingKey: '05315000', geocodingLevel: 'kreis',
        contributorID: 'X', landingPage: 'https://example.org/a',
      });
      const json = JSON.stringify(dcatDataset(inventory[0]));
      return { json, ttl: turtleDataset(inventory[0]) };
    });
    // Jede URI aus dem JSON muss auch im Turtle stehen – sonst driften die Formate
    const uris = [...r.json.matchAll(/https?:\/\/[^"]+/g)].map(m => m[0]);
    expect(uris.length).toBeGreaterThan(5);
    for (const u of uris) expect(r.ttl).toContain(u);
  });

  test('Datensatz-IRI: landingPage schlägt die relative Basis', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].landingPage = '';
      const ohne = turtleDataset(inventory[0]).split('\n')[0];
      inventory[0].landingPage = 'https://opendata.musterstadt.de/melderegister';
      return { ohne, mit: turtleDataset(inventory[0]).split('\n')[0] };
    });
    expect(r.ohne).toBe('<dataset/stadt-musterstadt-einwohnermeldedaten>');
    expect(r.mit).toBe('<https://opendata.musterstadt.de/melderegister>');
  });

  test('Download liefert die .ttl-Datei', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const ttl = await grabDownload(page, () => page.locator('#btn-export-ttl').click());
    expect(ttl.name).toBe('datenlotse-inventar-dcat-ap-de.ttl');
    expect(ttl.text).toContain('a dcat:Catalog');
    expect(pruefeTurtle(ttl.text)).toEqual([]);
  });

  test('leeres Inventar löst keinen Download aus', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => showView('inventory'));
    let ausgeloest = false;
    page.on('download', () => { ausgeloest = true; });
    await page.locator('#btn-export-ttl').click();
    expect(ausgeloest).toBe(false);
  });
});

test.describe('DCAT-AP.de-Katalog einlesen', () => {
  test('Export-Round-Trip: eigener Katalog kommt vollständig zurück', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      Object.assign(inventory[0], {
        keywords: 'a, b', theme: 'ENVI', accrualPeriodicity: 'DAILY', accessRights: 'PUBLIC',
        landingPage: 'https://example.org/x', issued: '2024-01-15', modified: '2024-06-01',
        temporalStart: '2023-01-01', temporalEnd: '2023-12-31', spatial: 'Musterstadt',
        geocodingKey: '05315000', geocodingLevel: 'gemeinde', contributorID: 'MUSTERSTADT',
      });
      inventory[0].distributions = [
        { title: 'Jahresdatei', format: 'CSV', accessURL: 'https://example.org/a.csv', license: 'dl-de/by-2-0' },
        { title: '', format: 'JSON', accessURL: '', license: 'cc-zero' },
      ];
      const vorher = JSON.parse(JSON.stringify(inventory[0]));
      const katalog = JSON.stringify(buildDcatJSON());
      inventory = [];
      importDcatJSON(katalog);
      return { vorher, nachher: inventory.find(d => d.id === vorher.id), n: inventory.length };
    });

    expect(r.n).toBe(12);
    const felder = ['title', 'description', 'publisher', 'contactPoint', 'sourceSystem',
      'keywords', 'theme', 'accrualPeriodicity', 'accessRights', 'landingPage',
      'issued', 'modified', 'temporalStart', 'temporalEnd', 'spatial',
      'geocodingKey', 'geocodingLevel', 'contributorID'];
    for (const f of felder) expect(r.nachher[f], f).toBe(r.vorher[f]);
    // Beide Verteilungen inklusive Lizenz-id (nicht der URI)
    expect(r.nachher.distributions.length).toBe(2);
    expect(r.nachher.distributions[0].license).toBe('dl-de/by-2-0');
    expect(r.nachher.distributions[0].format).toBe('CSV');
    expect(r.nachher.distributions[1].license).toBe('cc-zero');
    expect(errors).toEqual([]);
  });

  test('NAL-URIs werden auf die Codes zurückgeführt', async ({ page }) => {
    await openApp(page);
    const d = await page.evaluate(() => dcatToDataset({
      'dct:identifier': 'x', 'dct:title': 'T',
      'dcat:theme': ['http://publications.europa.eu/resource/authority/data-theme/TRAN'],
      'dct:accrualPeriodicity': 'http://publications.europa.eu/resource/authority/frequency/MONTHLY',
      'dct:accessRights': 'http://publications.europa.eu/resource/authority/access-right/RESTRICTED',
      'dcatde:contributorID': 'http://dcat-ap.de/def/contributors/STADT',
      'dcatde:politicalGeocodingURI': 'http://dcat-ap.de/def/politicalGeocoding/regionalKey/05315000',
      'dcatde:politicalGeocodingLevelURI': 'http://dcat-ap.de/def/politicalGeocoding/Level/kreis',
      'dcat:distribution': [{ 'dct:license': 'http://dcat-ap.de/def/licenses/cc-by/4.0' }],
    }));
    expect(d.theme).toBe('TRAN');
    expect(d.accrualPeriodicity).toBe('MONTHLY');
    expect(d.accessRights).toBe('RESTRICTED');
    expect(d.contributorID).toBe('STADT');
    expect(d.geocodingKey).toBe('05315000');
    expect(d.geocodingLevel).toBe('kreis');
    expect(d.distributions[0].license).toBe('cc-by-4.0');
  });

  test('tolerantes Lesen: String, @id-Objekt und Array', async ({ page }) => {
    await openApp(page);
    const d = await page.evaluate(() => dcatToDataset({
      'dct:identifier': 'y',
      'dct:title': { '@value': 'Aus @value' },
      'dct:publisher': { '@type': 'foaf:Organization', 'foaf:name': 'Stadt X' },
      'dcat:contactPoint': { 'vcard:fn': 'Frau Y' },
      'dct:spatial': { 'skos:prefLabel': 'Musterstadt' },
      'dcat:keyword': ['a', 'b', 'c'],
      'dcat:landingPage': { '@id': 'https://example.org/z' },
      'dcat:distribution': { 'dct:format': 'CSV' },   // Einzelobjekt statt Array
    }));
    expect(d.title).toBe('Aus @value');
    expect(d.publisher).toBe('Stadt X');
    expect(d.contactPoint).toBe('Frau Y');
    expect(d.spatial).toBe('Musterstadt');
    expect(d.keywords).toBe('a, b, c');
    expect(d.landingPage).toBe('https://example.org/z');
    expect(d.distributions.length).toBe(1);
    expect(d.distributions[0].format).toBe('CSV');
  });

  test('unbekannte Vokabularwerte bleiben stehen und werden gemeldet', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const d = dcatToDataset({
        'dct:identifier': 'z', 'dct:title': 'T', 'dct:description': 'Beschreibung dazu',
        'dct:publisher': 'P', 'dcat:contactPoint': 'a@b.de',
        'dcat:theme': 'https://fremd.example/theme/XYZ',
        'dct:accessRights': 'GEHEIM',
        'dcat:distribution': [{ 'dct:license': 'https://fremd.example/lizenz' }],
      });
      return { theme: d.theme, access: d.accessRights, msgs: validateDataset(d).map(i => i.msg) };
    });
    // Nicht stillschweigend verwerfen – der Wert bleibt sichtbar
    expect(r.theme).toBe('https://fremd.example/theme/XYZ');
    expect(r.access).toBe('GEHEIM');
    expect(r.msgs.some(m => /Kategorie nicht aus dem EU-Datenthemen-Vokabular/.test(m))).toBe(true);
    expect(r.msgs.some(m => /Zugriffsrechte nicht aus dem kontrollierten Vokabular/.test(m))).toBe(true);
    expect(r.msgs.some(m => /Register unbekannt/.test(m))).toBe(true);
  });

  test('Import führt zusammen und bewahrt Clearing-Antworten', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0]._clearing = { pb: 'ja', art9: 'nein', recht: 'ja', anon: 'ja' };
      const schutz = inventory[0]._grafSchutzbedarf;
      const katalog = JSON.stringify({
        '@type': 'dcat:Catalog',
        'dcat:dataset': [
          { 'dct:identifier': inventory[0].id, 'dct:title': 'Neuer Titel aus dem Portal' },
          { 'dct:identifier': 'fremder-datensatz', 'dct:title': 'Fremd' },
        ],
      });
      importDcatJSON(katalog);
      return {
        n: inventory.length, titel: inventory[0].title,
        clearing: inventory[0]._clearing.anon, schutz: inventory[0]._grafSchutzbedarf === schutz,
        fremd: !!inventory.find(d => d.id === 'fremder-datensatz'),
      };
    });
    expect(r.n).toBe(13);
    expect(r.titel).toBe('Neuer Titel aus dem Portal');
    // Clearing und Schutzbedarf stehen nicht im Katalog und dürfen nicht verschwinden
    expect(r.clearing).toBe('ja');
    expect(r.schutz).toBe(true);
    expect(r.fremd).toBe(true);
  });

  test('fremde JSON-Dateien werden abgelehnt', async ({ page }) => {
    await openApp(page);
    expect(await page.evaluate(() => importDcatJSON('kein json'))).toBe(false);
    expect(await lastAlert(page)).toContain('JSON');
    expect(await page.evaluate(() => importDcatJSON('{"foo":1}'))).toBe(false);
    expect(await lastAlert(page)).toContain('DCAT-Katalog');
    expect(await page.evaluate(() => inventory.length)).toBe(0);
  });

  test('ein Einstieg erkennt CSV und JSON', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      const katalog = JSON.stringify(buildDcatJSON());
      const csv = buildInventoryCSV();
      inventory = [];
      importAnyFile(katalog);
      const nachJson = inventory.length;
      importAnyFile(csv);
      const nachCsv = inventory.length;
      importAnyFile('Quelle,QuelleOrganisation,Datentyp\nSys,Stadt,Typ\n');
      return { nachJson, nachCsv, nachGraf: inventory.length };
    });
    expect(r.nachJson).toBe(12);
    expect(r.nachCsv).toBe(12);   // dieselben ids – zusammengeführt, nicht verdoppelt
    expect(r.nachGraf).toBe(1);
  });
});
