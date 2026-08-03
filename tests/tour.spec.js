const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Onboarding-Rundgang', () => {
  test('Erstnutzer bekommen einen Hinweis, kein aufgezwungenes Modal', async ({ page }) => {
    const errors = await openApp(page);
    // Bewusst KEIN Auto-Start: der Rundgang wird angeboten, nicht aufgedrängt
    await expect(page.locator('#tour-layer')).toBeHidden();
    await expect(page.locator('#tour-hint')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('weggeklickter Hinweis bleibt über den Reload weg', async ({ page }) => {
    await openApp(page);
    await page.locator('#tour-hint-close').click();
    await expect(page.locator('#tour-hint')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('datenlotse_tour'))).toBe('done');

    await page.reload();
    await page.waitForFunction(() => typeof pseudonymize === 'function');
    await expect(page.locator('#tour-hint')).toBeHidden();
  });

  test('Rundgang führt durch alle Schritte und wechselt dabei die Ansicht', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('home'));
    await page.locator('#tour-hint-start').click();

    const gesamt = await page.evaluate(() => TOUR_STEPS.length);
    await expect(page.locator('#tour-card')).toContainText(`Schritt 1 von ${gesamt}`);
    await expect(page.locator('#tour-prev')).toBeDisabled();

    await page.locator('#tour-next').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
    await expect(page.locator('#tour-card')).toContainText('Daten-Kompass');
    await expect(page.locator('#tour-prev')).toBeEnabled();

    await page.locator('#tour-next').click();
    await expect(page.locator('#governance-view')).toBeVisible();

    // Zurück führt wieder in die vorherige Ansicht
    await page.locator('#tour-prev').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('letzter Schritt schließt den Rundgang ab', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const gesamt = await page.evaluate(() => TOUR_STEPS.length);
    await page.evaluate(() => startTour());
    for (let i = 0; i < gesamt; i++) await page.locator('#tour-next').click();
    await expect(page.locator('#tour-layer')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('datenlotse_tour'))).toBe('done');
  });

  test('Escape und „Überspringen“ beenden den Rundgang', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => startTour());
    await expect(page.locator('#tour-layer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tour-layer')).toBeHidden();

    await page.evaluate(() => startTour());
    await page.locator('#tour-skip').click();
    await expect(page.locator('#tour-layer')).toBeHidden();
  });

  test('Pfeiltasten blättern vor und zurück', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => startTour());
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tour-card')).toContainText('Schritt 2');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tour-card')).toContainText('Schritt 1');
    // Vor dem ersten Schritt passiert nichts
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tour-card')).toContainText('Schritt 1');
  });

  test('Schritte ohne Daten bieten den Import an, statt still zu laden', async ({ page }) => {
    const errors = await openApp(page);
    const idx = await page.evaluate(() => TOUR_STEPS.findIndex(s => s.needsData));
    await page.evaluate(i => { startTour(); tour.i = i; renderTour(); }, idx);

    await expect(page.locator('#tour-sample')).toBeVisible();
    expect(await page.evaluate(() => inventory.length)).toBe(0);
    await expect(page.locator('.tour-highlight')).toHaveCount(0);

    await page.locator('#tour-sample').click();
    await expect(page.locator('#tour-sample')).toHaveCount(0);
    expect(await page.evaluate(() => inventory.length)).toBe(12);
    await expect(page.locator('.inv-card.tour-highlight')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('Hervorhebung wandert mit und bleibt am Ende nicht zurück', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => startTour());
    await page.locator('#tour-next').click();
    await expect(page.locator('#kompass-score.tour-highlight')).toHaveCount(1);
    await page.locator('#tour-next').click();
    // Nur genau ein Element ist gleichzeitig hervorgehoben
    await expect(page.locator('.tour-highlight')).toHaveCount(1);
    await expect(page.locator('#gov-questions.tour-highlight')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('.tour-highlight')).toHaveCount(0);
  });

  test('Seitenleisten-Schritt öffnet die Leiste und schließt sie danach wieder', async ({ page }) => {
    await openApp(page);
    const idx = await page.evaluate(() => TOUR_STEPS.findIndex(s => s.openSidebar));
    await page.evaluate(i => { startTour(); tour.i = i; renderTour(); }, idx);
    await expect(page.locator('#project-save-btn.tour-highlight')).toBeVisible();

    await page.locator('#tour-next').click();
    expect(await page.evaluate(() =>
      document.getElementById('app-sidebar').classList.contains('collapsed'))).toBe(true);
  });

  test('Rundgang lässt sich über die Seitenleiste wiederholen', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => markTourSeen());
    await expect(page.locator('#tour-hint')).toBeHidden();

    await page.locator('#sidebar-toggle-btn').click();
    await page.locator('#sidebar-tour').click();
    await expect(page.locator('#tour-layer')).toBeVisible();
    await expect(page.locator('#tour-card')).toContainText('Schritt 1');
    // Die Leiste liegt dann nicht mehr über dem Rundgang
    expect(await page.evaluate(() =>
      document.getElementById('app-sidebar').classList.contains('collapsed'))).toBe(true);
  });

  test('Schritt-Daten sind vollständig und zeigen auf existierende Ziele', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const befunde = await page.evaluate(() => {
      const views = ['home', 'kompass', 'inventory', 'governance', 'pseudo', 'wissen', 'vorlagen'];
      const raus = [];
      TOUR_STEPS.forEach((s, i) => {
        if (!s.title || !s.text) raus.push(`Schritt ${i + 1}: Titel oder Text fehlt`);
        if (s.view && !views.includes(s.view)) raus.push(`Schritt ${i + 1}: unbekannte View ${s.view}`);
        if (s.target) {
          navTo(s.view);
          if (s.openSidebar) openSidebar();
          if (!document.querySelector(s.target)) raus.push(`Schritt ${i + 1}: Ziel ${s.target} existiert nicht`);
          closeSidebar();
        }
      });
      return raus;
    });
    expect(befunde).toEqual([]);
  });

  test('Rundgang-Text wird escaped in die Karte geschrieben', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      TOUR_STEPS[0].title = '<img src=x onerror="window.__xss=1">';
      startTour();
    });
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('#tour-card img').count()).toBe(0);
  });
});
