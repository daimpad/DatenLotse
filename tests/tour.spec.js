const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Onboarding-Rundgang', () => {
  test('kein aufgezwungenes Modal – der Rundgang wird angeboten', async ({ page }) => {
    const errors = await openApp(page);
    // Bewusst KEIN Auto-Start: der Rundgang wird angeboten, nicht aufgedrängt
    await expect(page.locator('#tour-layer')).toBeHidden();
    // …aber sichtbar angeboten, im Hero und dauerhaft in der Seitenleiste
    await expect(page.locator('#hero-tour-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  /* v68: Der wegklickbare Hinweis `#tour-hint` ist entfallen – der Hero bietet
     den Rundgang jetzt dauerhaft an, der Hinweis war die zweite Einladung an
     derselben Seite. Mit ihm entfällt sein einziger Leser: der Schlüssel
     `datenlotse_tour` wurde sonst nur noch geschrieben und von niemandem gelesen. */
  test('kein Rundgang-Hinweis und kein verwaister Speicher-Schlüssel mehr', async ({ page }) => {
    await openApp(page);
    expect(await page.locator('#tour-hint').count()).toBe(0);
    await page.evaluate(() => { startTour(); endTour(); });
    expect(await page.evaluate(() => localStorage.getItem('datenlotse_tour'))).toBeNull();
    expect(await page.evaluate(() => typeof refreshTourHint)).toBe('undefined');
  });

  test('Rundgang führt durch alle Schritte und wechselt dabei die Ansicht', async ({ page }) => {
    const errors = await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('home'));
    await page.locator('#hero-tour-btn').click();

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

  // Regression v66: `.tour-highlight` lag auf z-index 1201, die Karte steckte in
  // `#tour-layer` (position: fixed = eigener Stapelkontext) auf 1200. Das
  // Zielelement zeichnete dadurch IN die Karte hinein – bei Schritt 3 stand der
  // Fragebogentext über Titel und Knöpfen, und Klicks dort trafen den Fragebogen.
  test('kein Seiteninhalt zeichnet in die Rundgang-Karte hinein', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => startTour());

    const gesamt = await page.evaluate(() => TOUR_STEPS.length);
    const verdeckt = [];
    for (let i = 0; i < gesamt; i++) {
      await page.evaluate(n => { tour.i = n; renderTour(); }, i);
      await page.waitForTimeout(450);   // scrollIntoView ist smooth
      const treffer = await page.evaluate(() => {
        const card = document.getElementById('tour-card');
        const b = card.getBoundingClientRect();
        const raus = [];
        for (const dx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          for (const dy of [0.06, 0.2, 0.5, 0.8, 0.94]) {
            const x = b.left + b.width * dx, y = b.top + b.height * dy;
            const oben = document.elementFromPoint(x, y);
            if (!card.contains(oben)) {
              raus.push(`Schritt ${tour.i + 1}: ${oben ? (oben.id || oben.className || oben.tagName) : 'nichts'}`);
            }
          }
        }
        return raus;
      });
      verdeckt.push(...treffer);
    }
    expect(verdeckt).toEqual([]);
  });

  test('das Abdunkeln liegt unter der hervorgehobenen Stelle und geht wieder weg', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { startTour(); tour.i = 2; renderTour(); });
    await page.waitForTimeout(450);

    const an = await page.evaluate(() => {
      const hl = document.querySelector('.tour-highlight');
      const b = hl.getBoundingClientRect();
      const oben = document.elementFromPoint(b.left + 20, b.top + 12);
      return {
        klasse: document.body.classList.contains('tour-on'),
        grund: getComputedStyle(document.body, '::before').backgroundColor,
        // die hervorgehobene Stelle bleibt bedienbar, das Abdunkeln liegt darunter
        erreichbar: hl.contains(oben) || oben === hl,
      };
    });
    expect(an.klasse).toBe(true);
    expect(an.grund).not.toBe('rgba(0, 0, 0, 0)');
    expect(an.erreichbar).toBe(true);

    // Ohne das Entfernen bliebe die Seite nach dem Rundgang dauerhaft abgedunkelt
    await page.evaluate(() => endTour());
    expect(await page.evaluate(() => document.body.classList.contains('tour-on'))).toBe(false);
    expect(await page.evaluate(() =>
      getComputedStyle(document.body, '::before').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
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
