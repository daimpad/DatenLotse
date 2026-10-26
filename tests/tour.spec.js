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

    const gesamt = await page.evaluate(() => tourSteps().length);
    await expect(page.locator('#tour-card')).toContainText(`Schritt 1 von ${gesamt}`);
    await expect(page.locator('#tour-prev')).toBeDisabled();

    // Jeder Schritt landet in der Ansicht, die er erklärt
    const views = { home: '#hero', kompass: '#kompass-view', governance: '#governance-view',
      inventory: '#inventory-view', pseudo: '#pseudo-view', wissen: '#wissen-view', vorlagen: '#vorlagen-view' };
    for (let i = 0; i < gesamt; i++) {
      const view = await page.evaluate(() => tourSteps()[tour.i].view);
      await expect(page.locator(views[view]), `Schritt ${i + 1}`).toBeVisible();
      if (i < gesamt - 1) await page.locator('#tour-next').click();
    }

    // Zurück führt wieder in die vorherige Ansicht
    await page.evaluate(() => tourKapitel('governance'));
    await expect(page.locator('#governance-view')).toBeVisible();
    await page.locator('#tour-prev').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('letzter Schritt schließt den Rundgang ab', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const gesamt = await page.evaluate(() => tourSteps().length);
    await page.evaluate(() => startTour());
    for (let i = 0; i < gesamt; i++) await page.locator('#tour-next').click();
    await expect(page.locator('#tour-layer')).toBeHidden();
  });

  test('Escape und das Schließen-Kreuz beenden den Rundgang', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => startTour());
    await expect(page.locator('#tour-layer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tour-layer')).toBeHidden();

    await page.evaluate(() => startTour());
    await page.locator('#tour-close').click();
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
    await page.evaluate(() => { startTour(); tourKapitel('inventar'); });

    await expect(page.locator('#tour-sample')).toBeVisible();
    expect(await page.evaluate(() => inventory.length)).toBe(0);
    // Von den datenabhängigen Schritten bleibt ohne Daten nur das eine Angebot –
    // sonst stünde siebenmal hintereinander derselbe Hinweis da
    expect(await page.evaluate(() => tourSteps().filter(s => s.needsData).map(s => s.id))).toEqual(['i-karte']);
    // Gezeigt wird, wo das Inventar beginnt – und kein Erklär-Modal hinter der Karte
    // (navTo('inventory') öffnet es ohne Daten; bis v69 lag es dann hinter dem Rundgang)
    await expect(page.locator('#modul-inventar.tour-highlight')).toHaveCount(1);
    await expect(page.locator('#inventory-backdrop')).toBeHidden();

    const vorher = await page.evaluate(() => tourSteps()[tour.i].id);
    await page.locator('#tour-sample').click();
    await expect(page.locator('#tour-sample')).toHaveCount(0);
    expect(await page.evaluate(() => inventory.length)).toBe(12);
    // Die Liste wächst, der Rundgang bleibt auf demselben Schritt
    expect(await page.evaluate(() => tourSteps()[tour.i].id)).toBe(vorher);
    await expect(page.locator('.inv-card .inv-card-head.tour-highlight')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('Hervorhebung wandert mit und bleibt am Ende nicht zurück', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { startTour(); tourKapitel('kompass'); });
    await expect(page.locator('#kompass-score.tour-highlight')).toHaveCount(1);
    await page.locator('#tour-next').click();
    // Nur genau ein Element ist gleichzeitig hervorgehoben
    await expect(page.locator('.tour-highlight')).toHaveCount(1);
    await expect(page.locator('#kompass-dims .kompass-dim.tour-highlight')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('.tour-highlight')).toHaveCount(0);
  });

  test('Seitenleisten-Schritt öffnet die Leiste und schließt sie danach wieder', async ({ page }) => {
    await openApp(page);
    const idx = await page.evaluate(() => tourSteps().findIndex(s => s.openSidebar));
    await page.evaluate(i => { startTour(); tour.i = i; renderTour(); }, idx);
    await expect(page.locator('.sidebar-project.tour-highlight')).toBeVisible();

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

/* ── v70: vollständiger Rundgang in Kapiteln ─────────────────────────
   Vorher elf Stichproben mit der Karte immer unten mittig – sie verdeckte
   bei großen Zielen genau das, was sie erklären sollte, und Ziele in Topbar
   oder Seitenleiste blieben mit abgedunkelt. */
test.describe('Rundgang in Kapiteln (v70)', () => {
  // Alle Schritte so durchgehen, wie der Rundgang sie zeigt
  async function jederSchritt(page, fn) {
    const n = await page.evaluate(() => tourSteps().length);
    const raus = [];
    for (let i = 0; i < n; i++) {
      await page.evaluate(k => { tour.i = k; renderTour(); }, i);
      // Übergänge (Seitenleiste) abwarten, dann einen Frame für das Nachführen
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      const r = await page.evaluate(fn);
      if (r) raus.push(r);
    }
    return raus;
  }

  test('Kapitel: jedes hat Schritte, Sprung und Markierung stimmen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const struktur = await page.evaluate(() => ({
      kapitel: TOUR_KAPITEL.map(k => k.id),
      leer: TOUR_KAPITEL.filter(k => !TOUR_STEPS.some(s => s.kap === k.id)).map(k => k.id),
      fremd: TOUR_STEPS.filter(s => !TOUR_KAPITEL.some(k => k.id === s.kap)).map(s => s.id),
      doppelt: TOUR_STEPS.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i),
      // Kapitel stehen zusammenhängend – sonst sprängen die Punkte hin und her
      zerrissen: TOUR_KAPITEL.filter(k => {
        const idx = TOUR_STEPS.map((s, i) => s.kap === k.id ? i : -1).filter(i => i >= 0);
        return idx.length && idx[idx.length - 1] - idx[0] + 1 !== idx.length;
      }).map(k => k.id),
    }));
    expect(struktur.kapitel.length).toBe(7);
    expect(struktur.leer).toEqual([]);
    expect(struktur.fremd).toEqual([]);
    expect(struktur.doppelt).toEqual([]);
    expect(struktur.zerrissen).toEqual([]);

    // Der erste Schritt bietet alle Kapitel zur Auswahl an
    await page.evaluate(() => startTour());
    await expect(page.locator('#tour-card .tour-chapter')).toHaveCount(7);
    await page.locator('#tour-card .tour-chapter[data-tour-kap="schutz"]').click();
    const nach = await page.evaluate(() => ({
      kap: tourSteps()[tour.i].kap,
      erster: tourSteps().findIndex(s => s.kap === 'schutz') === tour.i,
    }));
    expect(nach).toEqual({ kap: 'schutz', erster: true });
    // Der Kapitelpunkt markiert, wo man ist – für Screenreader per aria-current
    await expect(page.locator('.tour-dot[aria-current="step"]')).toHaveAttribute('data-tour-kap', 'schutz');
    await page.locator('.tour-dot[data-tour-kap="wissen"]').click();
    expect(await page.evaluate(() => tourSteps()[tour.i].kap)).toBe('wissen');
  });

  test('jeder Bereich und jeder Tab wird gezeigt – und ist dann auch sichtbar', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const abdeckung = await page.evaluate(() => ({
      views: [...new Set(TOUR_STEPS.map(s => s.view))].sort(),
      invTabs: [...new Set(TOUR_STEPS.map(s => s.invTab).filter(Boolean))].sort(),
      pseudoTabs: [...new Set(TOUR_STEPS.map(s => s.pseudoTab).filter(Boolean))].sort(),
    }));
    expect(abdeckung.views).toEqual(['governance', 'home', 'inventory', 'kompass', 'pseudo', 'vorlagen', 'wissen']);
    expect(abdeckung.invTabs).toEqual(['clearing', 'inventar', 'quality']);
    expect(abdeckung.pseudoTabs).toEqual(['csv', 'risiko', 'text']);

    await page.evaluate(() => startTour());
    const falsch = await jederSchritt(page, () => {
      const s = tourSteps()[tour.i];
      const panel = s.invTab ? { inventar: 'inventar-panel', clearing: 'clearing-panel', quality: 'quality-panel' }[s.invTab]
        : s.pseudoTab ? `pseudo-${s.pseudoTab}-panel` : null;
      if (panel && document.getElementById(panel).classList.contains('hidden')) return `${s.id}: ${panel} verborgen`;
      if (!s.target) return null;
      const hl = [...document.querySelectorAll('.tour-highlight')];
      if (hl.length !== 1) return `${s.id}: ${hl.length} Hervorhebungen`;
      if (!hl[0].matches(s.target)) return `${s.id}: falsches Element`;
      const r = hl[0].getBoundingClientRect();
      if (!r.width || !r.height) return `${s.id}: Ziel unsichtbar`;
      if (r.top < 0 || r.top > innerHeight) return `${s.id}: Ziel außer Sicht`;
      return null;
    });
    expect(falsch).toEqual([]);
  });

  test('die Karte steht neben dem Ziel und verdeckt es nicht (Desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('home'); startTour(); });
    const befunde = await jederSchritt(page, () => {
      const card = document.getElementById('tour-card'), c = card.getBoundingClientRect();
      const s = tourSteps()[tour.i];
      if (c.top < 0 || c.left < 0 || c.bottom > innerHeight + 1 || c.right > innerWidth + 1) return `${s.id}: Karte ragt hinaus`;
      const z = document.querySelector('.tour-highlight');
      if (!z) return null;
      const t = z.getBoundingClientRect();
      const ix = Math.max(0, Math.min(c.right, t.right) - Math.max(c.left, t.left));
      const iy = Math.max(0, Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top));
      if (ix * iy > 0) return `${s.id}: verdeckt ${Math.round(ix * iy / (t.width * t.height) * 100)} % (${card.dataset.place})`;
      if (!['unten', 'oben', 'links', 'rechts'].includes(card.dataset.place)) return `${s.id}: angedockt statt am Ziel`;
      return null;
    });
    expect(befunde).toEqual([]);
  });

  test('auf dem Telefon dockt die Karte an, der Anfang des Ziels bleibt frei', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => { navTo('home'); startTour(); });
    const befunde = await jederSchritt(page, () => {
      const card = document.getElementById('tour-card'), c = card.getBoundingClientRect();
      const s = tourSteps()[tour.i];
      if (c.top < -1 || c.left < -1 || c.bottom > innerHeight + 1 || c.right > innerWidth + 1) return `${s.id}: Karte ragt hinaus`;
      const z = document.querySelector('.tour-highlight');
      if (!z) return null;
      const t = z.getBoundingClientRect();
      // die erste Zeile des Ziels: darf weder unter der Karte noch außer Sicht liegen
      const y = t.top + 6;
      if (y < 0 || y > innerHeight) return `${s.id}: Anfang außer Sicht`;
      if (y >= c.top && y <= c.bottom && t.left < c.right && t.right > c.left) return `${s.id}: Anfang verdeckt`;
      return null;
    });
    expect(befunde).toEqual([]);
  });

  /* Gemessen, nicht über Klassen behauptet: das Abdunkeln (body::before) wird
     klickbar gemacht, dann zeigt elementFromPoint, was OBEN liegt. Läge das
     Ziel darunter, träfe der Punkt das body-Element. Bis v69 war das beim
     Seitenleisten-Schritt so – die fixierte Leiste (z-index 300) bildet einen
     eigenen Stapelkontext, das Ziel darin kam nie über 1200 hinaus. */
  test('hervorgehobene Stellen liegen über dem Abdunkeln – auch in Topbar und Seitenleiste', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page);
    await loadSample(page);
    await page.addStyleTag({ content: 'body.tour-on::before { pointer-events: auto !important; }' });
    await page.evaluate(() => { navTo('home'); startTour(); });
    const verdeckt = await jederSchritt(page, () => {
      const z = document.querySelector('.tour-highlight');
      if (!z) return null;
      const t = z.getBoundingClientRect();
      const oben = document.elementFromPoint(t.left + Math.min(12, t.width / 2), t.top + Math.min(8, t.height / 2));
      return z.contains(oben) ? null : `${tourSteps()[tour.i].id}: oben liegt ${oben ? (oben.id || oben.tagName) : 'nichts'}`;
    });
    expect(verdeckt).toEqual([]);
    // Danach ist nichts mehr angehoben
    await page.evaluate(() => endTour());
    expect(await page.locator('.tour-lift, .tour-highlight, .tour-pos').count()).toBe(0);
  });

  test('kein Rundgangstext verspricht „keine Übertragung"', async ({ page }) => {
    await openApp(page);
    // Regression v70: der Willkommensschritt versprach „keine Übertragung" –
    // seit v48 gibt es die anonyme Zählung, die Zusage gilt für die INHALTE
    const texte = await page.evaluate(() => TOUR_STEPS.map(s => s.text).join(' '));
    expect(texte).not.toMatch(/keine (Daten)?übertragung|kein Datentransfer/i);
    expect(await page.evaluate(() => TOUR_STEPS[0].text)).toMatch(/Inhalte bleiben/);
  });
});
