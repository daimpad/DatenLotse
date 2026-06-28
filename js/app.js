/* ──────────────────────────────────────────────────────────────
   DatenLotse – app.js

   Philosophie wie DatenGraf: Vanilla JS, kein Build, eine Datei,
   alles lokal im Browser. Keine externen Calls.

   Stand: MVP = Modul 2 (Dateninventar + DCAT-AP.de-Export).
   Module 1, 3a, 3b sind als Roadmap am Ende markiert.
   ────────────────────────────────────────────────────────────── */

'use strict';

/* ── DatenGraf Row-Schema (1:1 übernehmen, NICHT divergieren) ──── */
const GRAF_COLUMNS = [
  'Quelle', 'QuelleAbteilung', 'QuelleBereich', 'QuelleOrganisation', 'QuelleRolle',
  'Beziehung', 'Ziel', 'Datentyp', 'Häufigkeit', 'Format', 'Schutzbedarf',
  'Erfassungsart', 'Anmerkungen', 'Ansprechpartner'
];

/* ── DCAT-AP.de kontrollierte Vokabulare (Auswahl) ────────────── */
// dct:accrualPeriodicity – EU Frequency NAL (gekürzt auf gängige Werte)
const FREQ_OPTIONS = [
  ['',          '— bitte wählen —'],
  ['CONT',      'Kontinuierlich'],
  ['DAILY',     'Täglich'],
  ['WEEKLY',    'Wöchentlich'],
  ['MONTHLY',   'Monatlich'],
  ['QUARTERLY', 'Vierteljährlich'],
  ['ANNUAL',    'Jährlich'],
  ['IRREG',     'Unregelmäßig'],
  ['NEVER',     'Einmalig / statisch']
];
// dct:license – gängige offene Lizenzen für DE-Verwaltung
const LICENSE_OPTIONS = [
  ['',                       '— bitte wählen —'],
  ['dl-de/by-2-0',           'Datenlizenz Deutschland – Namensnennung 2.0'],
  ['dl-de/zero-2-0',         'Datenlizenz Deutschland – Zero 2.0'],
  ['cc-by-4.0',              'Creative Commons BY 4.0'],
  ['cc-zero',                'Creative Commons Zero (CC0)'],
  ['other-closed',           'Nicht offen / eingeschränkt']
];
// dct:accessRights – EU Access-Right NAL
const ACCESS_OPTIONS = [
  ['',           '— bitte wählen —'],
  ['PUBLIC',     'Öffentlich'],
  ['RESTRICTED', 'Eingeschränkt'],
  ['NON_PUBLIC', 'Nicht öffentlich']
];

/* ── Globaler State ───────────────────────────────────────────── */
let grafRows = [];      // importierte DatenGraf-Zeilen
let inventory = [];     // abgeleitete DCAT-AP.de-Inventar-Einträge

/* ── XSS-Schutz (wie DatenGraf) ───────────────────────────────── */
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── CSV-Parser (identisch zu DatenGraf) ──────────────────────── */
function splitCSVLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const header = splitCSVLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

/* ── CSV-Serialisierung (Falsy-sicher wie DatenGraf toCSV) ────── */
function csvCell(v) {
  const s = (v == null || v === '') ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ── DCAT-AP.de Mapping (Phase 2 – Kern des MVP) ──────────────────
   Jede eindeutige (Quelle|Datentyp)-Kombination wird ein Dataset.
   DatenGraf liefert Vorbelegungen; offene Pflichtfelder werden im
   UI nacherfasst.
   ────────────────────────────────────────────────────────────── */
function deriveInventory(rows) {
  const seen = new Map();
  for (const r of rows) {
    const key = `${r.Quelle}__${r.Datentyp}`;
    if (seen.has(key)) {
      // Empfänger sammeln (für spätere Distribution/Notiz)
      seen.get(key)._recipients.add(r.Ziel);
      continue;
    }
    seen.set(key, {
      id:                 slug(`${r.QuelleOrganisation}-${r.Datentyp || r.Quelle}`),
      title:              r.Datentyp || r.Quelle || 'Unbenannter Datensatz',
      description:        r.Anmerkungen || '',
      publisher:          r.QuelleOrganisation || '',
      contactPoint:       r.Ansprechpartner || '',
      sourceSystem:       r.Quelle || '',
      format:             r.Format || '',
      // Nacherfassung:
      accrualPeriodicity: mapHaeufigkeit(r['Häufigkeit']),
      license:            '',
      accessRights:       mapSchutzToAccess(r.Schutzbedarf),
      _grafSchutzbedarf:  r.Schutzbedarf || '',
      _recipients:        new Set(r.Ziel ? [r.Ziel] : [])
    });
  }
  return [...seen.values()];
}

function slug(s) {
  return String(s).toLowerCase().trim()
    .replace(/[äöü]/g, m => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue' }[m]))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'datensatz';
}

function mapSchutzToAccess(schutz) {
  if (/dsgvo/i.test(schutz)) return 'NON_PUBLIC';
  if (/intern/i.test(schutz)) return 'RESTRICTED';
  if (/öffentlich|oeffentlich/i.test(schutz)) return 'PUBLIC';
  return '';
}

function mapHaeufigkeit(h) {
  if (!h) return '';
  if (/täglich|taeglich|daily/i.test(h)) return 'DAILY';
  if (/wöch|woech|weekly/i.test(h)) return 'WEEKLY';
  if (/monat|monthly/i.test(h)) return 'MONTHLY';
  if (/quart|viertel/i.test(h)) return 'QUARTERLY';
  if (/jähr|jaehr|annual|jährlich/i.test(h)) return 'ANNUAL';
  if (/laufend|kontinu|cont/i.test(h)) return 'CONT';
  return '';
}

/* ── DCAT-AP.de Vollständigkeit je Dataset ────────────────────── */
const REQUIRED_FIELDS = ['title', 'publisher', 'contactPoint', 'accrualPeriodicity', 'license', 'accessRights'];
function completeness(d) {
  const filled = REQUIRED_FIELDS.filter(f => d[f] && d[f] !== '').length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

/* ── Modul 3a: Clearing-Ampel (deterministischer Entscheidungsbaum)
   Antworten je Datensatz:
     pb    = personenbezogen   'ja' | 'nein' | 'unklar'  (Frage 1, aus Schutzbedarf vorbelegt)
     art9  = besondere Kat.    ''   | 'ja' | 'nein'       (Frage 2)
     recht = Rechtsgrundlage   ''   | 'ja' | 'nein'       (Frage 3)
     anon  = anonymisierbar    ''   | 'ja' | 'nein'       (Frage 4)
   Ergebnis am Eintrag: d.clearing = { ampel, begruendung, empfehlung }.
   Grundsatz: bei Unklarheit Gelb – nie automatisch Grün.
   ────────────────────────────────────────────────────────────── */
const AMPEL_LABEL = { gruen: 'Grün · Freigabe', gelb: 'Gelb · Prüfen', rot: 'Rot · Sperren' };

// Frage 1 aus DatenGraf-Schutzbedarf vorbelegen
function initClearing(d) {
  if (d._clearing) return d._clearing;
  const s = d._grafSchutzbedarf || '';
  let pb = 'unklar';
  if (/dsgvo/i.test(s)) pb = 'ja';
  else if (/öffentlich|oeffentlich/i.test(s)) pb = 'nein';
  d._clearing = { pb, art9: '', recht: '', anon: '' };
  return d._clearing;
}

function evaluateClearing(a) {
  // Regel 5: kein Personenbezug → Grün
  if (a.pb === 'nein') return {
    ampel: 'gruen',
    begruendung: 'Keine personenbezogenen Daten – datenschutzrechtlich unkritisch.',
    empfehlung: 'Freigabe als Open Data möglich. Lizenz und Metadaten im Inventar vervollständigen.'
  };
  // Personenbezug unklar → mindestens Gelb (nie automatisch Grün)
  if (a.pb !== 'ja') return {
    ampel: 'gelb',
    begruendung: 'Personenbezug unklar. Im Zweifel wird konservativ bewertet.',
    empfehlung: 'Personenbezug in Frage 1 klären, bevor eine Freigabe erwogen wird.'
  };
  // ab hier: personenbezogen
  // Regel 2: Art. 9 DSGVO → Rot (Ende)
  if (a.art9 === 'ja') return {
    ampel: 'rot',
    begruendung: 'Besondere Kategorien nach Art. 9 DSGVO (z. B. Gesundheit, Religion, Biometrie).',
    empfehlung: 'Nicht veröffentlichen. Keine Open-Data-Freigabe ohne enge Rechtsgrundlage und gesonderte Prüfung.'
  };
  // Regel 3: keine Rechtsgrundlage → Rot (Ende)
  if (a.recht === 'nein') return {
    ampel: 'rot',
    begruendung: 'Personenbezogen ohne Rechtsgrundlage / gesetzlichen Veröffentlichungsauftrag.',
    empfehlung: 'Nicht veröffentlichen. Zuerst Rechtsgrundlage klären (Art. 6 DSGVO / Fachrecht).'
  };
  // Regel 4: mit Rechtsgrundlage → von Anonymisierbarkeit abhängig
  if (a.recht === 'ja') {
    if (a.anon === 'ja') return {
      ampel: 'gelb',
      begruendung: 'Personenbezogen mit Rechtsgrundlage, aber anonymisier-/pseudonymisierbar – erst nach Bearbeitung freigabefähig.',
      empfehlung: 'Vor Veröffentlichung anonymisieren/aggregieren; Freitexte über die Textbereinigung (Modul 3b) pseudonymisieren.'
    };
    if (a.anon === 'nein') return {
      ampel: 'rot',
      begruendung: 'Personenbezogen und nicht sinnvoll anonymisierbar – der Personenbezug bliebe bestehen.',
      empfehlung: 'Nicht als Open Data veröffentlichen. Allenfalls aggregierte Kennzahlen separat erwägen.'
    };
    return {
      ampel: 'gelb',
      begruendung: 'Personenbezogen mit Rechtsgrundlage. Anonymisierbarkeit noch offen.',
      empfehlung: 'Frage 4 beantworten: Lässt sich der Datensatz anonymisieren/aggregieren?'
    };
  }
  // Fallback: greift keine Regel eindeutig → Gelb
  return {
    ampel: 'gelb',
    begruendung: 'Personenbezogen, Bewertung noch unvollständig.',
    empfehlung: 'Fragen 2–4 beantworten. Bis dahin: manuelle Prüfung empfohlen, keine Freigabe.'
  };
}

// Clearing für alle Einträge sicherstellen (z. B. vor dem Export)
function ensureAllClearing() {
  inventory.forEach(d => { d.clearing = evaluateClearing(initClearing(d)); });
}

/* ── Rendering: Inventar-Tabelle ──────────────────────────────── */
function optionsHTML(opts, selected) {
  return opts.map(([v, l]) =>
    `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(l)}</option>`
  ).join('');
}

function renderInventory() {
  const heroEl = document.getElementById('hero');
  const gridEl = document.getElementById('module-grid');
  const view   = document.getElementById('inventory-view');
  const body   = document.getElementById('inventory-body');
  const meta   = document.getElementById('inventory-meta');

  if (heroEl) heroEl.style.display = 'none';
  if (gridEl) gridEl.style.display = 'none';
  view.classList.remove('hidden');
  showInventoryTab('inventar');   // bei (Neu-)Import immer mit dem Inventar starten

  const avgComplete = inventory.length
    ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length) : 0;
  meta.textContent = `${inventory.length} Datensätze · Ø ${avgComplete} % DCAT-AP.de-vollständig`;

  body.innerHTML = inventory.map((d, i) => {
    const pct = completeness(d);
    const pctColor = pct >= 80 ? 'var(--ampel-gruen)' : pct >= 50 ? 'var(--ampel-gelb)' : 'var(--ampel-rot)';
    return `
    <div class="inv-card" data-idx="${i}">
      <div class="inv-card-head">
        <input class="inv-title" data-field="title" value="${esc(d.title)}" placeholder="Titel des Datensatzes">
        <span class="inv-complete" style="color:${pctColor}">${pct}%</span>
      </div>
      <div class="inv-meta-row">
        <span class="inv-src"><i class="fas fa-database"></i> ${esc(d.sourceSystem || '—')}</span>
        ${d.format ? `<span class="inv-fmt">${esc(d.format)}</span>` : ''}
      </div>
      <div class="inv-fields">
        <label>Publisher
          <input data-field="publisher" value="${esc(d.publisher)}" placeholder="Organisation">
        </label>
        <label>Ansprechpartner
          <input data-field="contactPoint" value="${esc(d.contactPoint)}" placeholder="Name / E-Mail">
        </label>
        <label>Aktualisierungszyklus
          <select data-field="accrualPeriodicity">${optionsHTML(FREQ_OPTIONS, d.accrualPeriodicity)}</select>
        </label>
        <label>Lizenz
          <select data-field="license">${optionsHTML(LICENSE_OPTIONS, d.license)}</select>
        </label>
        <label>Zugriffsrechte
          <select data-field="accessRights">${optionsHTML(ACCESS_OPTIONS, d.accessRights)}</select>
        </label>
      </div>
    </div>`;
  }).join('');

  // Feld-Änderungen zurück in den State schreiben
  body.querySelectorAll('.inv-card').forEach(card => {
    const idx = +card.dataset.idx;
    card.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        inventory[idx][el.dataset.field] = el.value;
        // Vollständigkeit live aktualisieren
        const pct = completeness(inventory[idx]);
        const badge = card.querySelector('.inv-complete');
        badge.textContent = pct + '%';
        badge.style.color = pct >= 80 ? 'var(--ampel-gruen)' : pct >= 50 ? 'var(--ampel-gelb)' : 'var(--ampel-rot)';
        const avg = Math.round(inventory.reduce((s, x) => s + completeness(x), 0) / inventory.length);
        meta.textContent = `${inventory.length} Datensätze · Ø ${avg} % DCAT-AP.de-vollständig`;
      });
    });
  });
}

/* ── Rendering: Risiko-Clearing (Modul 3a) ────────────────────── */
const PB_OPTS    = [['ja', 'Ja'], ['nein', 'Nein'], ['unklar', 'Unklar']];
const YESNO_OPTS = [['', '— wählen —'], ['ja', 'Ja'], ['nein', 'Nein']];

function clearingAutoHint(d) {
  const s = d._grafSchutzbedarf || '';
  if (/dsgvo|öffentlich|oeffentlich/i.test(s))
    return ` <span class="clear-auto">· vorbelegt aus Schutzbedarf „${esc(s)}"</span>`;
  return '';
}

function renderClearing() {
  const body = document.getElementById('clearing-body');
  if (!body) return;

  body.innerHTML = inventory.map((d, i) => {
    const a = initClearing(d);
    d.clearing = evaluateClearing(a);
    const amp = d.clearing.ampel;
    const showArt9  = a.pb === 'ja';
    const showRecht = a.pb === 'ja' && a.art9 !== 'ja';
    const showAnon  = a.pb === 'ja' && a.art9 !== 'ja' && a.recht === 'ja';
    return `
    <div class="clear-card clear-card--${amp}" data-idx="${i}">
      <div class="clear-card-head">
        <div class="clear-head-text">
          <span class="clear-title">${esc(d.title)}</span>
          <span class="clear-src"><i class="fas fa-database"></i> ${esc(d.sourceSystem || '—')}</span>
        </div>
        <span class="clear-ampel clear-ampel--${amp}"><span class="clear-dot"></span>${AMPEL_LABEL[amp]}</span>
      </div>
      <div class="clear-questions">
        <label class="clear-q">
          <span class="clear-q-label">1 · Enthält der Datensatz personenbezogene Daten?${clearingAutoHint(d)}</span>
          <select data-q="pb">${optionsHTML(PB_OPTS, a.pb)}</select>
        </label>
        ${showArt9 ? `
        <label class="clear-q">
          <span class="clear-q-label">2 · Besondere Kategorien nach Art. 9 DSGVO? <span class="clear-q-ex">(Gesundheit, Religion, Biometrie …)</span></span>
          <select data-q="art9">${optionsHTML(YESNO_OPTS, a.art9)}</select>
        </label>` : ''}
        ${showRecht ? `
        <label class="clear-q">
          <span class="clear-q-label">3 · Rechtsgrundlage / gesetzlicher Auftrag zur Veröffentlichung?</span>
          <select data-q="recht">${optionsHTML(YESNO_OPTS, a.recht)}</select>
        </label>` : ''}
        ${showAnon ? `
        <label class="clear-q">
          <span class="clear-q-label">4 · Anonymisier-, aggregier- oder pseudonymisierbar?</span>
          <select data-q="anon">${optionsHTML(YESNO_OPTS, a.anon)}</select>
        </label>` : ''}
      </div>
      <div class="clear-result">
        <p class="clear-begruendung">${esc(d.clearing.begruendung)}</p>
        <p class="clear-empfehlung"><i class="fas fa-arrow-right"></i> ${esc(d.clearing.empfehlung)}</p>
      </div>
    </div>`;
  }).join('');

  body.querySelectorAll('.clear-card').forEach(card => {
    const idx = +card.dataset.idx;
    card.querySelectorAll('select[data-q]').forEach(sel => {
      sel.addEventListener('change', () => {
        const a = inventory[idx]._clearing;
        a[sel.dataset.q] = sel.value;
        // Folgefragen zurücksetzen, wenn ihre Voraussetzung entfällt
        if (sel.dataset.q === 'pb'    && a.pb   !== 'ja') { a.art9 = ''; a.recht = ''; a.anon = ''; }
        if (sel.dataset.q === 'art9'  && a.art9 === 'ja') { a.recht = ''; a.anon = ''; }
        if (sel.dataset.q === 'recht' && a.recht !== 'ja') { a.anon = ''; }
        renderClearing();   // progressive Anzeige + Ergebnis neu berechnen
      });
    });
  });

  updateClearingSummary();
}

function updateClearingSummary() {
  const sum = document.getElementById('clearing-summary');
  if (!sum) return;
  const c = { gruen: 0, gelb: 0, rot: 0 };
  inventory.forEach(d => { if (d.clearing) c[d.clearing.ampel]++; });
  sum.innerHTML =
    `<span class="clear-stat clear-stat--gruen"><span class="clear-dot"></span>${c.gruen} grün</span>` +
    `<span class="clear-stat clear-stat--gelb"><span class="clear-dot"></span>${c.gelb} gelb</span>` +
    `<span class="clear-stat clear-stat--rot"><span class="clear-dot"></span>${c.rot} rot</span>`;
}

/* ── Tab-Umschaltung Inventar ↔ Clearing ──────────────────────── */
function showInventoryTab(name) {
  const isClearing = name === 'clearing';
  document.getElementById('inventar-panel')?.classList.toggle('hidden', isClearing);
  document.getElementById('clearing-panel')?.classList.toggle('hidden', !isClearing);
  document.getElementById('tab-inventar')?.classList.toggle('is-active', !isClearing);
  document.getElementById('tab-clearing')?.classList.toggle('is-active', isClearing);
  if (isClearing) renderClearing();
}
document.getElementById('tab-inventar')?.addEventListener('click', () => showInventoryTab('inventar'));
document.getElementById('tab-clearing')?.addEventListener('click', () => showInventoryTab('clearing'));

/* ── Export: DCAT-AP.de JSON ──────────────────────────────────── */
function buildDcatJSON() {
  return {
    '@context': 'https://www.dcat-ap.de/def/dcatde/2.0/context.jsonld',
    '@type': 'dcat:Catalog',
    'dct:title': 'Dateninventar (DatenLotse-Export)',
    'dct:publisher': inventory[0]?.publisher || '',
    'dcat:dataset': inventory.map(d => ({
      '@type': 'dcat:Dataset',
      'dct:identifier': d.id,
      'dct:title': d.title,
      'dct:description': d.description || d.title,
      'dct:publisher': { '@type': 'foaf:Organization', 'foaf:name': d.publisher },
      'dcat:contactPoint': { '@type': 'vcard:Organization', 'vcard:fn': d.contactPoint },
      'dct:accrualPeriodicity': d.accrualPeriodicity,
      'dct:accessRights': d.accessRights,
      'dcat:distribution': [{
        '@type': 'dcat:Distribution',
        'dct:format': d.format,
        'dct:license': d.license
      }],
      'dcatde:sourceSystem': d.sourceSystem
    }))
  };
}

/* ── Export: flaches CSV (Inventarliste) ──────────────────────── */
function buildInventoryCSV() {
  ensureAllClearing();   // Ampel auch ohne Besuch des Clearing-Tabs befüllen
  const cols = ['id', 'title', 'description', 'publisher', 'contactPoint',
                'sourceSystem', 'format', 'accrualPeriodicity', 'license', 'accessRights'];
  const head = [...cols, 'clearingAmpel', 'clearingEmpfehlung'].join(',');
  const rows = inventory.map(d => {
    const cells = cols.map(c => csvCell(d[c]));
    cells.push(csvCell(d.clearing?.ampel || ''), csvCell(d.clearing?.empfehlung || ''));
    return cells.join(',');
  });
  return [head, ...rows].join('\n');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ── DatenGraf-Brücke: CSV importieren ────────────────────────── */
function importGrafCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length || !('Quelle' in rows[0])) {
    alert('Diese Datei sieht nicht nach einem DatenGraf-Export aus.\nErwartet werden Spalten wie „Quelle“, „Ziel“, „Datentyp“.');
    return;
  }
  grafRows = rows;
  inventory = deriveInventory(grafRows);
  renderInventory();
}

/* ── Event-Bindings ───────────────────────────────────────────── */
function pickAndImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importGrafCSV(reader.result);
    reader.readAsText(file, 'utf-8');
  });
  input.click();
}

document.getElementById('btn-import-graf')?.addEventListener('click', pickAndImport);
document.getElementById('btn-import-again')?.addEventListener('click', pickAndImport);

document.getElementById('btn-export-json')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(JSON.stringify(buildDcatJSON(), null, 2),
    'datenlotse-inventar-dcat-ap-de.json', 'application/json');
});
document.getElementById('btn-export-csv')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(buildInventoryCSV(), 'datenlotse-inventar.csv', 'text/csv');
});

/* ── UI: Seitenleiste + Modals (FAQ / CTA) ────────────────────── */
function openSidebar() {
  document.getElementById('app-sidebar')?.classList.remove('collapsed');
  document.getElementById('sidebar-overlay')?.classList.add('show');
}
function closeSidebar() {
  document.getElementById('app-sidebar')?.classList.add('collapsed');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}
document.getElementById('sidebar-toggle-btn')?.addEventListener('click', openSidebar);
document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
document.querySelectorAll('.app-sidebar-nav a').forEach(a => a.addEventListener('click', closeSidebar));

function showModal(id, show) {
  document.getElementById(id)?.classList.toggle('hidden', !show);
}
document.getElementById('faq-btn')?.addEventListener('click', () => showModal('faq-backdrop', true));
document.getElementById('faq-close-btn')?.addEventListener('click', () => showModal('faq-backdrop', false));
document.getElementById('cta-btn')?.addEventListener('click', () => showModal('cta-backdrop', true));
document.getElementById('cta-close-btn')?.addEventListener('click', () => showModal('cta-backdrop', false));

// Klick auf den Backdrop (außerhalb des Dialogs) schließt das Modal
['faq-backdrop', 'cta-backdrop'].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener('click', e => { if (e.target === el) el.classList.add('hidden'); });
});

// Escape schließt offene Modals und die Seitenleiste
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  showModal('faq-backdrop', false);
  showModal('cta-backdrop', false);
  closeSidebar();
});

/* ──────────────────────────────────────────────────────────────
   ROADMAP / BAUAUFTRÄGE
   ────────────────────────────────────────────────────────────── */
// ✓ MVP  – Modul 2: Inventar-Import, Nacherfassung, DCAT-AP.de-Export
// Next   – Modul 3a: Rot/Gelb/Grün-Clearing-Entscheidungsbaum
// Next   – Modul 3b: Client-Side-Pseudonymisierung (Regex-Pack DE Verwaltung)
// Last   – Modul 1: Governance-Fragebogen → RACI-Matrix
