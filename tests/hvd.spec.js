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
  hvd: 'c_c3de25e4',   // Georaum → Adressen (amtlicher Code)
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
      inventory[idx].hvd = 'c_e1da4e07';
      return { vorher: vor.length, nachher: hvdVorschlaege().length };
    });
    expect(r).not.toBeNull();
    expect(r.nachher).toBe(r.vorher - 1);
  });

  test('unbekannte Kategorie wird gemeldet und stoppt die weitere Prüfung', async ({ page }) => {
    await openApp(page);
    const issues = await hvd(page, mit({ hvd: 'c_phantasie' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].sev).toBe('warn');
    expect(issues[0].msg).toContain('High-value dataset categories');
  });
});

test.describe('HVD – amtliches Vokabular', () => {
  test('alle sechs Kategorien der Verordnung mit ihren amtlichen Codes', async ({ page }) => {
    await openApp(page);
    const oben = await page.evaluate(() => HVD_CATEGORIES.map(c => [c.id, c.label]));
    // Aus der RDF/SKOS-Fassung des Vokabulars der EU-Publikationsstelle
    // (skos:topConceptOf → http://data.europa.eu/bna/asd487ae75).
    expect(oben).toEqual([
      ['c_ac64a52d', 'Georaum'],
      ['c_dd313021', 'Erdbeobachtung und Umwelt'],
      ['c_164e0bf5', 'Meteorologie'],
      ['c_e1da4e07', 'Statistik'],
      ['c_a9135398', 'Unternehmen und Eigentümerschaft von Unternehmen'],
      ['c_b79e35eb', 'Mobilität'],
    ]);
  });

  test('das vollständige Register steht zur Auswahl, nicht nur die Oberkategorien', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => ({
      konzepte: Object.keys(HVD_META).length,
      leer: Object.values(HVD_META).filter(m => !m.label || !m.top).length,
      doppelt: Object.keys(HVD_META).length !== new Set(Object.keys(HVD_META)).size,
    }));
    // 6 Kategorien + 65 Unterkategorien + 25 Binnenschifffahrts-Begriffe
    expect(r.konzepte).toBe(96);
    expect(r.leer).toBe(0);
    expect(r.doppelt).toBe(false);
  });

  test('das Dropdown gruppiert nach Oberkategorie und erhält unbekannte Werte', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const box = document.createElement('div');
      box.innerHTML = `<select>${hvdSelectHTML('c_c3de25e4')}</select>`;
      const sel = box.querySelector('select');
      box.innerHTML = `<select>${hvdSelectHTML('c_fremd')}</select>`;
      const fremd = box.querySelector('select');
      return {
        gruppen: sel.querySelectorAll('optgroup').length,
        optionen: sel.querySelectorAll('option').length,
        gewaehlt: sel.value,
        fremdErhalten: fremd.value,
      };
    });
    expect(r.gruppen).toBe(6);
    expect(r.optionen).toBe(97);        // 96 Konzepte + „nein / nicht geprüft"
    expect(r.gewaehlt).toBe('c_c3de25e4');
    // Ein Code aus einem fremden Katalog darf nicht stillschweigend wegfallen
    expect(r.fremdErhalten).toBe('c_fremd');
  });

  test('nur die Oberkategorie ist zulässig, aber ein Hinweis wert', async ({ page }) => {
    await openApp(page);
    const grob = await hvd(page, mit({ hvd: 'c_ac64a52d' }));   // Georaum
    expect(grob.some(i => i.sev === 'warn' && /genauesten/.test(i.msg))).toBe(true);
    const genau = await hvd(page, mit({ hvd: 'c_c3de25e4' }));  // Adressen
    expect(genau).toEqual([]);
  });

  test('Stände aus v46 werden auf die amtlichen Codes gehoben', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      inventory = [
        { id: 'a', title: 'A', hvd: 'georaum', distributions: [newDistribution()] },
        { id: 'b', title: 'B', hvd: '', hvdCategoryURI: 'http://data.europa.eu/bna/c_43f88346', distributions: [newDistribution()] },
        { id: 'c', title: 'C', distributions: [newDistribution()] },
      ];
      migrateInventory();
      return inventory.map(d => [d.hvd, 'hvdCategoryURI' in d]);
    });
    expect(r[0]).toEqual(['c_ac64a52d', false]);   // eigener Schlüssel → amtlicher Code
    expect(r[1]).toEqual(['c_43f88346', false]);   // URI aus dem Altfeld → Code (Wasser)
    expect(r[2]).toEqual([undefined, false]);      // ohne Einstufung bleibt es dabei
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
    // Eine Kategorie ausserhalb des Vokabulars ergäbe eine URI, die beim
    // Harvesting in der SHACL-Validierung hängen bliebe – dann lieber gar
    // keine HVD-Angabe.
    const ohne = await page.evaluate(d => dcatDataset(d), mit({ hvd: 'c_phantasie' }));
    expect(ohne['dcatap:hvdCategory']).toBeUndefined();
    expect(ohne['dcatap:applicableLegislation']).toBeUndefined();

    const mitUri = await page.evaluate(d => dcatDataset(d), HVD_OK);
    expect(mitUri['dcatap:hvdCategory']).toBe('http://data.europa.eu/bna/c_c3de25e4');
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
    expect(r.ttl).toContain('dcatap:hvdCategory <http://data.europa.eu/bna/c_c3de25e4>');
    expect(r.json).toContain('http://data.europa.eu/bna/c_c3de25e4');
  });

  test('Round-Trip über die Inventar-CSV erhält die Einstufung', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(d => {
      inventory = [d];
      const csv = buildInventoryCSV();
      inventory = [];
      importInventoryCSV(csv);
      return { hvd: inventory[0].hvd };
    }, HVD_OK);
    expect(r.hvd).toBe('c_c3de25e4');
  });

  test('Katalog-Import führt die Kategorie-URI auf ihren Code zurück', async ({ page }) => {
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
      return inventory[0].hvd;
    });
    // unbekannter Code bleibt stehen statt still verworfen zu werden
    expect(uri).toBe('c_unbekannt');
  });
});

test.describe('HVD – Oberfläche', () => {
  test('der Pflichtenblock erscheint erst mit der Einstufung', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const block = page.locator('.inv-card').first().locator('.inv-hvd');
    await expect(block).toBeHidden();
    await page.locator('.inv-card').first().locator('select[data-field="hvd"]').selectOption('c_c3de25e4');
    await expect(block).toBeVisible();
    // und der Wert landet im State
    expect(await page.evaluate(() => inventory[0].hvd)).toBe('c_c3de25e4');
  });

  test('das Vokabular ist verlinkt statt geraten', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { inventory[0].hvd = 'c_c3de25e4'; renderInventory(); });
    const link = page.locator('.inv-card').first().locator('.inv-hvd-src a');
    await expect(link).toHaveAttribute('href', 'http://data.europa.eu/bna/asd487ae75');
    // Jeder Schlüssel im Register ist ein amtlicher Code – daraus entsteht die
    // URI durch blosses Voranstellen, es gibt nichts zuzuordnen und nichts zu raten.
    const schlecht = await page.evaluate(() =>
      Object.keys(HVD_META).filter(id => !/^c_[0-9a-f]{8}$/.test(id)));
    expect(schlecht).toEqual([]);
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
