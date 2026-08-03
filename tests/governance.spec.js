const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Governance & Rollen (Modul 1)', () => {
  test('Reifegrad ist gewichtet und deckt 0–100 ab', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const setze = wert => { governanceAnswers = {}; GOV_QUESTIONS.forEach(q => { governanceAnswers[q.id] = wert; }); return reifegrad().score; };
      const summe = GOV_QUESTIONS.reduce((s, q) => s + q.weight, 0);
      const alleJa = setze('ja'), alleHalb = setze('teilweise'), alleNein = setze('nein');
      governanceAnswers = {};
      return { summe, alleJa, alleHalb, alleNein, leer: reifegrad().score };
    });
    expect(r.summe).toBe(100);
    expect(r.alleJa).toBe(100);
    expect(r.alleHalb).toBe(50);
    expect(r.alleNein).toBe(0);
    expect(r.leer).toBe(0);
  });

  test('Ampel-Schwellen 80 / 50', async ({ page }) => {
    await openApp(page);
    const a = await page.evaluate(() => [100, 80, 79, 50, 49, 0].map(s => reifeAmpel(s).cls));
    expect(a).toEqual(['gruen', 'gruen', 'gelb', 'gelb', 'rot', 'rot']);
  });

  test('Reifegrad-Check ist vom Inventar entkoppelt, nur die RACI-Matrix hängt daran', async ({ page }) => {
    const errors = await openApp(page);
    // Regression v29: ohne Import war der ganze Fragebogen ausgeblendet
    await page.evaluate(() => navTo('governance'));
    await expect(page.locator('#gov-questions select')).toHaveCount(8);
    await expect(page.locator('#gov-raci')).toBeHidden();
    await expect(page.locator('#gov-empty')).toBeVisible();

    await loadSample(page);
    await page.evaluate(() => navTo('governance'));
    await expect(page.locator('#gov-raci')).toBeVisible();
    await expect(page.locator('#gov-empty')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('Antwort im Fragebogen aktualisiert Score und Persistenz', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('governance'));
    await page.locator('#gov-questions select').first().selectOption('ja');
    await expect(page.locator('#gov-score-badge')).toContainText('12');
    const gespeichert = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('datenlotse_governance')));
    expect(gespeichert.domains).toBe('ja');
  });

  test('Domänen kommen aus dem Inventar, DSB nur bei DSGVO-Relevanz', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      const doms = deriveDomains();
      const melde = doms.find(d => d.name === 'Melderegister');
      const gis = doms.find(d => d.name === 'Geoinformationssystem');
      return {
        n: doms.length,
        gisCount: gis.count,
        meldeRaci: raciFor(melde),
        gisRaci: raciFor(gis),
      };
    });
    expect(r.n).toBe(11);          // Geoinformationssystem kommt zweimal vor
    expect(r.gisCount).toBe(2);
    expect(r.meldeRaci.dsb).toBe('C');
    expect(r.gisRaci.dsb).toBe('I');
    expect(r.meldeRaci.owner).toBe('A');
    expect(r.meldeRaci.steward).toBe('R');
  });

  test('roleGap markiert Rollen ohne „Ja“ im Fragebogen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const dsgvoDom = { name: 'X', dsgvo: true }, offenDom = { name: 'Y', dsgvo: false };
      governanceAnswers = {};
      const ohne = { owner: roleGap('owner', dsgvoDom), dsb: roleGap('dsb', dsgvoDom), dsbOffen: roleGap('dsb', offenDom) };
      governanceAnswers = { owner: 'ja', steward: 'ja', dsb: 'ja' };
      const mit = { owner: roleGap('owner', dsgvoDom), dsb: roleGap('dsb', dsgvoDom) };
      governanceAnswers = {};
      return { ohne, mit };
    });
    expect(r.ohne).toEqual({ owner: true, dsb: true, dsbOffen: false });
    expect(r.mit).toEqual({ owner: false, dsb: false });
  });

  test('RACI-CSV enthält Domänen und die Reifegrad-Zeile', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const csv = await page.evaluate(() => buildRaciCSV());
    expect(csv).toContain('Melderegister');
    expect(csv.toLowerCase()).toContain('reifegrad');
  });
});

test.describe('Daten-Kompass', () => {
  test('Struktur: 7 Dimensionen mit je 3–4 Items und Quellenangabe', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => ({
      n: KOMPASS_DIMENSIONS.length,
      items: KOMPASS_DIMENSIONS.map(d => d.items.length),
      ohneQuelle: KOMPASS_DIMENSIONS.filter(d => !d.source).map(d => d.id),
    }));
    expect(r.n).toBe(7);
    expect(r.items.every(n => n >= 3 && n <= 4)).toBe(true);
    expect(r.ohneQuelle).toEqual([]);
  });

  test('Score und Ampel rechnen wie dokumentiert', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const alle = wert => {
        kompassState = {};
        KOMPASS_DIMENSIONS.forEach(d => d.items.forEach(i => { kompassState[`${d.id}.${i.id}`] = wert; }));
        return kompassOverall();
      };
      const out = { erfuellt: alle('erfuellt'), teilweise: alle('teilweise'), offen: alle('offen') };
      // „na“ zählt nicht mit: alles erfüllt bis auf ein „na“ bleibt 100 %
      alle('erfuellt');
      kompassState['strategie.leitlinie'] = 'na';
      out.mitNa = kompassOverall();
      kompassState = {};
      return out;
    });
    expect(r).toEqual({ erfuellt: 100, teilweise: 50, offen: 0, mitNa: 100 });
    const ampeln = await page.evaluate(() => [100, 80, 79, 50, 49, 0].map(s => kompassAmpel(s).cls));
    expect(ampeln).toEqual(['gruen', 'gruen', 'gelb', 'gelb', 'rot', 'rot']);
  });

  test('Vorbelegung aus dem App-Stand, Nutzerwahl hat Vorrang', async ({ page }) => {
    await openApp(page);
    expect(await page.evaluate(() => kompassStatus('inventar', 'inventar'))).toBe('offen');
    await loadSample(page);
    expect(await page.evaluate(() => kompassStatus('inventar', 'inventar'))).toBe('erfuellt');
    // Nutzerentscheidung überschreibt die Ableitung und wird persistiert
    await page.evaluate(() => { kompassState['inventar.inventar'] = 'offen'; });
    expect(await page.evaluate(() => kompassStatus('inventar', 'inventar'))).toBe('offen');
  });

  test('View rendert alle Items und speichert eine Statusänderung', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('kompass'));
    const anzahl = await page.evaluate(() =>
      KOMPASS_DIMENSIONS.reduce((s, d) => s + d.items.length, 0));
    await expect(page.locator('#kompass-dims select')).toHaveCount(anzahl);

    await page.locator('#kompass-dims select').first().selectOption('erfuellt');
    const gespeichert = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('datenlotse_kompass')));
    expect(Object.values(gespeichert)).toContain('erfuellt');
    await expect(page.locator('#kompass-score')).toContainText('/ 100');
    expect(errors).toEqual([]);
  });
});

test.describe('Wissens-Center & Vorlagen', () => {
  test('Glossar, Rechtsgrundlagen und Modelle werden gerendert', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await expect(page.locator('#wissen-glossary .know-term')).toHaveCount(
      await page.evaluate(() => GLOSSARY.length));
    await expect(page.locator('#wissen-laws .know-law')).toHaveCount(
      await page.evaluate(() => LEGAL_BASIS.length));
    await expect(page.locator('#wissen-models > *')).toHaveCount(
      await page.evaluate(() => METHOD_MODELS.length));
    expect(errors).toEqual([]);
  });

  test('Gesetzes-Links zeigen auf amtliche Quellen und öffnen sicher', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    const links = await page.locator('#wissen-laws a').evaluateAll(as =>
      as.map(a => ({ href: a.href, rel: a.rel, target: a.target })));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.href).toMatch(/gesetze-im-internet\.de|eur-lex\.europa\.eu/);
      expect(l.rel).toContain('noopener');
      expect(l.target).toBe('_blank');
    }
  });

  test('Rechtsgrundlagen der Länder: alle 16 mit amtlicher Fundstelle', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await expect(page.locator('#wissen-laender .know-law')).toHaveCount(16);

    const daten = await page.evaluate(() => ({
      laender: LEGAL_BASIS_LAENDER.map(l => l.land),
      arten: LEGAL_BASIS_LAENDER.reduce((a, l) => (a[l.kind] = (a[l.kind] || 0) + 1, a), {}),
      ohneHttps: LEGAL_BASIS_LAENDER.filter(l => !/^https:\/\//.test(l.url)).map(l => l.land),
      unbekannteArt: LEGAL_BASIS_LAENDER.filter(l => !LAENDER_KIND[l.kind]).map(l => l.land),
      luecken: LEGAL_BASIS_LAENDER.filter(l => !l.name || !l.summary).map(l => l.land),
    }));
    // Genau die 16 Länder, jedes genau einmal
    expect(new Set(daten.laender).size).toBe(16);
    expect(daten.ohneHttps).toEqual([]);
    expect(daten.unbekannteArt).toEqual([]);
    expect(daten.luecken).toEqual([]);
    expect(daten.arten.transparenz + daten.arten.ifg + daten.arten.kein).toBe(16);
    expect(errors).toEqual([]);
  });

  test('Länder-Links öffnen amtliche Landesrecht-Portale, nicht den Bund', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    const links = await page.locator('#wissen-laender a').evaluateAll(as =>
      as.map(a => ({ href: a.href, rel: a.rel, target: a.target })));
    expect(links.length).toBe(16);
    for (const l of links) {
      expect(l.rel).toContain('noopener');
      expect(l.target).toBe('_blank');
      // Bundesrecht steht in der anderen Sektion – hier gehört Landesrecht hin
      expect(l.href).not.toContain('gesetze-im-internet.de');
    }
    // Der bestehende Bundes-Abschnitt bleibt davon unberührt
    await expect(page.locator('#wissen-laws .know-law')).toHaveCount(
      await page.evaluate(() => LEGAL_BASIS.length));
  });

  test('Bundesland-Filter grenzt auf ein Land ein', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await page.locator('#wissen-land').selectOption('Hamburg');
    await expect(page.locator('#wissen-laender .know-law')).toHaveCount(1);
    await expect(page.locator('#wissen-laender')).toContainText('Hamburgisches Transparenzgesetz');
    // Der Filter betrifft nur die Länder-Sektion
    await expect(page.locator('#wissen-glossary .know-term')).toHaveCount(
      await page.evaluate(() => GLOSSARY.length));

    await page.locator('#wissen-land').selectOption('');
    await expect(page.locator('#wissen-laender .know-law')).toHaveCount(16);
  });

  test('Volltextsuche findet Landesregelungen über Abkürzung und Art', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await page.locator('#wissen-search').fill('HmbTG');
    await expect(page.locator('#wissen-laender .know-law')).toHaveCount(1);

    await page.locator('#wissen-search').fill('Transparenzgesetz');
    const n = await page.locator('#wissen-laender .know-law').count();
    expect(n).toBeGreaterThanOrEqual(4);
  });

  test('Live-Filter durchsucht alle drei Listen und meldet Leerergebnisse', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await page.locator('#wissen-search').fill('dsgvo');
    const sichtbar = await page.locator('#wissen-glossary .know-term:visible').count();
    expect(sichtbar).toBeGreaterThan(0);
    expect(sichtbar).toBeLessThan(await page.evaluate(() => GLOSSARY.length));

    await page.locator('#wissen-search').fill('zzzznichts');
    await expect(page.locator('#wissen-noresult')).toBeVisible();
  });

  test('Vorlagen: statische Muster als Markdown, datengetrieben mit Guard', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('vorlagen'));
    await expect(page.locator('.vorlage-card')).toHaveCount(4);

    // Ohne Inventar blockieren die datengetriebenen Dokumente mit Hinweis
    await page.evaluate(() => generateDoc('vvt', 'csv'));
    expect(await page.evaluate(() => window.__dialogs.alert.length)).toBeGreaterThan(0);

    await loadSample(page);
    const csv = await page.evaluate(() => vvtCSV());
    expect(csv.split('\n').length).toBe(await page.evaluate(() => vvtRows().length + 1));
    const md = await page.evaluate(() => policyMarkdown());
    expect(md).toContain(await page.evaluate(() => orgName()));
    expect(errors).toEqual([]);
  });
});
