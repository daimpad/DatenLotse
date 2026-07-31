const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

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
    // Derselbe Name kommt im Demo-Text zweimal vor → derselbe Platzhalter
    expect(a.match(/\[PERSON_1\]/g).length).toBeGreaterThan(1);
    expect(a).not.toContain('[PERSON_2]');
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
