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
  const cols = ['id', 'title', 'description', 'publisher', 'contactPoint',
                'sourceSystem', 'format', 'accrualPeriodicity', 'license', 'accessRights'];
  const head = cols.join(',');
  const rows = inventory.map(d => cols.map(c => csvCell(d[c])).join(','));
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

/* ──────────────────────────────────────────────────────────────
   ROADMAP / BAUAUFTRÄGE
   ────────────────────────────────────────────────────────────── */
// ✓ MVP  – Modul 2: Inventar-Import, Nacherfassung, DCAT-AP.de-Export
// Next   – Modul 3a: Rot/Gelb/Grün-Clearing-Entscheidungsbaum
// Next   – Modul 3b: Client-Side-Pseudonymisierung (Regex-Pack DE Verwaltung)
// Last   – Modul 1: Governance-Fragebogen → RACI-Matrix
