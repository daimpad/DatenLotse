const { test, expect } = require('@playwright/test');
const { openApp, loadSample, lastAlert } = require('./helpers');

test.describe('CSV-Import & Inventar-Ableitung', () => {
  test('Beispieldatensatz erzeugt 12 Einträge', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    expect(await page.evaluate(() => inventory.length)).toBe(12);
    expect(await page.evaluate(() => grafRows.length)).toBe(12);
    expect(errors).toEqual([]);
  });

  test('Zeilenumbruch im gequoteten Feld erzeugt keine Phantom-Zeile', async ({ page }) => {
    await openApp(page);
    // Regression v29: der Parser trennte Datensätze vorher naiv an "\n".
    const rows = await page.evaluate(() => parseCSV(
      'Quelle,Datentyp,Anmerkungen\n' +
      'A,Typ A,"Zeile 1\nZeile 2"\n' +
      'B,Typ B,einfach\n'));
    expect(rows.length).toBe(2);
    expect(rows[0].Anmerkungen).toBe('Zeile 1\nZeile 2');
    expect(rows[1].Quelle).toBe('B');
  });

  test('eigener CSV-Export ist wieder importierbar (Round-Trip)', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const ok = await page.evaluate(() => {
      // Mehrzeilige Beschreibung erzwingen, damit Quoting wirklich geprüft wird
      inventory[0].description = 'Zeile A\nZeile B';
      const csv = buildInventoryCSV();
      const back = parseCSV(csv);
      return { n: back.length, desc: back[0].description };
    });
    expect(ok.n).toBe(12);
    expect(ok.desc).toBe('Zeile A\nZeile B');
  });

  test('Deduplizierung über Quelle + Datentyp, Empfänger werden gesammelt', async ({ page }) => {
    await openApp(page);
    const res = await page.evaluate(() => {
      const rows = parseCSV(
        'Quelle,QuelleOrganisation,Datentyp,Ziel\n' +
        'Sys,Stadt,Typ,Ziel A\n' +
        'Sys,Stadt,Typ,Ziel B\n');
      const inv = deriveInventory(rows);
      return { n: inv.length, rec: inv[0]._recipients };
    });
    expect(res.n).toBe(1);
    expect(res.rec).toEqual(['Ziel A', 'Ziel B']);
  });

  test('kollidierende dct:identifier werden durchnummeriert', async ({ page }) => {
    await openApp(page);
    // Regression v29: gleiche Organisation + gleicher Datentyp aus zwei
    // Quellsystemen ergaben denselben Identifier (Harvesting-Kollision).
    const ids = await page.evaluate(() => deriveInventory(parseCSV(
      'Quelle,QuelleOrganisation,Datentyp\n' +
      'Sys A,Stadt,Bericht\n' +
      'Sys B,Stadt,Bericht\n')).map(d => d.id));
    expect(ids).toEqual(['stadt-bericht', 'stadt-bericht-2']);
  });

  test('_recipients überlebt den JSON-Round-Trip als Array', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const type = await page.evaluate(() => {
      const back = JSON.parse(JSON.stringify(inventory));
      return Array.isArray(back[0]._recipients);
    });
    expect(type).toBe(true);
  });

  test('fremde Datei wird abgelehnt, Semikolon-CSV bekommt einen konkreten Hinweis', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => importGrafCSV('Foo,Bar\n1,2\n'));
    expect(await page.evaluate(() => inventory.length)).toBe(0);

    await page.evaluate(() => importGrafCSV('Quelle;Ziel;Datentyp\nA;B;C\n'));
    expect(await lastAlert(page)).toContain('Semikolon');
    expect(await page.evaluate(() => inventory.length)).toBe(0);
  });

  test('csvCell neutralisiert Formel-Injection', async ({ page }) => {
    await openApp(page);
    const cells = await page.evaluate(() => ['=SUM(A1)', '+1', '-1', '@x', 'normal', 0, '']
      .map(v => csvCell(v)));
    expect(cells[0].startsWith("'") || cells[0].startsWith('"\'')).toBe(true);
    expect(cells[4]).toBe('normal');
    // Falsy-sicher: die Zahl 0 darf nicht zu "" werden
    expect(String(cells[5]).replace(/"/g, '')).toBe('0');
  });

  test('Schutzbedarf wird korrekt auf accessRights gemappt', async ({ page }) => {
    await openApp(page);
    const map = await page.evaluate(() => ({
      dsgvo: mapSchutzToAccess('DSGVO-relevant'),
      oeffentlich: mapSchutzToAccess('Öffentlich'),
      nichtOeffentlich: mapSchutzToAccess('Nicht öffentlich'),
      intern: mapSchutzToAccess('Intern'),
      leer: mapSchutzToAccess(''),
    }));
    expect(map.dsgvo).toBe('NON_PUBLIC');
    expect(map.oeffentlich).toBe('PUBLIC');
    // Regression v28: Teilstring-Suche las „Nicht öffentlich“ als PUBLIC
    expect(map.nichtOeffentlich).toBe('NON_PUBLIC');
    expect(map.intern).toBe('RESTRICTED');
    expect(map.leer).toBe('');
  });

  test('Export- und Importspalten können nicht auseinanderlaufen', async ({ page }) => {
    await openApp(page);
    // Regression v46: der Export trug seine Spaltenliste ein zweites Mal
    // wörtlich. Ein neu ergänztes Feld stand danach in INV_CSV_FIELDS, aber
    // nicht in der Datei – der Rückimport fand es folglich nie.
    const r = await page.evaluate(() => {
      inventory = [{ id: 'x', title: 'A', distributions: [newDistribution()] }];
      return { kopf: buildInventoryCSV().split('\n')[0].split(','), felder: INV_CSV_FIELDS };
    });
    const fehlend = r.felder.filter(f => !r.kopf.includes(f));
    expect(fehlend, 'Felder aus INV_CSV_FIELDS fehlen im CSV-Kopf').toEqual([]);
  });
});
