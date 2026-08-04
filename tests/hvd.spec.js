/**
 * Hochwertige Datensätze (HVD) – Durchführungsverordnung (EU) 2023/138.
 *
 * Der Sonderfall im Werkzeug: überall sonst gilt „offen ist besser", hier gilt
 * „so und nicht anders". Deshalb prüfen diese Tests vor allem, dass Verstöße
 * als **Fehler** ankommen und nicht als Warnung – und dass die Einstufung
 * niemals automatisch passiert.
 */
const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

/** HVD-tauglicher Datensatz: öffentlich, maschinenlesbar, CC BY 4.0, mit API. */
const HVD_OK = {
  id: 'musterstadt-adressdaten',
  title: 'Adressdaten', description: 'Amtliche Hauskoordinaten des Stadtgebiets.',
  publisher: 'Stadt Musterstadt', contactPoint: 'Frau Wagner (opendata@musterstadt.de)',
  accessRights: 'PUBLIC', theme: 'REGI', keywords: 'adressen, geobasis',
  accrualPeriodicity: 'QUARTERLY', contributorID: 'MUSTERSTADT',
  landingPage: 'https://opendata.musterstadt.de/adressen',
  hvd: 'georaum', hvdCategoryURI: 'http://data.europa.eu/bna/c_beispiel',
  distributions: [{ title: '', format: 'GeoJSON', accessURL: 'https://api.musterstadt.de/adressen', license: 'cc-by-4.0' }],
};
const mit = patch => ({ ...HVD_OK, ...patch });
const mitDist = patch => ({ ...HVD_OK, distributions: [{ ...HVD_OK.distributions[0], ...patch }] });

/** Nur die HVD-Befunde einer Prüfung. */
async function hvd(page, d) {
  return page.evaluate(x => hvdIssues(x), d);
}

test.describe('HVD – Einstufung', () => {
  test('ohne Einstufung greift keine einzige HVD-Regel', async ({ page }) => {
    await openApp(page);
    // Derselbe Datensatz, der als HVD durchfällt, ist ohne Einstufung sauber
    const schlecht = mitDist({ license: 'cc-by-sa-4.0' });
    expect(await hvd(page, { ...schlecht, hvd: '' })).toEqual([]);
    expect((await hvd(page, schlecht)).length).toBeGreaterThan(0);
  });

  test('Beispieldaten werden nicht automatisch eingestuft', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    // Die Einstufung ist eine Rechtsentscheidung – das Werkzeug schlägt vor,
    // es setzt nichts. Nach einem Import darf kein Eintrag `hvd` tragen.
    const gesetzt = await page.evaluate(() => inventory.filter(d => d.hvd).length);
    expect(gesetzt).toBe(0);
    // Vorschläge gibt es trotzdem
    expect(await page.evaluate(() => hvdVorschlaege().length)).toBeGreaterThan(0);
  });

  test('Vorschläge lassen personenbezogene Bestände aus', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const dsgvo = await page.evaluate(() =>
      hvdVorschlaege().filter(v => schutzKategorie(v.d._grafSchutzbedarf) === 'dsgvo').length);
    expect(dsgvo).toBe(0);
  });

  test('Vorschlag greift nicht mehr, sobald eingestuft wurde', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      const vor = hvdVorschlaege();
      if (!vor.length) return null;
      const idx = vor[0].idx;
      inventory[idx].hvd = 'statistik';
      return { vorher: vor.length, nachher: hvdVorschlaege().length };
    });
    expect(r).not.toBeNull();
    expect(r.nachher).toBe(r.vorher - 1);
  });

  test('unbekannte Kategorie wird gemeldet und stoppt die weitere Prüfung', async ({ page }) => {
    await openApp(page);
    const issues = await hvd(page, mit({ hvd: 'phantasie' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].sev).toBe('warn');
    expect(issues[0].msg).toContain('2023/138');
  });
});

test.describe('HVD – verbindliche Vorgaben', () => {
  test('konformer Datensatz erzeugt keinen HVD-Befund', async ({ page }) => {
    await openApp(page);
    expect(await hvd(page, HVD_OK)).toEqual([]);
  });

  test('Weitergabe unter gleichen Bedingungen ist ein Fehler, kein Nörgeln', async ({ page }) => {
    await openApp(page);
    // CC BY-SA ist nach `licenseIsOpen()` zu Recht offen – für hochwertige
    // Datensätze aber zu einschränkend. Beides muss nebeneinander stimmen.
    const offen = await page.evaluate(() => licenseIsOpen('cc-by-sa-4.0'));
    expect(offen).toBe(true);
    const issues = await hvd(page, mitDist({ license: 'cc-by-sa-4.0' }));
    expect(issues.some(i => i.sev === 'error' && /Lizenz/.test(i.msg))).toBe(true);
  });

  test('alle zulässigen Lizenzen kommen ohne Befund durch', async ({ page }) => {
    await openApp(page);
    const erlaubt = await page.evaluate(() => HVD_LICENSES);
    for (const id of erlaubt) {
      const issues = await hvd(page, mitDist({ license: id }));
      expect(issues, `Lizenz ${id} sollte für HVD zulässig sein`).toEqual([]);
    }
  });

  test('eingeschränkte Zugriffsrechte sind ein Fehler', async ({ page }) => {
    await openApp(page);
    for (const wert of ['RESTRICTED', 'NON_PUBLIC']) {
      const issues = await hvd(page, mit({ accessRights: wert }));
      expect(issues.some(i => i.sev === 'error' && /PUBLIC/.test(i.msg)), wert).toBe(true);
    }
  });

  test('PDF allein genügt nicht als maschinenlesbares Format', async ({ page }) => {
    await openApp(page);
    const issues = await hvd(page, mitDist({ format: 'PDF' }));
    expect(issues.some(i => i.sev === 'error' && /maschinenlesbar/.test(i.msg))).toBe(true);
    // Mit einer zweiten, maschinenlesbaren Verteilung ist die Pflicht erfüllt
    const zwei = {
      ...HVD_OK,
      distributions: [
        { ...HVD_OK.distributions[0], format: 'PDF' },
        { ...HVD_OK.distributions[0], format: 'CSV' },
      ],
    };
    expect(await hvd(page, zwei)).toEqual([]);
  });

  test('fehlende Zugriffs-URL ist eine Warnung (API-Pflicht)', async ({ page }) => {
    await openApp(page);
    const issues = await hvd(page, mitDist({ accessURL: '' }));
    expect(issues.some(i => i.sev === 'warn' && /API/.test(i.msg))).toBe(true);
  });

  test('HVD-Befunde färben die Ampel rot', async ({ page }) => {
    await openApp(page);
    const status = await page.evaluate(d => qualityStatus(validateDataset(d)),
      mitDist({ license: 'cc-by-sa-4.0' }));
    expect(status).toBe('rot');
  });
});

test.describe('HVD – Export', () => {
  test('Kennzeichnung und Kategorie werden nur gemeinsam geschrieben', async ({ page }) => {
    await openApp(page);
    // Ohne Kategorie-URI bliebe der Datensatz beim Harvesting in der
    // SHACL-Validierung hängen – dann lieber gar keine HVD-Angabe.
    const ohne = await page.evaluate(d => dcatDataset(d), mit({ hvdCategoryURI: '' }));
    expect(ohne['dcatap:hvdCategory']).toBeUndefined();
    expect(ohne['dcatap:applicableLegislation']).toBeUndefined();

    const mitUri = await page.evaluate(d => dcatDataset(d), HVD_OK);
    expect(mitUri['dcatap:hvdCategory']).toBe(HVD_OK.hvdCategoryURI);
    expect(mitUri['dcatap:applicableLegislation']).toBe('http://data.europa.eu/eli/reg_impl/2023/138/oj');
  });

  test('Turtle bildet dieselbe Aussage ab wie JSON-LD', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(d => {
      inventory = [d];
      return { ttl: buildDcatTurtle(), json: JSON.stringify(buildDcatJSON()) };
    }, HVD_OK);
    expect(r.ttl).toContain('@prefix dcatap: <http://data.europa.eu/r5r/>');
    expect(r.ttl).toContain('dcatap:applicableLegislation <http://data.europa.eu/eli/reg_impl/2023/138/oj>');
    expect(r.ttl).toContain(`dcatap:hvdCategory <${HVD_OK.hvdCategoryURI}>`);
    expect(r.json).toContain(HVD_OK.hvdCategoryURI);
  });

  test('Round-Trip über die Inventar-CSV erhält die Einstufung', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(d => {
      inventory = [d];
      const csv = buildInventoryCSV();
      inventory = [];
      importInventoryCSV(csv);
      return { hvd: inventory[0].hvd, uri: inventory[0].hvdCategoryURI };
    }, HVD_OK);
    expect(r.hvd).toBe('georaum');
    expect(r.uri).toBe(HVD_OK.hvdCategoryURI);
  });

  test('Katalog-Import übernimmt die Kategorie-URI, statt sie zu verwerfen', async ({ page }) => {
    await openApp(page);
    const uri = await page.evaluate(() => {
      inventory = [];
      importDcatJSON(JSON.stringify({
        '@type': 'dcat:Catalog',
        'dcat:dataset': [{
          '@type': 'dcat:Dataset', 'dct:identifier': 'x', 'dct:title': 'Adressdaten',
          'dcatap:applicableLegislation': { '@id': 'http://data.europa.eu/eli/reg_impl/2023/138/oj' },
          'dcatap:hvdCategory': { '@id': 'http://data.europa.eu/bna/c_unbekannt' },
        }],
      }));
      return inventory[0].hvdCategoryURI;
    });
    expect(uri).toBe('http://data.europa.eu/bna/c_unbekannt');
  });
});

test.describe('HVD – Oberfläche', () => {
  test('der Pflichtenblock erscheint erst mit der Einstufung', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const block = page.locator('.inv-card').first().locator('.inv-hvd');
    await expect(block).toBeHidden();
    await page.locator('.inv-card').first().locator('select[data-field="hvd"]').selectOption('georaum');
    await expect(block).toBeVisible();
    // und der Wert landet im State
    expect(await page.evaluate(() => inventory[0].hvd)).toBe('georaum');
  });

  test('das Vokabular ist verlinkt statt geraten', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { inventory[0].hvd = 'georaum'; renderInventory(); });
    const link = page.locator('.inv-card').first().locator('.inv-hvd-src a');
    await expect(link).toHaveAttribute('href', 'http://data.europa.eu/bna/asd487ae75');
    // Regression v46: solange die Register-URIs nicht gegen das amtliche
    // Vokabular geprüft sind, darf keine Kategorie eine erfundene URI führen.
    const erfunden = await page.evaluate(() =>
      HVD_CATEGORIES.filter(c => c.uri && !/^https?:\/\/data\.europa\.eu\/bna\//.test(c.uri)).map(c => c.id));
    expect(erfunden).toEqual([]);
  });

  test('der Hinweisblock im Qualitäts-Tab springt zur Karte', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('quality'); });
    const jump = page.locator('#quality-hvd .qual-cross-jump').first();
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(page.locator('#inventory-body')).toBeVisible();
    await expect(page.locator('.inv-card--flash')).toHaveCount(1);
  });

  test('Rechtsgrundlage steht im Wissens-Center', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await page.fill('#wissen-search', '2023/138');
    const karte = page.locator('#wissen-laws .know-law');
    await expect(karte).toHaveCount(1);
    await expect(karte).toContainText('Hochwertige Datensätze');
    // die Karte IST der Link – die Fundstelle muss amtlich sein
    await expect(karte).toHaveAttribute('href', /eur-lex\.europa\.eu/);
  });
});
