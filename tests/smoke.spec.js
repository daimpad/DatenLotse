const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Grundgerüst & Navigation', () => {
  test('lädt ohne Konsolenfehler und zeigt den Hero', async ({ page }) => {
    const errors = await openApp(page);
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#hero h1')).toContainText('DatenLotse');
    expect(errors).toEqual([]);
  });

  /* Genau ein externer Aufruf ist erlaubt: die anonyme Seitenzählung.
     Alles andere – Schriften, Icons, Bibliotheken, Karten – wird lokal
     ausgeliefert, und genau das prüft dieser Test weiterhin. Die Liste ist
     bewusst eine Aufzählung konkreter Hosts und kein Muster: ein zweiter
     Dienst soll auffallen, nicht durchrutschen. */
  const ERLAUBTE_HOSTS = require('./helpers').ZAEHLUNG_HOSTS;

  test('nur der Zähl-Aufruf geht nach außen (kein CDN, keine Bibliothek)', async ({ page }) => {
    const external = [];
    page.on('request', r => {
      const url = r.url();
      if (url.startsWith('http://127.0.0.1:8081') || url.startsWith('data:') || url.startsWith('blob:')) return;
      if (ERLAUBTE_HOSTS.includes(new URL(url).hostname)) return;
      external.push(url);
    });
    await openApp(page);
    await loadSample(page);
    expect(external).toEqual([]);
  });

  test('die Seitenzählung kann keine Inhalte mitnehmen', async ({ page }) => {
    // Sie sieht nur die Adresse. Schriebe die App jemals Zustand in die URL –
    // Hash, Query, pushState –, gingen importierte Daten mit hinaus. Sie tut
    // es nicht, und dieser Test hält das fest.
    await openApp(page);
    await loadSample(page);
    const vorher = page.url();
    await page.evaluate(() => { navTo('inventory'); showInventoryTab('quality'); navTo('kompass'); });
    expect(page.url()).toBe(vorher);
    expect(new URL(page.url()).hash).toBe('');
    expect(new URL(page.url()).search).toBe('');
  });

  test('alle sieben Views sind über navTo erreichbar', async ({ page }) => {
    const errors = await openApp(page);
    const views = {
      kompass: '#kompass-view',
      governance: '#governance-view',
      pseudo: '#pseudo-view',
      wissen: '#wissen-view',
      vorlagen: '#vorlagen-view',
    };
    for (const [target, sel] of Object.entries(views)) {
      await page.evaluate(t => navTo(t), target);
      await expect(page.locator(sel)).toBeVisible();
      await expect(page.locator('#hero')).toBeHidden();
    }
    // Inventar braucht Daten – ohne Daten kommt das Erklär-Modal
    await page.evaluate(() => navTo('inventory'));
    await expect(page.locator('#inventory-backdrop')).toBeVisible();
    await page.evaluate(() => showModal('inventory-backdrop', false));

    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    await expect(page.locator('#inventory-view')).toBeVisible();

    await page.evaluate(() => navTo('home'));
    await expect(page.locator('#hero')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('nur genau eine sichtbare h1 je View', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    for (const t of ['home', 'kompass', 'inventory', 'governance', 'pseudo', 'wissen', 'vorlagen']) {
      await page.evaluate(x => navTo(x), t);
      const visible = await page.locator('h1:visible').count();
      expect(visible, `View ${t}`).toBe(1);
    }
  });

  test('Phase-4&5-Block erscheint nur auf der Startseite', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.consult-cta')).toBeVisible();
    await page.evaluate(() => navTo('kompass'));
    await expect(page.locator('.consult-cta')).toBeHidden();
  });

  test('Dashboard bleibt ohne Daten verborgen und erscheint mit Daten', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#dashboard')).toBeHidden();
    await loadSample(page);
    await page.evaluate(() => navTo('home'));
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('.dash-card')).toHaveCount(4);
    // Karten sind delegierte Schnellsprünge
    await page.locator('.dash-card[data-go="kompass"]').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
  });

  test('Buttons enthalten keine Block-Elemente (HTML-Validität)', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('home'));
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter(b => b.querySelector('div, p, h1, h2, h3, ul, ol, section, article'))
        .map(b => b.className));
    expect(bad).toEqual([]);
  });
});
