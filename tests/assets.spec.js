/**
 * Ladegewicht und Icon-Auslieferung.
 *
 * DatenLotse liefert alles lokal aus – der Preis dafür ist, dass jedes
 * mitgelieferte Paket auch wirklich über die Leitung geht. Font Awesome ist
 * deshalb auf die tatsächlich verwendeten Icons zugeschnitten
 * (`tools/build-icons.py`). Diese Tests halten den Zuschnitt aktuell und
 * verhindern, dass die vollständigen Pakete unbemerkt zurückkehren.
 *
 * Der Staleness-Test kommt bewusst ohne `fonttools` aus: er vergleicht die im
 * Quelltext benutzten Icon-Klassen mit dem erzeugten CSS. Genau das ist der
 * reale Fehlerfall – ein neues Icon im Markup, ohne `npm run icons`.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

/** Alle Dateien, in denen Icon-Klassen stehen dürfen. */
function sourceFiles() {
  const files = ['index.html', 'js/app.js', 'css/styles.css'];
  const wissen = path.join(ROOT, 'wissen');
  if (fs.existsSync(wissen)) {
    for (const entry of fs.readdirSync(wissen, { withFileTypes: true })) {
      if (entry.isDirectory()) files.push(`wissen/${entry.name}/index.html`);
      else if (entry.name === 'index.html') files.push('wissen/index.html');
    }
  }
  return files;
}

/** name → Codepunkt aus dem vollständigen Font-Awesome-Paket. */
function fullIconMap() {
  const css = read('assets/fonts/fa/all.min.css');
  const map = new Map();
  for (const m of css.matchAll(/([^{}]+)\{--fa:"(\\[0-9a-f]+)"\}/g)) {
    for (const sel of m[1].split(',')) {
      const s = sel.trim();
      if (s.startsWith('.fa-')) map.set(s.slice(1), parseInt(m[2].slice(1), 16));
    }
  }
  return map;
}

/** Im Quelltext benutzte Icon-Klassen (gegen das Register abgeglichen). */
function usedIcons(known) {
  const used = new Set();
  for (const rel of sourceFiles()) {
    for (const m of read(rel).matchAll(/\bfa-[a-z0-9-]+\b/g)) {
      if (known.has(m[0])) used.add(m[0]);
    }
  }
  return used;
}

/** Icon-Klassen, die das zugeschnittene CSS deklariert. */
function shippedIcons() {
  const css = read('assets/fonts/fa/icons.min.css');
  const out = new Set();
  for (const m of css.matchAll(/([^{}]+)\{--fa:"(\\[0-9a-f]+)"\}/g)) {
    for (const sel of m[1].split(',')) {
      const s = sel.trim();
      if (s.startsWith('.fa-')) out.add(s.slice(1));
    }
  }
  return out;
}

test.describe('Icon-Zuschnitt', () => {
  test('das ausgelieferte CSS deckt genau die verwendeten Icons ab', () => {
    const known = fullIconMap();
    const used = [...usedIcons(known)].sort();
    const shipped = shippedIcons();

    const fehlend = used.filter(n => !shipped.has(n));
    expect(fehlend, 'Icons im Markup, aber nicht im Zuschnitt – "npm run icons" ausführen').toEqual([]);

    const ueberzaehlig = [...shipped].filter(n => !used.includes(n)).sort();
    expect(ueberzaehlig, 'Icons im Zuschnitt, die niemand mehr benutzt – "npm run icons" ausführen').toEqual([]);
  });

  test('der Zuschnitt ist deutlich kleiner als das vollständige Paket', () => {
    const voll = read('assets/fonts/fa/all.min.css').length;
    const klein = read('assets/fonts/fa/icons.min.css').length;
    // Regression v45: das vollständige Paket bringt ~1.900 Icon-Regeln mit,
    // benutzt werden rund 80. Alles über einem Fünftel wäre kein Zuschnitt.
    expect(klein).toBeLessThan(voll / 5);
  });

  test('Schriften laden mit font-display: swap', () => {
    const css = read('assets/fonts/fa/icons.min.css');
    expect(css).toContain('font-display:swap');
    // Regression v45: das Original stand auf `block` und hielt die Textausgabe
    // an, bis die Icon-Schrift da war.
    expect(css).not.toContain('font-display:block');
  });

  test('nur die Teilmengen der Schriften werden referenziert', () => {
    const css = read('assets/fonts/fa/icons.min.css');
    const srcs = [...css.matchAll(/url\(\.\.\/webfonts\/([^)]+)\)/g)].map(m => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    for (const s of srcs) {
      expect(s, 'nur zugeschnittene Schriften ausliefern').toContain('.subset.woff2');
      expect(fs.existsSync(path.join(ROOT, 'assets/fonts/webfonts', s))).toBe(true);
    }
    // Regression v45: die Brands-Familie steckte nur wegen eines einzigen
    // GitHub-Zeichens im Fuß in der Auslieferung – 116 KB für ein Icon. Die
    // Hilfsklassen dürfen bleiben, die Schrift darf nicht mehr geladen werden.
    expect(srcs.some(s => s.includes('brands'))).toBe(false);
    expect(css).not.toMatch(/@font-face\{[^{}]*Brands/);
  });
});

test.describe('Ladegewicht', () => {
  test('weder das vollständige CSS noch die Brands-Schrift werden geladen', async ({ page }) => {
    const geladen = [];
    page.on('request', r => geladen.push(r.url()));
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    const auffaellig = geladen.filter(u => /all\.min\.css|fa-brands|fa-v4compatibility/.test(u));
    expect(auffaellig).toEqual([]);
  });

  test('die Startseite bleibt unter dem Budget', async ({ page }) => {
    let bytes = 0;
    page.on('response', async res => {
      try {
        const len = res.headers()['content-length'];
        bytes += len ? Number(len) : (await res.body()).length;
      } catch { /* abgebrochene Antworten zählen nicht */ }
    });
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    // Regression v45: vor dem Zuschnitt waren es 918 KB, davon 300 KB Icon-
    // Schriften für rund 80 benutzte Zeichen. Der Testserver komprimiert nicht,
    // die Zahl ist also die unkomprimierte Obergrenze.
    expect(bytes).toBeLessThan(700 * 1024);
  });

  test('die benutzten Icons rendern wirklich (keine Tofu-Kästchen)', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => document.fonts.ready);
    const known = fullIconMap();
    const namen = [...usedIcons(known)];
    const codes = namen.map(n => known.get(n));

    // Gemessen wird die gezeichnete Fläche, nicht die Vorschubbreite: ein
    // fehlender Glyph fällt auf die Ersatzschrift zurück und zeichnet dort
    // entweder nichts oder exakt dasselbe wie ein garantiert unbelegtes
    // Zeichen. Ein Breitenvergleich reichte nicht – mehrere echte Icons haben
    // zufällig dieselbe Vorschubbreite wie das Referenzzeichen.
    const fehlend = await page.evaluate(([codes, namen]) => {
      const stift = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      stift.canvas.width = stift.canvas.height = 64;
      const bild = (cp, weight) => {
        stift.clearRect(0, 0, 64, 64);
        stift.font = `${weight} 48px "Font Awesome 6 Free"`;
        stift.textBaseline = 'middle';
        stift.fillText(String.fromCodePoint(cp), 8, 32);
        const px = stift.getImageData(0, 0, 64, 64).data;
        let tinte = 0, summe = 0;
        for (let i = 3; i < px.length; i += 4) { if (px[i] > 8) { tinte++; summe += px[i] * (i % 251); } }
        return { tinte, summe };
      };
      const referenz = [900, 400].map(w => bild(0xe999, w)); // im Paket nicht belegt
      return codes.map((cp, i) => {
        const treffer = [900, 400].some((w, k) => {
          const b = bild(cp, w);
          return b.tinte > 0 && b.summe !== referenz[k].summe;
        });
        return treffer ? null : namen[i];
      }).filter(Boolean);
    }, [codes, namen]);

    expect(fehlend, 'Icons ohne Glyph in der zugeschnittenen Schrift').toEqual([]);
  });
});
