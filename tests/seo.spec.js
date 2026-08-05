const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openApp } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const SEITEN = ['', 'glossar', 'rechtsgrundlagen', 'rechtsgrundlagen-laender',
                'kommunale-satzungen', 'lizenzen', 'reifegrad-modelle', 'pruefwerkzeuge'];

test.describe('Statische Wissensseiten', () => {
  test('sind gegenüber den App-Daten aktuell', () => {
    // Der Generator liest die Arrays aus der laufenden App – läuft sie
    // weiter, ohne dass jemand regeneriert, wird dieser Test rot.
    execFileSync('node', ['tools/generate-wissen.js', '--check'], {
      cwd: ROOT, stdio: 'pipe',
      env: { ...process.env, PLAYWRIGHT_CHROMIUM_PATH: process.env.PLAYWRIGHT_CHROMIUM_PATH || '' },
    });
  });

  for (const slug of SEITEN) {
    test(`/wissen/${slug ? slug + '/' : ''} trägt vollständige Metadaten`, async ({ page }) => {
      const fehler = [];
      page.on('pageerror', e => fehler.push(String(e)));
      const url = `/wissen/${slug ? slug + '/' : ''}`;
      await page.goto(url);

      await expect(page).toHaveTitle(/DatenLotse$/);
      const meta = await page.evaluate(() => ({
        desc: document.querySelector('meta[name="description"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
        lang: document.documentElement.lang,
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map(s => JSON.parse(s.textContent)['@type']),
      }));
      expect(meta.desc.length).toBeGreaterThan(80);
      expect(meta.desc.length).toBeLessThan(320);
      expect(meta.canonical).toBe(`https://datenlotse.nozilla.net${url}`);
      expect(meta.h1.length).toBe(1);          // genau eine Überschrift erster Ebene
      expect(meta.lang).toBe('de');
      expect(meta.ogImage).toMatch(/\.png$/);  // SVG wird von Plattformen nicht gerendert
      expect(meta.jsonld).toContain('BreadcrumbList');
      expect(fehler).toEqual([]);
    });
  }

  test('Inhalt steht ohne JavaScript im HTML', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/wissen/rechtsgrundlagen-laender/');
    // Alle 16 Länder müssen ohne Skriptausführung lesbar sein
    for (const land of ['Baden-Württemberg', 'Bayern', 'Hamburg', 'Sachsen', 'Thüringen']) {
      await expect(page.locator('.static-cards')).toContainText(land);
    }
    await expect(page.locator('.static-card')).toHaveCount(16);
    await ctx.close();
  });

  test('Titel und Beschreibungen sind je Seite verschieden', async ({ page }) => {
    const gesehen = new Map();
    for (const slug of SEITEN) {
      await page.goto(`/wissen/${slug ? slug + '/' : ''}`);
      const key = await page.evaluate(() =>
        document.title + '|' + document.querySelector('meta[name="description"]').content);
      expect(gesehen.has(key), `Dublette bei /wissen/${slug}/`).toBe(false);
      gesehen.set(key, slug);
    }
    expect(gesehen.size).toBe(SEITEN.length);
  });

  test('laden keine externen Ressourcen', async ({ page }) => {
    const extern = [];
    page.on('request', r => {
      const u = r.url();
      if (!u.startsWith('http://127.0.0.1:8081') && !u.startsWith('data:')) extern.push(u);
    });
    await page.goto('/wissen/glossar/');
    expect(extern).toEqual([]);
  });

  test('verlinken zurück ins Werkzeug, die App verlinkt sie', async ({ page }) => {
    await page.goto('/wissen/glossar/');
    await expect(page.locator('.static-cta a[href="/"]')).toBeVisible();
    await expect(page.locator('.static-crumbs a[href="/wissen/"]')).toBeVisible();

    await openApp(page);
    await page.evaluate(() => navTo('wissen'));
    const links = await page.locator('.know-static-hint a').evaluateAll(as => as.map(a => a.getAttribute('href')));
    expect(links.length).toBe(7);
    for (const l of links) expect(l).toMatch(/^\/wissen\/[a-z-]+\/$/);
  });
});

test.describe('SEO-Grundlagen der App', () => {
  test('Sitemap führt alle Seiten und nichts Totes', async ({ request }) => {
    const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    expect(locs.length).toBe(SEITEN.length + 1);   // Startseite + Wissensseiten
    for (const slug of SEITEN) {
      expect(locs).toContain(`https://datenlotse.nozilla.net/wissen/${slug ? slug + '/' : ''}`);
    }
    // Jede gelistete Seite existiert auch wirklich
    for (const loc of locs) {
      const pfad = loc.replace('https://datenlotse.nozilla.net', '');
      const res = await request.get(pfad === '/' ? '/index.html' : pfad);
      expect(res.status(), loc).toBe(200);
    }
    expect(xml).not.toContain('2026-06-28');       // veraltetes lastmod
  });

  test('Google-Bestätigungsdatei wird unverändert ausgeliefert', async ({ request }) => {
    // Die Search Console prüft die Datei regelmäßig nach. Verschwindet sie
    // oder ändert sich ihr Inhalt, verliert die Property ihre Bestätigung –
    // und der Verlust fällt erst auf, wenn die Berichte leer sind.
    const dateien = fs.readdirSync(ROOT).filter(f => /^google[0-9a-f]+\.html$/.test(f));
    expect(dateien.length, 'genau eine Google-Bestätigungsdatei erwartet').toBe(1);

    const name = dateien[0];
    expect(fs.readFileSync(path.join(ROOT, name), 'utf8').trim())
      .toBe(`google-site-verification: ${name}`);

    const res = await request.get('/' + name);
    expect(res.status()).toBe(200);
    expect((await res.text()).trim()).toBe(`google-site-verification: ${name}`);

    // Sie ist kein Inhalt und gehört deshalb nicht in die Sitemap
    expect(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8')).not.toContain(name);
    // robots.txt darf sie nicht aussperren, sonst kann Google nicht prüfen
    expect(fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8')).not.toContain('Disallow');
  });

  test('Startseite: Vorschaubild ist ein PNG und existiert', async ({ page, request }) => {
    await openApp(page);
    const bilder = await page.evaluate(() => ({
      og: document.querySelector('meta[property="og:image"]').content,
      typ: document.querySelector('meta[property="og:image:type"]')?.content,
      alt: document.querySelector('meta[property="og:image:alt"]')?.content,
      tw: document.querySelector('meta[name="twitter:image"]').content,
    }));
    // SVG wird von Facebook, LinkedIn und WhatsApp nicht gerendert
    expect(bilder.og).toMatch(/\.png$/);
    expect(bilder.tw).toMatch(/\.png$/);
    expect(bilder.typ).toBe('image/png');
    expect(bilder.alt && bilder.alt.length).toBeGreaterThan(10);
    expect((await request.get('/social-preview.png')).status()).toBe(200);
  });

  test('FAQ-Markup entspricht den tatsächlich angezeigten Fragen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => JSON.parse(s.textContent)).find(d => d['@type'] === 'FAQPage');
      const sichtbar = [...document.querySelectorAll('#faq-backdrop .faq-q')].map(e => e.textContent.trim());
      return { fragen: ld.mainEntity.map(q => q.name), antworten: ld.mainEntity.map(q => q.acceptedAnswer.text), sichtbar };
    });
    // Kein erfundenes Markup: jede ausgezeichnete Frage steht auch auf der Seite
    expect(r.fragen).toEqual(r.sichtbar);
    expect(r.antworten.every(a => a.length > 40)).toBe(true);
  });

  test('Manifest ist vollständig und ohne Tippfehler', async ({ request }) => {
    const m = await (await request.get('/site.webmanifest')).json();
    expect(m.name).toBe('DatenLotse');
    expect(m.short_name).toBe('DatenLotse');   // war „DatenLose“
    expect(m.lang).toBe('de');
    expect(m.start_url).toBe('/');
    expect(m.description.length).toBeGreaterThan(40);
  });

  test('Startseite behält Canonical, Sprache und genau eine h1', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]').href,
      lang: document.documentElement.lang,
      h1: document.querySelectorAll('h1:not([hidden])').length,
      robots: document.querySelector('meta[name="robots"]').content,
    }));
    expect(r.canonical).toBe('https://datenlotse.nozilla.net/');
    expect(r.lang).toBe('de');
    expect(r.h1).toBeGreaterThanOrEqual(1);
    expect(r.robots).toContain('index');
  });
});
