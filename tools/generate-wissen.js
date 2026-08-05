/**
 * Erzeugt statische, crawlbare Seiten aus den Wissens-Daten der App.
 *
 * WARUM: Die Inhalte (Glossar, Rechtsgrundlagen, Lizenzregister, Kompass)
 * liegen in `js/app.js` und werden erst zur Laufzeit in ausgeblendete Views
 * gerendert. Für Suchmaschinen ist das die Hälfte der Substanz hinter genau
 * einer URL – jede Seite kann aber nur für ein Thema ranken.
 *
 * WIE: Der Generator lädt die App im Browser und liest die Daten-Arrays
 * heraus. Damit gibt es KEINE zweite Quelle – was hier landet, ist exakt das,
 * was die App kennt. `tests/wissen-static.spec.js` erzeugt die Seiten erneut
 * und vergleicht: läuft die App weiter, ohne dass jemand regeneriert, wird
 * der Test rot.
 *
 * Dev-Werkzeug. Die ausgelieferte App bleibt abhängigkeitsfrei.
 *
 *   node tools/generate-wissen.js            # schreibt nach wissen/
 *   node tools/generate-wissen.js --check    # nur prüfen, nichts schreiben
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://datenlotse.nozilla.net';
const OUT = path.join(ROOT, 'wissen');

/* Ein Miniserver reicht – die App braucht http://, nicht file:// */
function serve(port) {
  const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                  '.svg': 'image/svg+xml', '.json': 'application/json', '.csv': 'text/csv',
                  '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const datei = path.join(ROOT, rel === '/' ? 'index.html' : rel);
    if (!datei.startsWith(ROOT) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': typen[path.extname(datei)] || 'application/octet-stream' });
    res.end(fs.readFileSync(datei));
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Gemeinsames Seitengerüst. Nutzt dieselben Stylesheets wie die App – die
   Seiten sehen damit aus wie das Werkzeug und brauchen kein eigenes CSS. */
function seite({ slug, title, description, lead, bodyHTML, jsonld }) {
  const url = `${BASE}/wissen/${slug ? slug + '/' : ''}`;
  const brot = [
    { '@type': 'ListItem', position: 1, name: 'DatenLotse', item: BASE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Wissen & Methodik', item: `${BASE}/wissen/` },
  ];
  if (slug) brot.push({ '@type': 'ListItem', position: 3, name: title, item: url });

  const daten = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: brot },
    ...(jsonld ? [jsonld] : []),
  ];

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} – DatenLotse</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="shortcut icon" href="/favicon.ico">
  <meta property="og:title" content="${esc(title)} – DatenLotse">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}/social-preview.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="DatenLotse">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} – DatenLotse">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${BASE}/social-preview.png">
${daten.map(d => `  <script type="application/ld+json">\n  ${JSON.stringify(d, null, 2).replace(/\n/g, '\n  ')}\n  </script>`).join('\n')}
  <link rel="stylesheet" href="/assets/fonts/inter/inter.css">
  <link rel="stylesheet" href="/assets/fonts/fa/icons.min.css?v=48">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="static-page">
  <a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
  <header class="topbar">
    <a class="topbar-brand" href="/">
      <img src="/logo.svg" alt="" class="topbar-logo" width="44" height="44">
      <span class="brand-name">DatenLotse</span>
    </a>
    <a class="btn btn-primary btn-sm" href="/"><i class="fas fa-rocket"></i> Werkzeug öffnen</a>
  </header>

  <main id="inhalt" class="static-main" tabindex="-1">
    <nav class="static-crumbs" aria-label="Brotkrumen">
      <a href="/">Start</a> <span aria-hidden="true">›</span>
      ${slug ? '<a href="/wissen/">Wissen &amp; Methodik</a> <span aria-hidden="true">›</span> ' : ''}
      <span>${esc(title)}</span>
    </nav>
    <h1 class="static-title">${esc(title)}</h1>
    <p class="static-lead">${lead}</p>
    ${bodyHTML}
    <aside class="static-cta">
      <h2>Im Werkzeug anwenden</h2>
      <p>DatenLotse führt von der Datenkartierung zur Veröffentlichung: Dateninventar nach DCAT-AP.de,
         Risiko-Clearing und Pseudonymisierung – vollständig im Browser, ohne Server und ohne Account.</p>
      <a class="btn btn-primary" href="/"><i class="fas fa-arrow-right"></i> DatenLotse öffnen</a>
    </aside>
    <p class="static-note">Diese Seite ist eine statische Fassung des Wissens-Centers und ausdrücklich
       <strong>keine Rechtsberatung</strong>. Maßgeblich ist immer der verlinkte amtliche Text.</p>
  </main>

  <footer class="footer">
    <nav class="footer-links">
      <a href="/">Werkzeug</a>
      <a href="/wissen/">Wissen &amp; Methodik</a>
      <a href="https://nozilla.de/impressum/" target="_blank" rel="noopener">Impressum</a>
      <a href="https://nozilla.de/datenschutz/" target="_blank" rel="noopener">Datenschutz</a>
    </nav>
  </footer>
</body>
</html>
`;
}

const liste = (eintraege) =>
  `<div class="static-cards">${eintraege.map(e => `
    <article class="static-card">
      <h2>${e.href ? `<a href="${esc(e.href)}" target="_blank" rel="noopener">${esc(e.titel)} <i class="fas fa-arrow-up-right-from-square"></i></a>` : esc(e.titel)}</h2>
      ${e.meta ? `<p class="static-card-meta">${esc(e.meta)}</p>` : ''}
      <p>${esc(e.text)}</p>
    </article>`).join('')}</div>`;

/* Die Seiten. Jede lebt von genau einem Datenbestand der App. */
function seiten(d) {
  const s = [];

  s.push({
    slug: 'glossar',
    title: 'Glossar: Open-Data-Begriffe erklärt',
    description: `${d.glossary.length} Begriffe rund um offene Verwaltungsdaten – von DCAT-AP.de über FAIR bis Pseudonymisierung, kurz und ohne Fachjargon erklärt.`,
    lead: `Die wichtigsten Begriffe rund um offene Verwaltungsdaten – ${d.glossary.length} Einträge, kurz erklärt.`,
    bodyHTML: `<dl class="static-glossary">${d.glossary.map(g =>
      `<div><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></div>`).join('')}</dl>`,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'DefinedTermSet',
      name: 'Open-Data-Glossar', inLanguage: 'de',
      hasDefinedTerm: d.glossary.map(g => ({ '@type': 'DefinedTerm', name: g.term, description: g.def })),
    },
  });

  s.push({
    slug: 'rechtsgrundlagen',
    title: 'Rechtsgrundlagen für offene Verwaltungsdaten (Bund und EU)',
    description: 'Open-Data-Gesetz, Datennutzungsgesetz, IFG, DSGVO, EU-Open-Data-Richtlinie und Geodatenzugangsgesetz – mit Verweis auf die amtlichen Fundstellen.',
    lead: 'Die bundes- und europarechtlichen Grundlagen der Bereitstellung offener Verwaltungsdaten, jeweils mit amtlicher Fundstelle.',
    bodyHTML: liste(d.legal.map(l => ({ titel: l.name, text: l.summary, href: l.url }))),
  });

  const arten = { transparenz: 'Transparenzgesetz', ifg: 'Informationsfreiheitsgesetz', kein: 'Kein allgemeines Landesgesetz' };
  s.push({
    slug: 'rechtsgrundlagen-laender',
    title: 'Informationsfreiheit und Transparenz in den Bundesländern',
    description: 'Alle 16 Bundesländer im Überblick: Transparenzgesetz, Informationsfreiheitsgesetz oder kein allgemeines Landesgesetz – jeweils mit amtlicher Fundstelle.',
    lead: 'Neben dem Bundesrecht gilt Landesrecht – und es unterscheidet sich erheblich. <strong>Transparenzgesetze</strong> verpflichten zur aktiven Veröffentlichung, <strong>Informationsfreiheitsgesetze</strong> regeln den Zugang auf Antrag, zwei Länder haben kein allgemeines Gesetz.',
    bodyHTML: liste(d.laender.map(l => ({
      titel: `${l.land}: ${l.name}${l.abbr ? ` (${l.abbr})` : ''}`,
      meta: arten[l.kind] || l.kind,
      text: l.summary, href: l.url,
    }))),
  });

  s.push({
    slug: 'kommunale-satzungen',
    title: 'Kommunale Informationsfreiheitssatzungen',
    description: 'Wo ein Landesgesetz fehlt – in Bayern und Niedersachsen – können Kommunen Informationsfreiheit über ihre Satzungsautonomie selbst einführen. Übersichten und ein amtliches Beispiel.',
    lead: 'Wo ein Landesgesetz fehlt – in <strong>Bayern</strong> und <strong>Niedersachsen</strong> –, können Kommunen Informationsfreiheit über ihre <strong>Satzungsautonomie</strong> selbst einführen. Welche Kommunen das getan haben, ändert sich laufend; deshalb verweisen wir auf gepflegte Übersichten statt auf eine Momentaufnahme.',
    bodyHTML: liste(d.kommunal.map(k => ({
      titel: k.name,
      meta: k.amtlich ? 'Amtliche Fundstelle' : 'Zivilgesellschaftliche Sammlung',
      text: k.summary, href: k.url,
    }))),
  });

  s.push({
    slug: 'lizenzen',
    title: 'Lizenzen für offene Daten nach DCAT-AP.de',
    description: 'Das DCAT-AP.de-Lizenzregister im Überblick: offene Lizenzen wie DL-DE BY, CC BY und CC0 gegenüber eingeschränkten NC-/ND-Varianten, jeweils mit offizieller URI.',
    lead: 'Welche Lizenz eine Veröffentlichung wirklich offen macht – und welche nicht. <strong>NC und ND gelten nicht als offen</strong>, Share-Alike dagegen schon.',
    bodyHTML: d.lizenzen.map(g => `
      <section class="static-section">
        <h2>${esc(g.group)}</h2>
        <table class="static-table">
          <thead><tr><th>Lizenz</th><th>Offen</th><th>URI</th></tr></thead>
          <tbody>${g.items.map(l => `<tr>
            <td>${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>` : esc(l.label)}</td>
            <td>${l.open ? 'ja' : 'nein'}</td>
            <td><code>${esc(l.uri)}</code></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>`).join(''),
  });

  s.push({
    slug: 'reifegrad-modelle',
    title: 'Reifegradmodelle für Open Data',
    description: 'Die Modelle hinter dem Daten-Kompass: World-Bank ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de sowie DSGVO und FAIR.',
    lead: 'Der <strong>Daten-Kompass</strong> in DatenLotse stützt sich auf anerkannte Modelle. Hier steht, was sie jeweils messen.',
    bodyHTML: liste(d.modelle.map(m => ({ titel: m.name, meta: m.by, text: m.desc }))) +
      `<section class="static-section"><h2>Die sieben Dimensionen des Daten-Kompasses</h2>
        <div class="static-cards">${d.dimensionen.map(dim => `
          <article class="static-card">
            <h3>${esc(dim.title)}</h3>
            <p class="static-card-meta">${esc(dim.source)}</p>
            <ul>${dim.items.map(i => `<li>${esc(i.label)}</li>`).join('')}</ul>
          </article>`).join('')}</div>
      </section>`,
  });

  s.push({
    slug: 'pruefwerkzeuge',
    title: 'Prüfwerkzeuge und Normtexte für DCAT-AP.de',
    description: 'Offizieller SHACL-Validator der EU, DCAT-AP.de-Spezifikation, Konventionenhandbuch und GovData-Metadatenschema – die Quellen für die abschließende Prüfung vor der Veröffentlichung.',
    lead: 'Eine regelbasierte Prüfung im Browser ist <strong>keine vollständige SHACL-Validierung</strong>. Für die abschließende Prüfung vor der Veröffentlichung führen diese Quellen weiter.',
    bodyHTML: liste(d.werkzeuge.map(w => ({ titel: w.name, text: w.summary, href: w.url }))),
  });

  // Übersichtsseite zuletzt, damit sie auf die anderen verlinken kann
  s.unshift({
    slug: '',
    title: 'Wissen & Methodik zu offenen Verwaltungsdaten',
    description: 'Glossar, Rechtsgrundlagen von Bund, EU und allen 16 Ländern, Lizenzregister, Reifegradmodelle und Prüfwerkzeuge – das Nachschlagewerk hinter DatenLotse.',
    lead: 'Das Nachschlagewerk hinter DatenLotse: Begriffe, Rechtsgrundlagen, Lizenzen und Methodik rund um offene Verwaltungsdaten.',
    bodyHTML: `<div class="static-cards">${s.map(x => `
      <article class="static-card">
        <h2><a href="/wissen/${x.slug}/">${esc(x.title)}</a></h2>
        <p>${esc(x.description)}</p>
      </article>`).join('')}</div>`,
  });

  return s;
}

async function daten() {
  const server = await serve(8123);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8123/index.html');
    await page.waitForFunction(() => typeof pseudonymize === 'function');
    return await page.evaluate(() => ({
      glossary: GLOSSARY,
      legal: LEGAL_BASIS,
      laender: LEGAL_BASIS_LAENDER,
      kommunal: KOMMUNAL_SATZUNGEN,
      werkzeuge: PRUEF_WERKZEUGE,
      modelle: METHOD_MODELS,
      dimensionen: KOMPASS_DIMENSIONS.map(d => ({
        title: d.title, source: d.source, items: d.items.map(i => ({ label: i.label })),
      })),
      lizenzen: LICENSE_CATALOG,
    }));
  } finally {
    await browser.close();
    server.close();
  }
}

async function main() {
  const nurPruefen = process.argv.includes('--check');
  const alle = seiten(await daten());
  const dateien = alle.map(s => ({
    pfad: path.join(OUT, s.slug, 'index.html'),
    inhalt: seite(s),
    url: `${BASE}/wissen/${s.slug ? s.slug + '/' : ''}`,
  }));

  if (nurPruefen) {
    const veraltet = dateien.filter(f =>
      !fs.existsSync(f.pfad) || fs.readFileSync(f.pfad, 'utf8') !== f.inhalt);
    if (veraltet.length) {
      console.error('Veraltet:\n' + veraltet.map(f => '  ' + path.relative(ROOT, f.pfad)).join('\n'));
      console.error('\nBitte `node tools/generate-wissen.js` ausführen und die Änderungen committen.');
      process.exit(1);
    }
    console.log(`${dateien.length} Seiten aktuell.`);
    return;
  }

  dateien.forEach(f => {
    fs.mkdirSync(path.dirname(f.pfad), { recursive: true });
    fs.writeFileSync(f.pfad, f.inhalt);
    console.log('geschrieben:', path.relative(ROOT, f.pfad));
  });

  // Sitemap mitziehen – sonst findet sie niemand
  const heute = new Date().toISOString().slice(0, 10);
  const urls = [{ loc: `${BASE}/`, prio: '1.0' },
                ...dateien.map(f => ({ loc: f.url, prio: f.url.endsWith('/wissen/') ? '0.8' : '0.7' }))];
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${heute}</lastmod>\n` +
                  `    <changefreq>monthly</changefreq>\n    <priority>${u.prio}</priority>\n  </url>`).join('\n') +
    `\n</urlset>\n`);
  console.log('geschrieben: sitemap.xml');
}

main().catch(e => { console.error(e); process.exit(1); });
