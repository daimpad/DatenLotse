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
    await page.evaluate(() => { inventory[5].distributions[0].license = 'dl-de/by-2-0'; navTo('inventory'); });

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
      const voll = { distributions: [{ format: 'CSV', license: 'cc-zero', accessURL: '', title: '' }] };
      REQUIRED_FIELDS.filter(f => f !== 'license').forEach(f => { voll[f] = 'x'; });
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
    await page.evaluate(() => { navTo('inventory'); inventory[0].distributions[0].license = 'cc-zero'; openLicenseWizard(); });
    await expect(page.locator('#license-backdrop')).toBeVisible();
    await expect(page.locator('#lic-apply')).toContainText('11');

    const vorher = await page.evaluate(() =>
      Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length));
    await page.locator('#lic-apply').click();
    const nachher = await page.evaluate(() => ({
      ohne: inventory.filter(d => !hasLicense(d)).length,
      erster: inventory[0].distributions[0].license,
      pct: Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length),
    }));
    expect(nachher.ohne).toBe(0);
    expect(nachher.erster).toBe('cc-zero');   // bereits gesetzte Lizenz bleibt
    expect(nachher.pct).toBeGreaterThan(vorher);
    expect(errors).toEqual([]);
  });
});

test.describe('Massenbearbeitung', () => {
  test('Auswahl blendet die Aktionsleiste ein und zählt korrekt', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await expect(page.locator('#inv-bulk')).toBeHidden();

    await page.locator('.inv-select').first().check();
    await expect(page.locator('#inv-bulk')).toBeVisible();
    await expect(page.locator('.bulk-count')).toContainText('1 ausgewählt');

    await page.locator('.inv-select').nth(2).check();
    await expect(page.locator('.bulk-count')).toContainText('2 ausgewählt');

    await page.locator('#bulk-clear').click();
    await expect(page.locator('#inv-bulk')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('„Alle auswählen“ meint die sichtbare Teilmenge', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('#inv-search').fill('Baumkataster');
    await expect(page.locator('.inv-card')).toHaveCount(1);

    await page.locator('#inv-select-all').click();
    // Nur der gefilterte Datensatz, nicht alle zwölf
    expect(await page.evaluate(() => invSelection.size)).toBe(1);
    await expect(page.locator('#inv-select-all')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#inv-search').fill('');
    await expect(page.locator('.inv-card')).toHaveCount(12);
    // Die Auswahl bleibt am echten Datensatz hängen, nicht an der Position
    const gewaehlt = await page.evaluate(() => [...invSelection].map(i => inventory[i].title));
    expect(gewaehlt).toEqual(['Baumkataster']);
    await expect(page.locator('#inv-select-all')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Massenänderung trifft genau die ausgewählten Datensätze', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('.inv-select').nth(0).check();
    await page.locator('.inv-select').nth(1).check();

    await page.locator('#bulk-field').selectOption('license');
    await page.locator('#bulk-value').selectOption('cc-zero');
    await page.locator('#bulk-apply').click();

    const r = await page.evaluate(() => ({
      gesetzt: inventory.filter(d => d.distributions.every(x => x.license === 'cc-zero')).length,
      rest: inventory.filter(d => !hasLicense(d)).length,
    }));
    expect(r.gesetzt).toBe(2);
    expect(r.rest).toBe(10);
  });

  test('Massenänderung wirkt auch über einem Filter korrekt', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('#inv-filter-schutz').selectOption('dsgvo');
    const n = await page.locator('.inv-card').count();
    await page.locator('#inv-select-all').click();

    await page.locator('#bulk-field').selectOption('publisher');
    await page.locator('#bulk-value').fill('Stadt Musterstadt (DSGVO-Bereich)');
    await page.locator('#bulk-apply').click();

    const r = await page.evaluate(() => ({
      markiert: inventory.filter(d => d.publisher.includes('DSGVO-Bereich')).map(d => d._grafSchutzbedarf),
      gesamt: inventory.length,
    }));
    expect(r.markiert.length).toBe(n);
    expect(r.markiert.every(s => /dsgvo/i.test(s))).toBe(true);
    expect(r.gesamt).toBe(12);
  });

  test('Feldwahl steuert das Wertfeld (Freitext vs. Register)', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('.inv-select').first().check();
    await expect(page.locator('#bulk-apply')).toBeDisabled();

    await page.locator('#bulk-field').selectOption('license');
    await expect(page.locator('select#bulk-value')).toBeVisible();
    await page.locator('#bulk-field').selectOption('keywords');
    await expect(page.locator('input#bulk-value')).toBeVisible();
    await expect(page.locator('#bulk-apply')).toBeEnabled();
  });

  test('Entfernen löscht genau die Auswahl und setzt sie zurück', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const weg = await page.evaluate(() => [inventory[0].title, inventory[5].title]);
    await page.locator('.inv-select').nth(0).check();
    await page.locator('.inv-select').nth(5).check();
    await page.locator('#bulk-remove').click();

    const r = await page.evaluate(() => ({
      n: inventory.length, titel: inventory.map(d => d.title), sel: invSelection.size,
    }));
    expect(r.n).toBe(10);
    for (const t of weg) expect(r.titel).not.toContain(t);
    // Nach dem Entfernen verschieben sich alle Indizes – die Auswahl muss weg sein
    expect(r.sel).toBe(0);
    await expect(page.locator('#inv-bulk')).toBeHidden();
    await expect(page.locator('.inv-card')).toHaveCount(10);
  });

  test('Entfernen respektiert ein abgelehntes Bestätigen', async ({ page }) => {
    await openApp(page, { confirmResult: false });
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('.inv-select').first().check();
    await page.locator('#bulk-remove').click();
    expect(await page.evaluate(() => inventory.length)).toBe(12);
  });
});

test.describe('Rückimport der bearbeiteten Inventar-CSV', () => {
  test('CSV-Export trägt den Schutzbedarf, damit der Round-Trip verlustfrei ist', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const csv = await page.evaluate(() => buildInventoryCSV());
    expect(csv.split('\n')[0]).toContain('schutzbedarf');
    expect(csv).toContain('DSGVO-relevant');
  });

  test('bearbeitete CSV aktualisiert bestehende Datensätze über die id', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      const csv = buildInventoryCSV().replace('Baumkataster', 'Baumkataster (überarbeitet)');
      // Clearing-Antwort setzen, die in der CSV nicht steht
      inventory[0]._clearing = { pb: 'ja', art9: 'nein', recht: 'ja', anon: 'ja' };
      const ok = importInventoryCSV(csv);
      return {
        ok, n: inventory.length,
        titel: inventory.map(d => d.title),
        clearingErhalten: inventory[0]._clearing.anon,
        schutz: inventory[0]._grafSchutzbedarf,
      };
    });
    expect(r.ok).toBe(true);
    expect(r.n).toBe(12);                       // nichts dupliziert
    expect(r.titel).toContain('Baumkataster (überarbeitet)');
    // Die Clearing-Antworten stehen nicht in der CSV und dürfen nicht verloren gehen
    expect(r.clearingErhalten).toBe('ja');
    expect(r.schutz).toBe('DSGVO-relevant');
    expect(errors).toEqual([]);
  });

  test('unbekannte ids kommen als neue Datensätze dazu', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const n = await page.evaluate(() => {
      const csv = 'id,title,publisher,schutzbedarf\nneuer-datensatz,Neuer Titel,Stadt X,Öffentlich\n';
      importInventoryCSV(csv);
      return { n: inventory.length, neu: inventory.find(d => d.id === 'neuer-datensatz') };
    });
    expect(n.n).toBe(13);
    expect(n.neu.title).toBe('Neuer Titel');
    expect(n.neu._grafSchutzbedarf).toBe('Öffentlich');
  });

  test('abgeleitete Clearing-Spalten werden nicht zurückgeschrieben', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const felder = await page.evaluate(() => INV_CSV_FIELDS);
    expect(felder).not.toContain('clearingAmpel');
    expect(felder).not.toContain('clearingEmpfehlung');
  });

  test('ein Einstieg für beide Formate – Rohdaten und Inventar-CSV', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      const invCsv = buildInventoryCSV();
      const grafCsv = 'Quelle,QuelleOrganisation,Datentyp\nSys,Stadt,Typ\n';
      const a = importAnyCSV(invCsv);          // erkennt die Inventar-CSV
      const nachInv = inventory.length;
      importAnyCSV(grafCsv);                   // erkennt die DatenGraf-Rohdaten
      return { a, nachInv, nachGraf: inventory.length, ersterTitel: inventory[0].title };
    });
    expect(r.a).toBe(true);
    expect(r.nachInv).toBe(12);
    expect(r.nachGraf).toBe(1);                // Rohdaten-Import ersetzt das Inventar
    expect(r.ersterTitel).toBe('Typ');
  });

  test('eine fremde CSV wird weiterhin abgelehnt', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => importAnyCSV('Foo,Bar\n1,2\n'));
    expect(await page.evaluate(() => inventory.length)).toBe(0);
  });
});

test.describe('Verteilungen (dcat:Distribution)', () => {
  test('jeder Datensatz startet mit genau einer Verteilung aus dem Format', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => ({
      alleEine: inventory.every(d => Array.isArray(d.distributions) && d.distributions.length === 1),
      formate: inventory.map(d => d.distributions[0].format),
      // Format und Lizenz dürfen nicht mehr am Datensatz hängen
      legacy: inventory.filter(d => 'format' in d || 'license' in d).map(d => d.id),
    }));
    expect(r.alleEine).toBe(true);
    expect(r.formate).toContain('CSV');
    expect(r.legacy).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('Verteilungen lassen sich hinzufügen und entfernen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const karte = page.locator('.inv-card').first();
    await expect(karte.locator('.inv-dist')).toHaveCount(1);
    // Bei nur einer Verteilung gibt es keinen Entfernen-Knopf
    await expect(karte.locator('.inv-dist-del')).toHaveCount(0);

    await karte.locator('[data-dist-add]').click();
    await expect(karte.locator('.inv-dist')).toHaveCount(2);
    await karte.locator('.inv-dist').nth(1).locator('[data-dist-field="format"]').fill('JSON');
    expect(await page.evaluate(() => inventory[0].distributions[1].format)).toBe('JSON');

    await karte.locator('.inv-dist-del').nth(1).click();
    await expect(karte.locator('.inv-dist')).toHaveCount(1);
    expect(await page.evaluate(() => inventory[0].distributions.length)).toBe(1);
  });

  test('mehrere Verteilungen erscheinen in JSON und Turtle', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].landingPage = 'https://example.org/datensatz';
      inventory[0].distributions = [
        { title: 'Jahresdatei', format: 'CSV', accessURL: 'https://example.org/a.csv', license: 'dl-de/by-2-0' },
        { title: '', format: 'JSON', accessURL: '', license: 'cc-zero' },
      ];
      return { json: dcatDataset(inventory[0]), ttl: turtleDataset(inventory[0]) };
    });
    const dists = r.json['dcat:distribution'];
    expect(dists.length).toBe(2);
    expect(dists[0]['dct:format']).toBe('CSV');
    expect(dists[0]['dct:title']).toBe('Jahresdatei');
    expect(dists[0]['dcat:accessURL']).toBe('https://example.org/a.csv');
    expect(dists[0]['dct:license']).toBe('http://dcat-ap.de/def/licenses/dl-by-de/2.0');
    // Ohne eigene URL fällt die Verteilung auf die Info-URL zurück
    expect(dists[1]['dcat:accessURL']).toBe('https://example.org/datensatz');
    expect(dists[1]['dct:license']).toBe('http://dcat-ap.de/def/licenses/cc-zero');

    expect((r.ttl.match(/a dcat:Distribution/g) || []).length).toBe(2);
    expect(r.ttl).toContain('https://example.org/a.csv');
  });

  test('Vollständigkeit verlangt eine Lizenz je Verteilung', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const basis = {
        title: 'T', description: 'Beschreibung', publisher: 'P',
        contactPoint: 'a@b.de', accessRights: 'PUBLIC',
      };
      const eine = { ...basis, distributions: [{ format: 'CSV', license: 'cc-zero', accessURL: '', title: '' }] };
      const halb = { ...basis, distributions: [
        { format: 'CSV', license: 'cc-zero', accessURL: '', title: '' },
        { format: 'JSON', license: '', accessURL: '', title: '' },
      ] };
      return {
        eine: completeness(eine), halb: completeness(halb),
        hasEine: hasLicense(eine), hasHalb: hasLicense(halb),
      };
    });
    expect(r.eine).toBe(100);
    expect(r.hasEine).toBe(true);
    // Eine Verteilung ohne Lizenz macht den Datensatz unvollständig
    expect(r.hasHalb).toBe(false);
    expect(r.halb).toBeLessThan(100);
  });

  test('Qualitätsprüfung benennt die betroffene Verteilung', async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(() => validateDataset({
      title: 'T', description: 'Beschreibung', publisher: 'P',
      contactPoint: 'a@b.de', accessRights: 'PUBLIC',
      distributions: [
        { format: 'CSV', license: 'cc-zero', accessURL: '', title: '' },
        { format: 'JSON', license: 'cc-by-nc-4.0', accessURL: 'nicht-url', title: '' },
      ],
    }).map(i => i.msg));
    expect(msgs.some(m => /Verteilung 2: .*nicht offen/.test(m))).toBe(true);
    expect(msgs.some(m => /Verteilung 2: Zugriffs-URL/.test(m))).toBe(true);
    // Verteilung 1 ist in Ordnung und wird nicht gemeldet
    expect(msgs.some(m => /Verteilung 1/.test(m))).toBe(false);
  });

  test('ein Datensatz ohne Verteilung ist ein Fehler', async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(() =>
      validateDataset({ title: 'T', distributions: [] }).map(i => `${i.sev}:${i.msg}`));
    expect(msgs.some(m => m.startsWith('error') && /Keine Verteilung/.test(m))).toBe(true);
  });

  test('Lizenz-Wegweiser und Massenbearbeitung setzen alle Verteilungen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      navTo('inventory');
      inventory[0].distributions.push({ title: '', format: 'JSON', accessURL: '', license: '' });
      openLicenseWizard();
    });
    await page.locator('#lic-apply').click();
    expect(await page.evaluate(() =>
      inventory[0].distributions.every(x => x.license))).toBe(true);

    await page.evaluate(() => { invSelection.add(0); renderInventoryBody(); });
    await page.locator('#bulk-field').selectOption('license');
    await page.locator('#bulk-value').selectOption('cc-zero');
    await page.locator('#bulk-apply').click();
    expect(await page.evaluate(() =>
      inventory[0].distributions.every(x => x.license === 'cc-zero'))).toBe(true);
  });

  test('ältere Stände ohne Verteilungen werden migriert', async ({ page }) => {
    await openApp(page);
    // So sah ein Datensatz vor v39 aus – Format und Lizenz am Datensatz
    const r = await page.evaluate(() => {
      const alt = {
        id: 'alt-1', title: 'Alt', description: 'x', publisher: 'P', contactPoint: 'a@b.de',
        accessRights: 'PUBLIC', format: 'CSV', license: 'dl-de/by-2-0',
        landingPage: 'https://example.org/alt',
      };
      inventory = [alt];
      migrateInventory();
      return {
        n: inventory[0].distributions.length,
        dist: inventory[0].distributions[0],
        legacyWeg: !('format' in inventory[0]) && !('license' in inventory[0]),
        vollstaendig: completeness(inventory[0]),
      };
    });
    expect(r.n).toBe(1);
    expect(r.dist.format).toBe('CSV');
    expect(r.dist.license).toBe('dl-de/by-2-0');
    expect(r.dist.accessURL).toBe('https://example.org/alt');
    expect(r.legacyWeg).toBe(true);
    // Der migrierte Datensatz bleibt vollständig – kein Rückschritt für Bestandsdaten
    expect(r.vollstaendig).toBe(100);
  });

  test('Projektdateien vor v39 bleiben importierbar', async ({ page }) => {
    await openApp(page);
    const ok = await page.evaluate(() => importProject(JSON.stringify({
      app: 'DatenLotse', schema: 1,
      data: { inventory: [{ id: 'x', title: 'T', format: 'JSON', license: 'cc-zero' }] },
    })));
    expect(ok).toBe(true);
    const dist = await page.evaluate(() => inventory[0].distributions[0]);
    expect(dist.format).toBe('JSON');
    expect(dist.license).toBe('cc-zero');
  });

  test('CSV zeigt die erste Verteilung und lässt weitere beim Rückimport in Ruhe', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      inventory[0].distributions = [
        { title: '', format: 'CSV', accessURL: '', license: 'dl-de/by-2-0' },
        { title: '', format: 'JSON', accessURL: '', license: 'cc-zero' },
      ];
      const csv = buildInventoryCSV();
      const kopf = csv.split('\n')[0].split(',');
      const zeile = parseCSV(csv).find(x => x.id === inventory[0].id);
      // Rückimport mit geändertem Format der ersten Verteilung
      importInventoryCSV(csv.replace(',CSV,', ',CSV-neu,'));
      return {
        kopf, zeile,
        n: inventory[0].distributions.length,
        erste: inventory[0].distributions[0],
        zweite: inventory[0].distributions[1],
      };
    });
    expect(r.kopf).toContain('verteilungen');
    expect(r.zeile.format).toBe('CSV');
    expect(r.zeile.license).toBe('dl-de/by-2-0');
    expect(r.zeile.verteilungen).toBe('2');
    // Die zweite Verteilung steht nicht in der CSV und überlebt den Rückimport
    expect(r.n).toBe(2);
    expect(r.zweite.format).toBe('JSON');
    expect(r.zweite.license).toBe('cc-zero');
  });
});

test.describe('Sortierung nach Publikationsreife', () => {
  /** Liest den Publikationsstatus in der aktuell gerenderten Reihenfolge. */
  const reihenfolge = page => page.evaluate(() =>
    filteredInventory().map(({ d }) => qualityStatus(validateDataset(d))));

  test('„Fehler zuerst" stellt Rot vor Gelb vor Grün', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      // Drei Gruppen erzeugen: grün, gelb, rot
      inventory.forEach(d => Object.assign(d, {
        keywords: 'x', landingPage: 'https://example.org', contactPoint: 'a@b.de',
        theme: 'ENVI', contributorID: 'X', description: 'Eine ausreichend lange Beschreibung.',
      }));
      inventory.forEach(d => d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; x.format = 'CSV'; }));
      inventory[4].keywords = '';        // Warnung
      inventory[7].title = '';           // Fehler
      navTo('inventory');
    });
    await page.locator('#inv-sort').selectOption('qual-worst');
    const r = await reihenfolge(page);
    const rang = { rot: 0, gelb: 1, gruen: 2 };
    expect(r.map(s => rang[s])).toEqual([...r.map(s => rang[s])].sort((a, b) => a - b));
    expect(r[0]).toBe('rot');
    expect(errors).toEqual([]);
  });

  test('„bereit zuerst" dreht die Reihenfolge um', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => {
      inventory.forEach(d => Object.assign(d, {
        keywords: 'x', landingPage: 'https://example.org', contactPoint: 'a@b.de',
        theme: 'ENVI', contributorID: 'X', description: 'Eine ausreichend lange Beschreibung.',
      }));
      inventory.forEach(d => d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; x.format = 'CSV'; }));
      inventory[7].title = '';
      navTo('inventory');
    });
    await page.locator('#inv-sort').selectOption('qual-best');
    const r = await reihenfolge(page);
    expect(r[0]).toBe('gruen');
    expect(r[r.length - 1]).toBe('rot');
  });

  test('bei gleichem Status entscheidet die Zahl der Befunde', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      // Alle gelb, aber unterschiedlich viele Warnungen
      inventory.forEach(d => Object.assign(d, {
        keywords: 'x', landingPage: 'https://example.org', contactPoint: 'a@b.de',
        theme: 'ENVI', contributorID: 'X', description: 'Eine ausreichend lange Beschreibung.',
      }));
      inventory.forEach(d => d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; x.format = 'CSV'; }));
      inventory[2].keywords = ''; inventory[2].theme = '';        // zwei Warnungen
      inventory[5].keywords = '';                                  // eine Warnung
      invFilter.sort = 'qual-worst';
      return filteredInventory().map(({ d }) => validateDataset(d).length);
    });
    expect(r).toEqual([...r].sort((a, b) => b - a));
    expect(r[0]).toBe(2);
  });

  test('Sortierung wirkt über einer gefilterten Teilmenge und trifft den richtigen Datensatz', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await page.locator('#inv-filter-schutz').selectOption('dsgvo');
    await page.locator('#inv-sort').selectOption('qual-worst');
    const n = await page.locator('.inv-card').count();
    expect(n).toBe(4);

    // Der echte Index wird durch Filter UND Sortierung mitgeführt
    await page.locator('.inv-card').first().locator('[data-field="keywords"]').fill('sortier-test');
    const treffer = await page.evaluate(() =>
      inventory.filter(d => d.keywords === 'sortier-test').map(d => d._grafSchutzbedarf));
    expect(treffer.length).toBe(1);
    expect(treffer[0]).toMatch(/DSGVO/i);
  });
});
