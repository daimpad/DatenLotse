const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

/** Ein Datensatz, der alle Pflicht- und Empfehlungsfelder korrekt füllt. */
const VOLLSTAENDIG = {
  title: 'Baumkataster', description: 'Standorte städtischer Bäume im Stadtgebiet.',
  publisher: 'Stadt Musterstadt', contactPoint: 'Frau Wagner (opendata@musterstadt.de)',
  accessRights: 'PUBLIC', theme: 'ENVI',
  keywords: 'baum, kataster', accrualPeriodicity: 'QUARTERLY',
  landingPage: 'https://opendata.musterstadt.de/baumkataster',
  contributorID: 'MUSTERSTADT',
  // Format und Lizenz hängen seit v39 an der Verteilung
  distributions: [{ title: '', format: 'GeoJSON', accessURL: '', license: 'dl-de/by-2-0' }],
};

/** Erzeugt eine Variante mit abweichender erster Verteilung. */
const mitDist = (patch) => ({
  ...VOLLSTAENDIG,
  distributions: [{ ...VOLLSTAENDIG.distributions[0], ...patch }],
});

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
    // 6 Pflichtfelder + „keine Verteilung angelegt"
    expect(r.errors).toBe(7);
    expect(r.warns).toBe(6);    // DCAT_RECOMMENDED
    expect(r.status).toBe('rot');
  });

  test('Werteprüfungen greifen', async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(base => {
      const check = patch => validateDataset({ ...base, ...patch }).map(i => `${i.sev}:${i.msg}`);
      const mitDist = patch => ({ ...base, distributions: [{ ...base.distributions[0], ...patch }] });
      return {
        nichtOffen: validateDataset(mitDist({ license: 'cc-by-nc-4.0' })).map(i => `${i.sev}:${i.msg}`),
        unbekannt: validateDataset(mitDist({ license: 'phantasie-lizenz' })).map(i => `${i.sev}:${i.msg}`),
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

  test('erweiterte DCAT-AP.de-Felder werden auf Werte geprüft', async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(base => {
      const check = patch => validateDataset({ ...base, ...patch }).map(i => `${i.sev}:${i.msg}`);
      return {
        sauber: check({
          issued: '2024-01-15', modified: '2024-06-01',
          temporalStart: '2023-01-01', temporalEnd: '2023-12-31',
          spatial: 'Stadt Musterstadt', geocodingKey: '05315000', geocodingLevel: 'gemeinde',
        }),
        datumFormat: check({ issued: '15.01.2024' }),
        reihenfolgeDoc: check({ issued: '2024-06-01', modified: '2024-01-15' }),
        reihenfolgeZeit: check({ temporalStart: '2023-12-31', temporalEnd: '2023-01-01' }),
        schluessel: check({ geocodingKey: '123', geocodingLevel: 'gemeinde' }),
        ebene: check({ geocodingKey: '05315000', geocodingLevel: 'planet' }),
        nurSchluessel: check({ geocodingKey: '05315000' }),
        nurEbene: check({ geocodingLevel: 'gemeinde' }),
      };
    }, VOLLSTAENDIG);

    expect(msgs.sauber).toEqual([]);
    expect(msgs.datumFormat.some(m => /JJJJ-MM-TT/.test(m))).toBe(true);
    expect(msgs.reihenfolgeDoc.some(m => /vor dem Veröffentlichungsdatum/.test(m))).toBe(true);
    expect(msgs.reihenfolgeZeit.some(m => /vor dem Zeitraum-Beginn/.test(m))).toBe(true);
    expect(msgs.schluessel.some(m => /amtlicher Schlüssel/.test(m))).toBe(true);
    expect(msgs.ebene.some(m => /Gebietsebene/.test(m))).toBe(true);
    // Regionalschlüssel und Ebene gehören zusammen – einzeln ist es unvollständig
    expect(msgs.nurSchluessel.some(m => /gemeinsam/.test(m))).toBe(true);
    expect(msgs.nurEbene.some(m => /gemeinsam/.test(m))).toBe(true);
  });

  test('Beispieldaten: erst 12 Fehler, nach Lizenz-Übernahme keine mehr', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('quality'); });
    await expect(page.locator('#quality-summary')).toContainText('12 mit Fehlern');
    await expect(page.locator('.qual-card')).toHaveCount(12);

    await page.evaluate(() => {
      inventory.forEach(d => d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; }));
      renderQuality();
    });
    await expect(page.locator('#quality-summary')).toContainText('0 mit Fehlern');
    expect(errors).toEqual([]);
  });

  test('schlechteste Karte steht oben', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory.forEach(d => {
        Object.assign(d, {
          keywords: 'x', landingPage: 'https://example.org',
          contactPoint: 'a@b.de', theme: 'ENVI', description: 'Eine ausreichend lange Beschreibung.',
        });
        d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; });
      });
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

test.describe('Bestandsprüfung (übergreifend)', () => {
  test('sauberer Bestand meldet keine Befunde', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const issues = await page.evaluate(() => inventoryIssues());
    expect(issues).toEqual([]);
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('quality'); });
    await expect(page.locator('.qual-cross--ok')).toBeVisible();
    await expect(page.locator('#quality-inventory')).toContainText('keine Dubletten');
    expect(errors).toEqual([]);
  });

  test('doppelte Identifier sind ein Fehler', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[1].id = inventory[0].id;
      return inventoryIssues().map(i => ({ sev: i.sev, msg: i.msg, n: i.treffer.length }));
    });
    const treffer = r.find(i => /Identifier/.test(i.msg));
    expect(treffer.sev).toBe('error');
    expect(treffer.n).toBe(2);
  });

  test('doppelte Titel werden gemeldet, Groß-/Kleinschreibung egal', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[1].title = '  baumkataster ';   // andere Schreibweise, gleicher Titel
      return inventoryIssues().filter(i => /Titel/.test(i.msg)).map(i => i.treffer.length);
    });
    expect(r).toEqual([2]);
  });

  test('dieselbe Zugriffs-URL an mehreren Datensätzen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].distributions[0].accessURL = 'https://example.org/gleiche.csv';
      inventory[3].distributions[0].accessURL = 'https://example.org/gleiche.csv';
      return inventoryIssues().filter(i => /dieselbe Adresse/.test(i.msg));
    });
    expect(r.length).toBe(1);
    expect(r[0].treffer.length).toBe(2);
    expect(r[0].sev).toBe('warn');
  });

  test('ohne eigene Zugriffs-URL zählt die Info-URL des Datensatzes', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const n = await page.evaluate(() => {
      inventory[0].landingPage = 'https://example.org/seite';
      inventory[1].landingPage = 'https://example.org/seite';
      return inventoryIssues().filter(i => /dieselbe Adresse/.test(i.msg)).length;
    });
    expect(n).toBe(1);
  });

  test('Schreibvarianten bei Publisher und Ansprechpartner', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].publisher = 'Stadt  Musterstadt';     // doppeltes Leerzeichen
      inventory[1].contactPoint = 'Frau Meier (buergeramt@musterstadt.de).';
      inventory[2].contactPoint = 'Frau Meier (buergeramt@musterstadt.de)';
      return inventoryIssues().map(i => i.msg);
    });
    expect(r.some(m => /^Publisher: .*weicht von der sonst verwendeten/.test(m))).toBe(true);
    expect(r.some(m => /^Ansprechpartner: .*weicht von der sonst verwendeten/.test(m))).toBe(true);
  });

  test('gemeldet wird nur der Abweichler, nicht der ganze Bestand', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      // Ein Ausreißer unter elf gleich geschriebenen Publishern
      inventory[0].publisher = 'Stadt  Musterstadt';
      const i = inventoryIssues().find(x => /^Publisher:/.test(x.msg));
      return { n: i.treffer.length, titel: i.treffer.map(t => t.d.title), msg: i.msg };
    });
    expect(r.n).toBe(1);
    expect(r.titel).toEqual(['Einwohnermeldedaten']);
    // Die häufige Schreibweise steht als Ziel im Text
    expect(r.msg).toContain('„Stadt Musterstadt"');
  });

  test('identische Schreibweise ist keine Variante', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    // Elf Datensätze teilen sich denselben Publisher – das ist normal, kein Befund
    const r = await page.evaluate(() =>
      inventoryIssues().filter(i => /Schreibweise/.test(i.msg)).length);
    expect(r).toBe(0);
  });

  test('Befunde springen zum betroffenen Datensatz', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory[1].title = inventory[0].title;
      navTo('inventory'); showInventoryTab('quality');
    });
    await expect(page.locator('.qual-cross-jump').first()).toBeVisible();
    await page.locator('.qual-cross-jump').first().click();
    await expect(page.locator('#inventar-panel')).toBeVisible();
    await expect(page.locator('.inv-card[data-idx="0"]')).toBeVisible();
  });

  test('leeres Inventar zeigt keine Bestandsprüfung', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { showView('inventory'); showInventoryTab('quality'); });
    await expect(page.locator('#quality-inventory')).toBeEmpty();
  });

  test('Massenbearbeitung setzt das Format der ersten Verteilung', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      navTo('inventory');
      inventory[0].distributions.push({ title: '', format: 'JSON', accessURL: '', license: '' });
      invSelection.add(0);
      renderInventoryBody();
    });
    await page.locator('#bulk-field').selectOption('format');
    await page.locator('#bulk-value').fill('GeoJSON');
    await page.locator('#bulk-apply').click();
    const r = await page.evaluate(() => inventory[0].distributions.map(x => x.format));
    // Nur die erste – bei mehreren Verteilungen wäre alles andere geraten
    expect(r).toEqual(['GeoJSON', 'JSON']);
  });
});
