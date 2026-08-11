const { test, expect } = require('@playwright/test');
const { openApp, collectErrors } = require('./helpers');

/* Re-Identifikationsrisiko (v57): k-Anonymität und l-Diversität.
   Rein arithmetisch – die Tests rechnen deshalb von Hand nach, statt
   die Implementierung gegen sich selbst zu prüfen. */

// QI = Jahr + PLZ. Gruppen: (1948,04315)×1 · (1950,04315)×3 · (1960,10115)×2
// ⇒ k = 1, drei Klassen, ein Unikat. Sensibel = Diagnose:
// die Dreiergruppe trägt {A,A,A} ⇒ l = 1.
const CSV = [
  'Jahr,PLZ,Diagnose',
  '1948,04315,A',
  '1950,04315,A',
  '1950,04315,A',
  '1950,04315,A',
  '1960,10115,B',
  '1960,10115,C',
].join('\n');

const mess = (page, csv, qi, sens = -1) => page.evaluate(([csv, qi, sens]) => {
  parseRiskCSV(csv);
  riskCsv.qi = qi;
  riskCsv.sens = sens;
  const r = riskReport();
  return r && { k: r.k, l: r.l, klassen: r.klassen, unikate: r.unikate,
                kleinAnteil: r.kleinAnteil, ampel: r.ampel.cls,
                sensKonflikt: r.sensKonflikt, zeilen: r.zeilen };
}, [csv, qi, sens]);

test.describe('Re-Identifikationsrisiko – Rechnung', () => {
  test('k, l und die Klassen stimmen mit der Handrechnung überein', async ({ page }) => {
    await openApp(page);
    const r = await mess(page, CSV, [0, 1], 2);
    expect(r.k).toBe(1);
    expect(r.l).toBe(1);
    expect(r.klassen).toBe(3);
    expect(r.unikate).toBe(1);
    expect(r.zeilen).toBe(6);
    expect(r.kleinAnteil).toBe(100);   // alle sechs Zeilen in Gruppen < 5
    expect(r.ampel).toBe('rot');
  });

  test('weniger Quasi-Identifikatoren ⇒ größere Gruppen', async ({ page }) => {
    await openApp(page);
    // Nur die PLZ: (04315)×4 · (10115)×2 ⇒ k = 2
    const r = await mess(page, CSV, [1]);
    expect(r.k).toBe(2);
    expect(r.klassen).toBe(2);
    expect(r.unikate).toBe(0);
    expect(r.ampel).toBe('gelb');
  });

  test('der Trenner lässt Werte nicht ineinanderlaufen', async ({ page }) => {
    await openApp(page);
    // „a b" + „c" und „a" + „b c" ergeben mit einem Leerzeichen als Trenner
    // beide „a b c" und würden zu EINER Gruppe verschmelzen – das Ergebnis
    // sähe dann sicherer aus, als es ist.
    const r = await mess(page, 'X,Y\na b,c\na,b c', [0, 1]);
    expect(r.klassen).toBe(2);
    expect(r.k).toBe(1);
  });

  test('gleiche Eingabe ⇒ gleiches Ergebnis', async ({ page }) => {
    await openApp(page);
    const a = await mess(page, CSV, [0, 1], 2);
    const b = await mess(page, CSV, [0, 1], 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

test.describe('Re-Identifikationsrisiko – Werte-Normalisierung', () => {
  test('Leerraum am Rand wird vereinheitlicht', async ({ page }) => {
    await openApp(page);
    const r = await mess(page, 'Ort\n Leipzig\nLeipzig \nLeipzig', [0]);
    expect(r.klassen).toBe(1);
    expect(r.k).toBe(3);
  });

  test('Groß- und Kleinschreibung wird NICHT zusammengefasst', async ({ page }) => {
    await openApp(page);
    // Zusammenfassen vergrößerte die Gruppen und ließe die Daten
    // harmloser erscheinen – im Zweifel lieber eine Warnung zu viel.
    const r = await mess(page, 'Ort\nLeipzig\nleipzig', [0]);
    expect(r.klassen).toBe(2);
    expect(r.k).toBe(1);
  });

  test('leere Zellen sind ein eigener Wert, kein Freibrief', async ({ page }) => {
    await openApp(page);
    const r = await mess(page, 'A,B\nx,\ny,\nz,q', [1]);
    expect(r.klassen).toBe(2);   // „" und „q"
    expect(r.k).toBe(1);
  });
});

test.describe('Re-Identifikationsrisiko – Ampel', () => {
  const nZeilen = (n, wert) => ['G', ...Array(n).fill(wert)].join('\n');

  test('k = 1 ist rot, k unter der Schwelle gelb, darüber grün', async ({ page }) => {
    await openApp(page);
    expect((await mess(page, nZeilen(1, 'a'), [0])).ampel).toBe('rot');
    expect((await mess(page, nZeilen(3, 'a'), [0])).ampel).toBe('gelb');
    expect((await mess(page, nZeilen(5, 'a'), [0])).ampel).toBe('gruen');
    expect(await page.evaluate(() => K_SCHWELLE)).toBe(5);
  });

  test('l = 1 hält die Ampel auf Gelb, auch wenn k groß ist', async ({ page }) => {
    await openApp(page);
    // Sechs identische Zeilen ⇒ k = 6, aber alle tragen dieselbe Diagnose:
    // wer die Gruppe kennt, kennt den Wert. Ein hohes k schützt davor nicht.
    const csv = ['Ort,Diagnose', ...Array(6).fill('Leipzig,A')].join('\n');
    const r = await mess(page, csv, [0], 1);
    expect(r.k).toBe(6);
    expect(r.l).toBe(1);
    expect(r.ampel).toBe('gelb');
  });

  test('vielfältiges sensibles Merkmal bleibt grün', async ({ page }) => {
    await openApp(page);
    const csv = ['Ort,Diagnose', 'L,A', 'L,B', 'L,C', 'L,D', 'L,E'].join('\n');
    const r = await mess(page, csv, [0], 1);
    expect(r.k).toBe(5);
    expect(r.l).toBe(5);
    expect(r.ampel).toBe('gruen');
  });
});

test.describe('Re-Identifikationsrisiko – Modellfehler abfangen', () => {
  test('ein sensibles Merkmal darf kein Quasi-Identifikator sein', async ({ page }) => {
    await openApp(page);
    // Sonst wäre es innerhalb der Klasse konstant und l immer 1 –
    // eine Aussage, die nur die eigene Auswahl widerspiegelt.
    const r = await mess(page, CSV, [0, 1, 2], 2);
    expect(r.sensKonflikt).toBe(true);
    expect(r.l).toBe(null);
  });

  test('ohne Quasi-Identifikatoren gibt es keine Auswertung', async ({ page }) => {
    await openApp(page);
    expect(await mess(page, CSV, [])).toBe(null);
  });

  test('die Auswahl des sensiblen Merkmals fällt weg, wenn es QI wird', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      parseRiskCSV('A,B\n1,2');
      riskCsv.sens = 1;
      renderRisk();
      document.querySelector('[data-risk-qi="1"]').click();   // B wird QI
      return riskCsv.sens;
    });
    expect(r).toBe(-1);
  });
});

test.describe('Re-Identifikationsrisiko – Oberfläche', () => {
  const oeffne = async page => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.click('#pseudo-tab-risiko');
  };

  test('der dritte Tab ist erreichbar und zeigt sein Panel', async ({ page }) => {
    await oeffne(page);
    await expect(page.locator('#pseudo-risiko-panel')).toBeVisible();
    await expect(page.locator('#pseudo-csv-panel')).toBeHidden();
    await expect(page.locator('#pseudo-tab-risiko')).toHaveAttribute('aria-selected', 'true');
  });

  test('Pfeiltasten blättern über alle drei Tabs', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.locator('#pseudo-tab-text').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#pseudo-tab-csv')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#pseudo-tab-risiko')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');   // wieder von vorn
    await expect(page.locator('#pseudo-tab-text')).toHaveAttribute('aria-selected', 'true');
  });

  test('der Knopf bleibt gesperrt, solange kein Merkmal gewählt ist', async ({ page }) => {
    await oeffne(page);
    await expect(page.locator('#risk-run')).toBeDisabled();
    await page.fill('#risk-input', CSV);
    await expect(page.locator('#risk-run')).toBeDisabled();   // Tabelle allein reicht nicht
    await page.click('[data-risk-qi="0"]');
    await expect(page.locator('#risk-run')).toBeEnabled();
  });

  test('die Auswertung erscheint mit Kennzahlen und den kleinsten Gruppen', async ({ page }) => {
    await oeffne(page);
    await page.fill('#risk-input', CSV);
    await page.click('[data-risk-qi="0"]');
    await page.click('[data-risk-qi="1"]');
    await page.click('#risk-run');
    await expect(page.locator('.risk-summary')).toContainText('Eindeutige Zeilen');
    await expect(page.locator('.risk-kpi')).toHaveCount(4);   // ohne sensibles Merkmal
    await expect(page.locator('.risk-table tbody tr')).toHaveCount(3);
    await expect(page.locator('.risk-row--klein')).toHaveCount(3);
  });

  test('Spaltenüberschriften werden escaped', async ({ page }) => {
    await oeffne(page);
    await page.fill('#risk-input', '"<img src=x onerror=alert(1)>",B\n1,2');
    await page.click('[data-risk-qi="0"]');
    await page.click('#risk-run');
    expect(await page.locator('#risk-cols').innerHTML()).not.toContain('<img');
    expect(await page.locator('#risk-out').innerHTML()).not.toContain('<img');
  });

  test('das Ergebnis der Spaltenbereinigung lässt sich direkt weiterprüfen', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.click('#pseudo-tab-csv');
    await page.fill('#pseudo-csv-input', CSV);
    await page.selectOption('[data-col-mode="2"]', 'ganz');   // Diagnose ersetzen
    await page.click('#pseudo-csv-run');
    await page.click('#pseudo-csv-risk');
    await expect(page.locator('#pseudo-risiko-panel')).toBeVisible();
    // Die bereinigte Tabelle steht bereits im Feld
    expect(await page.inputValue('#risk-input')).toContain('Jahr');
    expect(await page.evaluate(() => riskCsv.header.length)).toBe(3);
  });

  test('die Gruppenübersicht lässt sich herunterladen', async ({ page }) => {
    await openApp(page);
    const csv = await page.evaluate(() => {
      parseRiskCSV(['Jahr,PLZ', '1948,04315', '1950,04315', '1950,04315'].join('\n'));
      riskCsv.qi = [0, 1];
      return buildRiskCSV(riskReport());
    });
    const zeilen = csv.split('\n');
    expect(zeilen[0]).toBe('Jahr,PLZ,Zeilen_in_Gruppe');
    expect(zeilen[1]).toBe('1948,04315,1');   // kleinste Gruppe zuerst
    expect(zeilen[2]).toBe('1950,04315,2');
  });

  test('keine Konsolenfehler beim Durchlauf', async ({ page }) => {
    const fehler = collectErrors(page);
    await oeffne(page);
    await page.fill('#risk-input', CSV);
    await page.click('[data-risk-qi="0"]');
    await page.click('[data-risk-qi="1"]');
    await page.selectOption('#risk-sens', '2');
    await page.click('#risk-run');
    await expect(page.locator('.risk-summary')).toBeVisible();
    expect(fehler).toEqual([]);
  });
});

/* Befunde aus dem Review zu v57. Der erste ist der gefährliche: eine
   veraltete, GÜNSTIGERE Aussage stehen zu lassen führt zur Freigabe. */
test.describe('Re-Identifikationsrisiko – Ergebnis bleibt zur Auswahl passend', () => {
  // Fünf Zeilen, gleicher Ort: k = 5. Beruf ist fünffach verschieden (l = 5),
  // die Diagnose bei allen gleich (l = 1) – die Ampel muss also umspringen.
  const CSV2 = ['Ort,Beruf,Diagnose', ...['a', 'b', 'c', 'd', 'e'].map(x => `L,${x},HIV`)].join('\n');

  const vorbereiten = async page => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.click('#pseudo-tab-risiko');
    await page.fill('#risk-input', CSV2);
    await page.click('[data-risk-qi="0"]');
  };

  test('der Wechsel des sensiblen Merkmals verwirft das alte Ergebnis', async ({ page }) => {
    await vorbereiten(page);
    await page.selectOption('#risk-sens', '1');        // Beruf ⇒ l = 5, grün
    await page.click('#risk-run');
    await expect(page.locator('.risk-summary')).toContainText('k ≥ 5 erreicht');

    await page.selectOption('#risk-sens', '2');        // Diagnose ⇒ l = 1, gelb
    // Vorher blieb hier „k ≥ 5 erreicht" stehen – eine Freigabe für eine
    // Auswahl, die nie berechnet wurde.
    await expect(page.locator('.risk-summary')).toHaveCount(0);
    await page.click('#risk-run');
    await expect(page.locator('.risk-summary')).toContainText('einheitlich');
  });

  test('auch das Umschalten eines Quasi-Identifikators verwirft es', async ({ page }) => {
    await vorbereiten(page);
    await page.click('#risk-run');
    await expect(page.locator('.risk-summary')).toBeVisible();
    await page.click('[data-risk-qi="1"]');
    await expect(page.locator('.risk-summary')).toHaveCount(0);
  });

  test('der Tab-Wechsel allein verwirft ein gültiges Ergebnis nicht', async ({ page }) => {
    await vorbereiten(page);
    await page.click('#risk-run');
    await page.click('#pseudo-tab-csv');
    await page.click('#pseudo-tab-risiko');
    await expect(page.locator('.risk-summary')).toBeVisible();
  });

  test('der Fokus bleibt beim Umschalten per Tastatur stehen', async ({ page }) => {
    await vorbereiten(page);
    await page.locator('[data-risk-qi="1"]').focus();
    await page.keyboard.press('Space');
    // Vorher rutschte der Fokus auf <body>, weil die ganze Box neu gerendert
    // wurde – dieselbe Regel wie bei der Massenbearbeitung im Inventar.
    const fokus = await page.evaluate(() => document.activeElement.dataset?.riskQi ?? null);
    expect(fokus).toBe('1');
    expect(await page.evaluate(() => riskCsv.qi)).toEqual([0, 1]);
  });

  test('eine Tabelle ohne Datenzeilen sperrt den Knopf und sagt es', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navTo('pseudo'));
    await page.click('#pseudo-tab-risiko');
    await page.fill('#risk-input', 'Jahr,PLZ');
    await page.click('[data-risk-qi="0"]');
    // Vorher war der Knopf aktiv und tat beim Klick wortlos nichts.
    await expect(page.locator('#risk-run')).toBeDisabled();
    await expect(page.locator('#risk-cols')).toContainText('nur eine Kopfzeile');
  });

  test('die Zusammenfassung erfüllt WCAG AA und trägt die Ampel nicht nur als Farbe', async ({ page }) => {
    await vorbereiten(page);
    await page.click('#risk-run');
    const f = await page.locator('.risk-summary').evaluate(el => {
      const s = getComputedStyle(el);
      const z = t => (t.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lum = a => { const c = a.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const t = lum(z(s.color)), g = lum(z(s.backgroundColor));
      return { verhaeltnis: (Math.max(t, g) + 0.05) / (Math.min(t, g) + 0.05),
               icon: el.querySelector('i')?.className || '' };
    });
    // Weiß auf --ampel-gelb erreichte nur 3,0 : 1.
    expect(f.verhaeltnis).toBeGreaterThanOrEqual(4.5);
    // Zweiter Träger neben der Farbe: je Ampelstufe ein eigenes Zeichen.
    expect(f.icon).toContain('fa-circle-check');
  });
});
