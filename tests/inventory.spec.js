const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Inventar – Karten, Suche, Filter, Sortierung', () => {
  test('rendert eine Karte je Datensatz mit Vollständigkeits-Badge', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await expect(page.locator('.inv-card')).toHaveCount(12);
    await expect(page.locator('#inventory-meta')).toContainText('12 Datensätze');
    expect(errors).toEqual([]);
  });

  test('Suche filtert und behält den Fokus im Suchfeld', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const search = page.locator('#inv-search');
    await search.click();
    await search.type('Personalstammdaten');
    await expect(page.locator('.inv-card')).toHaveCount(1);
    // Die Controls werden bewusst nicht neu gerendert – sonst wäre der Fokus weg
    await expect(search).toBeFocused();
    await expect(page.locator('#inventory-meta')).toContainText('1 von 12 Datensätzen');

    await search.fill('gibtesnicht');
    await expect(page.locator('.inv-empty')).toBeVisible();
  });

  test('Editieren über einer gefilterten Teilmenge trifft den richtigen Datensatz', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const vorher = await page.evaluate(() => inventory.map(d => d.title));

    await page.locator('#inv-search').fill('Baumkataster');
    await expect(page.locator('.inv-card')).toHaveCount(1);
    await page.locator('.inv-card [data-field="keywords"]').fill('baum, kataster');

    const nachher = await page.evaluate(() => inventory.map(d => ({ t: d.title, k: d.keywords })));
    const treffer = nachher.filter(d => d.k === 'baum, kataster');
    expect(treffer.length).toBe(1);
    expect(treffer[0].t).toBe('Baumkataster');
    expect(nachher.map(d => d.t)).toEqual(vorher);
  });

  test('Schutzbedarf-Filter unterscheidet „öffentlich“ von „nicht öffentlich“', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    // Regression v28: „Nicht öffentlich“ landete über den Teilstring im Öffentlich-Filter
    await page.evaluate(() => {
      inventory.find(d => d.title === 'Haushaltsplan')._grafSchutzbedarf = 'Nicht öffentlich';
      navTo('inventory');
    });
    await page.locator('#inv-filter-schutz').selectOption('oeffentlich');
    const titel = await page.locator('.inv-card .inv-title').evaluateAll(
      els => els.map(e => e.value));
    expect(titel).not.toContain('Haushaltsplan');
    expect(titel.length).toBe(5);
  });

  test('Clearing-Ampel-Filter', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('#inv-filter-ampel').selectOption('gruen');
    await expect(page.locator('.inv-card')).toHaveCount(6);
  });

  test('Sortierung nach Vollständigkeit und Titel', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { inventory[5].license = 'dl-de/by-2-0'; navTo('inventory'); });

    await page.locator('#inv-sort').selectOption('title');
    const titel = await page.locator('.inv-card .inv-title').evaluateAll(e => e.map(x => x.value));
    expect([...titel].sort((a, b) => a.localeCompare(b, 'de'))).toEqual(titel);

    await page.locator('#inv-sort').selectOption('complete-desc');
    const pct = await page.locator('.inv-complete').evaluateAll(e => e.map(x => parseInt(x.textContent, 10)));
    expect([...pct].sort((a, b) => b - a)).toEqual(pct);
  });

  test('completeness zählt genau die DCAT-Pflichtfelder', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const leer = {};
      const voll = {};
      REQUIRED_FIELDS.forEach(f => { voll[f] = 'x'; });
      return { leer: completeness(leer), voll: completeness(voll), felder: REQUIRED_FIELDS };
    });
    expect(r.leer).toBe(0);
    expect(r.voll).toBe(100);
    // REQUIRED_FIELDS leitet sich aus DCAT_REQUIRED ab (eine Quelle der Wahrheit)
    expect(r.felder).toEqual([
      'title', 'description', 'publisher', 'contactPoint', 'accessRights', 'license',
    ]);
  });

  test('Titel wird escaped in die Karte geschrieben (XSS)', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory[0].title = '"><img src=x onerror="window.__xss=1">';
      navTo('inventory');
    });
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('#inventory-body img').count()).toBe(0);
    await expect(page.locator('.inv-card').first().locator('.inv-title'))
      .toHaveValue('"><img src=x onerror="window.__xss=1">');
  });

  test('Tabs blenden immer genau ein Panel ein', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    for (const [tab, panel] of [['inventar', '#inventar-panel'], ['clearing', '#clearing-panel'], ['quality', '#quality-panel']]) {
      await page.locator('#tab-' + tab).click();
      // Regression v28: `.quality-panel.hidden` fehlte in der CSS-Regelgruppe,
      // die Qualitätsprüfung blieb dauerhaft sichtbar.
      const sichtbar = [];
      for (const p of ['#inventar-panel', '#clearing-panel', '#quality-panel']) {
        if (await page.locator(p).isVisible()) sichtbar.push(p);
      }
      expect(sichtbar).toEqual([panel]);
      await expect(page.locator('#tab-' + tab)).toHaveAttribute('aria-selected', 'true');
    }
  });
});

test.describe('Lizenz-Register & -Wegweiser', () => {
  test('Register ist konsistent (ids, URIs, open-Flag)', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const items = LICENSE_CATALOG.flatMap(g => g.items);
      return {
        gruppen: LICENSE_CATALOG.length,
        n: items.length,
        offen: items.filter(l => l.open).length,
        ohneUri: items.filter(l => !l.uri).map(l => l.id),
        doppelt: items.map(l => l.id).filter((id, i, a) => a.indexOf(id) !== i),
        metaVollstaendig: items.every(l => LICENSE_META[l.id] === l),
      };
    });
    expect(r.gruppen).toBe(2);
    expect(r.n).toBeGreaterThanOrEqual(20);
    expect(r.ohneUri).toEqual([]);
    expect(r.doppelt).toEqual([]);
    expect(r.metaVollstaendig).toBe(true);
    expect(r.offen).toBeGreaterThan(0);
  });

  test('NC/ND sind nicht offen, Share-Alike ist offen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const items = LICENSE_CATALOG.flatMap(g => g.items);
      const nc = items.filter(l => /-nc|-nd/.test(l.id));
      return {
        ncN: nc.length,
        ncOffen: nc.filter(l => l.open).map(l => l.id),
        // Copyleft ist offen im Sinne der Open Definition
        shareAlike: ['cc-by-sa-4.0', 'odc-odbl'].map(licenseIsOpen),
        geschlossen: licenseIsOpen('other-closed'),
      };
    });
    expect(r.ncN).toBeGreaterThan(0);
    expect(r.ncOffen).toEqual([]);
    expect(r.shareAlike).toEqual([true, true]);
    expect(r.geschlossen).toBe(false);
  });

  test('Legacy-Schlüssel bleiben erhalten', async ({ page }) => {
    await openApp(page);
    const bekannt = await page.evaluate(() =>
      ['dl-de/by-2-0', 'dl-de/zero-2-0', 'cc-by-4.0', 'cc-zero', 'other-closed']
        .map(id => !!LICENSE_META[id]));
    expect(bekannt).toEqual([true, true, true, true, true]);
  });

  test('unbekannter Legacy-Wert bleibt im Dropdown wählbar', async ({ page }) => {
    await openApp(page);
    const html = await page.evaluate(() => licenseSelectHTML('irgendwas-altes'));
    expect(html).toContain('irgendwas-altes');
    expect(html).toContain('selected');
  });

  test('Wegweiser empfiehlt deterministisch', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const out = {};
      for (const attribution of ['ja', 'nein']) {
        for (const scope of ['de', 'intl']) {
          licenseWiz.attribution = attribution; licenseWiz.scope = scope;
          out[`${attribution}-${scope}`] = recommendLicense();
        }
      }
      return out;
    });
    expect(r).toEqual({
      'ja-de': 'dl-de/by-2-0', 'ja-intl': 'cc-by-4.0',
      'nein-de': 'dl-de/zero-2-0', 'nein-intl': 'cc-zero',
    });
    // Alle Empfehlungen müssen offene Lizenzen sein
    const offen = await page.evaluate(ids => ids.map(licenseIsOpen), Object.values(r));
    expect(offen).toEqual([true, true, true, true]);
  });

  test('Massenübernahme setzt nur leere Lizenzen und hebt die Vollständigkeit', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); inventory[0].license = 'cc-zero'; openLicenseWizard(); });
    await expect(page.locator('#license-backdrop')).toBeVisible();
    await expect(page.locator('#lic-apply')).toContainText('11');

    const vorher = await page.evaluate(() =>
      Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length));
    await page.locator('#lic-apply').click();
    const nachher = await page.evaluate(() => ({
      ohne: inventory.filter(d => !d.license).length,
      erster: inventory[0].license,
      pct: Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length),
    }));
    expect(nachher.ohne).toBe(0);
    expect(nachher.erster).toBe('cc-zero');   // bereits gesetzte Lizenz bleibt
    expect(nachher.pct).toBeGreaterThan(vorher);
    expect(errors).toEqual([]);
  });
});
