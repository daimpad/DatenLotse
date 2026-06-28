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

/* ── LocalStorage-Persistenz (Präfix datenlotse_) ─────────────── */
const LS_INVENTORY = 'datenlotse_inventory';
const LS_GOVERNANCE = 'datenlotse_governance';

function saveState() {
  try {
    localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory));
    localStorage.setItem(LS_GOVERNANCE, JSON.stringify(governanceAnswers));
  } catch (e) { /* Speicher nicht verfügbar/voll – still ignorieren */ }
}

function loadState() {
  try {
    const inv = localStorage.getItem(LS_INVENTORY);
    if (inv) { const parsed = JSON.parse(inv); if (Array.isArray(parsed)) inventory = parsed; }
  } catch (e) { /* defekte Inventar-Daten ignorieren */ }
  try {
    const gov = localStorage.getItem(LS_GOVERNANCE);
    if (gov) { const parsed = JSON.parse(gov); if (parsed && typeof parsed === 'object') governanceAnswers = parsed; }
  } catch (e) { /* defekte Governance-Daten ignorieren */ }
}

function clearState() {
  try { localStorage.removeItem(LS_INVENTORY); localStorage.removeItem(LS_GOVERNANCE); } catch (e) { /* ignorieren */ }
  grafRows = [];
  inventory = [];
  governanceAnswers = {};
}

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
  const body = document.getElementById('inventory-body');
  const meta = document.getElementById('inventory-meta');

  showView('inventory');
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
        <input class="inv-title" data-field="title" aria-label="Titel des Datensatzes" value="${esc(d.title)}" placeholder="Titel des Datensatzes">
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
        saveState();
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
        saveState();
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

/* ── Export: PDF-Bericht Inventar + Clearing (Druckfenster) ───── */
function buildInventoryReportHTML() {
  ensureAllClearing();
  const avg = inventory.length ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length) : 0;
  const c = { gruen: 0, gelb: 0, rot: 0 };
  inventory.forEach(d => { if (d.clearing) c[d.clearing.ampel]++; });
  const accessLabel = { PUBLIC: 'Öffentlich', RESTRICTED: 'Eingeschränkt', NON_PUBLIC: 'Nicht öffentlich' };
  const ampLabel = { gruen: 'Grün', gelb: 'Gelb', rot: 'Rot' };
  const ampColor = { gruen: '#2e9e60', gelb: '#d4820a', rot: '#c0392b' };
  const rows = inventory.map(d => {
    const pct = completeness(d);
    const amp = d.clearing?.ampel;
    return `<tr>
      <td>${esc(d.title)}</td>
      <td>${esc(d.publisher || '—')}</td>
      <td>${esc(d.sourceSystem || '—')}</td>
      <td style="text-align:right">${pct}%</td>
      <td>${esc(d.license || '—')}</td>
      <td>${esc(accessLabel[d.accessRights] || d.accessRights || '—')}</td>
      <td style="color:${ampColor[amp] || '#7a7591'};font-weight:700">${ampLabel[amp] || '—'}</td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>DatenLotse – Inventar- & Clearing-Bericht</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1e1b2e;margin:32px;font-size:12px}
      h1{color:#420093;font-size:22px;margin:0 0 4px} h2{color:#420093;font-size:15px;margin:22px 0 8px}
      .muted{color:#7a7591} .chips span{display:inline-block;padding:5px 11px;border-radius:20px;font-weight:700;margin-right:8px}
      table{border-collapse:collapse;width:100%;margin-top:6px} th,td{border:1px solid #d9d2e8;padding:6px 9px;text-align:left;vertical-align:top}
      th{background:#f3eefb;color:#420093;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
      @media print{body{margin:12mm}}
    </style></head><body>
    <h1>DatenLotse – Dateninventar &amp; Risiko-Clearing</h1>
    <p class="muted">DCAT-AP.de-Inventar mit Vollständigkeit und Clearing-Ampel. Lokal erzeugt – keine Datenübertragung.</p>
    <h2>Überblick</h2>
    <p>${inventory.length} Datensätze · Ø ${avg} % DCAT-AP.de-vollständig</p>
    <p class="chips">
      <span style="color:#2e9e60;background:rgba(46,158,96,.12)">${c.gruen} grün</span>
      <span style="color:#d4820a;background:rgba(212,130,10,.12)">${c.gelb} gelb</span>
      <span style="color:#c0392b;background:rgba(192,57,43,.12)">${c.rot} rot</span>
    </p>
    <h2>Datensätze</h2>
    <table><thead><tr><th>Titel</th><th>Publisher</th><th>Quellsystem</th><th>Vollst.</th><th>Lizenz</th><th>Zugriff</th><th>Clearing</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="muted">Clearing-Ampel laut deterministischem Entscheidungsbaum (Modul 3a). Gelb/Rot bedeuten Prüf- bzw. Sperrbedarf vor einer Veröffentlichung.</p>
    </body></html>`;
}

function printInventoryReport() {
  if (!inventory.length) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildInventoryReportHTML());
  w.document.close();
  const go = () => { w.focus(); w.print(); };
  if (w.document.readyState === 'complete') go();
  else w.addEventListener('load', go);
}
document.getElementById('btn-print-inventory')?.addEventListener('click', printInventoryReport);

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
  saveState();
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

// Beispieldaten laden (via fetch → benötigt HTTP, nicht file://)
function loadSampleData(file) {
  fetch(file || 'data/sample-kommune.csv')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(text => importGrafCSV(text))
    .catch(() => alert('Beispieldaten konnten nicht geladen werden.\nBitte die App über http:// (python3 -m http.server) öffnen, nicht über file://.'));
}

document.getElementById('btn-import-graf')?.addEventListener('click', pickAndImport);
document.getElementById('btn-import-again')?.addEventListener('click', pickAndImport);
document.querySelectorAll('[data-sample]').forEach(btn =>
  btn.addEventListener('click', () => loadSampleData(btn.dataset.sample)));

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

let modalOpener = null;
function showModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('hidden', !show);
  if (show) {
    modalOpener = document.activeElement;
    el.querySelector('.icon-close, button, [href], select, input')?.focus();
  } else {
    if (modalOpener && typeof modalOpener.focus === 'function') modalOpener.focus();
    modalOpener = null;
  }
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

/* ── View-Umschaltung (home / inventory / governance / pseudo) ── */
function showView(name) {
  ['hero', 'about-accordion', 'module-grid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (name === 'home') ? '' : 'none';
  });
  document.getElementById('inventory-view')?.classList.toggle('hidden', name !== 'inventory');
  document.getElementById('governance-view')?.classList.toggle('hidden', name !== 'governance');
  document.getElementById('pseudo-view')?.classList.toggle('hidden', name !== 'pseudo');
  window.scrollTo({ top: 0 });
}

function navTo(target) {
  if (target === 'inventory') {
    if (inventory.length) renderInventory();   // rendert Karten + showView('inventory') – auch nach Reload
    else { showView('home'); document.getElementById('module-grid')?.scrollIntoView({ behavior: 'smooth' }); }
  } else if (target === 'governance') {
    showView('governance');
    renderGovernance();
  } else if (target === 'pseudo') {
    showView('pseudo');
  } else if (target === 'about') {
    showView('home');
    const det = document.querySelector('#about-accordion details');
    if (det) det.open = true;
    document.getElementById('about-accordion')?.scrollIntoView({ behavior: 'smooth' });
  } else {
    showView('home');
  }
}
document.querySelectorAll('.app-sidebar-nav a[data-view]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); navTo(a.dataset.view); }));
document.getElementById('open-pseudo-btn')?.addEventListener('click', () => navTo('pseudo'));
document.getElementById('open-gov-btn')?.addEventListener('click', () => navTo('governance'));
document.getElementById('gov-import-btn')?.addEventListener('click', pickAndImport);
document.getElementById('topbar-brand')?.addEventListener('click', () => navTo('home'));
document.getElementById('topbar-brand')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('home'); }
});

/* ──────────────────────────────────────────────────────────────
   Modul 3b: Client-Side-Pseudonymisierung (reines Regex-Pack)

   Strukturerhaltend & deterministisch: pro Entitätstyp ein Zähler +
   Map(original → platzhalter). Gleicher Wert ⇒ derselbe Platzhalter.
   Erkennung in definierter Reihenfolge; erkannte Spans werden nach
   Position sortiert, Überlappungen verworfen (Longest/First-match-wins),
   dann ersetzt → keine Doppel-Ersetzung. KEIN ML/NER – bewusst konservativ.
   ────────────────────────────────────────────────────────────── */
const PSEUDO_LABELS = {
  name: 'Name', strasse: 'Adresse', plzort: 'PLZ + Ort', az: 'Aktenzeichen',
  iban: 'IBAN', email: 'E-Mail', telefon: 'Telefon', geburtsdatum: 'Geburtsdatum'
};
const PSEUDO_PH = {
  name: 'PERSON', strasse: 'ADRESSE', plzort: 'ORT', az: 'AZ',
  iban: 'IBAN', email: 'EMAIL', telefon: 'TELEFON', geburtsdatum: 'GEBURTSDATUM'
};
// Reihenfolge = Priorität (spezifisch → allgemein)
const PSEUDO_PATTERNS = [
  { type: 'iban',         re: /DE\d{2}\s?(?:\d{4}\s?){4}\d{2}/g },
  { type: 'email',        re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g },
  { type: 'telefon',      re: /(?:\+49|0)[\d\s\/()\-]{4,}\d/g },
  { type: 'az',           re: /\bAz\.?\s*[:\-]?\s*[\dIVXLC]+[\/\-][\dIVXLC]+(?:[\/\-]\d{2,4})?\b/g },
  { type: 'geburtsdatum', re: /(?:geb\.?|geboren am)\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/gid, group: 1 },
  { type: 'strasse',      re: /[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|weg|gasse|allee|platz|ring|damm)\s+\d+[a-z]?/g },
  { type: 'plzort',       re: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:[\-\s][A-ZÄÖÜ][a-zäöüß]+)?/g },
  { type: 'name',         re: /(?:Herr|Frau|Hr\.|Fr\.|Dr\.|Prof\.)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/gd, group: 1 },
];

function collectSpans(text) {
  const spans = [];
  PSEUDO_PATTERNS.forEach((pat, prio) => {
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(text)) !== null) {
      if (m[0] === '') { pat.re.lastIndex++; continue; }
      const gi = pat.group || 0;
      let start, end, value;
      if (gi && m.indices && m.indices[gi]) {
        [start, end] = m.indices[gi];
        value = m[gi];
      } else {
        start = m.index; end = m.index + m[0].length; value = m[0];
      }
      spans.push({ start, end, type: pat.type, value, prio });
    }
  });
  return spans;
}

function selectSpans(spans) {
  // nach Startposition, dann längster Span, dann höchste Priorität (kleinste prio)
  spans.sort((a, b) =>
    a.start - b.start || (b.end - b.start) - (a.end - a.start) || a.prio - b.prio);
  const out = [];
  let lastEnd = -1;
  for (const s of spans) {
    if (s.start >= lastEnd) { out.push(s); lastEnd = s.end; }
  }
  return out;
}

function pseudonymize(text) {
  const selected = selectSpans(collectSpans(text));
  const counters = {};            // type → laufender Index
  const maps = {};                // type → Map(original → platzhalter)
  const mapping = [];             // eindeutige Einträge in Reihenfolge
  let plain = '', html = '', cursor = 0;
  for (const s of selected) {
    plain += text.slice(cursor, s.start);
    html  += esc(text.slice(cursor, s.start));
    maps[s.type] = maps[s.type] || new Map();
    let ph = maps[s.type].get(s.value);
    if (!ph) {
      counters[s.type] = (counters[s.type] || 0) + 1;
      ph = `[${PSEUDO_PH[s.type]}_${counters[s.type]}]`;
      maps[s.type].set(s.value, ph);
      mapping.push({ type: s.type, label: PSEUDO_LABELS[s.type], placeholder: ph, original: s.value });
    }
    plain += ph;
    html  += `<mark class="pseudo-hit" title="${esc(PSEUDO_LABELS[s.type])}: ${esc(s.value)}">${esc(ph)}</mark>`;
    cursor = s.end;
  }
  plain += text.slice(cursor);
  html  += esc(text.slice(cursor));
  return { text: plain, html, mapping, count: selected.length };
}

const PSEUDO_DEMO =
`Sehr geehrter Herr Max Mustermann,

in der Sache Az. 12/345/67 bestätigen wir den Eingang Ihres Antrags.
Herr Max Mustermann, wohnhaft Musterstraße 12a, 12345 Musterstadt,
geb. 03.04.1985, wird um Rückmeldung gebeten.
Zahlungen erfolgen auf IBAN DE12 3456 7890 1234 5678 90.
Kontakt: max.mustermann@example.de, Tel. +49 30 1234567.
Der Bescheid vom 15.03.2024 bleibt davon unberührt.`;

let lastPseudoText = null;

function runPseudonymize() {
  const inputEl = document.getElementById('pseudo-input');
  const outEl = document.getElementById('pseudo-output');
  const mapEl = document.getElementById('pseudo-mapping');
  const dlBtn = document.getElementById('pseudo-download-btn');
  const text = inputEl.value;
  if (!text.trim()) {
    outEl.innerHTML = '<span class="pseudo-placeholder">Bitte zuerst einen Text eingeben oder das Beispiel laden.</span>';
    mapEl.innerHTML = ''; dlBtn.hidden = true; lastPseudoText = null;
    return;
  }
  const res = pseudonymize(text);
  lastPseudoText = res.text;
  outEl.innerHTML = res.html;
  if (res.mapping.length) {
    mapEl.innerHTML =
      `<div class="pseudo-map-head"><i class="fas fa-table-list"></i> Ersetzungen (${res.mapping.length})</div>` +
      `<table class="pseudo-map"><thead><tr><th>Platzhalter</th><th>Typ</th><th>Original</th></tr></thead><tbody>` +
      res.mapping.map(m =>
        `<tr><td><code>${esc(m.placeholder)}</code></td><td>${esc(m.label)}</td><td>${esc(m.original)}</td></tr>`
      ).join('') +
      `</tbody></table>`;
  } else {
    mapEl.innerHTML = '<div class="pseudo-map-head pseudo-map-empty"><i class="fas fa-circle-check"></i> Keine erkennbaren personenbezogenen Muster gefunden – bitte trotzdem manuell prüfen.</div>';
  }
  dlBtn.hidden = false;
}

function pickPseudoFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.csv,text/plain,text/csv';
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { document.getElementById('pseudo-input').value = r.result; };
    r.readAsText(f, 'utf-8');
  });
  input.click();
}

document.getElementById('pseudo-clean-btn')?.addEventListener('click', runPseudonymize);
document.getElementById('pseudo-file-btn')?.addEventListener('click', pickPseudoFile);
document.getElementById('pseudo-demo-btn')?.addEventListener('click', () => {
  document.getElementById('pseudo-input').value = PSEUDO_DEMO;
  runPseudonymize();
});
document.getElementById('pseudo-download-btn')?.addEventListener('click', () => {
  if (lastPseudoText != null) downloadBlob(lastPseudoText, 'bereinigt.txt', 'text/plain');
});

/* ──────────────────────────────────────────────────────────────
   Modul 1: Governance & Rollen (RACI + Reifegrad)

   Datendomänen werden aus dem Inventar (Publisher/Quellsystem) abgeleitet.
   Die RACI-Matrix folgt einem festen, transparenten Rollen-Template;
   die DSB-Spalte hängt an der DSGVO-Relevanz der Domäne. Der Reifegrad
   (0–100) ist die gewichtete Summe der Fragebogen-Antworten.
   ────────────────────────────────────────────────────────────── */
const GOV_QUESTIONS = [
  { id: 'domains', label: 'Sind die Datendomänen klar abgegrenzt und dokumentiert?',                        weight: 12 },
  { id: 'owner',   label: 'Ist je Domäne ein Data Owner (fachlich verantwortlich) benannt?',                weight: 16 },
  { id: 'steward', label: 'Sind Data Stewards für die operative Datenpflege benannt?',                      weight: 16 },
  { id: 'ssot',    label: 'Gibt es je Domäne eine Single Source of Truth?',                                  weight: 12 },
  { id: 'quality', label: 'Existieren dokumentierte Datenqualitäts-Richtlinien?',                            weight: 12 },
  { id: 'dsb',     label: 'Ist die/der Datenschutzbeauftragte in datenschutzrelevante Domänen eingebunden?', weight: 12 },
  { id: 'release', label: 'Gibt es einen Freigabe-/Clearing-Prozess für Veröffentlichungen?',               weight: 12 },
  { id: 'review',  label: 'Werden Zuständigkeiten regelmäßig überprüft und aktualisiert?',                   weight: 8 },
];
const GOV_FACTOR = { ja: 1, teilweise: 0.5, nein: 0 };
const GOV_OPTS = [['', '— wählen —'], ['ja', 'Ja'], ['teilweise', 'Teilweise'], ['nein', 'Nein']];

const RACI_ROLES = [
  { key: 'owner',   label: 'Data Owner' },
  { key: 'steward', label: 'Data Steward' },
  { key: 'fach',    label: 'Fachbereich' },
  { key: 'it',      label: 'IT-Betrieb' },
  { key: 'dsb',     label: 'Datenschutz (DSB)' },
];
// Welche Frage „besetzt" welche Rolle (für Lücken-Markierung)
const ROLE_GAP_Q = { owner: 'owner', steward: 'steward', dsb: 'dsb' };

let governanceAnswers = {};

function deriveDomains() {
  const seen = new Map();
  inventory.forEach(d => {
    const name = (d.sourceSystem || d.publisher || 'Ohne Zuordnung').trim() || 'Ohne Zuordnung';
    const dsgvo = /dsgvo/i.test(d._grafSchutzbedarf || '') || ['rot', 'gelb'].includes(d.clearing?.ampel);
    if (!seen.has(name)) seen.set(name, { name, dsgvo: false, count: 0 });
    const dom = seen.get(name);
    dom.count++;
    if (dsgvo) dom.dsgvo = true;
  });
  return [...seen.values()];
}

function raciFor(domain) {
  return {
    owner:   'A',
    steward: 'R',
    fach:    'C',
    it:      'C',
    dsb:     domain.dsgvo ? 'C' : 'I',
  };
}

// Lücke = zuständige Frage nicht mit „Ja" beantwortet (DSB nur bei DSGVO-Domänen)
function roleGap(roleKey, domain) {
  const q = ROLE_GAP_Q[roleKey];
  if (!q) return false;
  if (roleKey === 'dsb' && !domain.dsgvo) return false;
  return governanceAnswers[q] !== 'ja';
}

function reifegrad() {
  let score = 0;
  const breakdown = GOV_QUESTIONS.map(q => {
    const f = GOV_FACTOR[governanceAnswers[q.id]] ?? 0;
    score += q.weight * f;
    return { id: q.id, label: q.label, weight: q.weight, factor: f };
  });
  return { score: Math.round(score), breakdown };
}

function reifeAmpel(score) {
  if (score >= 80) return { cls: 'gruen', label: 'Reif' };
  if (score >= 50) return { cls: 'gelb',  label: 'Im Aufbau' };
  return { cls: 'rot', label: 'Lückenhaft' };
}

function renderGovernance() {
  const empty = document.getElementById('gov-empty');
  const content = document.getElementById('gov-content');
  if (!empty || !content) return;
  if (!inventory.length) {
    empty.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  content.classList.remove('hidden');
  renderGovQuestions();
  renderGovScore();
  renderRaciMatrix();
}

function renderGovQuestions() {
  const box = document.getElementById('gov-questions');
  if (!box) return;
  box.innerHTML = GOV_QUESTIONS.map(q => `
    <label class="gov-q">
      <span class="gov-q-label">${esc(q.label)} <span class="gov-q-w">(${q.weight})</span></span>
      <select data-gov="${esc(q.id)}">${optionsHTML(GOV_OPTS, governanceAnswers[q.id] || '')}</select>
    </label>`).join('');
  box.querySelectorAll('select[data-gov]').forEach(sel => {
    sel.addEventListener('change', () => {
      governanceAnswers[sel.dataset.gov] = sel.value;
      renderGovScore();
      renderRaciMatrix();
      saveState();
    });
  });
}

function renderGovScore() {
  const badge = document.getElementById('gov-score-badge');
  const bars = document.getElementById('gov-score-bars');
  if (!badge) return;
  const { score, breakdown } = reifegrad();
  const amp = reifeAmpel(score);
  badge.className = `gov-score-badge gov-score-badge--${amp.cls}`;
  badge.innerHTML = `<span class="gov-score-num">${score}</span><span class="gov-score-unit">/ 100</span><span class="gov-score-lbl">${amp.label}</span>`;
  bars.innerHTML = breakdown.map(b => {
    const pct = Math.round(b.factor * 100);
    const cls = b.factor === 1 ? 'gruen' : b.factor === 0.5 ? 'gelb' : 'rot';
    return `<div class="gov-bar-row" title="${esc(b.label)}">
      <span class="gov-bar-lbl">${esc(b.label)}</span>
      <span class="gov-bar"><span class="gov-bar-fill gov-bar-fill--${cls}" style="width:${pct}%"></span></span>
    </div>`;
  }).join('');
}

function renderRaciMatrix() {
  const table = document.getElementById('gov-matrix');
  if (!table) return;
  const domains = deriveDomains();
  const head = `<thead><tr><th>Datendomäne</th>${RACI_ROLES.map(r => `<th>${esc(r.label)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${domains.map(dom => {
    const raci = raciFor(dom);
    const cells = RACI_ROLES.map(r => {
      const gap = roleGap(r.key, dom);
      return `<td><span class="raci raci--${raci[r.key]}">${raci[r.key]}</span>${gap ? '<span class="gov-gap-dot" title="laut Fragebogen noch nicht (vollständig) besetzt"></span>' : ''}</td>`;
    }).join('');
    const tag = dom.dsgvo ? '<span class="gov-dsgvo">DSGVO</span>' : '';
    return `<tr><td class="gov-dom"><span>${esc(dom.name)}</span> <span class="gov-dom-n">${dom.count}</span> ${tag}</td>${cells}</tr>`;
  }).join('')}</tbody>`;
  table.innerHTML = head + body;
}

function buildRaciCSV() {
  const domains = deriveDomains();
  const { score } = reifegrad();
  const head = ['Domaene', 'DSGVO-relevant', 'Anzahl_Datensaetze', ...RACI_ROLES.map(r => r.label)].join(',');
  const rows = domains.map(dom => {
    const raci = raciFor(dom);
    return [csvCell(dom.name), dom.dsgvo ? 'ja' : 'nein', dom.count, ...RACI_ROLES.map(r => raci[r.key])].join(',');
  });
  return [head, ...rows].join('\n') + `\n\nReifegrad,${score}/100`;
}

function buildGovReportHTML() {
  const domains = deriveDomains();
  const { score, breakdown } = reifegrad();
  const amp = reifeAmpel(score);
  const ampColor = { gruen: '#2e9e60', gelb: '#d4820a', rot: '#c0392b' }[amp.cls];
  const matrixRows = domains.map(dom => {
    const raci = raciFor(dom);
    return `<tr><td>${esc(dom.name)}${dom.dsgvo ? ' <b>(DSGVO)</b>' : ''}</td>${RACI_ROLES.map(r => `<td style="text-align:center">${raci[r.key]}${roleGap(r.key, dom) ? ' ⚠' : ''}</td>`).join('')}</tr>`;
  }).join('');
  const breakdownRows = breakdown.map(b =>
    `<tr><td>${esc(b.label)}</td><td style="text-align:right">${b.weight}</td><td style="text-align:right">${Math.round(b.factor * b.weight)}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>DatenLotse – Governance-Bericht</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1e1b2e;margin:32px;font-size:13px}
      h1{color:#420093;font-size:22px;margin:0 0 4px} h2{color:#420093;font-size:15px;margin:24px 0 8px}
      .score{display:inline-block;padding:10px 18px;border-radius:10px;color:#fff;font-weight:700;background:${ampColor}}
      table{border-collapse:collapse;width:100%;margin-top:6px} th,td{border:1px solid #d9d2e8;padding:6px 9px;text-align:left}
      th{background:#f3eefb;color:#420093} .muted{color:#7a7591} @media print{body{margin:12mm}}
    </style></head><body>
    <h1>DatenLotse – Governance &amp; Rollen</h1>
    <p class="muted">RACI-Matrix &amp; Reifegrad, abgeleitet aus dem Dateninventar. Lokal erzeugt – keine Datenübertragung.</p>
    <h2>Reifegrad</h2>
    <p><span class="score">${score} / 100 · ${amp.label}</span></p>
    <table><thead><tr><th>Kategorie</th><th>Gewicht</th><th>Punkte</th></tr></thead><tbody>${breakdownRows}</tbody></table>
    <h2>RACI-Matrix</h2>
    <table><thead><tr><th>Datendomäne</th>${RACI_ROLES.map(r => `<th>${esc(r.label)}</th>`).join('')}</tr></thead><tbody>${matrixRows}</tbody></table>
    <p class="muted">R = Responsible · A = Accountable · C = Consulted · I = Informed · ⚠ = laut Fragebogen noch nicht (vollständig) besetzt</p>
    </body></html>`;
}

function printGovReport() {
  if (!inventory.length) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildGovReportHTML());
  w.document.close();
  const go = () => { w.focus(); w.print(); };
  if (w.document.readyState === 'complete') go();
  else w.addEventListener('load', go);
}

document.getElementById('gov-export-csv')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(buildRaciCSV(), 'datenlotse-raci.csv', 'text/csv');
});
document.getElementById('gov-print')?.addEventListener('click', printGovReport);

/* ── Persistenz: gespeicherten Stand laden / zurücksetzen ─────── */
document.getElementById('reset-data-btn')?.addEventListener('click', () => {
  const hasData = inventory.length || Object.keys(governanceAnswers).length;
  if (hasData && !confirm('Gespeicherte Daten (Inventar, Clearing, Governance) wirklich löschen?')) return;
  clearState();
  document.getElementById('inventory-body') && (document.getElementById('inventory-body').innerHTML = '');
  showView('home');
  closeSidebar();
});

// Beim Laden den gespeicherten Stand wiederherstellen (still – Daten sind über die Views erreichbar)
loadState();

/* ──────────────────────────────────────────────────────────────
   ROADMAP / BAUAUFTRÄGE
   ────────────────────────────────────────────────────────────── */
// ✓ MVP  – Modul 2: Inventar-Import, Nacherfassung, DCAT-AP.de-Export
// ✓      – Modul 3a: Rot/Gelb/Grün-Clearing-Entscheidungsbaum
// ✓      – Modul 3b: Client-Side-Pseudonymisierung (Regex-Pack DE Verwaltung)
// ✓      – Modul 1: Governance-Fragebogen → RACI-Matrix + Reifegrad
