const { test, expect } = require('@playwright/test');
const { openApp, loadSample } = require('./helpers');

test.describe('Grundgerüst & Navigation', () => {
  test('lädt ohne Konsolenfehler und zeigt den Hero', async ({ page }) => {
    const errors = await openApp(page);
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#hero h1')).toContainText('DatenLotse');
    expect(errors).toEqual([]);
  });

  /* v66: Der Hero sagte „Datenmanagement verstehen, aufbauen, vertiefen" und
     verschwieg damit, wofür das Werkzeug gebaut ist – Daten zu öffnen. Titel
     UND Einleitung benennen den Zweck jetzt; ein Test hält beides fest, weil
     eine Überschrift ohne den Satz darunter nur die halbe Aussage wäre. */
  test('Hero benennt Open Data als Zweck – in Titel und Einleitung', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#hero h1')).toContainText(/Open Data/i);
    const sub = await page.locator('.hero-sub').innerText();
    expect(sub).toMatch(/Open Data/i);
    expect(sub).toMatch(/öffnen/i);
  });

  /* v67: „DatenLotse: Daten verstehen …" stand als ein Satz mit Doppelpunkt in
     einer Farbe und einer Größe – die Marke ging darin unter. Marke und Aussage
     sind jetzt getrennt ausgezeichnet; der Test misst den Unterschied, statt ihn
     zu behaupten (eine reine Klassen-Prüfung bliebe grün, wenn beide gleich aussähen). */
  test('Marke und Aussage im Hero sind sichtbar voneinander abgesetzt', async ({ page }) => {
    await openApp(page);
    const h1 = page.locator('#hero h1');
    await expect(h1.locator('.hero-brand')).toHaveText('DatenLotse');
    await expect(h1.locator('.hero-claim')).toContainText(/Open Data/i);
    // kein Doppelpunkt mehr hinter der Marke
    expect(await h1.locator('.hero-brand').innerText()).not.toContain(':');

    const stil = await page.evaluate(() => {
      const g = el => { const c = getComputedStyle(document.querySelector(el)); return { size: parseFloat(c.fontSize), color: c.color }; };
      return { marke: g('.hero-brand'), claim: g('.hero-claim') };
    });
    expect(stil.marke.size).toBeGreaterThan(stil.claim.size + 8);
    expect(stil.marke.color).not.toBe(stil.claim.color);
  });

  /* v67: Der Hero bot nur „Daten-Kompass starten". Wer sich erst orientieren
     will, hatte im Hero keinen Weg dorthin – der Rundgang lag im wegklickbaren
     Hinweis und in der Seitenleiste. */
  test('der Hero bietet beide Einstiege an – sofort loslegen und Rundgang', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#hero-kompass-btn')).toContainText('Sofort loslegen');
    await expect(page.locator('#hero-tour-btn')).toContainText('Rundgang');

    await page.locator('#hero-tour-btn').click();
    await expect(page.locator('#tour-layer')).toBeVisible();
    await expect(page.locator('#tour-card')).toContainText('Schritt 1');
    await page.locator('#tour-skip').click();

    await page.locator('#hero-kompass-btn').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
  });

  /* v67: Die DatenGraf-Brücke stand als graue Zeile unter dem Hero-Button und
     richtete sich an eine Minderheit. Jetzt ein eigener Abschnitt weiter unten –
     unterhalb der Modul-Karten, mit eigener Erklärung. */
  test('die DatenGraf-Brücke ist ein eigener Abschnitt unterhalb der Module', async ({ page }) => {
    await openApp(page);
    const bridge = page.locator('#graf-bridge');
    await expect(bridge).toBeVisible();
    await expect(bridge.locator('h2')).toBeVisible();
    // Erklärung, nicht nur ein Link
    expect((await bridge.locator('.graf-bridge-text').innerText()).length).toBeGreaterThan(120);
    // …und sie steht wirklich weiter unten als die Modul-Karten
    const [module, bruecke] = await page.evaluate(() => [
      document.getElementById('module-grid').getBoundingClientRect().top,
      document.getElementById('graf-bridge').getBoundingClientRect().top,
    ]);
    expect(bruecke).toBeGreaterThan(module);
    // im Hero steht sie nicht mehr
    expect(await page.locator('#hero .graf-bridge, #hero .hero-from-graf').count()).toBe(0);
  });

  /* v69: Die Brücke trug erst ein CSV-Zeichen, dann das DatenGraf-Zeichen aus der
     Icon-Schrift – beides, weil das echte Logo nicht zu beschaffen war. Jetzt liegt
     es lokal im Repo. Der Test prüft, dass es wirklich geladen wird und nicht als
     kaputtes Bild endet; ein `<img>`, das 404 liefert, hat naturalWidth 0. */
  test('die DatenGraf-Brücke trägt das echte Logo, lokal ausgeliefert', async ({ page }) => {
    await openApp(page);
    const logo = page.locator('img.graf-bridge-icon');
    // `loading="lazy"`: der Abschnitt steht weit unter dem Falz, das Bild wird
    // beim ersten Laden bewusst nicht mitgeholt (siehe Ladegewicht-Budget).
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toBeVisible();
    const bild = await logo.evaluate(el => ({
      quelle: el.getAttribute('src'),
      alt: el.getAttribute('alt'),
      geladen: el.complete && el.naturalWidth > 0,
    }));
    expect(bild.quelle).toBe('datengraf-logo.svg');   // lokal, kein CDN
    expect(bild.alt).toBeTruthy();
    expect(bild.geladen).toBe(true);
    // kein Icon-Schriftzeichen mehr an dieser Stelle
    expect(await page.locator('#graf-bridge .graf-bridge-icon i').count()).toBe(0);
  });

  /* v66: Der Hero trug sieben Bausteine (Logo, Titel, Einleitung, Chips,
     Zusage, Aktion, Import-Zeile). Die vier Schritte stehen jetzt in einem
     eigenen Abschnitt – mit `<h2>`, denn je Ansicht bleibt genau eine `<h1>`. */
  test('die vier Schritte stehen in einem eigenen Abschnitt unter dem Hero', async ({ page }) => {
    await openApp(page);
    const steps = page.locator('#hero-steps');
    await expect(steps).toBeVisible();
    await expect(steps.locator('h2')).toBeVisible();
    expect(await steps.locator('h1').count()).toBe(0);
    // die Chips liegen nicht mehr im Hero
    expect(await page.locator('#hero .hero-step').count()).toBe(0);
    expect(await steps.locator('.hero-step').count()).toBe(4);
    // und navigieren weiterhin
    await steps.locator('.hero-step[data-go="kompass"]').click();
    await expect(page.locator('#kompass-view')).toBeVisible();
  });

  /* v66: `showView()` führte eine Liste von IDs plus einen Sonderfall für
     `.consult-cta`. Ein neuer Startseiten-Abschnitt wäre auf allen Unterseiten
     stehen geblieben – jetzt entscheidet die Klasse `.home-only`. */
  test('kein Startseiten-Abschnitt bleibt auf einer Unterseite stehen', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const stehen = [];
    for (const view of ['kompass', 'inventory', 'governance', 'pseudo', 'wissen', 'vorlagen']) {
      await page.evaluate(v => navTo(v), view);
      stehen.push(...await page.evaluate(v => Array.from(document.querySelectorAll('.home-only'))
        .filter(el => el.offsetParent !== null)
        .map(el => `${v}: ${el.id || el.className}`), view));
    }
    expect(stehen).toEqual([]);
    // …und auf der Startseite sind sie alle wieder da
    await page.evaluate(() => navTo('home'));
    expect(await page.evaluate(() => Array.from(document.querySelectorAll('.home-only'))
      .filter(el => el.offsetParent === null).length)).toBe(0);
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

  /* Die Anrede ist einheitlich „Sie". Geprüft wird der SICHTBARE Text, nicht
     der Quelltext: im Quelltext steckt „euer" harmlos in Regex-Quellen wie
     `St(?:euer)?-Nr`, und ein Treffer dort wäre nur Lärm. */
  const DU_FORM = /\b(du|dich|dir|dein|deine[mnrs]?|euch|euer|eure[mnrs]?)\b/i;

  test('die Anrede bleibt überall beim Sie', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const funde = [];
    const pruefe = async (wo) => {
      const text = await page.evaluate(() => document.body.innerText);
      for (const zeile of text.split('\n')) {
        if (DU_FORM.test(zeile)) funde.push(`${wo}: ${zeile.trim().slice(0, 90)}`);
      }
    };
    for (const v of ['home', 'kompass', 'inventory', 'governance', 'pseudo', 'wissen', 'vorlagen']) {
      await page.evaluate(x => navTo(x), v);
      await pruefe(v);
    }
    for (const id of ['faq-backdrop', 'inventory-backdrop', 'phase3-backdrop',
                      'phase45-backdrop', 'license-backdrop']) {
      await page.evaluate(x => showModal(x, true), id);
      await pruefe(id);
      await page.evaluate(x => showModal(x, false), id);
    }
    expect(funde).toEqual([]);
  });

  test('auch der Rundgang siezt', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const texte = await page.evaluate(() => TOUR_STEPS.map(s => `${s.title} ${s.text}`));
    expect(texte.filter(t => DU_FORM.test(t))).toEqual([]);
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
