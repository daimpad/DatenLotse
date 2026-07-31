const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Barrierefreiheit', () => {
  test('Skip-Link führt in den Hauptbereich', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Tab');
    const erster = await page.evaluate(() => document.activeElement.getAttribute('href'));
    expect(erster).toBe('#main-content');
    // <main> ist fokussierbar, sonst springt der Skip-Link ins Leere
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
  });

  test('eingeklappte Seitenleiste liegt nicht im Tab-Order', async ({ page }) => {
    await openApp(page);
    // Regression v29: die Links waren nur transformiert, aber weiterhin fokussierbar
    const versteckt = await page.evaluate(() =>
      getComputedStyle(document.getElementById('app-sidebar')).visibility);
    expect(versteckt).toBe('hidden');
    await expect(page.locator('#sidebar-toggle-btn')).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#sidebar-toggle-btn').click();
    await expect(page.locator('#sidebar-toggle-btn')).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() =>
      getComputedStyle(document.getElementById('app-sidebar')).visibility)).toBe('visible');
  });

  test('Modals fangen den Fokus und geben ihn zurück', async ({ page }) => {
    await openApp(page);
    await page.locator('#faq-btn').focus();
    await page.locator('#faq-btn').click();
    await expect(page.locator('#faq-backdrop')).toBeVisible();

    // Fokus liegt im Dialog und bleibt beim Durchtabben darin
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const drin = await page.evaluate(() =>
        document.getElementById('faq-backdrop').contains(document.activeElement));
      expect(drin).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#faq-backdrop')).toBeHidden();
    await expect(page.locator('#faq-btn')).toBeFocused();
  });

  test('Backdrop-Klick schließt alle Modals', async ({ page }) => {
    await openApp(page);
    for (const id of ['faq-backdrop', 'inventory-backdrop', 'phase3-backdrop', 'phase45-backdrop', 'license-backdrop']) {
      await page.evaluate(x => showModal(x, true), id);
      await expect(page.locator('#' + id)).toBeVisible();
      await page.locator('#' + id).click({ position: { x: 5, y: 5 } });
      await expect(page.locator('#' + id)).toBeHidden();
    }
  });

  test('Inventar-Tabs folgen der ARIA-Tablist-Semantik inkl. Pfeiltasten', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    for (const id of ['tab-inventar', 'tab-clearing', 'tab-quality']) {
      await expect(page.locator('#' + id)).toHaveAttribute('role', 'tab');
      await expect(page.locator('#' + id)).toHaveAttribute('aria-controls', /panel$/);
    }
    for (const id of ['inventar-panel', 'clearing-panel', 'quality-panel']) {
      await expect(page.locator('#' + id)).toHaveAttribute('role', 'tabpanel');
    }
    await page.locator('#tab-inventar').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-clearing')).toBeFocused();
    await expect(page.locator('#clearing-panel')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tab-inventar')).toBeFocused();
  });

  test('Formularfelder tragen zugängliche Namen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => navTo('inventory'));
    const ohneNamen = await page.evaluate(() =>
      [...document.querySelectorAll('#inventory-view input, #inventory-view select, #inventory-view textarea')]
        .filter(el => !el.getAttribute('aria-label') && !el.closest('label') &&
          !(el.id && document.querySelector(`label[for="${el.id}"]`)))
        .map(el => el.outerHTML.slice(0, 80)));
    expect(ohneNamen).toEqual([]);
  });

  test('Kompass-Selects sind beschriftet', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('kompass'));
    const ohne = await page.locator('#kompass-dims select').evaluateAll(
      els => els.filter(e => !e.getAttribute('aria-label')).length);
    expect(ohne).toBe(0);
  });

  test('erklärender Fließtext erreicht WCAG-AA-Kontrast', async ({ page }) => {
    await openApp(page);
    const kontrast = await page.evaluate(() => {
      const lum = c => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(v => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--c-muted').trim();
      const probe = document.createElement('span');
      probe.style.color = muted;
      document.body.appendChild(probe);
      const fg = lum(getComputedStyle(probe).color);
      probe.remove();
      const bg = lum('rgb(255,255,255)');
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
    expect(kontrast).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Responsive Layout', () => {
  for (const width of [360, 375, 390]) {
    test(`kein horizontaler Überlauf bei ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openApp(page);
      await loadSample(page);
      for (const view of ['home', 'kompass', 'inventory', 'governance', 'pseudo', 'wissen', 'vorlagen']) {
        await page.evaluate(v => navTo(v), view);
        const overflow = await page.evaluate(w =>
          document.documentElement.scrollWidth - w, width);
        expect(overflow, `View ${view} bei ${width} px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
