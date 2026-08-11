const { test, expect } = require('@playwright/test');
const { openApp, grabDownload } = require('./helpers');

/** Bequemer Zugriff auf pseudonymize() im Seitenkontext. */
const clean = (page, text) => page.evaluate(t => pseudonymize(t), text);

test.describe('Pseudonymisierung – Erkennung', () => {
  test('Demo-Text: alle Entitätstypen werden erkannt', async ({ page }) => {
    const errors = await openApp(page);
    const res = await page.evaluate(() => pseudonymize(PSEUDO_DEMO));
    const types = [...new Set(res.mapping.map(m => m.type))].sort();
    expect(types).toEqual([
      'az', 'email', 'geburtsdatum', 'iban', 'kfz', 'name',
      'plzort', 'steuerid', 'strasse', 'svnr', 'telefon',
    ].sort());
    // Nichts Erkanntes darf im bereinigten Text zurückbleiben
    for (const m of res.mapping) expect(res.text).not.toContain(m.original);
    expect(errors).toEqual([]);
  });

  test('deterministisch und platzhalter-konsistent', async ({ page }) => {
    await openApp(page);
    const a = await page.evaluate(() => pseudonymize(PSEUDO_DEMO).text);
    const b = await page.evaluate(() => pseudonymize(PSEUDO_DEMO).text);
    expect(a).toBe(b);
    // Beide Namen kommen im Demo-Text je zweimal vor → je EIN Platzhalter.
    // Seit v58 hat der Text zwei Zuschnitte (Bescheid + Beratungsnotiz), also
    // zwei verschiedene Personen – aber keine dritte.
    expect(a.match(/\[PERSON_1\]/g).length).toBe(2);
    expect(a.match(/\[PERSON_2\]/g).length).toBe(2);
    expect(a).not.toContain('[PERSON_3]');
  });

  test('Anrede + akademischer Titel lässt den echten Namen nicht stehen', async ({ page }) => {
    await openApp(page);
    // Regression v28 (Datenleck): „Dr“ wurde als Name erfasst, „Anna Beispiel“ blieb stehen.
    const res = await clean(page, 'Bitte wenden Sie sich an Frau Dr. Anna Beispiel.');
    expect(res.text).not.toContain('Anna');
    expect(res.text).not.toContain('Beispiel');
    expect(res.text).toContain('[PERSON_1]');
    const person = res.mapping.find(m => m.type === 'name');
    expect(person.original).toBe('Anna Beispiel');
  });

  test('mehrteilige Titel (Prof. Dr. med.) werden übersprungen', async ({ page }) => {
    await openApp(page);
    const res = await clean(page, 'Gutachten von Herr Prof. Dr. med. Karl Beispiel.');
    expect(res.mapping.find(m => m.type === 'name').original).toBe('Karl Beispiel');
  });

  test('Telefon verschluckt weder PLZ noch Sozialversicherungsnummer', async ({ page }) => {
    await openApp(page);
    // Regression v28 (Teil-Leak): das greedy Telefon-Muster überlappte
    // angrenzende Treffer, der Rest blieb im „bereinigten“ Text stehen.
    const res = await clean(page,
      'Tel. 030 1234567, wohnhaft in 12345 Musterstadt, SVNR 65 170839 M 003.');
    const types = res.mapping.map(m => m.type);
    expect(types).toContain('telefon');
    expect(types).toContain('plzort');
    expect(types).toContain('svnr');
    expect(res.text).not.toContain('12345');
    expect(res.text).not.toContain('170839');
  });

  test('Kfz-Muster greift nur mit Kontext – Lizenz-/Normkürzel bleiben heil', async ({ page }) => {
    await openApp(page);
    // Regression v29: ein kontextfreies Kfz-Muster zerstörte „DL-DE 2.0“ und „DIN-EN 1090“.
    const heil = await clean(page, 'Lizenz DL-DE 2.0 nach Norm DIN-EN 1090 veröffentlicht.');
    expect(heil.count).toBe(0);
    expect(heil.text).toContain('DL-DE 2.0');

    const treffer = await clean(page, 'Das Fahrzeug mit dem Kennzeichen M-AB 1234 ist betroffen.');
    expect(treffer.mapping.find(m => m.type === 'kfz').original).toBe('M-AB 1234');
  });

  test('PLZ-Muster ignoriert Zähl- und Maßeinheiten', async ({ page }) => {
    await openApp(page);
    const zaehl = await clean(page, 'Der Datensatz umfasst 50000 Datensätze und 12000 Einwohner.');
    expect(zaehl.count).toBe(0);
    // Bewusst per Sperrliste statt Positionsregel: sonst würde genau dieser Fall übersehen
    const adresse = await clean(page, 'wohnhaft in 12345 Musterstadt');
    expect(adresse.mapping.find(m => m.type === 'plzort').original).toBe('12345 Musterstadt');
  });

  test('Bindestrich-Zeitspannen sind keine Telefonnummern', async ({ page }) => {
    await openApp(page);
    const res = await clean(page, 'Sprechzeiten 0800 - 1600 Uhr.');
    expect(res.mapping.some(m => m.type === 'telefon' && m.original.includes('-'))).toBe(false);
  });

  test('freistehende Datumsangaben bleiben unangetastet', async ({ page }) => {
    await openApp(page);
    const frei = await clean(page, 'Der Bescheid vom 15.03.2024 bleibt unberührt.');
    expect(frei.count).toBe(0);
    const geburt = await clean(page, 'Antragsteller, geb. 03.04.1985, wohnhaft dort.');
    expect(geburt.mapping.find(m => m.type === 'geburtsdatum').original).toBe('03.04.1985');
  });

  test('Steuer-ID nur kontextgetriggert, Schlüsselwort bleibt lesbar', async ({ page }) => {
    await openApp(page);
    const res = await clean(page, 'Steuer-ID: 12 345 678 901 wurde geprüft.');
    expect(res.text).toContain('Steuer-ID:');
    expect(res.text).toContain('[STEUERID_1]');
    const ohne = await clean(page, 'Die Vorgangsnummer 12345678901 ist vergeben.');
    expect(ohne.mapping.some(m => m.type === 'steuerid')).toBe(false);
  });

  test('Aktenzeichen mit Buchstabenkern (Gz. AB-9/2024)', async ({ page }) => {
    await openApp(page);
    const res = await clean(page, 'In der Sache Gz. AB-9/2024 teilen wir mit …');
    expect(res.mapping.some(m => m.type === 'az')).toBe(true);
  });

  test('neutraler Verwaltungstext erzeugt keine Falschtreffer', async ({ page }) => {
    await openApp(page);
    const res = await clean(page,
      'Die Stadt Musterstadt veröffentlicht den Haushaltsplan 2024 als PDF. ' +
      'Die Daten stehen unter der Lizenz DL-DE 2.0 im Open-Data-Portal bereit. ' +
      'Der Datensatz umfasst 4500 Zeilen und wird jährlich aktualisiert.');
    expect(res.count).toBe(0);
  });

  test('Platzhalter zerstören die CSV-Struktur nicht', async ({ page }) => {
    await openApp(page);
    const res = await page.evaluate(() => pseudonymize(PSEUDO_DEMO));
    for (const m of res.mapping) expect(m.placeholder).not.toMatch(/[",\n]/);
  });

  test('Unicode jenseits der BMP verschiebt keine Indizes', async ({ page }) => {
    await openApp(page);
    // maskRanges arbeitet mit split('') statt [...text] – Surrogat-Paare
    // dürfen die Zeichen-Indizes der Treffer nicht verrutschen lassen.
    const res = await clean(page, '👍👍👍 Kontakt: max.mustermann@example.de bitte melden.');
    expect(res.mapping.find(m => m.type === 'email').original).toBe('max.mustermann@example.de');
    expect(res.text).toContain('👍👍👍');
    expect(res.text).not.toContain('@example.de');
  });

  test('Mapping-CSV enthält Kopfzeile und alle Treffer', async ({ page }) => {
    await openApp(page);
    const csv = await page.evaluate(() => {
      const r = pseudonymize(PSEUDO_DEMO);
      return { csv: buildPseudoMappingCSV(r.mapping), n: r.mapping.length };
    });
    const lines = csv.csv.split('\n');
    expect(lines[0]).toBe('Platzhalter,Typ,Original');
    expect(lines.length).toBe(csv.n + 1);
  });
});

test.describe('Pseudonymisierung – UI', () => {
  test('Beispiel laden → bereinigen → Mapping-Tabelle + Download-Button', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.locator('#pseudo-demo-btn').click();
    await expect(page.locator('#pseudo-input')).not.toHaveValue('');
    await page.locator('#pseudo-clean-btn').click();
    await expect(page.locator('#pseudo-output mark.pseudo-hit').first()).toBeVisible();
    await expect(page.locator('#pseudo-mapping table')).toBeVisible();
    await expect(page.locator('#pseudo-download-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Eingabe wird escaped in die Ausgabe geschrieben (XSS)', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.locator('#pseudo-input').fill('<img src=x onerror="window.__xss=1"> Herr Max Mustermann');
    await page.locator('#pseudo-clean-btn').click();
    await expect(page.locator('#pseudo-output')).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('#pseudo-output img').count()).toBe(0);
  });
});

test.describe('Pseudonymisierung – CSV spaltenweise', () => {
  const CSV = 'Name,Anmerkungen,Abteilung\n' +
    'Max Mustermann,"Kontakt: max@example.de, Tel. 030 1234567",Bürgeramt\n' +
    'Erika Beispiel,"Wohnhaft in 12345 Musterstadt",Sozialamt\n' +
    'Max Mustermann,"Zweiter Vorgang",Bürgeramt\n';

  async function ladeCsv(page, text = CSV) {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.locator('#pseudo-tab-csv').click();
    await page.locator('#pseudo-csv-input').fill(text);
    // Spaltenzahl aus der Kopfzeile ableiten, nicht fest verdrahten
    await expect(page.locator('.pseudo-csv-col')).toHaveCount(text.split('\n')[0].split(',').length);
  }

  test('Tabs schalten zwischen Freitext und CSV um', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await expect(page.locator('#pseudo-text-panel')).toBeVisible();
    await expect(page.locator('#pseudo-csv-panel')).toBeHidden();

    await page.locator('#pseudo-tab-csv').click();
    await expect(page.locator('#pseudo-csv-panel')).toBeVisible();
    await expect(page.locator('#pseudo-text-panel')).toBeHidden();
    await expect(page.locator('#pseudo-tab-csv')).toHaveAttribute('aria-selected', 'true');

    // Pfeiltasten-Navigation wie bei den Inventar-Tabs
    await page.locator('#pseudo-tab-csv').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#pseudo-tab-text')).toBeFocused();
    await expect(page.locator('#pseudo-text-panel')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Spalten werden mit Beispielwert erkannt, Bereinigen erst nach Auswahl', async ({ page }) => {
    await ladeCsv(page);
    await expect(page.locator('#pseudo-csv-cols')).toContainText('3 Spalten · 3 Datenzeilen');
    await expect(page.locator('#pseudo-csv-cols')).toContainText('Max Mustermann');
    await expect(page.locator('#pseudo-csv-run')).toBeDisabled();

    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    await expect(page.locator('#pseudo-csv-run')).toBeEnabled();
  });

  test('Typ-Auswahl ist nur bei „ganze Spalte ersetzen“ aktiv', async ({ page }) => {
    await ladeCsv(page);
    await expect(page.locator('[data-col-type="0"]')).toBeDisabled();
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    await expect(page.locator('[data-col-type="0"]')).toBeEnabled();
    await page.locator('[data-col-mode="0"]').selectOption('muster');
    await expect(page.locator('[data-col-type="0"]')).toBeDisabled();
  });

  test('ganze Spalte ersetzen: gleicher Wert bekommt zeilenübergreifend denselben Platzhalter', async ({ page }) => {
    await ladeCsv(page);
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    await page.locator('[data-col-type="0"]').selectOption('name');
    const res = await page.evaluate(() => buildPseudoCSVResult());
    const zeilen = res.csv.split('\n');

    expect(zeilen[0]).toBe('Name,Anmerkungen,Abteilung');
    // Max Mustermann steht in Zeile 1 und 3 – derselbe Platzhalter
    expect(zeilen[1].startsWith('[PERSON_1]')).toBe(true);
    expect(zeilen[3].startsWith('[PERSON_1]')).toBe(true);
    expect(zeilen[2].startsWith('[PERSON_2]')).toBe(true);
    // Zwei verschiedene Werte → zwei Mapping-Einträge, nicht drei
    expect(res.mapping.filter(m => m.type === 'name').length).toBe(2);
    // Nicht gewählte Spalten bleiben unverändert
    expect(zeilen[1]).toContain('Bürgeramt');
  });

  test('Muster-Modus bereinigt Freitextspalten und lässt andere in Ruhe', async ({ page }) => {
    await ladeCsv(page);
    await page.locator('[data-col-mode="1"]').selectOption('muster');
    const res = await page.evaluate(() => buildPseudoCSVResult());
    expect(res.csv).toContain('[EMAIL_1]');
    expect(res.csv).toContain('[TELEFON_1]');
    expect(res.csv).toContain('[ORT_1]');
    expect(res.csv).not.toContain('max@example.de');
    // Namensspalte war nicht gewählt – sie bleibt bewusst stehen
    expect(res.csv).toContain('Max Mustermann');
  });

  test('CSV-Struktur bleibt erhalten und ist reimportierbar', async ({ page }) => {
    await ladeCsv(page);
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    await page.locator('[data-col-mode="1"]').selectOption('muster');
    const back = await page.evaluate(() => {
      const res = buildPseudoCSVResult();
      return { zeilen: parseCSV(res.csv).length, spalten: Object.keys(parseCSV(res.csv)[0]) };
    });
    expect(back.zeilen).toBe(3);
    expect(back.spalten).toEqual(['Name', 'Anmerkungen', 'Abteilung']);
  });

  test('Zeilenumbruch im gequoteten Feld übersteht die Bereinigung', async ({ page }) => {
    await ladeCsv(page, 'Name,Notiz\nMax Mustermann,"Zeile 1\nZeile 2"\n');
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    const back = await page.evaluate(() => parseCSV(buildPseudoCSVResult().csv));
    expect(back.length).toBe(1);
    expect(back[0].Notiz).toBe('Zeile 1\nZeile 2');
    expect(back[0].Name).toBe('[PERSON_1]');
  });

  test('leere Zellen werden nicht durch Platzhalter ersetzt', async ({ page }) => {
    await ladeCsv(page, 'Name,Notiz\nMax Mustermann,x\n,y\n');
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    const res = await page.evaluate(() => buildPseudoCSVResult());
    expect(res.csv.split('\n')[2]).toBe(',y');
    expect(res.mapping.length).toBe(1);
  });

  test('Ergebnis bietet bereinigte CSV und Mapping zum Download', async ({ page }) => {
    await ladeCsv(page);
    await page.locator('[data-col-mode="0"]').selectOption('ganz');
    await page.locator('#pseudo-csv-run').click();
    await expect(page.locator('#pseudo-csv-out')).toContainText('Ersetzungen');
    await expect(page.locator('.pseudo-csv-preview')).toContainText('[PERSON_1]');

    const csv = await grabDownload(page, () => page.locator('#pseudo-csv-dl').click());
    expect(csv.name).toBe('bereinigt.csv');
    expect(csv.text).toContain('[PERSON_1]');

    const map = await grabDownload(page, () => page.locator('#pseudo-csv-map').click());
    expect(map.text.split('\n')[0]).toBe('Platzhalter,Typ,Original');
    expect(map.text).toContain('Max Mustermann');
  });
});
