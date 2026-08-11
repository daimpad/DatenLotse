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
  test('Struktur: 8 Dimensionen mit je 3–5 Items und Quellenangabe', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => ({
      n: KOMPASS_DIMENSIONS.length,
      punkte: KOMPASS_DIMENSIONS.reduce((a, d) => a + d.items.length, 0),
      items: KOMPASS_DIMENSIONS.map(d => d.items.length),
      ohneQuelle: KOMPASS_DIMENSIONS.filter(d => !d.source).map(d => d.id),
      doppelt: KOMPASS_DIMENSIONS.flatMap(d => d.items.map(i => `${d.id}.${i.id}`))
        .filter((k, i, a) => a.indexOf(k) !== i),
    }));
    expect(r.n).toBe(8);
    // Die Zahl steht in README und CLAUDE.md – sie darf nicht still auseinanderlaufen
    expect(r.punkte).toBe(33);
    expect(r.items.every(n => n >= 3 && n <= 5)).toBe(true);
    expect(r.ohneQuelle).toEqual([]);
    expect(r.doppelt).toEqual([]);
  });

  test('Können & Kapazität misst die Fortführung, nicht das Getane', async ({ page }) => {
    await openApp(page);
    const dim = await page.evaluate(() => KOMPASS_DIMENSIONS.find(d => d.id === 'koennen'));
    expect(dim, 'achte Dimension fehlt').toBeTruthy();
    expect(dim.items.map(i => i.id)).toEqual(['fachwissen', 'schulung', 'fortfuehrung', 'externe']);
    // Diese Punkte kann das Werkzeug nicht aus dem Arbeitsstand ableiten –
    // sie beantwortet nur, wer die Organisation kennt.
    const abgeleitet = await page.evaluate(() =>
      KOMPASS_DIMENSIONS.find(d => d.id === 'koennen').items
        .filter(i => kompassDerived('koennen', i.id) !== 'offen').map(i => i.id));
    expect(abgeleitet).toEqual([]);
  });

  test('Selbstprüfung leitet sich aus festgehaltenen Ständen ab', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const stand = () => kompassDerived('wirkung', 'selbstpruefung');
      kompassHistory = [];
      const leer = stand();
      kompassHistory = [{ date: '2026-01-01', score: 20 }];
      const einer = stand();
      kompassHistory = [{ date: '2026-01-01', score: 20 }, { date: '2026-02-01', score: 40 }];
      const zwei = stand();
      kompassHistory = [];
      return { leer, einer, zwei };
    });
    expect(r).toEqual({ leer: 'offen', einer: 'teilweise', zwei: 'erfuellt' });
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

  test('Kommunale Satzungen: Mechanismus erklärt, Quellenart offengelegt', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    const n = await page.evaluate(() => KOMMUNAL_SATZUNGEN.length);
    await expect(page.locator('#wissen-kommunal .know-law')).toHaveCount(n);
    await expect(page.locator('#wissen-sec-kommunal')).toContainText('Satzungsautonomie');

    const daten = await page.evaluate(() => ({
      ohneHttps: KOMMUNAL_SATZUNGEN.filter(k => !/^https:\/\//.test(k.url)).map(k => k.name),
      luecken: KOMMUNAL_SATZUNGEN.filter(k => !k.name || !k.summary).map(k => k.name),
      amtliche: KOMMUNAL_SATZUNGEN.filter(k => k.amtlich).length,
    }));
    expect(daten.ohneHttps).toEqual([]);
    expect(daten.luecken).toEqual([]);
    // Mindestens ein amtliches Beispiel, und die Herkunft steht an jeder Karte
    expect(daten.amtliche).toBeGreaterThan(0);
    await expect(page.locator('#wissen-kommunal')).toContainText('Amtliche Fundstelle');
    await expect(page.locator('#wissen-kommunal')).toContainText('Zivilgesellschaftliche Sammlung');
    expect(errors).toEqual([]);
  });

  test('Bundesland-Filter blendet die kommunale Ebene aus', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    await expect(page.locator('#wissen-sec-kommunal')).toBeVisible();
    // Der Filter meint Landesrecht – kommunale Satzungen gehören nicht dazu
    await page.locator('#wissen-land').selectOption('Bayern');
    await expect(page.locator('#wissen-sec-kommunal')).toBeHidden();
    await page.locator('#wissen-land').selectOption('');
    await expect(page.locator('#wissen-sec-kommunal')).toBeVisible();
  });

  test('Länder ohne Landesgesetz verweisen auf kommunale Satzungen', async ({ page }) => {
    await openApp(page);
    const ohne = await page.evaluate(() =>
      LEGAL_BASIS_LAENDER.filter(l => l.kind === 'kein').map(l => ({ land: l.land, s: l.summary })));
    expect(ohne.length).toBe(2);
    for (const l of ohne) expect(l.s).toMatch(/[Ss]atzung/);
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
    // Jede Karte bietet genau ein Dokument an – Anzahl aus dem Markup ableiten
    const dokumente = await page.evaluate(() =>
      new Set([...document.querySelectorAll('#vorlagen-view [data-doc]')].map(b => b.dataset.doc)).size);
    await expect(page.locator('.vorlage-card')).toHaveCount(dokumente);
    expect(dokumente).toBe(5);

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

test.describe('Beispieldaten, Verlauf & Prüfwerkzeuge', () => {
  const BEISPIELE = [
    'data/sample-kommune.csv',
    'data/sample-landkreis.csv',
    'data/sample-landesbehoerde.csv',
  ];

  test('drei Beispielorganisationen stehen zur Auswahl und laden korrekt', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => openInventoryModal());
    await expect(page.locator('.sample-card')).toHaveCount(3);

    for (const datei of BEISPIELE) {
      await page.evaluate(d => { clearState(); loadSampleData(d); }, datei);
      await page.waitForFunction(() => inventory.length > 0);
      const r = await page.evaluate(() => ({
        n: inventory.length,
        ohneTitel: inventory.filter(d => !d.title).length,
        ohnePublisher: inventory.filter(d => !d.publisher).length,
        publisher: [...new Set(inventory.map(d => d.publisher))],
      }));
      expect(r.n, datei).toBe(12);
      expect(r.ohneTitel, datei).toBe(0);
      expect(r.ohnePublisher, datei).toBe(0);
      expect(r.publisher.length, datei).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });

  test('Auswahl im Modal lädt die Daten und schließt den Dialog', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => openInventoryModal());
    await page.locator('.sample-card[data-sample="data/sample-landkreis.csv"]').click();
    await page.waitForFunction(() => inventory.length > 0);
    await expect(page.locator('#inventory-backdrop')).toBeHidden();
    await expect(page.locator('#inventory-view')).toBeVisible();
    await expect(page.locator('#inventory-body')).toContainText('Infektionsmeldungen');
  });

  test('die Beispiele decken unterschiedliche Schutzbedarfe ab', async ({ page }) => {
    await openApp(page);
    const verteilungen = [];
    for (const datei of BEISPIELE) {
      await page.evaluate(d => { clearState(); loadSampleData(d); }, datei);
      await page.waitForFunction(() => inventory.length > 0);
      verteilungen.push(await page.evaluate(() => {
        ensureAllClearing();
        const c = { gruen: 0, gelb: 0, rot: 0 };
        inventory.forEach(d => c[d.clearing.ampel]++);
        return c;
      }));
    }
    // Jedes Beispiel enthält sowohl unstrittige als auch prüfbedürftige Fälle
    for (const v of verteilungen) {
      expect(v.gruen).toBeGreaterThan(0);
      expect(v.gelb).toBeGreaterThan(0);
    }
    // „Nicht öffentlich“ darf nie automatisch grün werden (Regression v28)
    const nichtOeff = await page.evaluate(() =>
      inventory.filter(d => schutzKategorie(d._grafSchutzbedarf) === 'nicht-oeffentlich')
        .map(d => d.clearing.ampel));
    expect(nichtOeff.length).toBeGreaterThan(0);
    expect(nichtOeff.every(a => a !== 'gruen')).toBe(true);
  });

  test('Kompass-Verlauf hält Stände nur auf Knopfdruck fest', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('kompass'));
    // Kein stiller Schnappschuss beim Rendern oder beim Ändern eines Items
    await expect(page.locator('#kompass-history .khist-empty')).toBeVisible();
    await page.locator('#kompass-dims select').first().selectOption('erfuellt');
    expect(await page.evaluate(() => kompassHistory.length)).toBe(0);

    await page.locator('#kompass-snap').click();
    expect(await page.evaluate(() => kompassHistory.length)).toBe(1);
    await expect(page.locator('.khist-bar')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('ein Eintrag je Tag, Verlauf überlebt den Reload', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      navTo('kompass');
      kompassSnapshot('2026-01-01');
      kompassSnapshot('2026-01-01');   // derselbe Tag ersetzt statt anzuhängen
      kompassSnapshot('2026-02-01');
    });
    expect(await page.evaluate(() => kompassHistory.length)).toBe(2);

    await page.reload();
    await page.waitForFunction(() => typeof pseudonymize === 'function');
    const daten = await page.evaluate(() => kompassHistory.map(e => e.date));
    expect(daten).toEqual(['2026-01-01', '2026-02-01']);
  });

  test('Verlauf ist chronologisch, gedeckelt und zeigt den Trend', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      navTo('kompass');
      // Absichtlich unsortiert einwerfen und über die Obergrenze hinaus
      for (let i = 40; i >= 1; i--) kompassSnapshot(`2026-${String(i % 12 + 1).padStart(2, '0')}-${String(i % 28 + 1).padStart(2, '0')}`);
      const sortiert = kompassHistory.every((e, i, a) => i === 0 || a[i - 1].date <= e.date);
      kompassHistory = [{ date: '2026-01-01', score: 20 }, { date: '2026-06-01', score: 55 }];
      return { n: kompassHistory.length, sortiert, max: KOMPASS_HIST_MAX, trend: kompassTrend() };
    });
    expect(r.sortiert).toBe(true);
    expect(r.trend).toEqual({ von: 20, auf: 55, diff: 35, seit: '2026-01-01', stand: '2026-06-01' });
    expect(r.max).toBeGreaterThan(0);
  });

  test('Verlauf wandert in die Projektdatei und wird beim Reset gelöscht', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { navTo('kompass'); kompassSnapshot('2026-03-03'); });
    const json = await page.evaluate(() => buildProjectJSON());
    expect(JSON.parse(json).data.kompassHistory.length).toBe(1);

    await page.evaluate(() => clearState());
    expect(await page.evaluate(() => kompassHistory.length)).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('datenlotse_kompass_verlauf'))).toBeNull();

    // Ältere Projektdateien ohne Verlauf bleiben importierbar (kein Schema-Bump)
    const ok = await page.evaluate(() =>
      importProject(JSON.stringify({ app: 'DatenLotse', schema: 1, data: { inventory: [] } })));
    expect(ok).toBe(true);
    expect(await page.evaluate(() => Array.isArray(kompassHistory))).toBe(true);

    const zurueck = await page.evaluate(t => importProject(t), json);
    expect(zurueck).toBe(true);
    expect(await page.evaluate(() => kompassHistory[0].date)).toBe('2026-03-03');
  });

  test('Prüfwerkzeuge verweisen auf offizielle Validatoren und Normtexte', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    const n = await page.evaluate(() => PRUEF_WERKZEUGE.length);
    await expect(page.locator('#wissen-tools .know-law')).toHaveCount(n);
    // Die Grenze der eigenen Prüfung wird benannt, nicht verschwiegen
    await expect(page.locator('#wissen-sec-tools')).toContainText('keine vollständige SHACL-Validierung');

    const links = await page.locator('#wissen-tools a').evaluateAll(as =>
      as.map(a => ({ href: a.href, rel: a.rel })));
    for (const l of links) {
      expect(l.href).toMatch(/itb\.ec\.europa\.eu|dcat-ap\.de|govdata\.de/);
      expect(l.rel).toContain('noopener');
    }
    expect(errors).toEqual([]);
  });
});

test.describe('Status-Einseiter', () => {
  test('fasst alle Bausteine auf einer Seite zusammen', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    const html = await page.evaluate(() => {
      inventory.forEach(d => d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; }));
      governanceAnswers.owner = 'ja';
      return statusBodyHTML();
    });
    for (const abschnitt of ['Kennzahlen', 'Risiko-Clearing', 'Nächste Schritte', 'Grundlage']) {
      expect(html).toContain(abschnitt);
    }
    expect(html).toContain('Stadt Musterstadt');
    expect(html).toContain('12');                       // Anzahl Datensätze
    expect(html).toContain('keine Rechtsberatung');
    expect(errors).toEqual([]);
  });

  test('Kennzahlen entsprechen dem tatsächlichen Stand', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const k = await page.evaluate(() => statusKennzahlen());
    expect(k.n).toBe(12);
    expect(k.ampel.gruen + k.ampel.gelb + k.ampel.rot).toBe(12);
    expect(k.qual.gruen + k.qual.gelb + k.qual.rot).toBe(12);
    expect(k.kScore).toBeGreaterThanOrEqual(0);
    expect(k.gScore).toBe(0);          // Fragebogen noch nicht beantwortet
    expect(k.gBeantwortet).toBe(0);
  });

  test('nächste Schritte richten sich nach dem Stand', async ({ page }) => {
    await openApp(page);
    // Ohne Daten steht der Aufbau des Inventars oben
    const leer = await page.evaluate(() => statusNaechsteSchritte(statusKennzahlen()));
    expect(leer[0]).toMatch(/Dateninventar aufbauen/);

    await loadSample(page);
    const mitDaten = await page.evaluate(() => statusNaechsteSchritte(statusKennzahlen()));
    expect(mitDaten.some(x => /Governance-Reifegrad/.test(x))).toBe(true);
    expect(mitDaten.some(x => /Pflichtfeld-Fehler/.test(x))).toBe(true);
    // Höchstens fünf, damit die Seite eine Seite bleibt
    expect(mitDaten.length).toBeLessThanOrEqual(5);

    const fertig = await page.evaluate(() => {
      inventory.forEach(d => {
        Object.assign(d, {
          keywords: 'x', landingPage: 'https://example.org',
          contactPoint: 'a@b.de', theme: 'ENVI', contributorID: 'X',
          description: 'Eine ausreichend lange Beschreibung.',
          _clearing: { pb: 'nein', art9: '', recht: '', anon: '' },
        });
        d.distributions.forEach(x => { x.license = 'dl-de/by-2-0'; x.format = 'CSV'; });
      });
      GOV_QUESTIONS.forEach(q => { governanceAnswers[q.id] = 'ja'; });
      KOMPASS_DIMENSIONS.forEach(d => d.items.forEach(i => { kompassState[`${d.id}.${i.id}`] = 'erfuellt'; }));
      return statusNaechsteSchritte(statusKennzahlen());
    });
    expect(fertig.length).toBe(1);
    expect(fertig[0]).toMatch(/Phase 4/);
  });

  test('Einseiter öffnet das Druckfenster', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('vorlagen'));
    await page.locator('[data-doc="status"]').click();
    expect(await page.evaluate(() => window.__dialogs.print)).toBeGreaterThan(0);
  });

  test('funktioniert auch ohne Inventar', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => navTo('vorlagen'));
    await page.locator('[data-doc="status"]').click();
    // Anders als die datengetriebenen Formulare braucht der Einseiter keine Daten
    expect(await page.evaluate(() => window.__dialogs.alert.length)).toBe(0);
    expect(await page.evaluate(() => window.__dialogs.print)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Kompass – Rechtspflicht der Organisation', () => {
  /* Eine einzige Angabe zur Organisation – und sie darf genau zwei Dinge
     bewirken, nicht mehr. Bewusst NICHT „Behörde oder NGO": dazwischen liegen
     Stadtwerke, Hochschulen und Beliehene, die ein Zwei-Wege-Schalter falsch
     einsortiert. */
  test('Rechtspflicht: „nein" nimmt genau einen Prüfpunkt aus der Wertung', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const alle = () => KOMPASS_DIMENSIONS.flatMap(d =>
        d.items.map(i => [`${d.id}.${i.id}`, kompassStatus(d.id, i.id)]));
      kompassProfil = { rechtspflicht: '' };
      const vorher = alle();
      kompassProfil = { rechtspflicht: 'nein' };
      const nachher = alle();
      const geaendert = nachher.filter(([k, v], i) => v !== vorher[i][1]).map(([k, v]) => `${k}=${v}`);
      kompassProfil = { rechtspflicht: '' };
      return geaendert;
    });
    expect(r).toEqual(['strategie.recht=na']);
  });

  test('Rechtspflicht: „ja" und „unklar" ändern nichts', async ({ page }) => {
    await openApp(page);
    for (const wert of ['ja', 'unklar']) {
      const status = await page.evaluate(w => {
        kompassProfil = { rechtspflicht: w };
        const s = kompassStatus('strategie', 'recht');
        kompassProfil = { rechtspflicht: '' };
        return s;
      }, wert);
      expect(status, wert).toBe('offen');
    }
  });

  test('ohne Rechtspflicht schlägt die Prüfung keine hochwertigen Datensätze vor', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const r = await page.evaluate(() => {
      kompassProfil = { rechtspflicht: '' };
      const mit = hvdVorschlaege().length;
      kompassProfil = { rechtspflicht: 'nein' };
      const ohne = hvdVorschlaege().length;
      kompassProfil = { rechtspflicht: '' };
      return { mit, ohne };
    });
    // Die DVO (EU) 2023/138 bindet oeffentliche Stellen – Vorschlaege waeren irrefuehrend
    expect(r.mit).toBeGreaterThan(0);
    expect(r.ohne).toBe(0);
  });

  test('die Angabe überlebt Reload und Projektdatei', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { kompassProfil = { rechtspflicht: 'nein' }; saveState(); });
    await page.reload();
    await page.waitForFunction(() => typeof pseudonymize === 'function');
    expect(await page.evaluate(() => kompassProfil.rechtspflicht)).toBe('nein');

    const r = await page.evaluate(() => {
      const json = buildProjectJSON();
      kompassProfil = { rechtspflicht: '' };
      importProject(json);
      return kompassProfil.rechtspflicht;
    });
    expect(r).toBe('nein');
  });

  test('„Gespeicherte Daten löschen" setzt die Angabe zurück', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      kompassProfil = { rechtspflicht: 'nein' }; saveState();
      clearState();
      return kompassProfil.rechtspflicht;
    });
    expect(r).toBe('');
  });
});
