const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

/** Ein Datensatz, der alle Pflicht- und Empfehlungsfelder korrekt füllt. */
const VOLLSTAENDIG = {
  title: 'Baumkataster', description: 'Standorte städtischer Bäume im Stadtgebiet.',
  publisher: 'Stadt Musterstadt', contactPoint: 'Frau Wagner (opendata@musterstadt.de)',
  accessRights: 'PUBLIC', license: 'dl-de/by-2-0', theme: 'ENVI',
  keywords: 'baum, kataster', accrualPeriodicity: 'QUARTERLY', format: 'GeoJSON',
  landingPage: 'https://opendata.musterstadt.de/baumkataster',
};

test.describe('DCAT-AP.de-Qualitätsprüfung', () => {
  test('vollständiger Datensatz ist publikationsbereit', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(d => ({
      issues: validateDataset(d), status: qualityStatus(validateDataset(d)),
    }), VOLLSTAENDIG);
    expect(r.issues).toEqual([]);
    expect(r.status).toBe('gruen');
  });

  test('Pflichtfelder sind Fehler, Empfehlungsfelder Warnungen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const issues = validateDataset({});
      return {
        errors: issues.filter(i => i.sev === 'error').length,
        warns: issues.filter(i => i.sev === 'warn').length,
        status: qualityStatus(issues),
      };
    });
    expect(r.errors).toBe(6);   // DCAT_REQUIRED
    expect(r.warns).toBe(5);    // DCAT_RECOMMENDED
    expect(r.status).toBe('rot');
  });

  test('Werteprüfungen greifen', async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(base => {
      const check = patch => validateDataset({ ...base, ...patch }).map(i => `${i.sev}:${i.msg}`);
      return {
        nichtOffen: check({ license: 'cc-by-nc-4.0' }),
        unbekannt: check({ license: 'phantasie-lizenz' }),
        access: check({ accessRights: 'IRGENDWAS' }),
        theme: check({ theme: 'XXXX' }),
        freq: check({ accrualPeriodicity: 'SOMETIMES' }),
        kontakt: check({ contactPoint: 'Frau Wagner' }),
        url: check({ landingPage: 'musterstadt.de' }),
        kurz: check({ title: 'AB', description: 'kurz' }),
      };
    }, VOLLSTAENDIG);

    expect(msgs.nichtOffen.some(m => m.startsWith('warn') && /nicht offen/.test(m))).toBe(true);
    // Regression v30: unbekannte Legacy-Lizenz meldete fälschlich „nicht offen“
    expect(msgs.unbekannt.some(m => /Register unbekannt/.test(m))).toBe(true);
    expect(msgs.unbekannt.some(m => /nicht offen/.test(m))).toBe(false);
    expect(msgs.access.some(m => m.startsWith('error'))).toBe(true);
    expect(msgs.theme.length).toBe(1);
    expect(msgs.freq.length).toBe(1);
    expect(msgs.kontakt.some(m => /E-Mail/.test(m))).toBe(true);
    expect(msgs.url.some(m => /http/.test(m))).toBe(true);
    expect(msgs.kurz.length).toBe(2);
  });

  test('Beispieldaten: erst 12 Fehler, nach Lizenz-Übernahme keine mehr', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('quality'); });
    await expect(page.locator('#quality-summary')).toContainText('12 mit Fehlern');
    await expect(page.locator('.qual-card')).toHaveCount(12);

    await page.evaluate(() => { inventory.forEach(d => { d.license = 'dl-de/by-2-0'; }); renderQuality(); });
    await expect(page.locator('#quality-summary')).toContainText('0 mit Fehlern');
    expect(errors).toEqual([]);
  });

  test('schlechteste Karte steht oben', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory.forEach(d => Object.assign(d, {
        license: 'dl-de/by-2-0', keywords: 'x', landingPage: 'https://example.org',
        contactPoint: 'a@b.de', theme: 'ENVI', description: 'Eine ausreichend lange Beschreibung.',
      }));
      inventory[3].title = '';   // erzeugt einen Fehler
      navTo('inventory'); showInventoryTab('quality');
    });
    await expect(page.locator('.qual-card').first()).toHaveClass(/qual-card--rot/);
  });

  test('„Im Inventar bearbeiten“ springt zur richtigen Karte', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      invFilter.q = 'Baumkataster';   // Filter muss beim Sprung zurückgesetzt werden
      navTo('inventory'); showInventoryTab('quality');
    });
    const ziel = await page.evaluate(() => inventory.findIndex(d => d.title === 'Ratsbeschlüsse'));
    await page.locator(`.qual-fix[data-fix="${ziel}"]`).click();
    await expect(page.locator('#inventar-panel')).toBeVisible();
    await expect(page.locator('#inv-search')).toHaveValue('');
    await expect(page.locator(`.inv-card[data-idx="${ziel}"]`)).toBeVisible();
    await expect(page.locator('.inv-card')).toHaveCount(12);
  });

  test('leeres Inventar zeigt einen Empty-State', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { showView('inventory'); showInventoryTab('quality'); });
    await expect(page.locator('#quality-body .inv-empty')).toBeVisible();
  });
});
