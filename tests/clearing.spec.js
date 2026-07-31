const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Risiko-Clearing (Modul 3a)', () => {
  test('schutzKategorie prüft Verneinungen zuerst', async ({ page }) => {
    await openApp(page);
    // Regression v28 (falsche Freigabe): „Nicht öffentlich“ wurde per
    // Teilstring als „öffentlich“ gelesen und ergab automatisch Grün.
    const k = await page.evaluate(() => ({
      dsgvo: schutzKategorie('DSGVO-relevant'),
      nichtOeff: schutzKategorie('Nicht öffentlich'),
      nichtOe: schutzKategorie('nicht-oeffentlich'),
      vsnfd: schutzKategorie('VS-NfD'),
      intern: schutzKategorie('Intern'),
      oeff: schutzKategorie('Öffentlich'),
      leer: schutzKategorie(''),
      nullwert: schutzKategorie(null),
    }));
    expect(k).toEqual({
      dsgvo: 'dsgvo', nichtOeff: 'nicht-oeffentlich', nichtOe: 'nicht-oeffentlich',
      vsnfd: 'nicht-oeffentlich', intern: 'intern', oeff: 'oeffentlich',
      leer: '', nullwert: '',
    });
  });

  test('Entscheidungsbaum deckt alle Pfade deterministisch ab', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => ({
      keinPb:      evaluateClearing({ pb: 'nein' }).ampel,
      unklar:      evaluateClearing({ pb: 'unklar' }).ampel,
      art9:        evaluateClearing({ pb: 'ja', art9: 'ja' }).ampel,
      ohneRecht:   evaluateClearing({ pb: 'ja', art9: 'nein', recht: 'nein' }).ampel,
      anonymJa:    evaluateClearing({ pb: 'ja', art9: 'nein', recht: 'ja', anon: 'ja' }).ampel,
      anonymNein:  evaluateClearing({ pb: 'ja', art9: 'nein', recht: 'ja', anon: 'nein' }).ampel,
      unbeantwortet: evaluateClearing({ pb: 'ja' }).ampel,
    }));
    expect(r).toEqual({
      keinPb: 'gruen', unklar: 'gelb', art9: 'rot', ohneRecht: 'rot',
      anonymJa: 'gelb', anonymNein: 'rot', unbeantwortet: 'gelb',
    });
  });

  test('unklarer Schutzbedarf führt nie automatisch zu Grün', async ({ page }) => {
    await openApp(page);
    const ampeln = await page.evaluate(() =>
      ['Intern', 'Nicht öffentlich', 'VS-NfD', '', 'irgendwas'].map(s =>
        evaluateClearing(initClearing({ _grafSchutzbedarf: s })).ampel));
    expect(ampeln.every(a => a !== 'gruen')).toBe(true);
  });

  test('Vorbelegung aus dem Schutzbedarf für den Beispieldatensatz', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const verteilung = await page.evaluate(() => {
      ensureAllClearing();
      const c = { gruen: 0, gelb: 0, rot: 0 };
      inventory.forEach(d => c[d.clearing.ampel]++);
      return c;
    });
    expect(verteilung.gruen).toBe(6);   // sechs „Öffentlich“-Datensätze
    expect(verteilung.rot).toBe(0);     // nichts wird ungefragt gesperrt
    expect(verteilung.gelb).toBe(6);
    expect(errors).toEqual([]);
  });

  test('progressive Anzeige: Folgefragen erscheinen und werden zurückgesetzt', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('clearing'); });

    // Ein „Öffentlich“-Datensatz startet mit pb=nein und ohne Folgefragen
    const card = page.locator('.clear-card').filter({ hasText: 'Haushaltsplan' }).first();
    await expect(card.locator('select[data-q="pb"]')).toHaveValue('nein');
    await expect(card.locator('select[data-q="art9"]')).toHaveCount(0);

    await card.locator('select[data-q="pb"]').selectOption('ja');
    await expect(card.locator('select[data-q="art9"]')).toBeVisible();
    await card.locator('select[data-q="art9"]').selectOption('nein');
    await expect(card.locator('select[data-q="recht"]')).toBeVisible();
    await card.locator('select[data-q="recht"]').selectOption('ja');
    await expect(card.locator('select[data-q="anon"]')).toBeVisible();

    // Zurück auf „nein“ → Folgefragen verschwinden und ihre Antworten sind weg
    await card.locator('select[data-q="pb"]').selectOption('nein');
    await expect(card.locator('select[data-q="art9"]')).toHaveCount(0);
    const reset = await page.evaluate(() =>
      inventory.filter(d => d.title === 'Haushaltsplan')
        .map(d => `${d._clearing.art9}|${d._clearing.recht}|${d._clearing.anon}`)[0]);
    expect(reset).toBe('||');
  });

  test('Clearing-Antworten überleben einen Reload', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('clearing'); });
    const card = page.locator('.clear-card').filter({ hasText: 'Baumkataster' }).first();
    await card.locator('select[data-q="pb"]').selectOption('ja');
    await expect(card.locator('.clear-ampel')).toContainText('Gelb');

    await page.reload();
    await page.waitForFunction(() => inventory.length > 0);
    const wieder = await page.evaluate(() =>
      inventory.find(d => d.title === 'Baumkataster')._clearing.pb);
    expect(wieder).toBe('ja');
  });

  test('Zusammenfassung und CSV-Export tragen die Ampel', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('clearing'); });
    await expect(page.locator('#clearing-summary')).toContainText('grün');
    const csv = await page.evaluate(() => buildInventoryCSV());
    expect(csv.split('\n')[0]).toContain('clearingAmpel');
    expect(csv.split('\n')[0]).toContain('clearingEmpfehlung');
  });

  test('leeres Inventar zeigt einen Empty-State statt einer leeren Liste', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { showView('inventory'); showInventoryTab('clearing'); });
    await expect(page.locator('#clearing-body .inv-empty')).toBeVisible();
  });
});
