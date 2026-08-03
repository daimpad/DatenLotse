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
/* dct:license – Lizenz-Register nach DCAT-AP.de (Auszug der gängigen
   Lizenzen). Jede Lizenz trägt: id (interner, rückwärtskompatibler
   Schlüssel = gespeicherter Wert), label, open (Open-Definition-konform:
   NC/ND sind NICHT offen; Share-Alike/Copyleft IST offen), uri (offizielle
   dct:license-URI für den DCAT-Export) und url (menschenlesbarer Lizenztext).
   Reihenfolge/Gruppen steuern das Dropdown (Optgroups). */
const DCATDE_LIC = 'http://dcat-ap.de/def/licenses/';
const LICENSE_CATALOG = [
  { group: 'Offene Lizenzen (für Open Data empfohlen)', items: [
    { id: 'dl-de/by-2-0',    label: 'Datenlizenz Deutschland – Namensnennung 2.0', open: true, uri: DCATDE_LIC + 'dl-by-de/2.0', url: 'https://www.govdata.de/dl-de/by-2-0' },
    { id: 'dl-de/zero-2-0',  label: 'Datenlizenz Deutschland – Zero 2.0', open: true, uri: DCATDE_LIC + 'dl-zero-de/2.0', url: 'https://www.govdata.de/dl-de/zero-2-0' },
    { id: 'cc-by-4.0',       label: 'Creative Commons Namensnennung 4.0 (CC BY 4.0)', open: true, uri: DCATDE_LIC + 'cc-by/4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.de' },
    { id: 'cc-zero',         label: 'Creative Commons Zero 1.0 (CC0 – Gemeinfreiheit)', open: true, uri: DCATDE_LIC + 'cc-zero', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.de' },
    { id: 'cc-by-sa-4.0',    label: 'Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0 (CC BY-SA 4.0)', open: true, uri: DCATDE_LIC + 'cc-by-sa/4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.de' },
    { id: 'dl-de/by-1-0',    label: 'Datenlizenz Deutschland – Namensnennung 1.0', open: true, uri: DCATDE_LIC + 'dl-by-de/1.0', url: 'https://www.govdata.de/dl-de/by-1-0' },
    { id: 'cc-by-3.0-de',    label: 'Creative Commons Namensnennung 3.0 Deutschland (CC BY 3.0 DE)', open: true, uri: DCATDE_LIC + 'cc-by/3.0/de', url: 'https://creativecommons.org/licenses/by/3.0/de/deed.de' },
    { id: 'geonutzv-de-2013', label: 'Nutzungsbestimmungen für Geodaten des Bundes (GeoNutzV)', open: true, uri: DCATDE_LIC + 'geonutz/20130319', url: 'https://www.gesetze-im-internet.de/geonutzv/' },
    { id: 'official-work',   label: 'Amtliches Werk – lizenzfrei nach § 5 UrhG', open: true, uri: DCATDE_LIC + 'officialWork', url: 'https://www.gesetze-im-internet.de/urhg/__5.html' },
    { id: 'odc-by',          label: 'Open Data Commons – Namensnennung (ODC-BY 1.0)', open: true, uri: 'https://opendatacommons.org/licenses/by/1-0/', url: 'https://opendatacommons.org/licenses/by/1-0/' },
    { id: 'odc-odbl',        label: 'Open Data Commons – Open Database License (ODbL 1.0)', open: true, uri: 'https://opendatacommons.org/licenses/odbl/1-0/', url: 'https://opendatacommons.org/licenses/odbl/1-0/' },
    { id: 'odc-pddl',        label: 'Open Data Commons – Public Domain Dedication (PDDL 1.0)', open: true, uri: 'https://opendatacommons.org/licenses/pddl/1-0/', url: 'https://opendatacommons.org/licenses/pddl/1-0/' },
    { id: 'gfdl',            label: 'GNU Free Documentation License (GFDL)', open: true, uri: DCATDE_LIC + 'gfdl', url: 'https://www.gnu.org/licenses/fdl-1.3.html' },
    { id: 'other-open',      label: 'Andere offene Lizenz', open: true, uri: DCATDE_LIC + 'other-open', url: 'https://opendefinition.org/licenses/' },
  ]},
  { group: 'Eingeschränkte Lizenzen (nicht „offen“ i. S. der Open Definition)', items: [
    { id: 'cc-by-nc-4.0',    label: 'CC Namensnennung – Nicht kommerziell 4.0 (CC BY-NC 4.0)', open: false, uri: DCATDE_LIC + 'cc-by-nc/4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/deed.de' },
    { id: 'cc-by-nd-4.0',    label: 'CC Namensnennung – Keine Bearbeitung 4.0 (CC BY-ND 4.0)', open: false, uri: DCATDE_LIC + 'cc-by-nd/4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/deed.de' },
    { id: 'cc-by-nc-sa-4.0', label: 'CC Namensnennung – Nicht kommerziell – Weitergabe 4.0 (CC BY-NC-SA 4.0)', open: false, uri: DCATDE_LIC + 'cc-by-nc-sa/4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de' },
    { id: 'cc-by-nc-nd-4.0', label: 'CC Namensnennung – Nicht kommerziell – Keine Bearbeitung 4.0 (CC BY-NC-ND 4.0)', open: false, uri: DCATDE_LIC + 'cc-by-nc-nd/4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de' },
    { id: 'dl-de/by-nc-1-0', label: 'Datenlizenz Deutschland – Namensnennung – nicht kommerziell 1.0', open: false, uri: DCATDE_LIC + 'dl-by-nc-de/1.0', url: 'https://www.govdata.de/lizenzen' },
    { id: 'other-closed',    label: 'Andere / nicht offene Lizenz', open: false, uri: DCATDE_LIC + 'other-closed', url: '' },
  ]},
];
// Nachschlage-Map id → Metadaten und flache Optionsliste (Rückwärtskompatibilität)
const LICENSE_META = {};
LICENSE_CATALOG.forEach(g => g.items.forEach(l => { LICENSE_META[l.id] = l; }));
const LICENSE_OPTIONS = [['', '— bitte wählen —'], ...LICENSE_CATALOG.flatMap(g => g.items.map(l => [l.id, l.label]))];

function licenseIsOpen(id) { return !!(LICENSE_META[id] && LICENSE_META[id].open); }

// Dropdown mit <optgroup>; ein unbekannter (z. B. legacy) Wert bleibt erhalten
function licenseSelectHTML(selected) {
  let html = `<option value=""${selected ? '' : ' selected'}>— bitte wählen —</option>`;
  html += LICENSE_CATALOG.map(g =>
    `<optgroup label="${esc(g.group)}">` +
    g.items.map(l => `<option value="${esc(l.id)}"${l.id === selected ? ' selected' : ''}>${esc(l.label)}</option>`).join('') +
    `</optgroup>`).join('');
  if (selected && !LICENSE_META[selected])
    html += `<option value="${esc(selected)}" selected>${esc(selected)} (unbekannte Lizenz)</option>`;
  return html;
}

// dct:accessRights – EU Access-Right NAL
const ACCESS_OPTIONS = [
  ['',           '— bitte wählen —'],
  ['PUBLIC',     'Öffentlich'],
  ['RESTRICTED', 'Eingeschränkt'],
  ['NON_PUBLIC', 'Nicht öffentlich']
];
const ACCESS_NAL = 'http://publications.europa.eu/resource/authority/access-right/';
const FREQ_NAL = 'http://publications.europa.eu/resource/authority/frequency/';

// dcat:theme – EU-Datenthemen (Data Theme NAL, von GovData/DCAT-AP.de genutzt)
const THEME_NAL = 'http://publications.europa.eu/resource/authority/data-theme/';

/* DCAT-AP.de-eigene Register (Auszug) – Grundlage für die erweiterten Felder.
   `politicalGeocodingURI` wird aus dem amtlichen Regionalschlüssel gebildet,
   `contributorID` aus der bei GovData vergebenen Kennung. */
const GEO_NAL          = 'http://dcat-ap.de/def/politicalGeocoding/';
const GEO_LEVEL_NAL    = GEO_NAL + 'Level/';
const GEO_REGIONAL_NAL = GEO_NAL + 'regionalKey/';
const CONTRIBUTOR_NAL  = 'http://dcat-ap.de/def/contributors/';
const GEO_LEVELS = [
  ['', '— bitte wählen —'],
  ['bund', 'Bund'],
  ['land', 'Land'],
  ['regierungsbezirk', 'Regierungsbezirk'],
  ['kreis', 'Kreis'],
  ['verwaltungsgemeinschaft', 'Verwaltungsgemeinschaft'],
  ['gemeinde', 'Gemeinde'],
];
// Amtlicher Regionalschlüssel: 2 (Land), 5 (Kreis), 8 (VG) oder 12 Stellen (Gemeinde/ARS)
const GEO_KEY_RE = /^\d{2}(\d{3}(\d{3}(\d{4})?)?)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DCAT_THEMES = [
  ['',     '— bitte wählen —'],
  ['AGRI', 'Landwirtschaft, Fischerei, Forstwirtschaft & Nahrung'],
  ['ECON', 'Wirtschaft & Finanzen'],
  ['EDUC', 'Bildung, Kultur & Sport'],
  ['ENER', 'Energie'],
  ['ENVI', 'Umwelt'],
  ['GOVE', 'Regierung & öffentlicher Sektor'],
  ['HEAL', 'Gesundheit'],
  ['INTR', 'Internationale Themen'],
  ['JUST', 'Justiz, Rechtssystem & öffentliche Sicherheit'],
  ['REGI', 'Regionen & Städte'],
  ['SOCO', 'Bevölkerung & Gesellschaft'],
  ['TECH', 'Wissenschaft & Technologie'],
  ['TRAN', 'Verkehr']
];

/* ── Globaler State ───────────────────────────────────────────── */
let grafRows = [];      // importierte DatenGraf-Zeilen
let inventory = [];     // abgeleitete DCAT-AP.de-Inventar-Einträge

/* ── LocalStorage-Persistenz (Präfix datenlotse_) ─────────────── */
const LS_INVENTORY = 'datenlotse_inventory';
const LS_GOVERNANCE = 'datenlotse_governance';
const LS_KOMPASS = 'datenlotse_kompass';

function saveState() {
  try {
    localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory));
    localStorage.setItem(LS_GOVERNANCE, JSON.stringify(governanceAnswers));
    localStorage.setItem(LS_KOMPASS, JSON.stringify(kompassState));
  } catch (e) { /* Speicher nicht verfügbar/voll – still ignorieren */ }
}

function loadState() {
  try {
    const inv = localStorage.getItem(LS_INVENTORY);
    if (inv) { const parsed = JSON.parse(inv); if (Array.isArray(parsed)) inventory = parsed; }
    migrateInventory();   // ältere Stände auf die Verteilungs-Ebene heben
  } catch (e) { /* defekte Inventar-Daten ignorieren */ }
  try {
    const gov = localStorage.getItem(LS_GOVERNANCE);
    if (gov) { const parsed = JSON.parse(gov); if (parsed && typeof parsed === 'object') governanceAnswers = parsed; }
  } catch (e) { /* defekte Governance-Daten ignorieren */ }
  try {
    loadKompassHistory();
    const k = localStorage.getItem(LS_KOMPASS);
    if (k) { const parsed = JSON.parse(k); if (parsed && typeof parsed === 'object') kompassState = parsed; }
  } catch (e) { /* defekte Kompass-Daten ignorieren */ }
}

function clearState() {
  try {
    localStorage.removeItem(LS_INVENTORY); localStorage.removeItem(LS_GOVERNANCE);
    localStorage.removeItem(LS_KOMPASS); localStorage.removeItem(LS_KOMPASS_HIST);
  } catch (e) { /* ignorieren */ }
  kompassHistory = [];
  grafRows = [];
  inventory = [];
  governanceAnswers = {};
  kompassState = {};
}

/* ── Projekt-Export/-Import (kompletter Stand als .json) ──────────
   Sichert/restauriert den gesamten Arbeitsstand portabel als eine
   Datei – über LocalStorage hinaus (Gerätewechsel, Backup, Teilen).
   Versionierter Umschlag; Import prüft Herkunft und füllt fehlende
   Teile defensiv. grafRows wird mitgesichert (anders als im
   LocalStorage), damit der Import-Kontext vollständig ist. */
const PROJECT_SCHEMA = 1;
const APP_VERSION = 'v41';

function buildProjectJSON() {
  return JSON.stringify({
    app: 'DatenLotse',
    schema: PROJECT_SCHEMA,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { grafRows, inventory, governanceAnswers, kompassState, kompassHistory }
  }, null, 2);
}

function exportProject() {
  const hasData = grafRows.length || inventory.length ||
    Object.keys(governanceAnswers).length || Object.keys(kompassState).length ||
    kompassHistory.length;
  if (!hasData) {
    alert('Es gibt noch keinen Stand zum Speichern. Importiere zuerst eine DatenGraf-CSV oder lade das Beispiel.');
    return;
  }
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(buildProjectJSON(), `datenlotse-projekt-${stamp}.json`, 'application/json');
}

function importProject(text) {
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) { alert('Die Datei ist kein gültiges JSON.'); return false; }
  if (!obj || obj.app !== 'DatenLotse' || !obj.data || typeof obj.data !== 'object') {
    alert('Diese Datei ist kein DatenLotse-Projekt (.json).');
    return false;
  }
  // Schema-Prüfung: eine neuere Datei würde sonst stillschweigend halb eingelesen
  if (Number(obj.schema) > PROJECT_SCHEMA) {
    alert(`Diese Projektdatei stammt aus einer neueren DatenLotse-Version (Schema ${obj.schema}).\nBitte die Anwendung aktualisieren.`);
    return false;
  }
  const hasData = inventory.length || Object.keys(governanceAnswers).length || Object.keys(kompassState).length;
  if (hasData && !confirm('Aktuellen Stand durch das geladene Projekt ersetzen? Nicht exportierte Änderungen gehen verloren.')) {
    return false;
  }
  const d = obj.data;
  grafRows          = Array.isArray(d.grafRows) ? d.grafRows : [];
  inventory         = Array.isArray(d.inventory) ? d.inventory : [];
  migrateInventory();   // Projektdateien vor v39 kennen keine Verteilungen
  governanceAnswers = (d.governanceAnswers && typeof d.governanceAnswers === 'object') ? d.governanceAnswers : {};
  kompassState      = (d.kompassState && typeof d.kompassState === 'object') ? d.kompassState : {};
  // Additiv ergänzt (kein Schema-Bump): ältere Projektdateien haben ihn nicht
  kompassHistory    = Array.isArray(d.kompassHistory)
    ? d.kompassHistory.filter(e => e && typeof e.date === 'string' && Number.isFinite(e.score))
    : [];
  saveKompassHistory();
  saveState();
  if (inventory.length) renderInventory();   // sinnvolle Ansicht; sonst Startseite
  else showView('home');
  return true;
}

function pickAndImportProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (importProject(r.result)) closeSidebar(); };
    r.readAsText(f, 'utf-8');
  });
  input.click();
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

/* Datensätze zeichenweise trennen – ein Zeilenumbruch INNERHALB eines
   gequoteten Feldes beendet den Datensatz nicht. Ein reines
   text.split(/\r?\n/) erzeugte hier Phantom-Zeilen; betroffen war auch der
   eigene Export, sobald eine Beschreibung einen Umbruch enthielt. */
function parseCSVRecords(text) {
  const rows = [];
  let row = [], cur = '', inQ = false, started = false;
  const endField = () => { row.push(cur); cur = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; started = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    started = true;
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') endField();
      else if (c === '\r') { /* vor \n ignorieren */ }
      else if (c === '\n') endRow();
      else cur += c;
    }
  }
  if (started || cur !== '' || row.length) endRow();
  return rows;
}

function parseCSV(text) {
  const recs = parseCSVRecords(text).filter(r => r.some(c => c.trim() !== ''));
  if (!recs.length) return [];
  const header = recs[0].map(h => h.trim());
  return recs.slice(1).map(cells => {
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

/* ── CSV-Serialisierung (Falsy-sicher wie DatenGraf toCSV) ────── */
function csvCell(v) {
  let s = (v == null || v === '') ? '' : String(v);
  // Formel-Injection: Excel/LibreOffice werten führende =,+,-,@ als Formel aus
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
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
      if (r.Ziel && !seen.get(key)._recipients.includes(r.Ziel)) seen.get(key)._recipients.push(r.Ziel);
      continue;
    }
    seen.set(key, {
      id:                 slug(`${r.QuelleOrganisation}-${r.Datentyp || r.Quelle}`),
      title:              r.Datentyp || r.Quelle || 'Unbenannter Datensatz',
      description:        r.Anmerkungen || '',
      publisher:          r.QuelleOrganisation || '',
      contactPoint:       r.Ansprechpartner || '',
      sourceSystem:       r.Quelle || '',
      // Nacherfassung:
      keywords:           '',
      theme:              guessTheme(r),
      accrualPeriodicity: mapHaeufigkeit(r['Häufigkeit']),
      accessRights:       mapSchutzToAccess(r.Schutzbedarf),
      landingPage:        '',
      // Format und Lizenz gehören nach DCAT-AP.de an die VERTEILUNG, nicht an
      // den Datensatz: derselbe Datensatz liegt oft als CSV und als JSON vor,
      // je mit eigener Zugriffs-URL und ggf. eigener Lizenz.
      distributions:      [{ title: '', format: r.Format || '', accessURL: '', license: '' }],
      // Erweiterte DCAT-AP.de-Felder (optional, Nacherfassung)
      issued:             '',
      modified:           '',
      temporalStart:      '',
      temporalEnd:        '',
      spatial:            '',
      geocodingKey:       '',
      geocodingLevel:     '',
      contributorID:      '',
      _grafSchutzbedarf:  r.Schutzbedarf || '',
      _recipients:        r.Ziel ? [r.Ziel] : []   // Array statt Set: überlebt JSON-Roundtrip
    });
  }
  // `id` enthält die Quelle nicht, dedupliziert wird aber über Quelle+Datentyp:
  // zwei Quellsysteme derselben Organisation mit gleichem Datentyp ergäben sonst
  // denselben dct:identifier (Kollision beim Harvesting). Deterministisch
  // durchnummerieren statt die id länger und unleserlicher zu machen.
  const list = [...seen.values()];
  const used = new Map();
  list.forEach(d => {
    const n = (used.get(d.id) || 0) + 1;
    used.set(d.id, n);
    if (n > 1) d.id = `${d.id}-${n}`;
  });
  return list;
}

function slug(s) {
  return String(s).toLowerCase().trim()
    .replace(/[äöü]/g, m => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue' }[m]))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'datensatz';
}

/* Schutzbedarf ist im DatenGraf-Schema Freitext. Die Kategorisierung prüft
   Verneinungen ZUERST – sonst würde „Nicht öffentlich“ über den Teilstring
   „öffentlich“ als PUBLIC gelesen und im Clearing automatisch Grün ergeben. */
function schutzKategorie(schutz) {
  const s = String(schutz == null ? '' : schutz);
  if (/dsgvo|personenbezogen/i.test(s)) return 'dsgvo';
  if (/nicht[\s\-]*öffentlich|nicht[\s\-]*oeffentlich|vs-nfd|verschlusssache|geheim/i.test(s)) return 'nicht-oeffentlich';
  if (/intern|vertraulich/i.test(s)) return 'intern';
  if (/öffentlich|oeffentlich/i.test(s)) return 'oeffentlich';
  return '';
}

function mapSchutzToAccess(schutz) {
  switch (schutzKategorie(schutz)) {
    case 'dsgvo':            return 'NON_PUBLIC';
    case 'nicht-oeffentlich': return 'NON_PUBLIC';
    case 'intern':           return 'RESTRICTED';
    case 'oeffentlich':      return 'PUBLIC';
    default:                 return '';
  }
}

// Konservativer Vorschlag für dcat:theme aus Datentyp/Bereich/Quelle.
// Nur bei eindeutigen Stichwörtern; sonst leer (Nutzer wählt).
function guessTheme(r) {
  const t = `${r.Datentyp || ''} ${r.QuelleBereich || ''} ${r.Quelle || ''} ${r.QuelleAbteilung || ''}`.toLowerCase();
  const rules = [
    ['ENVI', /umwelt|geo|baum|grün|gruen|bebauung|natur|klima|luft|wasser|abfall|entsorg/],
    ['TRAN', /verkehr|mobil|fahrgast|fahrplan|parken|straße|strasse|öpnv|oepnv|bus|bahn/],
    ['ECON', /haushalt|finanz|wirtschaft|steuer|vergabe|kämmer|kaemmer|beschaffung/],
    ['SOCO', /sozial|kita|betreuung|senior|jugend|familie|bevölker|bevoelker|einwohner|melde/],
    ['EDUC', /bildung|schule|biblio|kultur|sport|museum|ausleih|volkshochschule/],
    ['HEAL', /gesundheit|medizin|pflege|impf|klinik/],
    ['ENER', /energie|strom|gas|solar|photovoltaik|wärme|waerme/],
    ['JUST', /polizei|ordnung|sicherheit|justiz|gericht|bußgeld|bussgeld/],
    ['GOVE', /rat|gremium|beschluss|verwaltung|personal|organigramm|wahl|sitzung/],
    ['REGI', /stadtplan|flächennutzung|flaechennutzung|quartier|bezirk|bebauungsplan/],
  ];
  for (const [code, re] of rules) if (re.test(t)) return code;
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

/* ── Verteilungen (dcat:Distribution) ─────────────────────────────
   Ein Datensatz hat mindestens eine Verteilung. Format, Zugriffs-URL und
   Lizenz hängen an ihr – das ist die DCAT-AP.de-Modellierung und der
   Normalfall in der Praxis (derselbe Datensatz als CSV und als JSON).

   `ensureDistributions()` ist zugleich die Migration: ältere Stände tragen
   `format`/`license` noch am Datensatz. Sie werden in eine erste Verteilung
   überführt, damit gespeicherte Projekte und LocalStorage-Stände weiter
   funktionieren.
   ────────────────────────────────────────────────────────────── */
const DIST_FIELDS = ['title', 'format', 'accessURL', 'license'];

function newDistribution(init) {
  return Object.assign({ title: '', format: '', accessURL: '', license: '' }, init || {});
}

function ensureDistributions(d) {
  if (!Array.isArray(d.distributions) || !d.distributions.length) {
    d.distributions = [newDistribution({
      format: d.format || '',
      accessURL: d.landingPage || '',
      license: d.license || '',
    })];
  }
  d.distributions = d.distributions.map(x => newDistribution(x));
  // Legacy-Felder entfernen, damit es keine zweite Wahrheit gibt
  delete d.format; delete d.license;
  return d.distributions;
}
function migrateInventory() { inventory.forEach(ensureDistributions); }

/* Lizenz gilt als erfüllt, wenn JEDE Verteilung eine hat – nach DCAT-AP.de
   ist `dct:license` je Verteilung Pflicht, nicht einmal je Datensatz. */
function hasLicense(d) {
  const ds = d.distributions || [];
  return ds.length > 0 && ds.every(x => x.license && x.license !== '');
}
function hasFormat(d) {
  return (d.distributions || []).some(x => x.format && x.format !== '');
}
function distLicenses(d) {
  return [...new Set((d.distributions || []).map(x => x.license).filter(Boolean))];
}
function distLicenseLabels(d) {
  const ids = distLicenses(d);
  if (!ids.length) return '—';
  return ids.map(id => (LICENSE_META[id] && LICENSE_META[id].label) || id).join(', ');
}
function distFormats(d) {
  return [...new Set((d.distributions || []).map(x => x.format).filter(Boolean))];
}

/* ── DCAT-AP.de Vollständigkeit je Dataset ────────────────────── */
/* Einzige Quelle der Wahrheit für „Pflicht“ vs. „Empfehlung“ nach DCAT-AP.de.
   Vollständigkeits-% (completeness) und Qualitätsprüfung (validateDataset)
   leiten beide hieraus ab – vorher wichen sie voneinander ab
   (accrualPeriodicity zählte als Pflicht, description nicht). */
const DCAT_REQUIRED = [
  ['title',        'Titel (dct:title)'],
  ['description',  'Beschreibung (dct:description)'],
  ['publisher',    'Publisher (dct:publisher)'],
  ['contactPoint', 'Ansprechpartner (dcat:contactPoint)'],
  ['accessRights', 'Zugriffsrechte (dct:accessRights)'],
  ['license',      'Lizenz (dct:license)', 'dist'],
];
const DCAT_RECOMMENDED = [
  ['theme',              'Kategorie (dcat:theme)'],
  ['keywords',           'Schlagwörter (dcat:keyword)'],
  ['accrualPeriodicity', 'Aktualisierungszyklus (dct:accrualPeriodicity)'],
  ['format',             'Format (dct:format)', 'dist'],
  ['landingPage',        'Info-/Zugriffs-URL (dcat:landingPage)'],
  ['contributorID',      'Kontributor-Kennung (dcatde:contributorID)'],
];
const REQUIRED_FIELDS = DCAT_REQUIRED.map(([k]) => k);

/* Ein Feld kann am Datensatz ODER an den Verteilungen hängen ('dist').
   Die Listen oben bleiben damit die einzige Quelle für „Pflicht vs.
   Empfehlung"; nur die Auswertung weiß, wo der Wert steht. */
function fieldFilled(d, key, scope) {
  if (scope === 'dist') return key === 'license' ? hasLicense(d) : hasFormat(d);
  return !!(d[key] && String(d[key]).trim() !== '');
}
function completeness(d) {
  const filled = DCAT_REQUIRED.filter(([k, , scope]) => fieldFilled(d, k, scope)).length;
  return Math.round((filled / DCAT_REQUIRED.length) * 100);
}

/* ── Onboarding-Rundgang ──────────────────────────────────────────
   Geführter Durchlauf durch die Bausteine. Bewusst KEIN Auto-Start als
   Modal beim ersten Laden – das nimmt Erstnutzern die Kontrolle. Stattdessen
   ein wegklickbarer Hinweis auf der Startseite plus ein Einstieg in der
   Seitenleiste; der Rundgang lässt sich jederzeit wiederholen.

   Schritte mit `needsData` brauchen ein Inventar. Statt still Beispieldaten
   zu laden (Nebenwirkung, die niemand bestellt hat), bietet der Schritt den
   Import an und lässt die Entscheidung beim Menschen.
   ────────────────────────────────────────────────────────────── */
const LS_TOUR = 'datenlotse_tour';
const TOUR_STEPS = [
  { view: 'home', title: 'Willkommen beim DatenLotsen',
    text: 'Dieser Rundgang zeigt in wenigen Schritten, wofür die Bausteine da sind und in welcher Reihenfolge sie sinnvoll sind. Alles läuft lokal in deinem Browser – es gibt keinen Server, keinen Account und keine Übertragung.' },
  { view: 'kompass', target: '#kompass-score', title: 'Überblick: Daten-Kompass',
    text: 'Der Einstieg. Eine Reifegrad-Checkliste nach anerkannten Modellen (ODRA, EU Open Data Maturity, 5-Sterne, DCAT-AP.de, DSGVO/FAIR) sagt dir, wo ihr steht – und empfiehlt den nächsten sinnvollen Schritt.' },
  { view: 'governance', target: '#gov-questions', title: 'Phase 1: Governance & Rollen',
    text: 'Acht gewichtete Fragen ergeben einen Reifegrad. Die RACI-Matrix leitet sich später aus dem Inventar ab und markiert Rollen, die noch nicht besetzt sind. Der Fragebogen funktioniert auch ohne importierte Daten.' },
  { view: 'inventory', target: '.inv-card', needsData: true, title: 'Phase 2: Dateninventar',
    text: 'Aus jedem kartierten Datenfluss wird ein DCAT-AP.de-Datensatz. Die Felder ergänzt ihr direkt in der Karte; die Prozentzahl zeigt live, wie vollständig der Datensatz für eine Veröffentlichung ist.' },
  { view: 'inventory', target: '#tab-quality', needsData: true, title: 'Publikationsreife prüfen',
    text: 'Die Qualitätsprüfung trennt echte Fehler (fehlende Pflichtfelder, ungültige Werte) von Warnungen – damit ihr vor dem Harvesting wisst, was ein Portal ablehnen würde.' },
  { view: 'inventory', target: '#tab-clearing', needsData: true, title: 'Phase 3: Risiko-Clearing',
    text: 'Ein transparenter Entscheidungsbaum je Datensatz: Grün ist unstrittig, Rot gesperrt, und eure Prüfkapazität konzentriert sich auf das Gelb. Kein maschinelles Lernen – jedes Ergebnis ist begründet und nachvollziehbar.' },
  { view: 'pseudo', target: '.pseudo-tabs', title: 'Phase 3: Textbereinigung',
    text: 'Freitexte und CSV-Spalten von personenbezogenen Angaben befreien – strukturerhaltend, mit konsistenten Platzhaltern und einer Zuordnungstabelle für die Dokumentation. Die manuelle Nachkontrolle bleibt Pflicht.' },
  { view: 'wissen', target: '#wissen-search', title: 'Nachschlagen statt raten',
    text: 'Glossar, Rechtsgrundlagen des Bundes und aller 16 Länder sowie die Modelle hinter dem Kompass – durchsuchbar an der Stelle, an der ihr arbeitet. Ausdrücklich keine Rechtsberatung.' },
  { view: 'vorlagen', target: '.vorlage-card', title: 'Fertige Dokumente',
    text: 'Richtlinie, DSFA-Checkliste, Freigabeformulare und VVT-Auszug entstehen aus dem Stand, den ihr ohnehin erfasst habt – als PDF, Markdown oder CSV.' },
  { view: 'home', target: '#project-save-btn', openSidebar: true, title: 'Arbeitsstand sichern',
    text: 'Alles bleibt im Browser. Damit nichts verloren geht, sichert „Projekt speichern" den kompletten Stand als eine Datei – für Backup, Gerätewechsel oder zum Teilen im Team.' },
  { view: 'home', title: 'Los geht es',
    text: 'Am besten startet ihr mit dem Daten-Kompass: Er sagt euch in zehn Minuten, wo ihr steht und was als Nächstes dran ist. Diesen Rundgang findet ihr jederzeit in der Seitenleiste.' },
];
const tour = { i: 0, active: false };

function tourSeen() {
  try { return localStorage.getItem(LS_TOUR) === 'done'; } catch (e) { return false; }
}
function markTourSeen() {
  try { localStorage.setItem(LS_TOUR, 'done'); } catch (e) { /* ignorieren */ }
  document.getElementById('tour-hint')?.classList.add('hidden');
}

function startTour() {
  tour.i = 0;
  tour.active = true;
  document.getElementById('tour-layer')?.classList.remove('hidden');
  renderTour();
}
function endTour() {
  tour.active = false;
  document.getElementById('tour-layer')?.classList.add('hidden');
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  closeSidebar();
  markTourSeen();
}
function tourGo(delta) {
  const next = tour.i + delta;
  if (next < 0) return;
  if (next >= TOUR_STEPS.length) { endTour(); return; }
  tour.i = next;
  renderTour();
}

function renderTour() {
  const layer = document.getElementById('tour-layer');
  const card = document.getElementById('tour-card');
  if (!layer || !card || !tour.active) return;
  const step = TOUR_STEPS[tour.i];

  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  if (step.view) navTo(step.view);
  if (step.openSidebar) openSidebar(); else closeSidebar();

  const fehlt = step.needsData && !inventory.length;
  const ziel = fehlt || !step.target ? null : document.querySelector(step.target);
  if (ziel) {
    ziel.classList.add('tour-highlight');
    ziel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  card.innerHTML =
    `<div class="tour-head">
       <span class="tour-count">Schritt ${tour.i + 1} von ${TOUR_STEPS.length}</span>
       <button class="icon-close" id="tour-close" aria-label="Rundgang beenden"><i class="fas fa-xmark"></i></button>
     </div>
     <h2 class="tour-title" id="tour-title">${esc(step.title)}</h2>
     <p class="tour-text">${esc(step.text)}</p>
     ${fehlt ? `<p class="tour-note"><i class="fas fa-circle-info"></i> Dieser Baustein braucht Daten. Lade den Beispieldatensatz, um ihn im Einsatz zu sehen.</p>
       <button class="btn btn-secondary tour-sample" id="tour-sample"><i class="fas fa-flask"></i> Beispiel laden</button>` : ''}
     <div class="tour-actions">
       <button class="btn btn-secondary" id="tour-prev"${tour.i === 0 ? ' disabled' : ''}><i class="fas fa-arrow-left"></i> Zurück</button>
       <button class="btn btn-secondary" id="tour-skip">Überspringen</button>
       <button class="btn btn-primary" id="tour-next">${tour.i === TOUR_STEPS.length - 1 ? 'Fertig' : 'Weiter'} <i class="fas fa-arrow-right"></i></button>
     </div>`;

  document.getElementById('tour-close')?.addEventListener('click', endTour);
  document.getElementById('tour-skip')?.addEventListener('click', endTour);
  document.getElementById('tour-prev')?.addEventListener('click', () => tourGo(-1));
  document.getElementById('tour-next')?.addEventListener('click', () => tourGo(1));
  document.getElementById('tour-sample')?.addEventListener('click', () => {
    loadSampleData();
    // renderInventory() wechselt die Ansicht – den Schritt danach neu aufbauen
    setTimeout(() => { if (tour.active) renderTour(); }, 150);
  });
  card.focus();
}

function refreshTourHint() {
  const hint = document.getElementById('tour-hint');
  if (!hint) return;
  // Nur für Erstnutzer und nur auf der Startseite – und nie während des Rundgangs
  hint.classList.toggle('hidden', tourSeen() || tour.active);
}

document.getElementById('sidebar-tour')?.addEventListener('click', e => {
  e.preventDefault();
  closeSidebar();
  startTour();
});
document.getElementById('tour-hint-start')?.addEventListener('click', startTour);
document.getElementById('tour-hint-close')?.addEventListener('click', markTourSeen);

document.addEventListener('keydown', e => {
  if (!tour.active) return;
  if (e.key === 'Escape') { e.preventDefault(); endTour(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); tourGo(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); tourGo(-1); }
});

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
  const kat = schutzKategorie(d._grafSchutzbedarf);
  // „nicht-oeffentlich“/„intern“ bleiben bewusst auf „unklar“ → Gelb statt Grün.
  let pb = 'unklar';
  if (kat === 'dsgvo') pb = 'ja';
  else if (kat === 'oeffentlich') pb = 'nein';
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

// Filter-/Sortier-/Suchzustand der Inventar-Liste
const invFilter = { q: '', schutz: '', ampel: '', sort: '' };

function filteredInventory() {
  if (invFilter.ampel) ensureAllClearing();   // Ampel-Filter braucht das Clearing-Ergebnis
  let list = inventory.map((d, idx) => ({ d, idx }));
  const q = invFilter.q.toLowerCase().trim();
  if (q) list = list.filter(({ d }) =>
    [d.title, d.publisher, d.sourceSystem, d.description].some(v => (v || '').toLowerCase().includes(q)));
  if (invFilter.schutz) {
    // über schutzKategorie(), damit „Nicht öffentlich“ nicht unter „Öffentlich“ fällt
    list = list.filter(({ d }) => schutzKategorie(d._grafSchutzbedarf) === invFilter.schutz);
  }
  if (invFilter.ampel) list = list.filter(({ d }) => d.clearing?.ampel === invFilter.ampel);
  if (invFilter.sort === 'title') list.sort((a, b) => a.d.title.localeCompare(b.d.title, 'de'));
  else if (invFilter.sort === 'complete-desc') list.sort((a, b) => completeness(b.d) - completeness(a.d));
  else if (invFilter.sort === 'complete-asc') list.sort((a, b) => completeness(a.d) - completeness(b.d));
  return list;
}

function invMetaText() {
  const total = inventory.length;
  const avg = total ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / total) : 0;
  const shown = filteredInventory().length;
  const head = shown === total ? `${total} Datensätze` : `${shown} von ${total} Datensätzen`;
  return `${head} · Ø ${avg} % DCAT-AP.de-vollständig`;
}

function renderInventory() {
  showView('inventory');
  showInventoryTab('inventar');   // bei (Neu-)Import immer mit dem Inventar starten
  renderInventoryBody();
}

/* ── Massenbearbeitung ────────────────────────────────────────────
   Bei 50+ Datensätzen ist Karte-für-Karte mühsam, und Felder wie Publisher
   oder Lizenz sind oft für viele Einträge identisch.

   Die Auswahl merkt sich den ECHTEN Index in `inventory` (nicht die Position
   in der gefilterten Liste) – sonst würde ein Filterwechsel plötzlich andere
   Datensätze meinen. Entsprechend wird die Auswahl nach dem Entfernen von
   Einträgen geleert, weil sich dabei alle nachfolgenden Indizes verschieben.
   ────────────────────────────────────────────────────────────── */
const invSelection = new Set();
const BULK_FIELDS = [
  ['', '— Feld wählen —'],
  ['publisher', 'Publisher'],
  ['contactPoint', 'Ansprechpartner'],
  ['license', 'Lizenz'],
  ['format', 'Format (erste Verteilung)'],
  ['theme', 'Kategorie (dcat:theme)'],
  ['accessRights', 'Zugriffsrechte'],
  ['accrualPeriodicity', 'Aktualisierungszyklus'],
  ['keywords', 'Schlagwörter'],
];
let bulkField = '';

function bulkValueControl() {
  if (bulkField === 'license') return `<select id="bulk-value">${licenseSelectHTML('')}</select>`;
  if (bulkField === 'theme') return `<select id="bulk-value">${optionsHTML(DCAT_THEMES, '')}</select>`;
  if (bulkField === 'accessRights') return `<select id="bulk-value">${optionsHTML(ACCESS_OPTIONS, '')}</select>`;
  if (bulkField === 'accrualPeriodicity') return `<select id="bulk-value">${optionsHTML(FREQ_OPTIONS, '')}</select>`;
  return `<input id="bulk-value" placeholder="Wert für alle ausgewählten" aria-label="Wert für alle ausgewählten Datensätze">`;
}

function renderBulkBar() {
  const bar = document.getElementById('inv-bulk');
  if (!bar) return;
  const n = invSelection.size;
  bar.classList.toggle('hidden', n === 0);
  // Screenreader sollen die Zahl mitbekommen, ohne dass der Fokus springt
  bar.setAttribute('aria-label', n ? `Massenbearbeitung, ${n} Datensätze ausgewählt` : 'Massenbearbeitung');
  if (!n) { bar.innerHTML = ''; return; }

  bar.innerHTML =
    `<span class="bulk-count"><i class="fas fa-check-double"></i> ${n} ausgewählt</span>
     <label class="bulk-field">Feld
       <select id="bulk-field" aria-label="Feld für die Massenbearbeitung">${optionsHTML(BULK_FIELDS, bulkField)}</select>
     </label>
     <label class="bulk-field bulk-field--value${bulkField ? '' : ' bulk-field--off'}">Wert
       ${bulkValueControl()}
     </label>
     <button class="btn btn-primary btn-sm" id="bulk-apply"${bulkField ? '' : ' disabled'}><i class="fas fa-wand-magic-sparkles"></i> Übernehmen</button>
     <button class="btn btn-secondary btn-sm" id="bulk-clear">Auswahl aufheben</button>
     <button class="btn btn-secondary btn-sm bulk-danger" id="bulk-remove"><i class="fas fa-trash-can"></i> Entfernen</button>`;

  const wert = document.getElementById('bulk-value');
  if (!bulkField && wert) wert.disabled = true;

  document.getElementById('bulk-field')?.addEventListener('change', e => {
    bulkField = e.target.value;
    renderBulkBar();
    document.getElementById('bulk-value')?.focus();
  });
  document.getElementById('bulk-apply')?.addEventListener('click', () => {
    const val = document.getElementById('bulk-value')?.value ?? '';
    applyBulk(bulkField, val);
  });
  document.getElementById('bulk-clear')?.addEventListener('click', () => {
    invSelection.clear();
    renderInventoryBody();
  });
  document.getElementById('bulk-remove')?.addEventListener('click', removeSelected);
}

function applyBulk(field, value) {
  if (!field || !invSelection.size) return;
  let n = 0;
  invSelection.forEach(idx => {
    const d = inventory[idx];
    if (!d) return;
    // Lizenz hängt an den Verteilungen, nicht am Datensatz
    if (field === 'license') ensureDistributions(d).forEach(x => { x.license = value; });
    // Format kann je Verteilung abweichen – die Massenaktion meint die erste
    else if (field === 'format') ensureDistributions(d)[0].format = value;
    else d[field] = value;
    n++;
  });
  saveState();
  renderInventoryBody();
  const label = (BULK_FIELDS.find(f => f[0] === field) || [, field])[1];
  alert(`„${label}" für ${n} Datensätze gesetzt.`);
}

function removeSelected() {
  const n = invSelection.size;
  if (!n) return;
  if (!confirm(`${n} Datensätze aus dem Inventar entfernen? Die importierten Rohdaten bleiben erhalten – ein erneuter Import stellt sie wieder her.`)) return;
  inventory = inventory.filter((d, i) => !invSelection.has(i));
  // Indizes haben sich verschoben – eine mitgeführte Auswahl wäre jetzt falsch
  invSelection.clear();
  saveState();
  renderInventoryBody();
}

function renderInventoryBody() {
  const body = document.getElementById('inventory-body');
  const meta = document.getElementById('inventory-meta');
  if (!body) return;
  meta.textContent = invMetaText();

  const list = filteredInventory();
  if (!list.length) {
    body.innerHTML = '<p class="inv-empty">Keine Datensätze passen zur Suche bzw. den Filtern.</p>';
    renderBulkBar();
    updateSelectAllLabel();
    return;
  }
  body.innerHTML = list.map(({ d, idx }) => {
    const pct = completeness(d);
    const pctColor = pct >= 80 ? 'var(--ampel-gruen)' : pct >= 50 ? 'var(--ampel-gelb)' : 'var(--ampel-rot)';
    return `
    <div class="inv-card" data-idx="${idx}">
      <div class="inv-card-head">
        <input type="checkbox" class="inv-select" data-sel="${idx}"${invSelection.has(idx) ? ' checked' : ''} aria-label="Datensatz „${esc(d.title)}" auswählen">
        <input class="inv-title" data-field="title" aria-label="Titel des Datensatzes" value="${esc(d.title)}" placeholder="Titel des Datensatzes">
        <span class="inv-complete" style="color:${pctColor}">${pct}%</span>
      </div>
      <div class="inv-meta-row">
        <span class="inv-src"><i class="fas fa-database"></i> ${esc(d.sourceSystem || '—')}</span>
        ${distFormats(d).map(f => `<span class="inv-fmt">${esc(f)}</span>`).join('')}
      </div>
      <label class="inv-desc-label">Beschreibung
        <textarea data-field="description" rows="2" placeholder="Kurze Beschreibung des Datensatzes (Pflichtfeld)">${esc(d.description)}</textarea>
      </label>
      <div class="inv-fields">
        <label>Publisher
          <input data-field="publisher" value="${esc(d.publisher)}" placeholder="Organisation">
        </label>
        <label>Ansprechpartner
          <input data-field="contactPoint" value="${esc(d.contactPoint)}" placeholder="Name / E-Mail">
        </label>
        <label>Kategorie (dcat:theme)
          <select data-field="theme">${optionsHTML(DCAT_THEMES, d.theme)}</select>
        </label>
        <label>Schlagwörter
          <input data-field="keywords" value="${esc(d.keywords || '')}" placeholder="komma, getrennt">
        </label>
        <label>Aktualisierungszyklus
          <select data-field="accrualPeriodicity">${optionsHTML(FREQ_OPTIONS, d.accrualPeriodicity)}</select>
        </label>
        <label>Zugriffsrechte
          <select data-field="accessRights">${optionsHTML(ACCESS_OPTIONS, d.accessRights)}</select>
        </label>
        <label class="inv-field-wide">Info-/Zugriffs-URL
          <input data-field="landingPage" value="${esc(d.landingPage || '')}" placeholder="https://…">
        </label>
      </div>
      <div class="inv-dists">
        <div class="inv-dists-head">
          <span class="inv-dists-title"><i class="fas fa-file-export"></i> Verteilungen (dcat:Distribution)</span>
          <button class="pseudo-mini-btn" data-dist-add="${idx}"><i class="fas fa-plus"></i> Verteilung hinzufügen</button>
        </div>
        <p class="inv-dists-hint">Format und Lizenz gehören je Verteilung – derselbe Datensatz kann als CSV und als JSON vorliegen. Ohne eigene Zugriffs-URL wird die Info-URL des Datensatzes verwendet.</p>
        ${(d.distributions || []).map((x, di) => `
          <div class="inv-dist" data-dist="${di}">
            <div class="inv-fields">
              <label>Format
                <input data-dist-field="format" value="${esc(x.format)}" placeholder="CSV, JSON, GeoJSON …" aria-label="Format der Verteilung ${di + 1}">
              </label>
              <label>Bezeichnung (optional)
                <input data-dist-field="title" value="${esc(x.title)}" placeholder="z. B. Jahresdatei" aria-label="Bezeichnung der Verteilung ${di + 1}">
              </label>
              <label class="inv-field-wide">Zugriffs-URL
                <input data-dist-field="accessURL" value="${esc(x.accessURL)}" placeholder="https://… (leer = Info-URL des Datensatzes)" aria-label="Zugriffs-URL der Verteilung ${di + 1}">
              </label>
              <label class="inv-field-wide">Lizenz
                <select data-dist-field="license" aria-label="Lizenz der Verteilung ${di + 1}">${licenseSelectHTML(x.license)}</select>
              </label>
            </div>
            ${(d.distributions || []).length > 1
              ? `<button class="inv-dist-del" data-dist-del="${di}" aria-label="Verteilung ${di + 1} entfernen"><i class="fas fa-trash-can"></i> Entfernen</button>`
              : ''}
          </div>`).join('')}
      </div>
      <details class="inv-more">
        <summary>Erweiterte DCAT-AP.de-Felder</summary>
        <p class="inv-more-hint">Optional, aber für das Harvesting durch GovData hilfreich. Die Kontributor-Kennung vergibt GovData bei der Anbindung.</p>
        <div class="inv-fields">
          <label>Veröffentlicht am <span class="inv-prop">dct:issued</span>
            <input type="date" data-field="issued" value="${esc(d.issued || '')}">
          </label>
          <label>Zuletzt geändert <span class="inv-prop">dct:modified</span>
            <input type="date" data-field="modified" value="${esc(d.modified || '')}">
          </label>
          <label>Zeitraum von <span class="inv-prop">dct:temporal</span>
            <input type="date" data-field="temporalStart" value="${esc(d.temporalStart || '')}">
          </label>
          <label>Zeitraum bis <span class="inv-prop">dct:temporal</span>
            <input type="date" data-field="temporalEnd" value="${esc(d.temporalEnd || '')}">
          </label>
          <label>Räumliche Abdeckung <span class="inv-prop">dct:spatial</span>
            <input data-field="spatial" value="${esc(d.spatial || '')}" placeholder="z. B. Stadt Musterstadt">
          </label>
          <label>Regionalschlüssel <span class="inv-prop">dcatde:politicalGeocodingURI</span>
            <input data-field="geocodingKey" value="${esc(d.geocodingKey || '')}" placeholder="z. B. 05315000">
          </label>
          <label>Gebietsebene <span class="inv-prop">dcatde:politicalGeocodingLevelURI</span>
            <select data-field="geocodingLevel">${optionsHTML(GEO_LEVELS, d.geocodingLevel)}</select>
          </label>
          <label>Kontributor-Kennung <span class="inv-prop">dcatde:contributorID</span>
            <input data-field="contributorID" value="${esc(d.contributorID || '')}" placeholder="GovData-Kennung oder volle URI">
          </label>
        </div>
      </details>
      <details class="inv-preview">
        <summary>DCAT-AP.de-Vorschau (JSON-LD)</summary>
        <pre class="inv-preview-json" data-preview="${idx}">${esc(JSON.stringify(dcatDataset(d), null, 2))}</pre>
      </details>
    </div>`;
  }).join('');

  body.querySelectorAll('.inv-card').forEach(card => {
    const idx = +card.dataset.idx;
    card.querySelectorAll('.inv-dist').forEach(row => {
      const di = +row.dataset.dist;
      row.querySelectorAll('[data-dist-field]').forEach(el => el.addEventListener('input', () => {
        inventory[idx].distributions[di][el.dataset.distField] = el.value;
        const pct = completeness(inventory[idx]);
        const badge = card.querySelector('.inv-complete');
        badge.textContent = pct + '%';
        badge.style.color = pct >= 80 ? 'var(--ampel-gruen)' : pct >= 50 ? 'var(--ampel-gelb)' : 'var(--ampel-rot)';
        document.getElementById('inventory-meta').textContent = invMetaText();
        const pre = card.querySelector('.inv-preview-json');
        if (pre) pre.textContent = JSON.stringify(dcatDataset(inventory[idx]), null, 2);
        saveState();
      }));
    });
  });
  body.querySelectorAll('[data-dist-add]').forEach(btn => btn.addEventListener('click', () => {
    inventory[+btn.dataset.distAdd].distributions.push(newDistribution());
    saveState();
    renderInventoryBody();
  }));
  body.querySelectorAll('[data-dist-del]').forEach(btn => btn.addEventListener('click', () => {
    const idx = +btn.closest('.inv-card').dataset.idx;
    inventory[idx].distributions.splice(+btn.dataset.distDel, 1);
    if (!inventory[idx].distributions.length) inventory[idx].distributions = [newDistribution()];
    saveState();
    renderInventoryBody();
  }));

  body.querySelectorAll('.inv-select').forEach(box => box.addEventListener('change', () => {
    const idx = +box.dataset.sel;
    if (box.checked) invSelection.add(idx); else invSelection.delete(idx);
    // Nur die Leiste neu zeichnen – ein voller Re-Render würde den Fokus nehmen
    renderBulkBar();
    updateSelectAllLabel();
  }));
  renderBulkBar();
  updateSelectAllLabel();

  // Feld-Änderungen zurück in den State schreiben (idx = echter Index in inventory)
  body.querySelectorAll('.inv-card').forEach(card => {
    const idx = +card.dataset.idx;
    card.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        inventory[idx][el.dataset.field] = el.value;
        const pct = completeness(inventory[idx]);
        const badge = card.querySelector('.inv-complete');
        badge.textContent = pct + '%';
        badge.style.color = pct >= 80 ? 'var(--ampel-gruen)' : pct >= 50 ? 'var(--ampel-gelb)' : 'var(--ampel-rot)';
        document.getElementById('inventory-meta').textContent = invMetaText();
        // Vorschau ist die Zusage „so wird exportiert“ – muss also live mitlaufen
        const pre = card.querySelector('.inv-preview-json');
        if (pre) pre.textContent = JSON.stringify(dcatDataset(inventory[idx]), null, 2);
        saveState();
      });
    });
  });
}

// Controls (Suche/Filter/Sortierung) – einmal binden, nur den Body neu rendern
/* „Alle auswählen" meint die aktuell SICHTBARE Teilmenge – alles andere wäre
   überraschend, wenn gerade ein Filter aktiv ist. */
function updateSelectAllLabel() {
  const btn = document.getElementById('inv-select-all');
  if (!btn) return;
  const sichtbar = filteredInventory().map(({ idx }) => idx);
  const alle = sichtbar.length > 0 && sichtbar.every(i => invSelection.has(i));
  btn.innerHTML = alle
    ? '<i class="fas fa-square-check"></i> Auswahl aufheben'
    : '<i class="far fa-square"></i> Alle auswählen';
  btn.setAttribute('aria-pressed', String(alle));
  btn.disabled = sichtbar.length === 0;
}
document.getElementById('inv-select-all')?.addEventListener('click', () => {
  const sichtbar = filteredInventory().map(({ idx }) => idx);
  const alle = sichtbar.length > 0 && sichtbar.every(i => invSelection.has(i));
  sichtbar.forEach(i => { if (alle) invSelection.delete(i); else invSelection.add(i); });
  renderInventoryBody();
});

document.getElementById('inv-search')?.addEventListener('input', e => { invFilter.q = e.target.value; renderInventoryBody(); });
document.getElementById('inv-filter-schutz')?.addEventListener('change', e => { invFilter.schutz = e.target.value; renderInventoryBody(); });
document.getElementById('inv-filter-ampel')?.addEventListener('change', e => { invFilter.ampel = e.target.value; renderInventoryBody(); });
document.getElementById('inv-sort')?.addEventListener('change', e => { invFilter.sort = e.target.value; renderInventoryBody(); });

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
  if (!inventory.length) {
    body.innerHTML = '<p class="inv-empty">Noch kein Inventar vorhanden – importiere zuerst eine DatenGraf-CSV oder lade den Beispieldatensatz.</p>';
    updateClearingSummary();
    return;
  }

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
  const tabs = ['inventar', 'clearing', 'quality'];
  const panel = { inventar: 'inventar-panel', clearing: 'clearing-panel', quality: 'quality-panel' };
  tabs.forEach(t => {
    document.getElementById(panel[t])?.classList.toggle('hidden', t !== name);
    const btn = document.getElementById('tab-' + t);
    btn?.classList.toggle('is-active', t === name);
    // Der aktive Zustand war bisher nur visuell – Screenreader konnten ihn nicht erkennen
    btn?.setAttribute('aria-selected', String(t === name));
  });
  if (name === 'clearing') renderClearing();
  if (name === 'quality') renderQuality();
}
document.getElementById('tab-inventar')?.addEventListener('click', () => showInventoryTab('inventar'));
document.getElementById('tab-clearing')?.addEventListener('click', () => showInventoryTab('clearing'));
document.getElementById('tab-quality')?.addEventListener('click', () => showInventoryTab('quality'));
// Pfeiltasten-Navigation, wie es die ARIA-Tablist-Semantik erwartet
document.querySelector('.inv-tabs')?.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const order = ['inventar', 'clearing', 'quality'];
  const cur = order.findIndex(t => document.getElementById('tab-' + t)?.classList.contains('is-active'));
  if (cur < 0) return;
  e.preventDefault();
  const next = order[(cur + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
  showInventoryTab(next);
  document.getElementById('tab-' + next)?.focus();
});

/* ── DCAT-AP.de-Qualitätsprüfung (Publish-Ready-Check) ─────────────
   Echte Validierung je Datensatz statt nur Vollständigkeits-%:
   Pflichtfelder (Fehler), Empfehlungsfelder (Warnung) sowie Werte-/
   Vokabular-/Formatprüfungen. Deterministisch, kein ML. */
const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
const URL_RE = /^https?:\/\/.+/i;

function validateDataset(d) {
  const issues = [];
  const empty = v => v == null || String(v).trim() === '';
  DCAT_REQUIRED.forEach(([k, label, scope]) => {
    if (!fieldFilled(d, k, scope)) issues.push({ sev: 'error', msg: `Pflichtfeld fehlt: ${label}` });
  });
  DCAT_RECOMMENDED.forEach(([k, label, scope]) => {
    if (!fieldFilled(d, k, scope)) issues.push({ sev: 'warn', msg: `Empfohlenes Feld fehlt: ${label}` });
  });

  // Verteilungen: je Verteilung eigene Lizenz und eigene Zugriffs-URL
  const dists = d.distributions || [];
  if (!dists.length) {
    issues.push({ sev: 'error', msg: 'Keine Verteilung angelegt – ein Datensatz braucht mindestens eine (dcat:Distribution).' });
  }
  dists.forEach((x, i) => {
    const wo = dists.length > 1 ? `Verteilung ${i + 1}: ` : '';
    if (!empty(x.license) && !LICENSE_META[x.license])
      issues.push({ sev: 'warn', msg: `${wo}Lizenz ist im DCAT-AP.de-Register unbekannt – bitte aus der Liste wählen.` });
    else if (!empty(x.license) && !licenseIsOpen(x.license))
      issues.push({ sev: 'warn', msg: `${wo}Lizenz ist nicht offen (NC/ND bzw. geschlossen) – für Open Data ungeeignet (siehe Lizenz-Wegweiser).` });
    if (!empty(x.accessURL) && !URL_RE.test(x.accessURL))
      issues.push({ sev: 'warn', msg: `${wo}Zugriffs-URL ist keine gültige http(s)-Adresse.` });
  });
  if (!empty(d.accessRights) && !['PUBLIC', 'RESTRICTED', 'NON_PUBLIC'].includes(d.accessRights))
    issues.push({ sev: 'error', msg: 'Zugriffsrechte nicht aus dem kontrollierten Vokabular (PUBLIC / RESTRICTED / NON_PUBLIC).' });
  if (!empty(d.theme) && !DCAT_THEMES.some(o => o[0] === d.theme))
    issues.push({ sev: 'warn', msg: 'Kategorie nicht aus dem EU-Datenthemen-Vokabular.' });
  if (!empty(d.accrualPeriodicity) && !FREQ_OPTIONS.some(o => o[0] === d.accrualPeriodicity))
    issues.push({ sev: 'warn', msg: 'Aktualisierungszyklus nicht aus dem kontrollierten Vokabular.' });
  if (!empty(d.contactPoint) && !EMAIL_RE.test(d.contactPoint))
    issues.push({ sev: 'warn', msg: 'Ansprechpartner enthält keine E-Mail-Adresse – für dcat:contactPoint empfohlen.' });
  if (!empty(d.landingPage) && !URL_RE.test(d.landingPage))
    issues.push({ sev: 'warn', msg: 'Info-/Zugriffs-URL ist keine gültige http(s)-Adresse.' });
  if (!empty(d.title) && d.title.trim().length < 3)
    issues.push({ sev: 'warn', msg: 'Titel ist sehr kurz – aussagekräftigen dct:title vergeben.' });
  if (!empty(d.description) && d.description.trim().length < 10)
    issues.push({ sev: 'warn', msg: 'Beschreibung ist sehr kurz.' });

  // Erweiterte DCAT-AP.de-Felder: nur prüfen, wenn gefüllt (alle optional)
  [['issued', 'Veröffentlichungsdatum'], ['modified', 'Änderungsdatum'],
   ['temporalStart', 'Zeitraum-Beginn'], ['temporalEnd', 'Zeitraum-Ende']]
    .forEach(([k, label]) => {
      if (!empty(d[k]) && !ISO_DATE_RE.test(String(d[k]).trim()))
        issues.push({ sev: 'warn', msg: `${label} ist kein Datum im Format JJJJ-MM-TT.` });
    });
  if (!empty(d.issued) && !empty(d.modified) && d.modified < d.issued)
    issues.push({ sev: 'warn', msg: 'Änderungsdatum liegt vor dem Veröffentlichungsdatum.' });
  if (!empty(d.temporalStart) && !empty(d.temporalEnd) && d.temporalEnd < d.temporalStart)
    issues.push({ sev: 'warn', msg: 'Zeitraum-Ende liegt vor dem Zeitraum-Beginn.' });
  if (!empty(d.geocodingKey) && !GEO_KEY_RE.test(String(d.geocodingKey).trim()))
    issues.push({ sev: 'warn', msg: 'Regionalschlüssel ist kein amtlicher Schlüssel (2, 5, 8 oder 12 Ziffern).' });
  if (!empty(d.geocodingLevel) && !GEO_LEVELS.some(o => o[0] === d.geocodingLevel))
    issues.push({ sev: 'warn', msg: 'Gebietsebene nicht aus dem DCAT-AP.de-Vokabular.' });
  // Regionalschlüssel und Gebietsebene gehören nach DCAT-AP.de zusammen
  if (!empty(d.geocodingKey) !== !empty(d.geocodingLevel))
    issues.push({ sev: 'warn', msg: 'Regionalschlüssel und Gebietsebene bitte gemeinsam angeben.' });
  return issues;
}

function qualityStatus(issues) {
  if (issues.some(i => i.sev === 'error')) return 'rot';
  if (issues.length) return 'gelb';
  return 'gruen';
}
const QUALITY_LABEL = { gruen: 'Publikationsbereit', gelb: 'Mit Warnungen', rot: 'Fehler beheben' };

/* ── Konsistenzprüfung über das gesamte Inventar ──────────────────
   `validateDataset()` schaut jeden Datensatz FÜR SICH an. Die teuren Fehler
   sind aber die übergreifenden: zweimal derselbe Titel, zweimal dieselbe
   Zugriffs-URL, „Stadt Musterstadt" neben „Stadt  Musterstadt" als
   Publisher. Kein DCAT-Validator fängt das ab – jeder Datensatz ist für
   sich korrekt –, und im Portal fällt es erst auf, wenn es unangenehm ist.

   Alle Prüfungen sind deterministisch und melden die betroffenen Einträge
   mit ihrem echten Index, damit man direkt hinspringen kann.
   ────────────────────────────────────────────────────────────── */
function normKey(v) {
  return String(v == null ? '' : v)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim();
}

/* Gruppiert Einträge nach einem Schlüssel und liefert nur die Gruppen mit
   mehr als einem Treffer. */
function gruppiere(auswahl, keyFn) {
  const map = new Map();
  auswahl.forEach(({ d, idx }) => {
    const k = keyFn(d);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push({ d, idx });
  });
  return [...map.entries()].filter(([, v]) => v.length > 1);
}

function inventoryIssues() {
  const issues = [];
  const alle = inventory.map((d, idx) => ({ d, idx }));

  // 1) Doppelte Identifier – beim Harvesting kollidieren sie
  gruppiere(alle, d => d.id).forEach(([id, treffer]) => {
    issues.push({ sev: 'error', msg: `Identifier „${id}" kommt ${treffer.length}× vor – beim Harvesting kollidieren die Datensätze.`, treffer });
  });

  // 2) Doppelte Titel – im Portal nicht unterscheidbar
  gruppiere(alle, d => normKey(d.title)).forEach(([, treffer]) => {
    issues.push({ sev: 'warn', msg: `Titel „${treffer[0].d.title}" wird ${treffer.length}× verwendet – im Portal sind die Einträge nicht unterscheidbar.`, treffer });
  });

  // 3) Dieselbe Zugriffs-URL an mehreren Datensätzen
  const mitUrl = [];
  alle.forEach(({ d, idx }) => {
    const urls = new Set();
    (d.distributions || []).forEach(x => { if (x.accessURL) urls.add(normKey(x.accessURL)); });
    if (!urls.size && d.landingPage) urls.add(normKey(d.landingPage));
    urls.forEach(u => mitUrl.push({ d: { _url: u, title: d.title }, idx }));
  });
  gruppiere(mitUrl, d => d._url).forEach(([url, treffer]) => {
    issues.push({ sev: 'warn', msg: `${treffer.length} Datensätze verweisen auf dieselbe Adresse (${url}) – Nachnutzende laden zweimal dasselbe.`, treffer });
  });

  /* 4) Schreibvarianten bei Publisher und Ansprechpartner.
        Gemeldet werden nur die ABWEICHLER von der häufigsten Schreibweise –
        die will man korrigieren. Alle Träger der Variante aufzulisten wäre
        bei elf gleich geschriebenen Einträgen nur Lärm. */
  [['publisher', 'Publisher'], ['contactPoint', 'Ansprechpartner']].forEach(([feld, label]) => {
    const map = new Map();
    alle.forEach(({ d, idx }) => {
      const k = normKey(d[feld]);
      if (!k) return;
      if (!map.has(k)) map.set(k, new Map());
      const varianten = map.get(k);
      const roh = String(d[feld]);
      if (!varianten.has(roh)) varianten.set(roh, []);
      varianten.get(roh).push({ d, idx });
    });
    map.forEach(varianten => {
      if (varianten.size < 2) return;
      const sortiert = [...varianten.entries()].sort((a, b) => b[1].length - a[1].length);
      const [haeufig] = sortiert[0];
      const abweichler = sortiert.slice(1);
      issues.push({
        sev: 'warn',
        msg: `${label}: ${abweichler.map(([roh]) => `„${roh}"`).join(', ')} weicht von der sonst verwendeten Schreibweise „${haeufig}" ab – Portale gruppieren danach.`,
        treffer: abweichler.flatMap(([, t]) => t),
      });
    });
  });

  return issues;
}

function renderInventoryIssues() {
  const box = document.getElementById('quality-inventory');
  if (!box) return;
  const issues = inventoryIssues();
  if (!inventory.length) { box.innerHTML = ''; return; }
  if (!issues.length) {
    box.innerHTML = `<div class="qual-cross qual-cross--ok"><i class="fas fa-circle-check"></i>
      Bestandsprüfung: keine Dubletten oder Schreibvarianten über die ${inventory.length} Datensätze hinweg.</div>`;
    return;
  }
  box.innerHTML =
    `<div class="qual-cross">
       <h3 class="qual-cross-title"><i class="fas fa-diagram-project"></i> Bestandsprüfung (${issues.length})</h3>
       <p class="qual-cross-lead">Diese Befunde betreffen das Zusammenspiel mehrerer Datensätze – einzeln geprüft ist jeder von ihnen in Ordnung.</p>
       <ul class="qual-issues">
         ${issues.map(i => `<li class="qual-issue qual-issue--${i.sev}">
            <i class="fas ${i.sev === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
            <span>${esc(i.msg)}
              <span class="qual-cross-jumps">${i.treffer.map(t =>
                `<button class="qual-cross-jump" data-fix="${t.idx}">${esc(t.d.title || '(ohne Titel)')}</button>`).join('')}</span>
            </span>
         </li>`).join('')}
       </ul>
     </div>`;
  box.querySelectorAll('.qual-cross-jump').forEach(btn =>
    btn.addEventListener('click', () => jumpToInventoryCard(+btn.dataset.fix)));
}

function renderQuality() {
  renderInventoryIssues();
  const body = document.getElementById('quality-body');
  const sum = document.getElementById('quality-summary');
  if (!body) return;

  if (!inventory.length) {
    body.innerHTML = '<p class="inv-empty">Noch kein Inventar vorhanden – die Publish-Ready-Prüfung braucht Datensätze.</p>';
    if (sum) sum.innerHTML = '';
    return;
  }
  const rows = inventory.map((d, idx) => {
    const issues = validateDataset(d);
    return { d, idx, issues, status: qualityStatus(issues) };
  });
  const c = { gruen: 0, gelb: 0, rot: 0 };
  rows.forEach(r => c[r.status]++);
  if (sum) sum.innerHTML =
    `<span class="clear-stat clear-stat--gruen"><span class="clear-dot"></span>${c.gruen} publikationsbereit</span>` +
    `<span class="clear-stat clear-stat--gelb"><span class="clear-dot"></span>${c.gelb} mit Warnungen</span>` +
    `<span class="clear-stat clear-stat--rot"><span class="clear-dot"></span>${c.rot} mit Fehlern</span>`;

  // schlechteste zuerst: Fehler → Warnungen → bereit
  const order = { rot: 0, gelb: 1, gruen: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status] || b.issues.length - a.issues.length);

  body.innerHTML = rows.map(({ d, idx, issues, status }) => {
    const list = issues.length
      ? `<ul class="qual-issues">${issues.map(i =>
          `<li class="qual-issue qual-issue--${i.sev}"><i class="fas ${i.sev === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i> ${esc(i.msg)}</li>`).join('')}</ul>`
      : `<p class="qual-ok"><i class="fas fa-circle-check"></i> Alle Pflicht- und Empfehlungsfelder erfüllt – bereit für die Veröffentlichung.</p>`;
    return `
    <div class="qual-card qual-card--${status}">
      <div class="qual-card-head">
        <div class="qual-head-text">
          <span class="qual-title">${esc(d.title || '(ohne Titel)')}</span>
          <span class="qual-src"><i class="fas fa-database"></i> ${esc(d.sourceSystem || '—')}</span>
        </div>
        <span class="qual-badge qual-badge--${status}"><span class="clear-dot"></span>${QUALITY_LABEL[status]}</span>
      </div>
      ${list}
      ${issues.length ? `<button class="qual-fix" data-fix="${idx}"><i class="fas fa-pen"></i> Im Inventar bearbeiten</button>` : ''}
    </div>`;
  }).join('');

  body.querySelectorAll('.qual-fix').forEach(btn =>
    btn.addEventListener('click', () => jumpToInventoryCard(+btn.dataset.fix)));
}

// In den Inventar-Tab wechseln und die Karte hervorheben (Filter zurücksetzen,
// damit die Zielkarte garantiert sichtbar ist)
function jumpToInventoryCard(idx) {
  invFilter.q = ''; invFilter.schutz = ''; invFilter.ampel = '';
  const search = document.getElementById('inv-search'); if (search) search.value = '';
  ['inv-filter-schutz', 'inv-filter-ampel'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  showInventoryTab('inventar');
  renderInventoryBody();
  const card = document.querySelector(`#inventory-body .inv-card[data-idx="${idx}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('inv-card--flash');
    setTimeout(() => card.classList.remove('inv-card--flash'), 1600);
  }
}

/* ── Export: DCAT-AP.de JSON ──────────────────────────────────── */
function keywordList(d) {
  return (d.keywords || '').split(',').map(s => s.trim()).filter(Boolean);
}
/* Ein einzelnes dcat:Dataset serialisieren. Bewusst als eigene Funktion:
   Katalog-Export und Live-Vorschau in der Karte müssen dieselbe Ausgabe
   erzeugen – sonst zeigt die Vorschau etwas anderes, als exportiert wird. */
function dcatDataset(d) {
  const ds = {
    '@type': 'dcat:Dataset',
    'dct:identifier': d.id,
    'dct:title': d.title,
    'dct:description': d.description || d.title,
    'dct:publisher': { '@type': 'foaf:Organization', 'foaf:name': d.publisher },
    'dcatde:sourceSystem': d.sourceSystem
  };
  if (d.contactPoint) ds['dcat:contactPoint'] = { '@type': 'vcard:Organization', 'vcard:fn': d.contactPoint };
  const kw = keywordList(d);
  if (kw.length) ds['dcat:keyword'] = kw;
  if (d.theme) ds['dcat:theme'] = [THEME_NAL + d.theme];
  if (d.accrualPeriodicity) ds['dct:accrualPeriodicity'] = FREQ_NAL + d.accrualPeriodicity;
  if (d.accessRights) ds['dct:accessRights'] = ACCESS_NAL + d.accessRights;
  if (d.landingPage) ds['dcat:landingPage'] = d.landingPage;

  // Erweiterte DCAT-AP.de-Felder – nur schreiben, wenn wirklich gefüllt
  if (d.issued) ds['dct:issued'] = d.issued;
  if (d.modified) ds['dct:modified'] = d.modified;
  if (d.temporalStart || d.temporalEnd) {
    const t = { '@type': 'dct:PeriodOfTime' };
    if (d.temporalStart) t['dcat:startDate'] = d.temporalStart;
    if (d.temporalEnd) t['dcat:endDate'] = d.temporalEnd;
    ds['dct:temporal'] = t;
  }
  if (d.spatial) ds['dct:spatial'] = { '@type': 'dct:Location', 'skos:prefLabel': d.spatial };
  if (d.geocodingKey) ds['dcatde:politicalGeocodingURI'] = GEO_REGIONAL_NAL + d.geocodingKey;
  if (d.geocodingLevel) ds['dcatde:politicalGeocodingLevelURI'] = GEO_LEVEL_NAL + d.geocodingLevel;
  // Bereits vollständige URI unverändert übernehmen, sonst als Register-URI bilden
  if (d.contributorID) ds['dcatde:contributorID'] =
    /^https?:\/\//i.test(d.contributorID) ? d.contributorID : CONTRIBUTOR_NAL + d.contributorID;

  ds['dcat:distribution'] = (d.distributions || []).map(x => {
    const dist = { '@type': 'dcat:Distribution' };
    if (x.title) dist['dct:title'] = x.title;
    // Ohne eigene Zugriffs-URL fällt die Verteilung auf die Info-URL zurück
    const url = x.accessURL || d.landingPage;
    if (url) dist['dcat:accessURL'] = url;
    if (x.format) dist['dct:format'] = x.format;
    if (x.license) dist['dct:license'] = (LICENSE_META[x.license] && LICENSE_META[x.license].uri) || x.license;
    return dist;
  });
  return ds;
}

function buildDcatJSON() {
  return {
    '@context': 'https://www.dcat-ap.de/def/dcatde/2.0/context.jsonld',
    '@type': 'dcat:Catalog',
    'dct:title': 'Dateninventar (DatenLotse-Export)',
    'dct:publisher': { '@type': 'foaf:Organization', 'foaf:name': orgName() },
    'dcat:dataset': inventory.map(dcatDataset)
  };
}

/* ── Export: RDF/Turtle (DCAT-AP.de) ──────────────────────────────
   Manche Portale harvesten Turtle direkt statt JSON-LD. Serialisiert wird
   derselbe Stand wie im JSON-Export – die Feldabdeckung ist bewusst
   identisch, ein Test hält beide gegeneinander.

   Datensatz-IRIs: DCAT-AP.de verlangt auflösbare URIs, und welche das sind,
   weiß nur die veröffentlichende Stelle. Deshalb werden RELATIVE IRIs gegen
   ein `@base` geschrieben – die Organisation ersetzt genau eine Zeile.
   Liegt eine landingPage vor, wird sie als absolute IRI bevorzugt.
   ────────────────────────────────────────────────────────────── */
const TTL_BASE_PLACEHOLDER = 'https://beispiel.de/';
const TTL_PREFIXES = [
  ['dcat',   'http://www.w3.org/ns/dcat#'],
  ['dct',    'http://purl.org/dc/terms/'],
  ['dcatde', 'http://dcat-ap.de/def/dcatde/'],
  ['foaf',   'http://xmlns.com/foaf/0.1/'],
  ['vcard',  'http://www.w3.org/2006/vcard/ns#'],
  ['skos',   'http://www.w3.org/2004/02/skos/core#'],
  ['xsd',    'http://www.w3.org/2001/XMLSchema#'],
];

/* Turtle-Literal. Zeilenumbrüche, Anführungszeichen und Backslashes MÜSSEN
   escaped werden – sonst bricht ein mehrzeiliger Beschreibungstext die Datei. */
function ttlStr(v) {
  return '"' + String(v == null ? '' : v)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t') + '"';
}
/* Turtle-IRI. Zeichen, die in <…> unzulässig sind (Leerraum, spitze Klammern,
   Anführungszeichen …), werden prozent-kodiert statt einfach entfernt. */
function ttlIri(v) {
  return '<' + String(v == null ? '' : v).trim()
    .replace(/[\u0000-\u0020<>"{}|^`\\]/g, c => encodeURIComponent(c)) + '>';
}
function ttlDate(v) { return `${ttlStr(v)}^^xsd:date`; }

function turtleDataset(d) {
  // Subjekt: absolute landingPage, sonst relative IRI gegen @base
  const subject = d.landingPage ? ttlIri(d.landingPage) : ttlIri(`dataset/${d.id}`);
  const p = [];
  p.push(['a', 'dcat:Dataset']);
  p.push(['dct:identifier', ttlStr(d.id)]);
  p.push(['dct:title', ttlStr(d.title)]);
  p.push(['dct:description', ttlStr(d.description || d.title)]);
  p.push(['dct:publisher', `[ a foaf:Organization ; foaf:name ${ttlStr(d.publisher)} ]`]);
  if (d.sourceSystem) p.push(['dcatde:sourceSystem', ttlStr(d.sourceSystem)]);
  if (d.contactPoint) p.push(['dcat:contactPoint', `[ a vcard:Organization ; vcard:fn ${ttlStr(d.contactPoint)} ]`]);
  const kw = keywordList(d);
  if (kw.length) p.push(['dcat:keyword', kw.map(ttlStr).join(', ')]);
  if (d.theme) p.push(['dcat:theme', ttlIri(THEME_NAL + d.theme)]);
  if (d.accrualPeriodicity) p.push(['dct:accrualPeriodicity', ttlIri(FREQ_NAL + d.accrualPeriodicity)]);
  if (d.accessRights) p.push(['dct:accessRights', ttlIri(ACCESS_NAL + d.accessRights)]);
  if (d.landingPage) p.push(['dcat:landingPage', ttlIri(d.landingPage)]);
  if (d.issued) p.push(['dct:issued', ttlDate(d.issued)]);
  if (d.modified) p.push(['dct:modified', ttlDate(d.modified)]);
  if (d.temporalStart || d.temporalEnd) {
    const t = ['a dct:PeriodOfTime'];
    if (d.temporalStart) t.push(`dcat:startDate ${ttlDate(d.temporalStart)}`);
    if (d.temporalEnd) t.push(`dcat:endDate ${ttlDate(d.temporalEnd)}`);
    p.push(['dct:temporal', `[ ${t.join(' ; ')} ]`]);
  }
  if (d.spatial) p.push(['dct:spatial', `[ a dct:Location ; skos:prefLabel ${ttlStr(d.spatial)} ]`]);
  if (d.geocodingKey) p.push(['dcatde:politicalGeocodingURI', ttlIri(GEO_REGIONAL_NAL + d.geocodingKey)]);
  if (d.geocodingLevel) p.push(['dcatde:politicalGeocodingLevelURI', ttlIri(GEO_LEVEL_NAL + d.geocodingLevel)]);
  if (d.contributorID) p.push(['dcatde:contributorID',
    ttlIri(/^https?:\/\//i.test(d.contributorID) ? d.contributorID : CONTRIBUTOR_NAL + d.contributorID)]);

  (d.distributions || []).forEach(x => {
    const dist = ['a dcat:Distribution'];
    if (x.title) dist.push(`dct:title ${ttlStr(x.title)}`);
    const url = x.accessURL || d.landingPage;
    if (url) dist.push(`dcat:accessURL ${ttlIri(url)}`);
    if (x.format) dist.push(`dct:format ${ttlStr(x.format)}`);
    if (x.license) dist.push(`dct:license ${ttlIri((LICENSE_META[x.license] && LICENSE_META[x.license].uri) || x.license)}`);
    p.push(['dcat:distribution', `[ ${dist.join(' ; ')} ]`]);
  });

  return `${subject}\n    ` + p.map(([k, v]) => `${k} ${v}`).join(' ;\n    ') + ' .';
}

function buildDcatTurtle() {
  const head = TTL_PREFIXES.map(([p, u]) => `@prefix ${p}: <${u}> .`).join('\n');
  const datasets = inventory.map(turtleDataset);
  const katalogRefs = inventory.map(d =>
    d.landingPage ? ttlIri(d.landingPage) : ttlIri(`dataset/${d.id}`));
  const katalogPreds = [
    'a dcat:Catalog',
    `dct:title ${ttlStr('Dateninventar (DatenLotse-Export)')}`,
    `dct:publisher [ a foaf:Organization ; foaf:name ${ttlStr(orgName())} ]`,
  ];
  if (katalogRefs.length) katalogPreds.push(`dcat:dataset ${katalogRefs.join(',\n        ')}`);
  const katalog = `${ttlIri('catalog/datenlotse')}\n    ` +
    katalogPreds.join(' ;\n    ') + ' .';

  return [
    '# DCAT-AP.de als RDF/Turtle – erzeugt mit DatenLotse, lokal im Browser.',
    '# Die Basis-URI unten durch die eigene, auflösbare Adresse ersetzen:',
    '# daraus werden die Datensatz-IRIs gebildet (Datensätze mit eigener',
    '# Info-/Zugriffs-URL nutzen stattdessen diese als IRI).',
    `@base <${TTL_BASE_PLACEHOLDER}> .`,
    head,
    '',
    katalog,
    '',
    datasets.join('\n\n'),
    '',
  ].join('\n');
}

/* ── Export: flaches CSV (Inventarliste) ──────────────────────── */
function buildInventoryCSV() {
  ensureAllClearing();   // Ampel auch ohne Besuch des Clearing-Tabs befüllen
  const cols = ['id', 'title', 'description', 'publisher', 'contactPoint',
                'sourceSystem', 'format', 'keywords', 'theme', 'accrualPeriodicity',
                'license', 'accessRights', 'landingPage',
                'issued', 'modified', 'temporalStart', 'temporalEnd',
                'spatial', 'geocodingKey', 'geocodingLevel', 'contributorID'];
  // Ohne den Schutzbedarf ginge beim Rückimport die Clearing-Vorbelegung verloren
  const extra = ['schutzbedarf', 'verteilungen'];
  const head = [...cols, ...extra, 'clearingAmpel', 'clearingEmpfehlung'].join(',');
  const rows = inventory.map(d => {
    const erste = (d.distributions || [])[0] || {};
    // Die flache CSV zeigt die ERSTE Verteilung; weitere stehen in JSON/Turtle
    // und der Projektdatei. Der Rückimport führt entsprechend nur die erste
    // zusammen und lässt zusätzliche unangetastet.
    const cells = cols.map(c =>
      c === 'format' ? csvCell(erste.format) :
      c === 'license' ? csvCell(erste.license) :
      csvCell(d[c]));
    cells.push(csvCell(d._grafSchutzbedarf));
    cells.push(csvCell((d.distributions || []).length));
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
      <td>${esc(distLicenseLabels(d))}</td>
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
    const semikolon = /^[^\n]*;[^\n]*Quelle|Quelle[^\n]*;/.test(text);
    alert('Diese Datei sieht nicht nach einem DatenGraf-Export aus.\n'
      + 'Erwartet werden Spalten wie „Quelle“, „Ziel“, „Datentyp“.'
      + (semikolon ? '\n\nHinweis: Die Datei scheint mit Semikolon getrennt zu sein (deutsches Excel).\n'
                   + 'Bitte als CSV mit Komma als Trennzeichen exportieren.' : ''));
    return;
  }
  grafRows = rows;
  inventory = deriveInventory(grafRows);
  migrateInventory();
  renderInventory();
  saveState();
}

/* Felder, die aus einer bearbeiteten Inventar-CSV zurückgelesen werden.
   `id` dient als Schlüssel, `clearingAmpel`/`clearingEmpfehlung` sind
   ABGELEITETE Spalten und werden bewusst NICHT zurückgeschrieben – sonst
   stünde ein Ergebnis im Eintrag, zu dem die Antworten fehlen. */
const INV_CSV_FIELDS = [
  'title', 'description', 'publisher', 'contactPoint', 'sourceSystem', 'format',
  'keywords', 'theme', 'accrualPeriodicity', 'license', 'accessRights', 'landingPage',
  'issued', 'modified', 'temporalStart', 'temporalEnd',
  'spatial', 'geocodingKey', 'geocodingLevel', 'contributorID',
];

function looksLikeInventoryCSV(rows) {
  return !!rows.length && 'id' in rows[0] && 'title' in rows[0];
}

/* Bearbeitete Inventar-CSV zurückspielen. Vorhandene Einträge werden über die
   `id` ZUSAMMENGEFÜHRT, nicht ersetzt: die Clearing-Antworten (`_clearing`)
   stehen nicht in der CSV und dürfen durch einen Rückimport nicht verloren
   gehen. Unbekannte ids kommen als neue Einträge dazu. */
function importInventoryCSV(text) {
  const rows = parseCSV(text);
  if (!looksLikeInventoryCSV(rows)) return false;

  const nachId = new Map(inventory.map((d, i) => [d.id, i]));
  let aktualisiert = 0, neu = 0;
  rows.forEach(r => {
    const id = (r.id || '').trim();
    if (!id) return;
    if (nachId.has(id)) {
      const d = inventory[nachId.get(id)];
      INV_CSV_FIELDS.forEach(f => { if (f in r) d[f] = r[f]; });
      if (r.schutzbedarf != null && r.schutzbedarf !== '') d._grafSchutzbedarf = r.schutzbedarf;
      // Format und Lizenz beziehen sich auf die ERSTE Verteilung; weitere
      // stehen nicht in der CSV und bleiben deshalb unverändert
      const erste = ensureDistributions(d)[0];
      if ('format' in r) erste.format = r.format;
      if ('license' in r) erste.license = r.license;
      aktualisiert++;
    } else {
      const d = { id, _grafSchutzbedarf: r.schutzbedarf || '', _recipients: [] };
      INV_CSV_FIELDS.forEach(f => { d[f] = r[f] || ''; });
      d.distributions = [newDistribution({ format: r.format || '', license: r.license || '' })];
      delete d.format; delete d.license;
      inventory.push(d);
      nachId.set(id, inventory.length - 1);
      neu++;
    }
  });

  invSelection.clear();
  saveState();
  renderInventory();
  alert(`Inventar-CSV eingelesen: ${aktualisiert} Datensätze aktualisiert, ${neu} neu hinzugefügt.`
    + (aktualisiert ? '\nBereits gegebene Clearing-Antworten bleiben erhalten.' : ''));
  return true;
}

/* Ein Einstieg für beide Formate: DatenGraf-Rohdaten und die eigene,
   bearbeitete Inventar-CSV. Sonst müssten Nutzer wissen, welcher Button
   welche Datei erwartet. */
function importAnyCSV(text) {
  const rows = parseCSV(text);
  if (looksLikeInventoryCSV(rows)) return importInventoryCSV(text);
  return importGrafCSV(text);
}

/* ── Import eines DCAT-AP.de-Katalogs (JSON-LD) ───────────────────
   Die Gegenrichtung zum Export. Viele Stellen veröffentlichen bereits –
   ihnen fehlt kein Erstinventar, sondern eine Prüfung des Bestands. Ein
   geharvesteter Katalog lässt sich hier einlesen, gegen die
   Qualitätsprüfung halten und mit Clearing und Governance verbinden.

   Bewusst tolerant beim Lesen: JSON-LD erlaubt für dieselbe Aussage
   mehrere Schreibweisen (String, `{"@id": …}`, Array). Streng ist nur der
   Export.
   ────────────────────────────────────────────────────────────── */
function jsonldValue(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return jsonldValue(v[0]);
  if (typeof v === 'object') return String(v['@id'] || v['@value'] || v['foaf:name'] || v['vcard:fn'] || v['skos:prefLabel'] || '');
  return String(v);
}
function jsonldList(v) {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).map(jsonldValue).filter(Boolean);
}
/* Kontrollierte Werte kommen als volle NAL-URI zurück – auf den Code kürzen,
   damit die Dropdowns im Inventar greifen. Unbekannte Werte bleiben stehen;
   die Qualitätsprüfung meldet sie dann als „nicht aus dem Vokabular". */
function stripNal(uri, prefix) {
  const v = jsonldValue(uri);
  return v.startsWith(prefix) ? v.slice(prefix.length) : v;
}
const LICENSE_BY_URI = {};
LICENSE_CATALOG.forEach(g => g.items.forEach(l => { LICENSE_BY_URI[l.uri] = l.id; }));
function licenseFromURI(uri) {
  const v = jsonldValue(uri);
  return LICENSE_BY_URI[v] || v;
}

function looksLikeDcatJSON(obj) {
  return !!(obj && typeof obj === 'object' &&
    (Array.isArray(obj['dcat:dataset']) || Array.isArray(obj.dataset) ||
     String(obj['@type'] || '').includes('Catalog')));
}

function dcatToDataset(ds) {
  const id = jsonldValue(ds['dct:identifier']) ||
             slug(jsonldValue(ds['dct:title'])) || 'datensatz';
  const dists = (Array.isArray(ds['dcat:distribution']) ? ds['dcat:distribution']
                : ds['dcat:distribution'] ? [ds['dcat:distribution']] : [])
    .map(x => newDistribution({
      title: jsonldValue(x['dct:title']),
      format: jsonldValue(x['dct:format']),
      accessURL: jsonldValue(x['dcat:accessURL']),
      license: licenseFromURI(x['dct:license']),
    }));
  const t = ds['dct:temporal'] || {};
  return {
    id,
    title: jsonldValue(ds['dct:title']),
    description: jsonldValue(ds['dct:description']),
    publisher: jsonldValue(ds['dct:publisher']),
    contactPoint: jsonldValue(ds['dcat:contactPoint']),
    sourceSystem: jsonldValue(ds['dcatde:sourceSystem']),
    keywords: jsonldList(ds['dcat:keyword']).join(', '),
    theme: stripNal(ds['dcat:theme'], THEME_NAL),
    accrualPeriodicity: stripNal(ds['dct:accrualPeriodicity'], FREQ_NAL),
    accessRights: stripNal(ds['dct:accessRights'], ACCESS_NAL),
    landingPage: jsonldValue(ds['dcat:landingPage']),
    issued: jsonldValue(ds['dct:issued']),
    modified: jsonldValue(ds['dct:modified']),
    temporalStart: jsonldValue(t['dcat:startDate']),
    temporalEnd: jsonldValue(t['dcat:endDate']),
    spatial: jsonldValue(ds['dct:spatial']),
    geocodingKey: stripNal(ds['dcatde:politicalGeocodingURI'], GEO_REGIONAL_NAL),
    geocodingLevel: stripNal(ds['dcatde:politicalGeocodingLevelURI'], GEO_LEVEL_NAL),
    contributorID: stripNal(ds['dcatde:contributorID'], CONTRIBUTOR_NAL),
    _grafSchutzbedarf: '',
    _recipients: [],
    distributions: dists.length ? dists : [newDistribution()],
  };
}

/* Wie beim CSV-Rückimport wird über die `id` ZUSAMMENGEFÜHRT: ein bereits
   bearbeiteter Stand samt Clearing-Antworten darf durch das Einlesen eines
   Katalogs nicht verloren gehen. */
function importDcatJSON(text) {
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) { alert('Die Datei ist kein gültiges JSON.'); return false; }
  if (!looksLikeDcatJSON(obj)) {
    alert('Diese Datei sieht nicht nach einem DCAT-Katalog aus.\nErwartet wird ein „dcat:Catalog" mit einer Liste „dcat:dataset".');
    return false;
  }
  const liste = obj['dcat:dataset'] || obj.dataset || [];
  const nachId = new Map(inventory.map((d, i) => [d.id, i]));
  let aktualisiert = 0, neu = 0;
  liste.forEach(raw => {
    const d = dcatToDataset(raw);
    if (nachId.has(d.id)) {
      const alt = inventory[nachId.get(d.id)];
      // Clearing-Antworten und Schutzbedarf stammen nicht aus dem Katalog
      const bewahrt = { _clearing: alt._clearing, _grafSchutzbedarf: alt._grafSchutzbedarf, _recipients: alt._recipients };
      Object.assign(alt, d, bewahrt);
      aktualisiert++;
    } else {
      inventory.push(d);
      nachId.set(d.id, inventory.length - 1);
      neu++;
    }
  });
  migrateInventory();
  invSelection.clear();
  saveState();
  renderInventory();
  alert(`DCAT-Katalog eingelesen: ${aktualisiert} Datensätze aktualisiert, ${neu} neu hinzugefügt.`
    + '\nDie Qualitätsprüfung zeigt jetzt, wo der Bestand vom Profil abweicht.');
  return true;
}

/* Ein Einstieg für alle Importformate – Nutzer sollen nicht wissen müssen,
   welcher Button welche Datei erwartet. */
function importAnyFile(text) {
  const t = String(text || '').trim();
  if (t.startsWith('{') || t.startsWith('[')) return importDcatJSON(t);
  return importAnyCSV(text);
}

/* ── Event-Bindings ───────────────────────────────────────────── */
function pickAndImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.json,text/csv,application/json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importAnyFile(reader.result);
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

document.getElementById('btn-import-again')?.addEventListener('click', pickAndImport);
document.querySelectorAll('[data-sample]').forEach(btn =>
  btn.addEventListener('click', () => {
    // Auswahl aus dem Erklär-Modal: Dialog schließen, sonst liegt er über dem Inventar
    showModal('inventory-backdrop', false);
    loadSampleData(btn.dataset.sample);
  }));

document.getElementById('btn-export-json')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(JSON.stringify(buildDcatJSON(), null, 2),
    'datenlotse-inventar-dcat-ap-de.json', 'application/json');
});
document.getElementById('btn-export-ttl')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(buildDcatTurtle(), 'datenlotse-inventar-dcat-ap-de.ttl', 'text/turtle');
});
document.getElementById('btn-export-csv')?.addEventListener('click', () => {
  if (!inventory.length) return;
  downloadBlob(buildInventoryCSV(), 'datenlotse-inventar.csv', 'text/csv');
});

/* ── UI: Seitenleiste + Modals (FAQ / CTA) ────────────────────── */
function openSidebar() {
  document.getElementById('app-sidebar')?.classList.remove('collapsed');
  document.getElementById('sidebar-overlay')?.classList.add('show');
  document.getElementById('sidebar-toggle-btn')?.setAttribute('aria-expanded', 'true');
  document.querySelector('.app-sidebar-nav a')?.focus();
}
function closeSidebar() {
  const sb = document.getElementById('app-sidebar');
  // Fokus zurückholen, bevor die Leiste unsichtbar (und damit unfokussierbar) wird
  if (sb && sb.contains(document.activeElement)) document.getElementById('sidebar-toggle-btn')?.focus();
  sb?.classList.add('collapsed');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
  document.getElementById('sidebar-toggle-btn')?.setAttribute('aria-expanded', 'false');
}
document.getElementById('sidebar-toggle-btn')?.addEventListener('click', openSidebar);
document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
document.querySelectorAll('.app-sidebar-nav a').forEach(a => a.addEventListener('click', closeSidebar));

let modalOpener = null;
const FOCUSABLE = 'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])';

/* Fokus im Dialog halten: ohne diese Falle wanderte der Fokus beim Tabben aus
   dem Modal heraus auf Elemente hinter dem Backdrop (u. a. die Seitenleiste). */
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  // Auch der Rundgang ist `aria-modal` – Screenreader blenden den Rest aus.
  // Ohne diese Falle konnte man per Tab in eine Seite tabben, die für sie
  // gar nicht existiert.
  const dialog = document.querySelector(
    '.modal-backdrop:not(.hidden) [role="dialog"], .tour-layer:not(.hidden) [role="dialog"]');
  if (!dialog) return;
  const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
document.addEventListener('keydown', trapFocus);

function showModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = !el.classList.contains('hidden');
  el.classList.toggle('hidden', !show);
  if (show) {
    modalOpener = document.activeElement;
    el.querySelector('.icon-close, button, [href], select, input')?.focus();
  } else if (wasOpen) {
    // nur zurückgeben, wenn dieses Modal wirklich offen war – Escape läuft über alle
    if (modalOpener && typeof modalOpener.focus === 'function') modalOpener.focus();
    modalOpener = null;
  }
}
const MODALS = ['faq-backdrop', 'inventory-backdrop', 'phase3-backdrop', 'phase45-backdrop', 'license-backdrop'];
document.getElementById('faq-btn')?.addEventListener('click', () => showModal('faq-backdrop', true));
document.getElementById('faq-close-btn')?.addEventListener('click', () => showModal('faq-backdrop', false));
document.getElementById('cta-btn')?.addEventListener('click', () => navTo('kompass'));
document.getElementById('hero-kompass-btn')?.addEventListener('click', () => navTo('kompass'));
document.getElementById('open-phase45-btn')?.addEventListener('click', () => showModal('phase45-backdrop', true));
document.getElementById('phase45-close-btn')?.addEventListener('click', () => showModal('phase45-backdrop', false));

// Dateninventar-Erklär-Modal
function openInventoryModal() { showModal('inventory-backdrop', true); }
document.getElementById('open-inventory-btn')?.addEventListener('click', openInventoryModal);
document.getElementById('inventory-close-btn')?.addEventListener('click', () => showModal('inventory-backdrop', false));
document.getElementById('inv-modal-import')?.addEventListener('click', () => { showModal('inventory-backdrop', false); pickAndImport(); });

/* ── Phase-3-Prozess-Wizard (Modal-Stepper mit Checks) ────────── */
const PHASE3_TITLES = ['Worum geht es?', 'Der Ablauf', 'Bereitschafts-Check', 'Nächste Schritte'];
const P3_CHECKS = [
  { id: 'inventory',  label: 'Ein Dateninventar liegt vor (Datensätze sind erfasst).' },
  { id: 'classified', label: 'Die Datensätze sind im Risiko-Clearing bewertet (Ampel gesetzt).' },
  { id: 'legal',      label: 'Für personenbezogene Daten ist die Rechtsgrundlage geprüft.' },
  { id: 'freitexte',  label: 'Es gibt personenbezogene Freitexte, die bereinigt werden müssen.' },
  { id: 'review',     label: 'Eine fachliche/juristische Endkontrolle vor der Veröffentlichung ist eingeplant.' },
];
let phase3Index = 0;
const phase3Checks = {};

function openClearing() {
  if (inventory.length) { renderInventory(); showInventoryTab('clearing'); }
  else openInventoryModal();
}

function openPhase3Wizard() {
  phase3Index = 0;
  phase3Checks.inventory = inventory.length > 0;
  phase3Checks.classified = inventory.some(d => d.clearing);
  showModal('phase3-backdrop', true);
  renderPhase3();
}

function phase3BodyHTML() {
  if (phase3Index === 0) return `
    <p>Phase 3 stellt sicher, dass <strong>nur rechtlich freigegebene Daten veröffentlicht</strong> werden. Sie besteht aus zwei aufeinander aufbauenden Schritten:</p>
    <ul class="p3-list">
      <li><strong>Risiko-Clearing (Modul 3a)</strong> – bewertet jeden Datensatz <em>deterministisch</em> nach Rot/Gelb/Grün: darf er, darf er nicht, oder erst nach Bearbeitung?</li>
      <li><strong>Pseudonymisierung (Modul 3b)</strong> – bereinigt personenbezogene Freitexte strukturerhaltend, damit aus einem „Gelb" ein freigabefähiger Datensatz wird.</li>
    </ul>
    <p class="modal-privacy"><i class="fas fa-lock"></i> Ziel ist die rechtssichere, datenschutzkonforme Open-Data-Freigabe – nichts verlässt dabei den Browser.</p>`;
  if (phase3Index === 1) return `
    <p>Der Prozess folgt vier Schritten:</p>
    <ol class="modal-steps">
      <li><strong>Klassifizieren</strong> – je Datensatz die Clearing-Fragen beantworten (Personenbezug, Art. 9 DSGVO, Rechtsgrundlage, Anonymisierbarkeit). Ergebnis: eine Ampel.</li>
      <li><strong>Entscheiden</strong> – <span style="color:var(--ampel-gruen);font-weight:700">Grün</span> = direkt freigabefähig · <span style="color:var(--ampel-rot);font-weight:700">Rot</span> = nicht veröffentlichen (höchstens aggregiert) · <span style="color:var(--ampel-gelb);font-weight:700">Gelb</span> = Bearbeitung nötig.</li>
      <li><strong>Bearbeiten</strong> – bei Gelb: personenbezogene Freitexte über die Textbereinigung pseudonymisieren bzw. aggregieren/anonymisieren.</li>
      <li><strong>Prüfen &amp; dokumentieren</strong> – Ergebnis im Clearing festhalten, Begründung exportieren; fachliche/juristische Endkontrolle vor der Veröffentlichung.</li>
    </ol>`;
  if (phase3Index === 2) return `
    <p>Kurze Selbsteinschätzung – was trifft bereits zu?</p>
    <div class="p3-checks">
      ${P3_CHECKS.map(c => `
        <label class="p3-check">
          <input type="checkbox" data-check="${esc(c.id)}"${phase3Checks[c.id] ? ' checked' : ''}>
          <span>${esc(c.label)}</span>
        </label>`).join('')}
    </div>`;
  // Schritt 4 – Nächste Schritte
  const done = P3_CHECKS.filter(c => phase3Checks[c.id]).length;
  const noInv = !phase3Checks.inventory;
  const needsPseudo = phase3Checks.freitexte;
  return `
    <p>Du hast <strong>${done} von ${P3_CHECKS.length}</strong> Punkten bestätigt. Empfohlene nächste Schritte:</p>
    ${noInv ? `<p class="modal-privacy"><i class="fas fa-circle-info"></i> Zuerst ein <strong>Dateninventar</strong> aufbauen – darauf setzt das Clearing auf.</p>` : ''}
    <div class="p3-tools">
      ${noInv ? `<button class="btn btn-primary" id="p3-open-inventory"><i class="fas fa-boxes-stacked"></i> Dateninventar starten</button>` : `<button class="btn btn-primary" id="p3-open-clearing"><i class="fas fa-traffic-light"></i> Risiko-Clearing öffnen</button>`}
      <button class="btn ${needsPseudo ? 'btn-primary' : 'btn-secondary'}" id="p3-open-pseudo"><i class="fas fa-user-shield"></i> Textbereinigung öffnen${needsPseudo ? ' (empfohlen)' : ''}</button>
    </div>
    <p class="gov-note" style="margin-top:14px"><i class="fas fa-circle-info"></i> Die Textbereinigung ist das Werkzeug für „Gelb"-Fälle mit personenbezogenen Freitexten. Eine manuelle Endkontrolle bleibt vor jeder Veröffentlichung Pflicht.</p>`;
}

function renderPhase3() {
  const body = document.getElementById('p3-body');
  const steps = document.getElementById('p3-steps');
  const prog = document.getElementById('p3-progress');
  const back = document.getElementById('p3-back');
  const next = document.getElementById('p3-next');
  if (!body) return;
  const last = PHASE3_TITLES.length - 1;
  steps.innerHTML = PHASE3_TITLES.map((t, i) =>
    `<span class="wizard-dot${i === phase3Index ? ' is-active' : ''}${i < phase3Index ? ' is-done' : ''}" title="${esc(t)}"></span>`).join('');
  prog.textContent = `Schritt ${phase3Index + 1} / ${PHASE3_TITLES.length} · ${PHASE3_TITLES[phase3Index]}`;
  back.disabled = phase3Index === 0;
  next.style.display = phase3Index === last ? 'none' : '';
  body.innerHTML = phase3BodyHTML();
  body.scrollTop = 0;
  if (phase3Index === 2) {
    body.querySelectorAll('input[data-check]').forEach(cb =>
      cb.addEventListener('change', () => { phase3Checks[cb.dataset.check] = cb.checked; }));
  }
  if (phase3Index === last) {
    body.querySelector('#p3-open-clearing')?.addEventListener('click', () => { showModal('phase3-backdrop', false); openClearing(); });
    body.querySelector('#p3-open-inventory')?.addEventListener('click', () => { showModal('phase3-backdrop', false); openInventoryModal(); });
    body.querySelector('#p3-open-pseudo')?.addEventListener('click', () => { showModal('phase3-backdrop', false); navTo('pseudo'); });
  }
}

document.getElementById('open-phase3-btn')?.addEventListener('click', openPhase3Wizard);
document.getElementById('phase3-close-btn')?.addEventListener('click', () => showModal('phase3-backdrop', false));
document.getElementById('p3-next')?.addEventListener('click', () => { if (phase3Index < PHASE3_TITLES.length - 1) { phase3Index++; renderPhase3(); } });
document.getElementById('p3-back')?.addEventListener('click', () => { if (phase3Index > 0) { phase3Index--; renderPhase3(); } });

/* ── Lizenz-Wegweiser (Modal) ─────────────────────────────────────
   Zwei Fragen (Namensnennung? nationaler vs. internationaler Fokus)
   → deterministische Empfehlung einer OFFENEN Lizenz. Der Rückgabe-
   schlüssel entspricht einem LICENSE_OPTIONS-Wert und lässt sich per
   Klick auf alle Datensätze ohne Lizenz übernehmen. */
const LICENSE_INFO = {
  'dl-de/by-2-0': {
    label: 'Datenlizenz Deutschland – Namensnennung 2.0',
    url: 'https://www.govdata.de/dl-de/by-2-0',
    why: 'Der De-facto-Standard für offene Verwaltungsdaten in Deutschland (GovData). Nachnutzung ist frei erlaubt und verlangt nur die Nennung der Quelle.'
  },
  'cc-by-4.0': {
    label: 'Creative Commons BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/deed.de',
    why: 'International etabliert und maschinenlesbar. Nachnutzung frei, verlangt eine Namensnennung – ideal, wenn breite bzw. globale Nachnutzung im Vordergrund steht.'
  },
  'dl-de/zero-2-0': {
    label: 'Datenlizenz Deutschland – Zero 2.0',
    url: 'https://www.govdata.de/dl-de/zero-2-0',
    why: 'Datenlizenz Deutschland ganz ohne Bedingungen – die Daten dürfen bedingungslos genutzt werden (auch ohne Quellenangabe). Passend im deutschen Verwaltungskontext.'
  },
  'cc-zero': {
    label: 'Creative Commons Zero (CC0 1.0)',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.de',
    why: 'CC0 verzichtet weltweit auf alle Rechte (Public-Domain-Widmung) – maximale, bedingungslose Nachnutzbarkeit und international sofort verständlich.'
  }
};
const licenseWiz = { attribution: 'ja', scope: 'de' };

function recommendLicense() {
  if (licenseWiz.attribution === 'ja') return licenseWiz.scope === 'de' ? 'dl-de/by-2-0' : 'cc-by-4.0';
  return licenseWiz.scope === 'de' ? 'dl-de/zero-2-0' : 'cc-zero';
}

function renderLicenseWizard() {
  document.querySelectorAll('#license-backdrop .lic-opt').forEach(btn => {
    const on = licenseWiz[btn.dataset.lic] === btn.dataset.val;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));   // vorher nur farblich erkennbar
  });
  const key = recommendLicense();
  const info = LICENSE_INFO[key];
  const res = document.getElementById('lic-result');
  if (res) res.innerHTML =
    `<span class="lic-result-badge"><i class="fas fa-award"></i> Empfehlung</span>` +
    `<strong class="lic-result-name">${esc(info.label)}</strong>` +
    `<p class="lic-result-why">${esc(info.why)}</p>` +
    `<a class="lic-result-link" href="${esc(info.url)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Lizenztext ansehen</a>`;
  const emptyCount = inventory.filter(d => !hasLicense(d)).length;
  const actions = document.getElementById('lic-actions');
  if (actions) {
    actions.innerHTML = inventory.length
      ? `<button class="btn btn-primary" id="lic-apply"${emptyCount ? '' : ' disabled'}><i class="fas fa-wand-magic-sparkles"></i> Für ${emptyCount} Datensätze ohne Lizenz übernehmen</button>`
      : `<span class="lic-note"><i class="fas fa-circle-info"></i> Importiere zuerst ein Inventar, um die Lizenz direkt zu übernehmen.</span>`;
    actions.querySelector('#lic-apply')?.addEventListener('click', () => {
      const k = recommendLicense();
      let n = 0;
      // Nur Verteilungen ohne Lizenz füllen – bereits gesetzte bleiben unangetastet
      inventory.forEach(d => {
        if (hasLicense(d)) return;
        ensureDistributions(d).forEach(x => { if (!x.license) x.license = k; });
        n++;
      });
      saveState();
      // auch den aktiven Tab aktualisieren – sonst meldet die Qualitätsprüfung
      // weiterhin „Pflichtfeld fehlt: Lizenz“ für alle Datensätze
      if (!document.getElementById('inventory-view')?.classList.contains('hidden')) {
        renderInventoryBody();
        if (!document.getElementById('quality-panel')?.classList.contains('hidden')) renderQuality();
        if (!document.getElementById('clearing-panel')?.classList.contains('hidden')) renderClearing();
      }
      showModal('license-backdrop', false);
      alert(`Lizenz „${LICENSE_INFO[k].label}" auf ${n} Datensätze ohne Lizenz übernommen.`);
    });
  }
}

function openLicenseWizard() { showModal('license-backdrop', true); renderLicenseWizard(); }

document.querySelectorAll('#license-backdrop .lic-opt').forEach(btn =>
  btn.addEventListener('click', () => { licenseWiz[btn.dataset.lic] = btn.dataset.val; renderLicenseWizard(); }));
document.getElementById('btn-license-wizard')?.addEventListener('click', openLicenseWizard);
document.getElementById('license-close-btn')?.addEventListener('click', () => showModal('license-backdrop', false));

// Klick auf den Backdrop (außerhalb des Dialogs) schließt das Modal
MODALS.forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener('click', e => { if (e.target === el) showModal(id, false); });
});

// Escape schließt offene Modals und die Seitenleiste
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  MODALS.forEach(id => showModal(id, false));
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
  document.getElementById('kompass-view')?.classList.toggle('hidden', name !== 'kompass');
  document.getElementById('wissen-view')?.classList.toggle('hidden', name !== 'wissen');
  document.getElementById('vorlagen-view')?.classList.toggle('hidden', name !== 'vorlagen');
  // Der Phase-4&5-Beratungsblock gehört auf die Startseite; Unterseiten bekommen
  // stattdessen ihren eigenen, kontextpassenden „Wie geht es weiter?"-Block.
  const cta = document.querySelector('.consult-cta');
  if (cta) cta.style.display = (name === 'home') ? '' : 'none';
  if (name === 'home') { refreshDashboard(); refreshTourHint(); }
  else { const dash = document.getElementById('dashboard'); if (dash) dash.classList.add('hidden'); }
  window.scrollTo({ top: 0 });
}

/* ── Status-Dashboard (Startseite): Überblick über alle Bausteine ──
   Zeigt Live-Kennzahlen je Modul mit Schnellsprung. Erscheint nur,
   wenn bereits Daten vorliegen (sonst sehen Erstnutzer Hero + Module). */
function hasAnyData() {
  return inventory.length || grafRows.length ||
    Object.keys(governanceAnswers).length || Object.keys(kompassState).length;
}
function refreshDashboard() {
  const dash = document.getElementById('dashboard');
  if (!dash) return;
  if (!hasAnyData()) { dash.classList.add('hidden'); return; }
  dash.classList.remove('hidden');
  renderDashboard();
}
/* „x von y bewertet“ zeigte immer 100 %, weil ensureAllClearing() jeden
   Datensatz aus dem Schutzbedarf vorbelegt. Gezählt wird deshalb, wie viele
   Einträge der Nutzer wirklich selbst beantwortet hat. */
function clearingSelbstBewertet(d) {
  const a = d._clearing;
  if (!a) return false;
  if (a.art9 || a.recht || a.anon) return true;
  const auto = schutzKategorie(d._grafSchutzbedarf);
  const autoPb = auto === 'dsgvo' ? 'ja' : auto === 'oeffentlich' ? 'nein' : 'unklar';
  return a.pb !== autoPb;
}
function clearingSubText(n) {
  const eigen = inventory.filter(clearingSelbstBewertet).length;
  return eigen ? `${eigen} von ${n} selbst bewertet` : 'aus Schutzbedarf vorbelegt';
}

function renderDashboard() {
  const wrap = document.getElementById('dashboard-cards');
  if (!wrap) return;
  const kScore = kompassOverall();
  const kAmp = kompassAmpel(kScore);
  const gAnswered = Object.keys(governanceAnswers).length;
  const g = reifegrad();
  const gAmp = reifeAmpel(g.score);
  const n = inventory.length;
  const avg = n ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / n) : 0;
  const cc = { gruen: 0, gelb: 0, rot: 0 };
  if (n) { ensureAllClearing(); inventory.forEach(d => { if (d.clearing) cc[d.clearing.ampel]++; }); }

  const cards = [
    { go: 'kompass', icon: 'fa-compass', phase: 'Überblick', title: 'Daten-Kompass',
      metric: `${kScore}%`, amp: kAmp.cls, sub: kAmp.label },
    { go: 'governance', icon: 'fa-users-gear', phase: 'Phase 1', title: 'Governance & Rollen',
      metric: gAnswered ? `${g.score}%` : '–', amp: gAnswered ? gAmp.cls : '',
      sub: gAnswered ? `Reifegrad: ${gAmp.label}` : 'Reifegrad-Check noch offen' },
    { go: 'inventory', icon: 'fa-boxes-stacked', phase: 'Phase 2', title: 'Dateninventar',
      metric: n ? `${n}` : '–', unit: n ? 'Datensätze' : '',
      sub: n ? `Ø ${avg}% DCAT-AP.de-vollständig` : 'Noch kein Inventar' },
    { go: 'clearing', icon: 'fa-traffic-light', phase: 'Phase 3', title: 'Risiko-Clearing',
      clearing: n ? cc : null, sub: n ? clearingSubText(n) : 'Noch kein Inventar' },
  ];

  wrap.innerHTML = cards.map(c => {
    const metricHTML = c.clearing
      ? `<span class="dash-clearing">
           <span class="dash-amp dash-amp--gruen">${c.clearing.gruen}</span>
           <span class="dash-amp dash-amp--gelb">${c.clearing.gelb}</span>
           <span class="dash-amp dash-amp--rot">${c.clearing.rot}</span>
         </span>`
      : `<span class="dash-metric ${c.amp ? 'dash-' + c.amp : ''}">${esc(c.metric)}${c.unit ? `<span class="dash-unit">${esc(c.unit)}</span>` : ''}</span>`;
    return `<button class="dash-card" data-go="${c.go}">
      <span class="dash-card-top">
        <span class="dash-ic"><i class="fas ${c.icon}"></i></span>
        <span class="dash-phase">${esc(c.phase)}</span>
      </span>
      <strong class="dash-card-title">${esc(c.title)}</strong>
      ${metricHTML}
      <span class="dash-sub">${esc(c.sub)}</span>
      <span class="dash-go">Öffnen <i class="fas fa-arrow-right"></i></span>
    </button>`;
  }).join('');
}

// Kontextuelle „Nächster Schritt"-Navigation (Phase-Badges, Zurück-Links, Weiter-Karten)
function goTo(target) {
  if (target === 'clearing') {
    if (inventory.length) { renderInventory(); showInventoryTab('clearing'); }
    else openInventoryModal();
  } else if (target === 'phase45') {
    showModal('phase45-backdrop', true);
  } else {
    navTo(target);
  }
}
// Delegation, damit auch dynamisch gerenderte Elemente (Dashboard-Karten) greifen
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go]');
  if (el) { e.preventDefault(); goTo(el.dataset.go); }
});

function navTo(target) {
  if (target === 'inventory') {
    if (inventory.length) renderInventory();   // rendert Karten + showView('inventory') – auch nach Reload
    else { showView('home'); openInventoryModal(); }   // ohne Daten: erst erklären, dann importieren
  } else if (target === 'kompass') {
    showView('kompass');
    renderKompass();
  } else if (target === 'governance') {
    showView('governance');
    renderGovernance();
  } else if (target === 'pseudo') {
    showView('pseudo');
  } else if (target === 'wissen') {
    showView('wissen');
    renderWissen();
  } else if (target === 'vorlagen') {
    showView('vorlagen');
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
document.getElementById('open-gov-btn')?.addEventListener('click', () => navTo('governance'));
document.getElementById('gov-import-btn')?.addEventListener('click', pickAndImport);
document.getElementById('topbar-brand')?.addEventListener('click', () => navTo('home'));
document.getElementById('topbar-brand')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('home'); }
});

/* ──────────────────────────────────────────────────────────────
   Wissens- & Methodik-Center (reiner Content-Service)

   Statische, lokal gerenderte Wissensbasis: Glossar zentraler Open-
   Data-Begriffe, Rechtsgrundlagen-Bibliothek (Bund/EU) mit amtlichen
   Quellen sowie die Reifegrad-Modelle hinter dem Daten-Kompass. Ein
   Live-Filter durchsucht Begriffe und Gesetze zugleich.
   ────────────────────────────────────────────────────────────── */
const GLOSSARY = [
  { term: 'Open Data', def: 'Daten, die von jedem frei genutzt, weiterverwendet und geteilt werden dürfen – maschinenlesbar und unter einer offenen Lizenz bereitgestellt.' },
  { term: 'DCAT-AP.de', def: 'Deutsches Metadaten-Anwendungsprofil (auf Basis von W3C DCAT bzw. DCAT-AP der EU) zur einheitlichen Beschreibung von Datensätzen – Grundlage für das Harvesting durch GovData.' },
  { term: 'GovData', def: 'Das Datenportal für Deutschland (Bund, Länder, Kommunen): bündelt die Metadaten offener Verwaltungsdaten und macht sie zentral auffindbar.' },
  { term: 'CKAN', def: 'Verbreitete Open-Source-Software für Datenportale (Katalog, API, Harvesting). Viele Open-Data-Portale in Deutschland und der EU setzen darauf.' },
  { term: 'Metadaten', def: '„Daten über Daten": beschreibende Angaben (Titel, Herausgeber, Lizenz, Format, Aktualisierung …), die Datensätze auffindbar und nachnutzbar machen.' },
  { term: 'Dataset & Distribution', def: 'Ein Dataset ist die inhaltliche Einheit (z. B. „Baumkataster"), eine Distribution die konkrete Repräsentation davon (z. B. die CSV-Datei).' },
  { term: 'Harvesting', def: 'Das automatische Einsammeln von Metadaten durch ein Portal – z. B. holt GovData die Kataloge von Kommunen und Ländern regelmäßig ab.' },
  { term: 'Offene Lizenz', def: 'Erlaubt Nutzung, Bearbeitung und Weitergabe (auch kommerziell), höchstens mit Namensnennung. NC (nicht-kommerziell), ND (keine Bearbeitung) und Share-Alike gelten nicht als offen.' },
  { term: '5-Sterne-Open-Data', def: 'Reifegradmodell von Tim Berners-Lee: ★ offen lizenziert · ★★ strukturiert · ★★★ offenes Format · ★★★★ URIs · ★★★★★ Linked Open Data.' },
  { term: 'FAIR-Prinzipien', def: 'Findable, Accessible, Interoperable, Reusable – Leitprinzipien für auffindbare und nachnutzbare Daten (ursprünglich aus der Forschung).' },
  { term: 'Linked Open Data / RDF', def: 'Offene Daten, die per RDF und URIs miteinander verknüpft sind und so maschinell in Beziehung gesetzt werden können (5. Stern).' },
  { term: 'Personenbezogene Daten', def: 'Art. 4 DSGVO: alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.' },
  { term: 'Besondere Kategorien (Art. 9 DSGVO)', def: 'Besonders schützenswerte Daten (Gesundheit, Religion, ethnische Herkunft, Biometrie, Gewerkschaft, Sexualleben) mit strengeren Voraussetzungen.' },
  { term: 'Pseudonymisierung', def: 'Ersetzen identifizierender Merkmale durch Platzhalter; eine Re-Identifizierung ist nur mit Zusatzwissen möglich. Die Daten bleiben personenbezogen.' },
  { term: 'Anonymisierung', def: 'Daten so verändern, dass eine Re-Identifizierung praktisch ausgeschlossen ist – anonyme Daten fallen nicht mehr unter die DSGVO.' },
  { term: 'Schutzbedarf', def: 'Einstufung, wie schützenswert Daten sind (öffentlich / intern / DSGVO-relevant). Im DatenLotsen steuert er die Vorbelegung des Risiko-Clearings.' },
  { term: 'Verzeichnis von Verarbeitungstätigkeiten (VVT)', def: 'Art. 30 DSGVO: Pflichtdokumentation aller Verarbeitungen personenbezogener Daten in einer Organisation.' },
  { term: 'Data Owner & Data Steward', def: 'Owner = fachlich verantwortlich für eine Datendomäne; Steward = zuständig für operative Pflege und Datenqualität.' },
  { term: 'RACI', def: 'Verantwortungsmatrix: Responsible (führt aus), Accountable (rechenschaftspflichtig), Consulted (wird befragt), Informed (wird informiert).' },
  { term: 'Accrual Periodicity', def: 'Der Aktualisierungszyklus eines Datensatzes (täglich, monatlich, jährlich …) – ein wichtiges DCAT-AP.de-Metadatum für Nachnutzende.' },
];

const LEGAL_BASIS = [
  { name: 'Open-Data-Gesetz (§ 12a EGovG)', summary: 'Verpflichtet Bundesbehörden, unbearbeitete Daten maschinenlesbar und offen bereitzustellen.', url: 'https://www.gesetze-im-internet.de/egovg/__12a.html' },
  { name: 'E-Government-Gesetz (EGovG)', summary: 'Rechtsrahmen für die elektronische Verwaltung des Bundes – enthält u. a. die Open-Data-Pflicht (§ 12a).', url: 'https://www.gesetze-im-internet.de/egovg/' },
  { name: 'Datennutzungsgesetz (DNG)', summary: 'Setzt die EU-Open-Data-Richtlinie um und regelt die Weiterverwendung von Verwaltungsdaten; löste das IWG ab.', url: 'https://www.gesetze-im-internet.de/dng/' },
  { name: 'EU Open Data Directive (2019/1024)', summary: 'EU-Richtlinie zur offenen Bereitstellung und Weiterverwendung von Daten des öffentlichen Sektors (vormals PSI-Richtlinie).', url: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32019L1024' },
  { name: 'Informationsfreiheitsgesetz (IFG)', summary: 'Gibt jeder Person einen Anspruch auf Zugang zu amtlichen Informationen des Bundes.', url: 'https://www.gesetze-im-internet.de/ifg/' },
  { name: 'DSGVO (VO (EU) 2016/679)', summary: 'EU-Datenschutz-Grundverordnung – Grundlage für den rechtmäßigen Umgang mit personenbezogenen Daten.', url: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679' },
  { name: 'Bundesdatenschutzgesetz (BDSG)', summary: 'Ergänzt die DSGVO national und konkretisiert sie für Deutschland (u. a. Behörden, Beschäftigtendatenschutz).', url: 'https://www.gesetze-im-internet.de/bdsg_2018/' },
  { name: 'Geodatenzugangsgesetz (GeoZG) / INSPIRE', summary: 'Regelt den Zugang zu Geodaten und setzt die EU-INSPIRE-Richtlinie zur Geodateninfrastruktur um.', url: 'https://www.gesetze-im-internet.de/geozg/' },
];

/* Landesrechtliche Grundlagen. Bewusst kuratiert und mit amtlicher Fundstelle
   verlinkt – die Zusammenfassung ordnet nur ein, der Link ist die Autorität.
   `kind`: 'transparenz' = aktive Veröffentlichungspflicht, 'ifg' = Zugang auf
   Antrag, 'kein' = kein allgemeines Landesgesetz. Bewusst OHNE Jahreszahlen:
   Novellen sind häufig, ein veraltetes Datum wäre schlechter als keines. */
const LEGAL_BASIS_LAENDER = [
  { land: 'Baden-Württemberg', name: 'Landesinformationsfreiheitsgesetz', abbr: 'LIFG', kind: 'ifg',
    summary: 'Anspruch auf Zugang zu amtlichen Informationen des Landes; § 11 regelt Veröffentlichungspflichten und ein Informationsregister.',
    url: 'https://www.landesrecht-bw.de/jportal/?quelle=jlink&query=InfFrG+BW&psml=bsbawueprod.psml&max=true&aiz=true' },
  { land: 'Bayern', name: 'Bayerisches Digitalgesetz, Art. 14 (Offene Daten)', abbr: 'BayDiG', kind: 'kein',
    summary: 'Kein allgemeines Landes-Informationsfreiheitsgesetz. Für Open Data einschlägig ist Art. 14 BayDiG; einzelne Kommunen haben eigene Informationsfreiheitssatzungen.',
    url: 'https://www.gesetze-bayern.de/Content/Document/BayDiG-14' },
  { land: 'Berlin', name: 'Berliner Informationsfreiheitsgesetz', abbr: 'IFG Bln', kind: 'ifg',
    summary: 'Eines der ältesten Landes-IFG; § 17 enthält Veröffentlichungspflichten.',
    url: 'https://gesetze.berlin.de/bsbe/document/jlr-InfFrGBErahmen' },
  { land: 'Brandenburg', name: 'Akteneinsichts- und Informationszugangsgesetz', abbr: 'AIG', kind: 'ifg',
    summary: 'Recht auf Akteneinsicht gegenüber Landesbehörden, Kommunen und beliehenen Stellen.',
    url: 'https://bravors.brandenburg.de/gesetze/aig' },
  { land: 'Bremen', name: 'Bremer Informationsfreiheitsgesetz', abbr: 'BremIFG', kind: 'transparenz',
    summary: 'Formal ein IFG, wirkt aber wie ein Transparenzgesetz: Veröffentlichungspflichten und ein zentrales Transparenzportal.',
    url: 'https://www.transparenz.bremen.de/metainformationen/gesetz-ueber-die-freiheit-des-zugangs-zu-informationen-fuer-das-land-bremen-bremer-informationsfreiheitsgesetz-bremifg-vom-16-mai-2006-67770?template=20_gp_ifg_meta_detail_d' },
  { land: 'Hamburg', name: 'Hamburgisches Transparenzgesetz', abbr: 'HmbTG', kind: 'transparenz',
    summary: 'Vorreiter der Transparenzgesetze: Pflicht zur aktiven Veröffentlichung im Informationsregister, maschinenlesbar und durchsuchbar.',
    url: 'https://www.landesrecht-hamburg.de/bsha/document/jlr-TranspGHArahmen' },
  { land: 'Hessen', name: 'Hessisches Datenschutz- und Informationsfreiheitsgesetz', abbr: 'HDSIG', kind: 'ifg',
    summary: 'Verbindet Datenschutz und Informationsfreiheit in einem Gesetz; der Informationszugangsanspruch steht in § 80 ff.',
    url: 'https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-DSIFGHErahmen' },
  { land: 'Mecklenburg-Vorpommern', name: 'Informationsfreiheitsgesetz Mecklenburg-Vorpommern', abbr: 'IFG M-V', kind: 'ifg',
    summary: 'Anspruch auf Zugang zu amtlichen Informationen gegenüber Landes- und Kommunalbehörden.',
    url: 'https://www.landesrecht-mv.de/bsmv/document/jlr-InfFrGMVV1P1' },
  { land: 'Niedersachsen', name: 'Niedersächsisches Umweltinformationsgesetz', abbr: 'NUIG', kind: 'kein',
    summary: 'Kein allgemeines Landes-Informationsfreiheitsgesetz. Zugangsansprüche bestehen fachbezogen, etwa für Umweltinformationen nach dem NUIG – einzelne Kommunen haben eigene Informationsfreiheitssatzungen beschlossen.',
    url: 'https://nds-voris.de/jportal/?max=true&psml=bsvorisprod.psml&quelle=jlink&query=UIG+ND+%C2%A7+6' },
  { land: 'Nordrhein-Westfalen', name: 'Informationsfreiheitsgesetz Nordrhein-Westfalen', abbr: 'IFG NRW', kind: 'ifg',
    summary: 'Anspruch auf Zugang zu amtlichen Informationen des Landes und der Kommunen.',
    url: 'https://recht.nrw.de/lrgv/gesetz/31122024-gesetz-ueber-die-freiheit-des-zugangs-zu-informationen-fuer-das-land-nordrhein/' },
  { land: 'Rheinland-Pfalz', name: 'Landestransparenzgesetz', abbr: 'LTranspG', kind: 'transparenz',
    summary: 'Transparenzgesetz mit aktiver Veröffentlichungspflicht und zentraler Transparenzplattform.',
    url: 'https://www.landesrecht.rlp.de/bsrp/document/jlr-TranspGRPrahmen' },
  { land: 'Saarland', name: 'Saarländisches Informationsfreiheitsgesetz', abbr: 'SIFG', kind: 'ifg',
    summary: 'Erklärt das Informationsfreiheitsgesetz des Bundes für die saarländische Verwaltung für anwendbar.',
    url: 'https://recht.saarland.de/bssl/document/jlr-SIFGSL2006rahmen' },
  { land: 'Sachsen', name: 'Sächsisches Transparenzgesetz', abbr: 'SächsTranspG', kind: 'transparenz',
    summary: 'Anspruch auf Veröffentlichung und Zugang; veröffentlichte Informationen kommen unverzüglich und im Volltext auf die Transparenzplattform.',
    url: 'https://www.revosax.sachsen.de/vorschrift/19699-Saechsisches-Transparenzgesetz' },
  { land: 'Sachsen-Anhalt', name: 'Informationszugangsgesetz Sachsen-Anhalt', abbr: 'IZG LSA', kind: 'ifg',
    summary: 'Anspruch auf Zugang zu amtlichen Informationen gegenüber Behörden des Landes und der Kommunen.',
    url: 'https://www.landesrecht.sachsen-anhalt.de/jportal/?quelle=jlink&query=InfZG+ST&psml=bssahprod.psml&max=true&aiz=true' },
  { land: 'Schleswig-Holstein', name: 'Informationszugangsgesetz für das Land Schleswig-Holstein', abbr: 'IZG-SH', kind: 'ifg',
    summary: 'Zugang zu Informationen bei informationspflichtigen Stellen des Landes und der Kommunen.',
    url: 'https://www.gesetze-rechtsprechung.sh.juris.de/jportal/perma?portal=bssh&j=InfoZG_SH' },
  { land: 'Thüringen', name: 'Thüringer Transparenzgesetz', abbr: 'ThürTG', kind: 'transparenz',
    summary: 'Transparenzgesetz mit aktiver Veröffentlichungspflicht; löste das frühere Thüringer Informationsfreiheitsgesetz ab.',
    url: 'https://landesrecht.thueringen.de/bsth/document/jlr-TranspGTHrahmen' },
];
/* Kommunale Informationsfreiheitssatzungen. Wo ein Landesgesetz fehlt, können
   Kommunen Informationsfreiheit über ihre Satzungsautonomie selbst einführen.

   BEWUSST KEINE LISTE der einzelnen Kommunen: es sind mehrere Dutzend, der
   Stand ändert sich laufend, und eine eingefrorene Momentaufnahme im Werkzeug
   wäre nach kurzer Zeit falsch. Verlinkt werden deshalb gepflegte Übersichten
   plus ein amtliches Beispiel. `amtlich` unterscheidet die amtliche Fundstelle
   von zivilgesellschaftlichen Sammlungen – das gehört offengelegt. */
const KOMMUNAL_SATZUNGEN = [
  { name: 'Übersicht der bayerischen Kommunen', amtlich: false,
    summary: 'Laufend gepflegte Liste des Bündnisses Informationsfreiheit für Bayern; nach dessen Angaben haben rund 80 Kommunen eine Satzung, darunter alle bayerischen Großstädte. Die Daten liegen zusätzlich maschinenlesbar vor.',
    url: 'https://informationsfreiheit.org/ubersicht/' },
  { name: 'Kommunale Satzungen (FragDenStaat)', amtlich: false,
    summary: 'Erläutert, was eine kommunale Satzung gegenüber einem Landesgesetz leistet und worauf bei einer Anfrage zu achten ist.',
    url: 'https://fragdenstaat.de/hilfe/erste-anfrage/welche-besonderheiten-gibt-es-in-den-laendergesetzen/kommunale-satzungen/' },
  { name: 'Beispiel München: Informationsfreiheitssatzung', amtlich: true,
    summary: 'Amtlicher Volltext im Stadtrecht der Landeshauptstadt – zeigt, wie eine solche Satzung konkret aufgebaut ist.',
    url: 'https://stadt.muenchen.de/rathaus/stadtrecht/vorschrift/38/version1/0.html' },
  { name: 'Beispiele aus Niedersachsen', amtlich: false,
    summary: 'Auch ohne Landesgesetz haben niedersächsische Kommunen Satzungen beschlossen (u. a. Oldenburg, Hameln, Lingen, Salzgitter). Rechtsgrundlage ist die kommunale Satzungsautonomie.',
    url: 'https://informationsfreiheit.org/category/woanders/niedersachsen/' },
];

/* Prüfwerkzeuge und Normtexte. Die eigene Qualitätsprüfung deckt die
   häufigsten Fehler ab, ist aber KEINE vollständige SHACL-Validierung –
   die bräuchte eine RDF-Bibliothek und damit eine Laufzeit-Abhängigkeit,
   die DatenLotse bewusst nicht hat. Statt das zu verschweigen, verweist
   das Werkzeug auf die offiziellen Validatoren. */
const PRUEF_WERKZEUGE = [
  { name: 'SHACL-Validator der EU (DCAT-AP)',
    summary: 'Offizieller Validator der Interoperability Test Bed: JSON-LD oder Turtle hochladen bzw. per URL prüfen lassen. Deckt die vollständigen SHACL-Regeln ab – mehr, als eine regelbasierte Prüfung im Browser leisten kann.',
    url: 'https://www.itb.ec.europa.eu/shacl/dcat-ap/upload' },
  { name: 'DCAT-AP.de-Spezifikation 2.0',
    summary: 'Der Normtext hinter dem Export: semantische Regeln für die Kommunikation mit GovData und dem europäischen Datenportal.',
    url: 'https://www.dcat-ap.de/def/dcatde/2.0/spec/' },
  { name: 'DCAT-AP.de-Konventionenhandbuch',
    summary: 'Ergänzende Regeln, Wertelisten und URIs, die speziell für die Anlieferung an GovData gelten – hier steht auch, welche Felder beim Harvesting tatsächlich verlangt werden.',
    url: 'https://www.dcat-ap.de/def/dcatde/2.0/implRules/' },
  { name: 'GovData: Metadaten-Struktur',
    summary: 'Portalseitige Beschreibung des Metadatenschemas – nützlich für die Abstimmung mit der eigenen Datenbereitstellung.',
    url: 'https://www.govdata.de/metadatenschema' },
];

const LAENDER_KIND = {
  transparenz: { label: 'Transparenzgesetz', hint: 'aktive Veröffentlichungspflicht' },
  ifg:         { label: 'Informationsfreiheitsgesetz', hint: 'Zugang auf Antrag' },
  kein:        { label: 'Kein allgemeines Landesgesetz', hint: 'nur fachbezogene Ansprüche' },
};

const METHOD_MODELS = [
  { name: 'Open Data Readiness Assessment (ODRA)', by: 'World Bank', desc: 'Bewertet die organisatorische, rechtliche und infrastrukturelle Bereitschaft für Open Data.' },
  { name: 'Open Data Maturity Report', by: 'data.europa.eu (EU)', desc: 'Jährlicher EU-Reifegradvergleich entlang der Dimensionen Policy, Portal, Impact, Quality.' },
  { name: '5-Sterne-Open-Data', by: 'Tim Berners-Lee', desc: 'Technische Offenheit von ★ (offen lizenziert) bis ★★★★★ (Linked Open Data).' },
  { name: 'DCAT-AP.de', by: 'GovData / IT-Planungsrat', desc: 'Metadaten-Anwendungsprofil für einheitliche, harvestbare Datensatzbeschreibungen.' },
  { name: 'DSGVO & FAIR', by: 'EU', desc: 'Rechtliche Leitplanken (Datenschutz) und Nachnutzbarkeits-Prinzipien (Findable, Accessible, Interoperable, Reusable).' },
];

const wissenFilter = { q: '', land: '' };

function renderWissen() {
  const q = wissenFilter.q.toLowerCase().trim();
  const match = (...parts) => !q || parts.some(p => (p || '').toLowerCase().includes(q));

  const glossary = GLOSSARY.filter(g => match(g.term, g.def));
  const laws = LEGAL_BASIS.filter(l => match(l.name, l.summary));
  const models = METHOD_MODELS.filter(m => match(m.name, m.by, m.desc));

  const gEl = document.getElementById('wissen-glossary');
  if (gEl) gEl.innerHTML = glossary.length
    ? glossary.map(g => `<div class="know-term"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></div>`).join('')
    : '<p class="know-empty">Keine Begriffe passen zur Suche.</p>';

  const lEl = document.getElementById('wissen-laws');
  if (lEl) lEl.innerHTML = laws.length
    ? laws.map(l => `<a class="know-law" href="${esc(l.url)}" target="_blank" rel="noopener">
        <span class="know-law-name">${esc(l.name)} <i class="fas fa-arrow-up-right-from-square"></i></span>
        <span class="know-law-sum">${esc(l.summary)}</span></a>`).join('')
    : '<p class="know-empty">Keine Rechtsgrundlagen passen zur Suche.</p>';

  const laender = LEGAL_BASIS_LAENDER
    .filter(l => !wissenFilter.land || l.land === wissenFilter.land)
    .filter(l => match(l.land, l.name, l.abbr, l.summary, LAENDER_KIND[l.kind].label));
  const lnEl = document.getElementById('wissen-laender');
  if (lnEl) lnEl.innerHTML = laender.length
    ? laender.map(l => `<a class="know-law know-law--${esc(l.kind)}" href="${esc(l.url)}" target="_blank" rel="noopener">
        <span class="know-law-land">${esc(l.land)}<span class="know-kind know-kind--${esc(l.kind)}">${esc(LAENDER_KIND[l.kind].label)}</span></span>
        <span class="know-law-name">${esc(l.name)}${l.abbr ? ` (${esc(l.abbr)})` : ''} <i class="fas fa-arrow-up-right-from-square"></i></span>
        <span class="know-law-sum">${esc(l.summary)}</span></a>`).join('')
    : '<p class="know-empty">Keine Landesregelung passt zur Suche.</p>';

  const kommunal = KOMMUNAL_SATZUNGEN.filter(k => match(k.name, k.summary, 'kommunale Satzung Informationsfreiheitssatzung'));
  const kmEl = document.getElementById('wissen-kommunal');
  if (kmEl) kmEl.innerHTML = kommunal.length
    ? kommunal.map(k => `<a class="know-law know-law--kommunal" href="${esc(k.url)}" target="_blank" rel="noopener">
        <span class="know-law-land"><span class="know-kind know-kind--${k.amtlich ? 'amtlich' : 'sammlung'}">${k.amtlich ? 'Amtliche Fundstelle' : 'Zivilgesellschaftliche Sammlung'}</span></span>
        <span class="know-law-name">${esc(k.name)} <i class="fas fa-arrow-up-right-from-square"></i></span>
        <span class="know-law-sum">${esc(k.summary)}</span></a>`).join('')
    : '<p class="know-empty">Nichts passt zur Suche.</p>';

  const werkzeuge = PRUEF_WERKZEUGE.filter(w => match(w.name, w.summary, 'validator prüfung shacl spezifikation'));
  const wzEl = document.getElementById('wissen-tools');
  if (wzEl) wzEl.innerHTML = werkzeuge.length
    ? werkzeuge.map(w => `<a class="know-law know-law--tool" href="${esc(w.url)}" target="_blank" rel="noopener">
        <span class="know-law-name">${esc(w.name)} <i class="fas fa-arrow-up-right-from-square"></i></span>
        <span class="know-law-sum">${esc(w.summary)}</span></a>`).join('')
    : '<p class="know-empty">Nichts passt zur Suche.</p>';

  const mEl = document.getElementById('wissen-models');
  if (mEl) mEl.innerHTML = models.length
    ? models.map(m => `<div class="know-model"><strong>${esc(m.name)}</strong><span class="know-model-by">${esc(m.by)}</span><p>${esc(m.desc)}</p></div>`).join('')
    : '<p class="know-empty">Keine Modelle passen zur Suche.</p>';

  // Abschnitts-Sichtbarkeit je nach Treffern
  document.getElementById('wissen-sec-glossary')?.classList.toggle('hidden', glossary.length === 0);
  document.getElementById('wissen-sec-laws')?.classList.toggle('hidden', laws.length === 0);
  document.getElementById('wissen-sec-models')?.classList.toggle('hidden', models.length === 0);
  document.getElementById('wissen-sec-laender')?.classList.toggle('hidden', laender.length === 0);
  // Der Bundesland-Filter meint Landesrecht – die kommunale Ebene blendet er aus
  document.getElementById('wissen-sec-kommunal')?.classList.toggle('hidden',
    kommunal.length === 0 || !!wissenFilter.land);
  document.getElementById('wissen-sec-tools')?.classList.toggle('hidden',
    werkzeuge.length === 0 || !!wissenFilter.land);
  document.getElementById('wissen-noresult')?.classList.toggle('hidden',
    glossary.length + laws.length + models.length + laender.length > 0);
}

document.getElementById('wissen-search')?.addEventListener('input', e => { wissenFilter.q = e.target.value; renderWissen(); });
document.getElementById('wissen-land')?.addEventListener('change', e => { wissenFilter.land = e.target.value; renderWissen(); });

/* ──────────────────────────────────────────────────────────────
   Vorlagen & Musterdokumente (Service-Center)

   Generiert fertige, herunterladbare bzw. druckbare Dokumente aus dem
   aktuellen Arbeitsstand: statische Muster (Open-Data-Richtlinie,
   DSFA-Checkliste) sowie datengetriebene Formulare (Veröffentlichungs-
   Freigabe, VVT-Auszug) aus Inventar + Clearing. Print → PDF, Download
   als Markdown/CSV. Alles lokal, keine Übertragung.
   ────────────────────────────────────────────────────────────── */
function orgName() {
  const counts = {};
  inventory.forEach(d => { const p = (d.publisher || '').trim(); if (p) counts[p] = (counts[p] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'Ihre Organisation';
}
function docDate() { return new Date().toLocaleDateString('de-DE'); }

const DOC_CSS = `body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1e1b2e;margin:32px;font-size:12.5px;line-height:1.6}
h1{color:#420093;font-size:22px;margin:0 0 2px} h2{color:#420093;font-size:15px;margin:22px 0 8px}
h3{font-size:13px;margin:16px 0 4px} .muted{color:#7a7591} ul,ol{margin:6px 0 6px 4px;padding-left:20px} li{margin:4px 0}
table{border-collapse:collapse;width:100%;margin-top:6px} th,td{border:1px solid #d9d2e8;padding:6px 9px;text-align:left;vertical-align:top}
th{background:#f3eefb;color:#420093;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
.sign{margin-top:14px;color:#555} .sign span{display:inline-block;min-width:230px;border-bottom:1px solid #999;margin-left:6px}
.form-card{border:1px solid #d9d2e8;border-radius:8px;padding:12px 14px;margin:10px 0;page-break-inside:avoid}
.amp{font-weight:700}
table.kpis{border:none;margin-top:10px} table.kpis td{border:1px solid #d9d2e8;width:25%;padding:10px 12px;text-align:center}
.kpi-num{display:block;font-size:21px;font-weight:800;color:#420093;line-height:1.2}
.kpi-lab{display:block;font-size:11px;font-weight:700;margin-top:3px}
.kpi-sub{display:block;font-size:10.5px;color:#6f6a87;margin-top:2px}
@media print{body{margin:12mm}}`;

function docShell(title, bodyHTML) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>DatenLotse – ${esc(title)}</title>
    <style>${DOC_CSS}</style></head><body>${bodyHTML}
    <p class="muted" style="margin-top:26px;border-top:1px solid #eee;padding-top:8px">Lokal erzeugt mit DatenLotse – keine Datenübertragung. Muster ohne Gewähr, keine Rechtsberatung; an die Gegebenheiten Ihrer Organisation und die jeweils geltenden (Landes-)Gesetze anzupassen.</p>
    </body></html>`;
}
function printDoc(html) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  const go = () => { w.focus(); w.print(); };
  if (w.document.readyState === 'complete') go();
  else w.addEventListener('load', go);
}

/* — Open-Data-Richtlinie (Muster) — */
function policyBodyHTML() {
  const org = esc(orgName());
  return `<h1>Open-Data-Richtlinie (Muster)</h1>
  <p class="muted">${org} · Stand: ${esc(docDate())}</p>
  <h2>1. Zweck &amp; Geltungsbereich</h2>
  <p>Diese Richtlinie regelt die Bereitstellung offener Daten (Open Data) der ${org}. Sie gilt für alle Organisationseinheiten, die Daten erheben, verarbeiten oder veröffentlichen.</p>
  <h2>2. Grundsätze</h2>
  <ul>
    <li><strong>Open by default:</strong> Daten werden grundsätzlich offen bereitgestellt, sofern keine rechtlichen, datenschutz- oder sicherheitsbezogenen Gründe entgegenstehen.</li>
    <li><strong>Maschinenlesbarkeit &amp; offene Formate</strong> (CSV, JSON, GeoJSON, XML …) nach DCAT-AP.de.</li>
    <li><strong>Offene Lizenzierung</strong> (DL-DE-BY-2.0 oder offener; keine NC-/ND-/Share-Alike-Einschränkungen).</li>
    <li><strong>Datenschutz:</strong> personenbezogene Daten werden vor einer Veröffentlichung geprüft (Risiko-Clearing) und bei Bedarf anonymisiert bzw. pseudonymisiert.</li>
  </ul>
  <h2>3. Rollen &amp; Verantwortlichkeiten</h2>
  <ul>
    <li><strong>Data Owner</strong> – fachliche Verantwortung je Datendomäne.</li>
    <li><strong>Data Steward</strong> – operative Pflege und Metadatenqualität.</li>
    <li><strong>Datenschutzbeauftragte:r</strong> – Prüfung bei DSGVO-Relevanz.</li>
    <li><strong>Leitung</strong> – Freigabe zur Veröffentlichung.</li>
  </ul>
  <h2>4. Prozess</h2>
  <ol>
    <li>Inventarisierung nach DCAT-AP.de.</li>
    <li>Risiko-Clearing (Rot/Gelb/Grün).</li>
    <li>Aufbereitung (Pseudonymisierung/Aggregation) bei Bedarf.</li>
    <li>Freigabe und Veröffentlichung über GovData/CKAN.</li>
    <li>Pflege, Monitoring und Rückkopplung (zirkuläres Ökosystem).</li>
  </ol>
  <h2>5. Qualität &amp; Aktualität</h2>
  <p>Metadaten werden vollständig gepflegt; Datensätze erhalten einen dokumentierten Aktualisierungszyklus. Die Publish-Ready-Prüfung wird vor jeder Veröffentlichung durchlaufen.</p>
  <h2>6. Inkrafttreten</h2>
  <p class="sign">Ort, Datum:<span></span></p>
  <p class="sign">Unterschrift (Leitung):<span></span></p>`;
}
function policyMarkdown() {
  const org = orgName();
  return `# Open-Data-Richtlinie (Muster)

_${org} · Stand: ${docDate()}_

## 1. Zweck & Geltungsbereich
Diese Richtlinie regelt die Bereitstellung offener Daten (Open Data) der ${org}. Sie gilt für alle Organisationseinheiten, die Daten erheben, verarbeiten oder veröffentlichen.

## 2. Grundsätze
- **Open by default:** Daten werden grundsätzlich offen bereitgestellt, sofern keine rechtlichen, datenschutz- oder sicherheitsbezogenen Gründe entgegenstehen.
- **Maschinenlesbarkeit & offene Formate** (CSV, JSON, GeoJSON, XML …) nach DCAT-AP.de.
- **Offene Lizenzierung** (DL-DE-BY-2.0 oder offener; keine NC-/ND-/Share-Alike-Einschränkungen).
- **Datenschutz:** personenbezogene Daten werden vor einer Veröffentlichung geprüft (Risiko-Clearing) und bei Bedarf anonymisiert bzw. pseudonymisiert.

## 3. Rollen & Verantwortlichkeiten
- **Data Owner** – fachliche Verantwortung je Datendomäne.
- **Data Steward** – operative Pflege und Metadatenqualität.
- **Datenschutzbeauftragte:r** – Prüfung bei DSGVO-Relevanz.
- **Leitung** – Freigabe zur Veröffentlichung.

## 4. Prozess
1. Inventarisierung nach DCAT-AP.de.
2. Risiko-Clearing (Rot/Gelb/Grün).
3. Aufbereitung (Pseudonymisierung/Aggregation) bei Bedarf.
4. Freigabe und Veröffentlichung über GovData/CKAN.
5. Pflege, Monitoring und Rückkopplung.

## 5. Qualität & Aktualität
Metadaten werden vollständig gepflegt; Datensätze erhalten einen dokumentierten Aktualisierungszyklus. Die Publish-Ready-Prüfung wird vor jeder Veröffentlichung durchlaufen.

## 6. Inkrafttreten
Ort, Datum: ____________________

Unterschrift (Leitung): ____________________

---
_Muster ohne Gewähr, keine Rechtsberatung; an die Gegebenheiten Ihrer Organisation und die geltenden (Landes-)Gesetze anzupassen._
`;
}

/* — DSFA-Kurz-Checkliste (Muster) — */
const DSFA_ITEMS = [
  'Werden personenbezogene Daten verarbeitet? Wenn nein: keine DSFA erforderlich.',
  'Umfangreiche Verarbeitung besonderer Kategorien (Art. 9 DSGVO)?',
  'Systematische umfangreiche Überwachung öffentlich zugänglicher Bereiche?',
  'Scoring/Profiling oder automatisierte Entscheidungen mit Rechtswirkung?',
  'Zusammenführung/Abgleich von Datensätzen aus verschiedenen Quellen?',
  'Betroffene besonders schutzbedürftig (z. B. Kinder, Beschäftigte)?',
  'Einsatz neuer Technologien mit hohem Risiko?',
  'Rechtsgrundlage der Verarbeitung dokumentiert?',
  'Technische & organisatorische Maßnahmen (TOM) festgelegt?',
  'Löschkonzept/Aufbewahrungsfristen definiert?',
];
function dsfaBodyHTML() {
  const org = esc(orgName());
  return `<h1>DSFA – Kurz-Checkliste (Muster)</h1>
  <p class="muted">${org} · Stand: ${esc(docDate())} · Vorprüfung nach Art. 35 DSGVO</p>
  <p>Diese Kurz-Checkliste dient der <strong>Vorprüfung</strong>, ob für eine Verarbeitung eine Datenschutz-Folgenabschätzung (DSFA) erforderlich ist. Mehrere „Ja" deuten auf ein hohes Risiko und damit auf eine DSFA-Pflicht hin – im Zweifel die/den Datenschutzbeauftragte:n einbeziehen.</p>
  <table><thead><tr><th style="width:70%">Prüfpunkt</th><th style="text-align:center">Ja</th><th style="text-align:center">Nein</th></tr></thead>
  <tbody>${DSFA_ITEMS.map(i => `<tr><td>${esc(i)}</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td></tr>`).join('')}</tbody></table>
  <h3>Ergebnis</h3>
  <p>☐ Keine DSFA erforderlich &nbsp;&nbsp; ☐ DSFA erforderlich &nbsp;&nbsp; ☐ Rücksprache DSB</p>
  <p class="sign">Bearbeiter:in / Datum:<span></span></p>
  <p class="sign">Datenschutzbeauftragte:r:<span></span></p>`;
}
function dsfaMarkdown() {
  const org = orgName();
  return `# DSFA – Kurz-Checkliste (Muster)

_${org} · Stand: ${docDate()} · Vorprüfung nach Art. 35 DSGVO_

Diese Kurz-Checkliste dient der **Vorprüfung**, ob eine Datenschutz-Folgenabschätzung erforderlich ist. Mehrere „Ja" deuten auf DSFA-Pflicht hin – im Zweifel die/den Datenschutzbeauftragte:n einbeziehen.

${DSFA_ITEMS.map(i => `- [ ] ${i}`).join('\n')}

## Ergebnis
- [ ] Keine DSFA erforderlich
- [ ] DSFA erforderlich
- [ ] Rücksprache DSB

Bearbeiter:in / Datum: ____________________

Datenschutzbeauftragte:r: ____________________

---
_Muster ohne Gewähr, keine Rechtsberatung._
`;
}

/* — Veröffentlichungs-Freigabe-Formular (datengetrieben) — */
function freigabeBodyHTML() {
  const org = esc(orgName());
  const accessLabel = { PUBLIC: 'Öffentlich', RESTRICTED: 'Eingeschränkt', NON_PUBLIC: 'Nicht öffentlich' };
  const ampLabel = { gruen: 'Grün · Freigabe', gelb: 'Gelb · Prüfen', rot: 'Rot · Sperren' };
  const ampColor = { gruen: '#2e9e60', gelb: '#d4820a', rot: '#c0392b' };
  const cards = inventory.map(d => {
    const amp = d.clearing?.ampel;
    return `<div class="form-card">
      <h3>${esc(d.title || '(ohne Titel)')}</h3>
      <p class="muted" style="margin:0 0 6px">${esc(d.sourceSystem || '—')} · ${esc(d.publisher || '—')} · ${esc(d.contactPoint || 'kein Kontakt')}</p>
      <p style="margin:0"><strong>Lizenz:</strong> ${esc(distLicenseLabels(d))} &nbsp;·&nbsp; <strong>Zugriffsrechte:</strong> ${esc(accessLabel[d.accessRights] || d.accessRights || '—')} &nbsp;·&nbsp; <strong>Vollständigkeit:</strong> ${completeness(d)} %</p>
      <p style="margin:6px 0 0"><strong>Risiko-Clearing:</strong> <span class="amp" style="color:${ampColor[amp] || '#7a7591'}">${ampLabel[amp] || '—'}</span>${d.clearing?.empfehlung ? ` – ${esc(d.clearing.empfehlung)}` : ''}</p>
      <p style="margin:8px 0 0">Freigabe zur Veröffentlichung: ☐ Ja&nbsp;&nbsp;☐ Nein&nbsp;&nbsp;☐ Nur aggregiert/anonymisiert</p>
      <p class="sign" style="margin-top:8px">Datenschutz geprüft (Datum/Name):<span></span></p>
      <p class="sign">Freigegeben (Leitung, Datum):<span></span></p>
    </div>`;
  }).join('');
  return `<h1>Veröffentlichungs-Freigabe</h1>
  <p class="muted">${org} · Stand: ${esc(docDate())} · ${inventory.length} Datensätze</p>
  <p>Dokumentiert je Datensatz die Metadaten, das Ergebnis des Risiko-Clearings und die formale Freigabe zur Open-Data-Veröffentlichung.</p>
  ${cards}`;
}

/* — VVT-Auszug: DSGVO-relevante Datensätze (Bezug zu Art. 30 DSGVO) — */
function vvtRows() {
  return inventory
    .map((d, i) => ({ d, i, dsgvo: /dsgvo/i.test(d._grafSchutzbedarf || '') || ['rot', 'gelb'].includes(d.clearing?.ampel) }))
    .filter(r => r.dsgvo);
}
function vvtBodyHTML() {
  const org = esc(orgName());
  const rows = vvtRows();
  const ampLabel = { gruen: 'Grün', gelb: 'Gelb', rot: 'Rot' };
  const body = rows.length ? rows.map(({ d }) => `<tr>
      <td>${esc(d.title || '—')}</td>
      <td>${esc(d.sourceSystem || '—')}</td>
      <td>${esc(d._grafSchutzbedarf || '—')}</td>
      <td>${esc(ampLabel[d.clearing?.ampel] || '—')}</td>
      <td></td><td></td><td></td>
    </tr>`).join('') : `<tr><td colspan="7" class="muted">Keine DSGVO-relevanten Datensätze erkannt (weder DSGVO-Schutzbedarf noch Clearing Gelb/Rot).</td></tr>`;
  return `<h1>VVT-Auszug – DSGVO-relevante Datensätze</h1>
  <p class="muted">${org} · Stand: ${esc(docDate())} · Bezug zu Art. 30 DSGVO (Verzeichnis von Verarbeitungstätigkeiten)</p>
  <p>Startpunkt für das Verzeichnis von Verarbeitungstätigkeiten: aufgeführt sind Datensätze mit DSGVO-Schutzbedarf bzw. Clearing-Ampel Gelb/Rot. Die offenen Spalten (Zweck, Rechtsgrundlage, Löschfrist) sind organisationsspezifisch zu ergänzen.</p>
  <table><thead><tr><th>Datensatz</th><th>Quellsystem</th><th>Schutzbedarf</th><th>Clearing</th><th>Zweck</th><th>Rechtsgrundlage</th><th>Löschfrist</th></tr></thead>
  <tbody>${body}</tbody></table>`;
}
function vvtCSV() {
  const head = ['Datensatz', 'Quellsystem', 'Schutzbedarf', 'ClearingAmpel', 'Zweck', 'Rechtsgrundlage', 'Loeschfrist'].join(',');
  const rows = vvtRows().map(({ d }) =>
    [d.title, d.sourceSystem, d._grafSchutzbedarf, d.clearing?.ampel || '', '', '', ''].map(csvCell).join(','));
  return [head, ...rows].join('\n');
}

/* ── Status-Einseiter ─────────────────────────────────────────────
   Eine Seite über ALLE Bausteine – für Vorstellungstermine, Leitungsrunden
   und Gremien. Die vorhandenen Berichte gehen jeweils in die Tiefe eines
   Moduls; hier fehlte die zusammenfassende Sicht auf einer Seite.

   Bewusst nur ABGELEITETE Zahlen aus dem aktuellen Stand – keine
   Bewertungen, keine Prognosen. Was offen ist, steht als nächster Schritt
   daneben, damit die Seite nicht bloß Status meldet, sondern handhabbar ist.
   ────────────────────────────────────────────────────────────── */
function statusKennzahlen() {
  const kScore = kompassOverall();
  const gScore = reifegrad().score;
  const gBeantwortet = Object.keys(governanceAnswers).length;
  const n = inventory.length;
  const avg = n ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / n) : 0;
  const ampel = { gruen: 0, gelb: 0, rot: 0 };
  if (n) { ensureAllClearing(); inventory.forEach(d => ampel[d.clearing.ampel]++); }
  const qual = { gruen: 0, gelb: 0, rot: 0 };
  inventory.forEach(d => qual[qualityStatus(validateDataset(d))]++);
  return { kScore, kAmp: kompassAmpel(kScore), gScore, gAmp: reifeAmpel(gScore),
           gBeantwortet, n, avg, ampel, qual };
}

/* Nächste Schritte aus dem Stand ableiten – geordnet nach dem, was den
   größten Unterschied macht. Keine Rangfolge aus dem Bauch: die Regeln
   entsprechen den Phasen des Werkzeugs. */
function statusNaechsteSchritte(k) {
  const s = [];
  if (!k.n) s.push('Dateninventar aufbauen: DatenGraf-CSV importieren oder mit einem Beispieldatensatz starten.');
  if (!k.gBeantwortet) s.push('Governance-Reifegrad ausfüllen (8 Fragen) – er zeigt, welche Rollen noch unbesetzt sind.');
  if (k.qual.rot) s.push(`${k.qual.rot} Datensätze haben Pflichtfeld-Fehler und wären für ein Portal nicht harvestbar.`);
  if (k.n && k.avg < 80) s.push(`Metadaten vervollständigen: derzeit ${k.avg} % der DCAT-AP.de-Pflichtfelder gefüllt.`);
  if (k.ampel.rot) s.push(`${k.ampel.rot} Datensätze stehen im Clearing auf Rot – Veröffentlichung ist dort gesperrt.`);
  if (k.ampel.gelb) s.push(`${k.ampel.gelb} Datensätze brauchen eine manuelle Prüfung (Clearing gelb).`);
  if (k.kScore < 50) s.push('Daten-Kompass durchgehen – er benennt die Lücken je Dimension und verweist auf den passenden Baustein.');
  if (!s.length) s.push('Keine offenen Punkte aus dem aktuellen Stand – Phase 4 (Pipeline) und Phase 5 (Feedback) sind der nächste Schritt.');
  return s.slice(0, 5);
}

function statusBodyHTML() {
  const k = statusKennzahlen();
  const kachel = (titel, wert, unter) =>
    `<td><div class="kpi"><span class="kpi-num">${esc(wert)}</span><span class="kpi-lab">${esc(titel)}</span>
      <span class="kpi-sub">${esc(unter)}</span></div></td>`;

  return `
    <h1>Open Data – Status auf einen Blick</h1>
    <p class="muted">${esc(orgName())} · Stand ${esc(docDate())}</p>

    <h2>Kennzahlen</h2>
    <table class="kpis"><tr>
      ${kachel('Daten-Kompass', `${k.kScore} / 100`, k.kAmp.label)}
      ${kachel('Governance-Reifegrad', `${k.gScore} / 100`, k.gBeantwortet ? k.gAmp.label : 'noch nicht beantwortet')}
      ${kachel('Datensätze im Inventar', String(k.n), `Ø ${k.avg} % DCAT-AP.de-vollständig`)}
      ${kachel('Publikationsbereit', String(k.qual.gruen), `${k.qual.gelb} mit Warnungen · ${k.qual.rot} mit Fehlern`)}
    </tr></table>

    <h2>Risiko-Clearing</h2>
    <table>
      <tr><th>Einstufung</th><th>Anzahl</th><th>Bedeutung</th></tr>
      <tr><td class="amp">Grün</td><td>${k.ampel.gruen}</td><td>Kein Personenbezug erkennbar – Veröffentlichung möglich.</td></tr>
      <tr><td class="amp">Gelb</td><td>${k.ampel.gelb}</td><td>Manuelle Prüfung nötig, ggf. Anonymisierung oder Aggregation.</td></tr>
      <tr><td class="amp">Rot</td><td>${k.ampel.rot}</td><td>Veröffentlichung gesperrt (Art. 9 DSGVO bzw. fehlende Rechtsgrundlage).</td></tr>
    </table>
    <p class="muted">Ergebnis eines transparenten Entscheidungsbaums, kein maschinelles Lernen. Die Einstufung ersetzt keine rechtliche Prüfung im Einzelfall.</p>

    <h2>Nächste Schritte</h2>
    <ol>${statusNaechsteSchritte(k).map(x => `<li>${esc(x)}</li>`).join('')}</ol>

    <h2>Grundlage</h2>
    <p>Erhoben mit <strong>DatenLotse</strong> entlang anerkannter Modelle (World-Bank ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de, DSGVO/FAIR). Alle Auswertungen entstanden lokal im Browser; es wurden keine Daten übertragen.</p>
    <p class="muted">Ohne Gewähr – dieses Dokument ist eine Arbeitsgrundlage und keine Rechtsberatung.</p>`;
}

function generateDoc(doc, fmt) {
  if (doc === 'status') {
    printDoc(docShell('Status auf einen Blick', statusBodyHTML()));
    return;
  }
  if (doc === 'policy') {
    if (fmt === 'md') downloadBlob(policyMarkdown(), 'open-data-richtlinie-muster.md', 'text/markdown');
    else printDoc(docShell('Open-Data-Richtlinie (Muster)', policyBodyHTML()));
  } else if (doc === 'dsfa') {
    if (fmt === 'md') downloadBlob(dsfaMarkdown(), 'dsfa-checkliste-muster.md', 'text/markdown');
    else printDoc(docShell('DSFA-Kurz-Checkliste (Muster)', dsfaBodyHTML()));
  } else if (doc === 'freigabe') {
    if (!inventory.length) { alert('Bitte zuerst ein Dateninventar importieren – das Freigabe-Formular wird daraus erzeugt.'); return; }
    ensureAllClearing();
    printDoc(docShell('Veröffentlichungs-Freigabe', freigabeBodyHTML()));
  } else if (doc === 'vvt') {
    if (!inventory.length) { alert('Bitte zuerst ein Dateninventar importieren – der VVT-Auszug wird daraus erzeugt.'); return; }
    ensureAllClearing();
    if (fmt === 'csv') downloadBlob(vvtCSV(), 'vvt-auszug-dsgvo.csv', 'text/csv');
    else printDoc(docShell('VVT-Auszug (DSGVO-relevante Datensätze)', vvtBodyHTML()));
  }
}
document.querySelectorAll('#vorlagen-view [data-doc]').forEach(btn =>
  btn.addEventListener('click', () => generateDoc(btn.dataset.doc, btn.dataset.fmt)));

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
  iban: 'IBAN', email: 'E-Mail', telefon: 'Telefon', geburtsdatum: 'Geburtsdatum',
  svnr: 'Sozialvers.-Nr.', steuerid: 'Steuer-ID', kfz: 'Kfz-Kennzeichen'
};
const PSEUDO_PH = {
  name: 'PERSON', strasse: 'ADRESSE', plzort: 'ORT', az: 'AZ',
  iban: 'IBAN', email: 'EMAIL', telefon: 'TELEFON', geburtsdatum: 'GEBURTSDATUM',
  svnr: 'SVNR', steuerid: 'STEUERID', kfz: 'KFZ'
};
// Reihenfolge = Priorität (spezifisch → allgemein). Das greedy Telefon-Muster
// steht bewusst ZULETZT: spezifische bzw. kontextgetriggerte Muster belegen ihre
// Textstellen zuerst (siehe collectSpans-Maskierung) und gewinnen dadurch.
const PSEUDO_PATTERNS = [
  { type: 'iban',         re: /DE\d{2}\s?(?:\d{4}\s?){4}\d{2}/g },
  { type: 'svnr',         re: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{2,3}\b/g },
  { type: 'steuerid',     re: /(?:Steuer-?(?:identifikationsnummer|ID|IdNr|nummer)|IdNr|St(?:euer)?\.?-?Nr)\.?\s*[:.]?\s*(\d{2}[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{3}|\d{11})/gid, group: 1 },
  { type: 'email',        re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g },
  { type: 'az',           re: /\b(?:Az|Gz|Aktenzeichen|Geschäftszeichen)\.?\s*[:\-]?\s*[A-Z0-9]+(?:[\/\-.][A-Z0-9]+){1,3}\b/g },
  { type: 'geburtsdatum', re: /(?:geb\.?|geboren am|Geburtsdatum|Geburtstag)\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/gid, group: 1 },
  // Kfz nur KONTEXTGETRIGGERT: das reine Muster traf sonst Lizenz-/Normkürzel
  // („DL-DE 2.0“, „CC-BY 4.0“, „DIN-EN 1090“). Ein Ausschluss per Kürzel-Liste
  // scheidet aus, weil DL und EN echte Unterscheidungszeichen sind.
  { type: 'kfz',          re: /(?:Kennzeichen|Kfz|KFZ|Nummernschild|Fahrzeug|Pkw|PKW|Lkw|LKW)\s*:?\s*(?:amtliches\s+)?([A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\s?\d{1,4}[EH]?)\b/gd, group: 1 },
  { type: 'strasse',      re: /[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|weg|gasse|allee|platz|ring|damm)\s+\d+[a-z]?/g },
  // PLZ+Ort: das Muster traf jede 5-stellige Zahl vor einem Substantiv
  // („50000 Datensätze“, „12345 Einwohner“). Ausgeschlossen werden deshalb
  // gängige Zähl-/Maßeinheiten. Bewusst KEINE Positionsregel (nur nach Komma):
  // die hätte „wohnhaft in 12345 Musterstadt“ übersehen – ein Falsch-Negativ
  // wiegt hier schwerer als ein Falschtreffer.
  { type: 'plzort',       re: /\b\d{5}\s+(?!(?:Einwohner|Datensätze|Datensatz|Euro|Personen|Bürger|Haushalte|Fälle|Anträge|Stück|Meter|Kilometer|Quadratmeter|Besucher|Nutzer|Zeilen|Zugriffe|Exemplare|Dokumente|Objekte|Beschäftigte|Mitarbeitende|Stunden|Tonnen)\b)[A-ZÄÖÜ][a-zäöüß]+(?:[\-\s][A-ZÄÖÜ][a-zäöüß]+)?/g },
  // Anrede (+ optionale akademische Titel) triggert; erfasst wird nur der Name.
  { type: 'name',         re: /(?:Herr|Frau|Hr\.|Fr\.|Dr\.|Prof\.)(?:\s+(?:Dr|Prof|Dipl|Ing|Mag|habil|med|rer|nat|phil|jur|h\.\s?c)\.?)*\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/gd, group: 1 },
  // Bindestrich nur direkt vor einer Ziffer: „0800 - 1600 Uhr“ ist eine
  // Zeitspanne, keine Rufnummer. Verbleibende Grenze: freistehende
  // Ziffernblöcke wie Kontonummern sind ohne Kontext nicht unterscheidbar.
  { type: 'telefon',      re: /(?:\+49|0)(?:[\d\s\/()]|-(?=\d)){4,}\d/g },
];

/* Belegte Textstellen werden für nachfolgende (unspezifischere) Muster
   maskiert. Dadurch kann das greedy Telefon-Muster keine bereits erkannte
   PLZ oder Sozialversicherungsnummer mehr verschlucken. Die Maske ist
   längengleich, sodass alle Indizes auf den Originaltext passen. */
const PSEUDO_MASK = '\u0000';
function maskRanges(text, spans) {
  if (!spans.length) return text;
  const arr = text.split('');
  spans.forEach(s => { for (let i = s.start; i < s.end; i++) arr[i] = PSEUDO_MASK; });
  return arr.join('');
}

function collectSpans(text) {
  const spans = [];
  let masked = text;
  PSEUDO_PATTERNS.forEach((pat, prio) => {
    pat.re.lastIndex = 0;
    const found = [];
    let m;
    while ((m = pat.re.exec(masked)) !== null) {
      if (m[0] === '') { pat.re.lastIndex++; continue; }
      const gi = pat.group || 0;
      let start, end;
      if (gi && m.indices && m.indices[gi]) [start, end] = m.indices[gi];
      else { start = m.index; end = m.index + m[0].length; }
      const value = text.slice(start, end);
      if (value.includes(PSEUDO_MASK)) continue;   // defensiv: nie über eine Maske hinweg
      found.push({ start, end, type: pat.type, value, prio });
    }
    found.forEach(f => spans.push(f));
    masked = maskRanges(masked, found);            // für alle folgenden Muster sperren
  });
  return spans;
}

function selectSpans(spans) {
  // Überlappungen sind durch die Maskierung praktisch ausgeschlossen; defensiv
  // gilt weiterhin: erster Beginn, dann längster Span, dann höchste Priorität.
  const sorted = [...spans].sort((a, b) =>
    a.start - b.start || (b.end - b.start) - (a.end - a.start) || a.prio - b.prio);
  const out = [];
  let lastEnd = -1;
  for (const s of sorted) {
    if (s.start >= lastEnd) { out.push(s); lastEnd = s.end; }
  }
  return out;
}

/* Zähler und Zuordnung liegen in einem Closure, damit sie über MEHRERE
   Durchläufe hinweg geteilt werden können. Genau das braucht die spaltenweise
   CSV-Bereinigung: derselbe Wert muss über alle Zellen hinweg denselben
   Platzhalter bekommen, sonst wäre die Ausgabe weder konsistent noch
   reidentifizierbar. Für Einzeltexte bleibt pseudonymize() die Ein-Schuss-Form. */
function createPseudonymizer() {
  const counters = {};            // type → laufender Index
  const maps = {};                // type → Map(original → platzhalter)
  const mapping = [];             // eindeutige Einträge in Reihenfolge

  function placeholderFor(type, value) {
    maps[type] = maps[type] || new Map();
    let ph = maps[type].get(value);
    if (!ph) {
      counters[type] = (counters[type] || 0) + 1;
      ph = `[${PSEUDO_PH[type]}_${counters[type]}]`;
      maps[type].set(value, ph);
      mapping.push({ type, label: PSEUDO_LABELS[type], placeholder: ph, original: value });
    }
    return ph;
  }

  function run(text) {
    const selected = selectSpans(collectSpans(text));
    let plain = '', html = '', cursor = 0;
    for (const s of selected) {
      plain += text.slice(cursor, s.start);
      html  += esc(text.slice(cursor, s.start));
      const ph = placeholderFor(s.type, s.value);
      plain += ph;
      html  += `<mark class="pseudo-hit" title="${esc(PSEUDO_LABELS[s.type])}: ${esc(s.value)}">${esc(ph)}</mark>`;
      cursor = s.end;
    }
    plain += text.slice(cursor);
    html  += esc(text.slice(cursor));
    return { text: plain, html, count: selected.length };
  }

  /* Ganze Zelle ersetzen. Nötig, weil die Muster bewusst kontextgetriggert
     sind: in einer Spalte „Name“ steht „Max Mustermann“ ohne Anrede und würde
     vom Namensmuster nicht erfasst. Die Spaltenüberschrift IST hier der
     Kontext – den liefert der Mensch bei der Spaltenauswahl. */
  function whole(value, type) {
    return placeholderFor(type, value);
  }

  return { run, whole, mapping };
}

function pseudonymize(text) {
  const p = createPseudonymizer();
  const r = p.run(text);
  return { text: r.text, html: r.html, mapping: p.mapping, count: r.count };
}

const PSEUDO_DEMO =
`Sehr geehrter Herr Max Mustermann,

in der Sache Az. 12/345/67 (Gz. AB-9/2024) bestätigen wir den Eingang Ihres Antrags.
Herr Max Mustermann, wohnhaft Musterstraße 12a, 12345 Musterstadt,
geb. 03.04.1985, wird um Rückmeldung gebeten.
Steuer-ID: 12 345 678 901, Sozialversicherungsnummer 65 170839 M 003.
Das Fahrzeug mit dem Kennzeichen M-AB 1234 ist betroffen.
Zahlungen erfolgen auf IBAN DE12 3456 7890 1234 5678 90.
Kontakt: max.mustermann@example.de, Tel. +49 30 1234567.
Der Bescheid vom 15.03.2024 bleibt davon unberührt.`;

/* Mapping (Platzhalter ↔ Original) als CSV – für die Reidentifizierung
   bzw. revisionssichere Dokumentation. Bewusst lokal, nichts verlässt
   den Browser. Falsy-sicher über csvCell(). */
function buildPseudoMappingCSV(mapping) {
  const head = ['Platzhalter', 'Typ', 'Original'].join(',');
  const rows = mapping.map(m => [m.placeholder, m.label, m.original].map(csvCell).join(','));
  return [head, ...rows].join('\n');
}

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
      `<div class="pseudo-map-head"><span><i class="fas fa-table-list"></i> Ersetzungen (${res.mapping.length})</span>` +
      `<button class="pseudo-mini-btn" id="pseudo-map-csv-btn"><i class="fas fa-file-csv"></i> Mapping als CSV</button></div>` +
      `<table class="pseudo-map"><thead><tr><th>Platzhalter</th><th>Typ</th><th>Original</th></tr></thead><tbody>` +
      res.mapping.map(m =>
        `<tr><td><code>${esc(m.placeholder)}</code></td><td>${esc(m.label)}</td><td>${esc(m.original)}</td></tr>`
      ).join('') +
      `</tbody></table>`;
    document.getElementById('pseudo-map-csv-btn')?.addEventListener('click', () =>
      downloadBlob(buildPseudoMappingCSV(res.mapping), 'pseudonymisierung-mapping.csv', 'text/csv'));
  } else {
    mapEl.innerHTML = '<div class="pseudo-map-head pseudo-map-empty"><i class="fas fa-circle-check"></i> Keine erkennbaren personenbezogenen Muster gefunden – bitte trotzdem manuell prüfen.</div>';
  }
  dlBtn.hidden = false;
}

/* ── Spaltenweise CSV-Bereinigung ─────────────────────────────────
   Die Muster sind bewusst kontextgetriggert (siehe PSEUDO_PATTERNS) und
   greifen deshalb in strukturierten Daten oft nicht: in einer Spalte „Name“
   steht der Name ohne Anrede. Hier liefert die SPALTENAUSWAHL den Kontext –
   der Mensch entscheidet je Spalte, was sie enthält. Zwei Behandlungen:
     'muster' – Regex-Pack auf den Zellinhalt (für Freitextspalten)
     'ganz'   – ganze Zelle durch einen Platzhalter des gewählten Typs
   Zähler und Zuordnung sind über alle Zellen geteilt (createPseudonymizer),
   damit derselbe Wert überall denselben Platzhalter bekommt.
   ────────────────────────────────────────────────────────────── */
const pseudoCsv = { header: [], rows: [], cols: {} };
const PSEUDO_COL_MODES = [
  ['', 'unverändert lassen'],
  ['muster', 'Muster erkennen'],
  ['ganz', 'ganze Spalte ersetzen'],
];
const PSEUDO_TYPE_OPTIONS = Object.keys(PSEUDO_PH).map(k => [k, PSEUDO_LABELS[k]]);

function parsePseudoCSV(text) {
  const recs = parseCSVRecords(text).filter(r => r.some(c => c.trim() !== ''));
  pseudoCsv.header = recs.length ? recs[0] : [];
  pseudoCsv.rows = recs.slice(1);
  // Spaltenkonfiguration NACH Index, nicht nach Name: doppelte Überschriften
  // sind in Verwaltungsexporten keine Seltenheit und würden sich sonst teilen.
  pseudoCsv.cols = {};
  pseudoCsv.header.forEach((h, i) => { pseudoCsv.cols[i] = { mode: '', type: 'name' }; });
  return pseudoCsv.header.length > 0;
}

function buildPseudoCSVResult() {
  const p = createPseudonymizer();
  const head = pseudoCsv.header.map(csvCell).join(',');
  let count = 0;
  const body = pseudoCsv.rows.map(r => pseudoCsv.header.map((h, i) => {
    const raw = r[i] == null ? '' : r[i];
    const conf = pseudoCsv.cols[i];
    if (!conf || !conf.mode || raw.trim() === '') return csvCell(raw);
    if (conf.mode === 'ganz') { count++; return csvCell(p.whole(raw, conf.type)); }
    const res = p.run(raw);
    count += res.count;
    return csvCell(res.text);
  }).join(','));
  return { csv: [head, ...body].join('\n'), mapping: p.mapping, count };
}

function renderPseudoCsv() {
  const box = document.getElementById('pseudo-csv-cols');
  const run = document.getElementById('pseudo-csv-run');
  if (!box) return;
  if (!pseudoCsv.header.length) {
    box.innerHTML = '<p class="inv-empty">Noch keine CSV geladen – Datei auswählen oder Inhalt einfügen.</p>';
    if (run) run.disabled = true;
    return;
  }
  box.innerHTML =
    `<p class="pseudo-csv-meta"><i class="fas fa-table"></i> ${pseudoCsv.header.length} Spalten · ${pseudoCsv.rows.length} Datenzeilen</p>` +
    `<div class="pseudo-csv-list">` +
    pseudoCsv.header.map((h, i) => {
      const conf = pseudoCsv.cols[i];
      const beispiel = (pseudoCsv.rows.find(r => (r[i] || '').trim() !== '') || [])[i] || '';
      return `<div class="pseudo-csv-col" data-col="${i}">
        <div class="pseudo-csv-name">
          <strong>${esc(h || '(ohne Überschrift)')}</strong>
          ${beispiel ? `<span class="pseudo-csv-sample">z. B. ${esc(beispiel.slice(0, 40))}${beispiel.length > 40 ? '…' : ''}</span>` : ''}
        </div>
        <label class="pseudo-csv-sel">Behandlung
          <select data-col-mode="${i}">${optionsHTML(PSEUDO_COL_MODES, conf.mode)}</select>
        </label>
        <label class="pseudo-csv-sel${conf.mode === 'ganz' ? '' : ' pseudo-csv-sel--off'}">Als
          <select data-col-type="${i}"${conf.mode === 'ganz' ? '' : ' disabled'} aria-label="Entitätstyp für Spalte ${esc(h)}">${optionsHTML(PSEUDO_TYPE_OPTIONS, conf.type)}</select>
        </label>
      </div>`;
    }).join('') + `</div>`;

  box.querySelectorAll('[data-col-mode]').forEach(sel => sel.addEventListener('change', () => {
    pseudoCsv.cols[+sel.dataset.colMode].mode = sel.value;
    renderPseudoCsv();   // Typ-Auswahl nur bei „ganze Spalte“ aktiv
  }));
  box.querySelectorAll('[data-col-type]').forEach(sel => sel.addEventListener('change', () => {
    pseudoCsv.cols[+sel.dataset.colType].type = sel.value;
  }));
  if (run) run.disabled = !Object.values(pseudoCsv.cols).some(c => c.mode);
}

function runPseudoCsv() {
  const out = document.getElementById('pseudo-csv-out');
  if (!out || !pseudoCsv.header.length) return;
  const res = buildPseudoCSVResult();
  out.innerHTML =
    `<div class="pseudo-map-head"><span><i class="fas fa-circle-check"></i> ${res.count} Ersetzungen in ${res.mapping.length} verschiedenen Werten</span>` +
    `<span class="pseudo-csv-btns">` +
    `<button class="pseudo-mini-btn" id="pseudo-csv-dl"><i class="fas fa-file-csv"></i> Bereinigte CSV</button>` +
    `<button class="pseudo-mini-btn" id="pseudo-csv-map"${res.mapping.length ? '' : ' disabled'}><i class="fas fa-table-list"></i> Mapping</button>` +
    `</span></div>` +
    `<pre class="pseudo-csv-preview">${esc(res.csv.split('\n').slice(0, 12).join('\n'))}${res.csv.split('\n').length > 12 ? '\n…' : ''}</pre>`;
  document.getElementById('pseudo-csv-dl')?.addEventListener('click', () =>
    downloadBlob(res.csv, 'bereinigt.csv', 'text/csv'));
  document.getElementById('pseudo-csv-map')?.addEventListener('click', () =>
    downloadBlob(buildPseudoMappingCSV(res.mapping), 'pseudonymisierung-mapping.csv', 'text/csv'));
}

function showPseudoTab(name) {
  ['text', 'csv'].forEach(t => {
    document.getElementById('pseudo-' + t + '-panel')?.classList.toggle('hidden', t !== name);
    const btn = document.getElementById('pseudo-tab-' + t);
    btn?.classList.toggle('is-active', t === name);
    btn?.setAttribute('aria-selected', String(t === name));
  });
  if (name === 'csv') renderPseudoCsv();
}

function pickPseudoCsvFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const el = document.getElementById('pseudo-csv-input');
      if (el) el.value = r.result;
      loadPseudoCsvFromInput();
    };
    r.readAsText(f, 'utf-8');
  });
  input.click();
}

function loadPseudoCsvFromInput() {
  const el = document.getElementById('pseudo-csv-input');
  const out = document.getElementById('pseudo-csv-out');
  if (out) out.innerHTML = '';
  if (!el || !el.value.trim()) { pseudoCsv.header = []; pseudoCsv.rows = []; pseudoCsv.cols = {}; renderPseudoCsv(); return; }
  parsePseudoCSV(el.value);
  renderPseudoCsv();
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
document.getElementById('pseudo-tab-text')?.addEventListener('click', () => showPseudoTab('text'));
document.getElementById('pseudo-tab-csv')?.addEventListener('click', () => showPseudoTab('csv'));
document.querySelector('.pseudo-tabs')?.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const order = ['text', 'csv'];
  const cur = order.findIndex(t => document.getElementById('pseudo-tab-' + t)?.classList.contains('is-active'));
  if (cur < 0) return;
  e.preventDefault();
  const next = order[(cur + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
  showPseudoTab(next);
  document.getElementById('pseudo-tab-' + next)?.focus();
});
document.getElementById('pseudo-csv-file')?.addEventListener('click', pickPseudoCsvFile);
document.getElementById('pseudo-csv-input')?.addEventListener('input', loadPseudoCsvFromInput);
document.getElementById('pseudo-csv-run')?.addEventListener('click', runPseudoCsv);
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
  // Der Reifegrad-Check speist sich allein aus governanceAnswers und bleibt
  // deshalb IMMER nutzbar – vorher sperrte der Inventar-Guard die komplette
  // Phase 1, obwohl nur die RACI-Matrix Datendomänen braucht.
  const hasInventory = inventory.length > 0;
  document.getElementById('gov-empty')?.classList.toggle('hidden', hasInventory);
  document.getElementById('gov-raci')?.classList.toggle('hidden', !hasInventory);
  document.getElementById('gov-content')?.classList.remove('hidden');
  renderGovQuestions();
  renderGovScore();
  if (hasInventory) renderRaciMatrix();
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

/* ──────────────────────────────────────────────────────────────
   Daten-Kompass: Open-Data-Reifegrad-Checkliste

   Dimensionen + Items nach anerkannten Modellen (ODRA, EU Open Data
   Maturity, 5-Sterne-Open-Data, DCAT-AP.de, DSGVO/FAIR). Status je Item:
   offen / teilweise / erfüllt / nicht relevant. Manche Items werden aus
   dem App-Stand vorbelegt; Nutzer-Entscheidungen werden persistiert.
   ────────────────────────────────────────────────────────────── */
let kompassState = {};   // `${dimId}.${itemId}` → 'erfuellt'|'teilweise'|'offen'|'na'

const KOMPASS_STATUS = [['offen', 'Offen'], ['teilweise', 'Teilweise'], ['erfuellt', 'Erfüllt'], ['na', 'Nicht relevant']];
const KOMPASS_FACTOR = { erfuellt: 1, teilweise: 0.5, offen: 0 };

const KOMPASS_DIMENSIONS = [
  {
    id: 'strategie', title: 'Strategie & Rechtsrahmen', icon: 'fa-scale-balanced',
    source: 'ODRA · EU Open Data Maturity (Policy)',
    items: [
      { id: 'leitlinie',     label: 'Open-Data-Leitlinie / Veröffentlichungsgrundsätze sind verabschiedet.' },
      { id: 'recht',         label: 'Rechtsgrundlagen sind geklärt (2. Open-Data-Gesetz / Datennutzungsgesetz, IFG, Fachrecht).' },
      { id: 'openbydefault', label: '„Open by default" ist als Grundsatz etabliert.' },
      { id: 'lizenzpolitik', label: 'Eine Lizenzpolitik ist festgelegt (DL-DE / Creative Commons).' },
    ],
  },
  {
    id: 'organisation', title: 'Organisation & Rollen', icon: 'fa-users-gear',
    source: 'ODRA (Institutional) · RACI',
    action: { label: 'Governance & RACI öffnen', target: 'governance' },
    items: [
      { id: 'rollen',    label: 'Verantwortlichkeiten sind definiert (Data Owner, Data Steward).' },
      { id: 'reifegrad', label: 'Ein Governance-Reifegrad-Check wurde durchgeführt.' },
      { id: 'dsb',       label: 'Die/der Datenschutzbeauftragte ist eingebunden.' },
    ],
  },
  {
    id: 'inventar', title: 'Dateninventar & Metadaten', icon: 'fa-boxes-stacked',
    source: 'DCAT-AP.de · FAIR (Findable)',
    action: { label: 'Dateninventar starten', target: 'inventory' },
    items: [
      { id: 'kartiert',   label: 'Die Datenbestände sind kartiert (z. B. mit DatenGraf).' },
      { id: 'inventar',   label: 'Ein Inventar nach DCAT-AP.de ist erstellt.' },
      { id: 'metadaten',  label: 'Die Metadaten sind vollständig (Publisher, Lizenz, Zyklus, Zugriff).' },
      { id: 'identifier', label: 'Jeder Datensatz hat einen eindeutigen Identifier.' },
    ],
  },
  {
    id: 'datenschutz', title: 'Datenschutz & Clearing', icon: 'fa-shield-halved',
    source: 'DSGVO · DatenLotse Modul 3',
    action: { label: 'Phase 3 starten', target: 'phase3' },
    items: [
      { id: 'pb',       label: 'Der Personenbezug ist je Datensatz bewertet (Clearing-Ampel).' },
      { id: 'art9',     label: 'Besondere Kategorien nach Art. 9 DSGVO sind geprüft.' },
      { id: 'pseudo',   label: 'Personenbezogene Freitexte sind pseudonymisiert.' },
      { id: 'freigabe', label: 'Die Freigabeentscheidung ist je Datensatz dokumentiert.' },
    ],
  },
  {
    id: 'technik', title: 'Technik, Format & Standards', icon: 'fa-cubes',
    source: '5-Sterne-Open-Data (Berners-Lee) · FAIR (Interoperable)',
    items: [
      { id: 'offen',       label: 'Daten liegen in offenen, maschinenlesbaren Formaten vor (★★★: CSV/JSON statt PDF).' },
      { id: 'struktur',    label: 'Strukturierte Daten nutzen offene Standards (★★★★: URIs/RDF).' },
      { id: 'verlinkt',    label: 'Daten sind mit anderen Daten verlinkt (★★★★★: Linked Open Data).' },
      { id: 'dcatconform', label: 'Die Bereitstellung ist DCAT-AP.de-konform.' },
    ],
  },
  {
    id: 'veroeffentlichung', title: 'Veröffentlichung & Portal', icon: 'fa-globe',
    source: 'EU Open Data Maturity (Portal/Quality)',
    items: [
      { id: 'portal',  label: 'Ein Zielportal ist gewählt (GovData, kommunales Portal, CKAN).' },
      { id: 'harvest', label: 'Die Datasets sind harvestbar bereitgestellt.' },
      { id: 'zyklus',  label: 'Aktualisierungszyklen sind definiert und werden eingehalten.' },
      { id: 'qs',      label: 'Eine Qualitätssicherung (Vollständigkeit, Aktualität) ist etabliert.' },
    ],
  },
  {
    id: 'wirkung', title: 'Nutzung, Wirkung & Feedback', icon: 'fa-recycle',
    source: 'EU Open Data Maturity (Impact) · ODRA (Demand)',
    action: { label: 'Phase 4 & 5 verstehen', target: 'phase45' },
    items: [
      { id: 'monitoring', label: 'Die Nutzung der Daten wird beobachtet (Monitoring).' },
      { id: 'feedback',   label: 'Es gibt Feedback-Kanäle für Nachnutzende.' },
      { id: 'wirkung',    label: 'Anwendungsfälle / Wirkung werden erfasst.' },
      { id: 'zirkulaer',  label: 'Ein kontinuierlicher Verbesserungsprozess ist etabliert (zirkulär).' },
    ],
  },
];

// Vorbelegung aus dem aktuellen App-Stand (nur solange der Nutzer nichts gesetzt hat)
function kompassDerived(dimId, itemId) {
  const has = inventory.length > 0;
  const avg = has ? Math.round(inventory.reduce((s, d) => s + completeness(d), 0) / inventory.length) : 0;
  const allClassified = has && inventory.every(d => d.clearing && d.clearing.ampel);
  const someClassified = has && inventory.some(d => d.clearing);
  const govAnswered = Object.keys(governanceAnswers).length > 0;
  switch (`${dimId}.${itemId}`) {
    case 'inventar.kartiert':       return (grafRows.length || has) ? 'erfuellt' : 'offen';
    case 'inventar.inventar':       return has ? 'erfuellt' : 'offen';
    case 'inventar.metadaten':      return avg >= 80 ? 'erfuellt' : avg > 0 ? 'teilweise' : 'offen';
    case 'inventar.identifier':     return has ? 'erfuellt' : 'offen';
    case 'datenschutz.pb':          return allClassified ? 'erfuellt' : someClassified ? 'teilweise' : 'offen';
    case 'organisation.reifegrad':  return govAnswered ? 'teilweise' : 'offen';
    default: return 'offen';
  }
}

function kompassStatus(dimId, itemId) {
  return kompassState[`${dimId}.${itemId}`] || kompassDerived(dimId, itemId);
}

function kompassDimScore(dim) {
  let sum = 0, count = 0;
  dim.items.forEach(it => {
    const st = kompassStatus(dim.id, it.id);
    if (st === 'na') return;
    sum += KOMPASS_FACTOR[st] ?? 0; count++;
  });
  return count ? Math.round((sum / count) * 100) : null;
}

function kompassOverall() {
  let sum = 0, count = 0;
  KOMPASS_DIMENSIONS.forEach(dim => dim.items.forEach(it => {
    const st = kompassStatus(dim.id, it.id);
    if (st === 'na') return;
    sum += KOMPASS_FACTOR[st] ?? 0; count++;
  }));
  return count ? Math.round((sum / count) * 100) : 0;
}

function kompassAmpel(score) {
  if (score >= 80) return { cls: 'gruen', label: 'Fortgeschritten' };
  if (score >= 50) return { cls: 'gelb',  label: 'Im Aufbau' };
  return { cls: 'rot', label: 'Am Anfang' };
}

function renderKompass() {
  renderKompassScore();
  renderKompassDims();
  renderKompassHistory();
}

/* ── Kompass-Verlauf ──────────────────────────────────────────────
   Ein Reifegrad ist als Momentaufnahme wenig wert – interessant ist die
   Entwicklung. Stände werden BEWUSST NUR AUF KNOPFDRUCK festgehalten:
   automatische Schnappschüsse bei jeder Änderung würden die Kurve mit
   Zwischenständen zumüllen, und ein Verlauf, den niemand bestellt hat,
   ist stille Protokollierung des eigenen Arbeitens.
   Ein Eintrag je Tag: mehrfaches Festhalten am selben Tag ersetzt den Wert.
   ────────────────────────────────────────────────────────────── */
const LS_KOMPASS_HIST = 'datenlotse_kompass_verlauf';
const KOMPASS_HIST_MAX = 24;
let kompassHistory = [];

function loadKompassHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KOMPASS_HIST) || '[]');
    kompassHistory = Array.isArray(raw)
      ? raw.filter(e => e && typeof e.date === 'string' && Number.isFinite(e.score))
      : [];
  } catch (e) { kompassHistory = []; }
}
function saveKompassHistory() {
  try { localStorage.setItem(LS_KOMPASS_HIST, JSON.stringify(kompassHistory)); } catch (e) { /* ignorieren */ }
}
function kompassSnapshot(datum) {
  const date = datum || new Date().toISOString().slice(0, 10);
  const score = kompassOverall();
  const vorhanden = kompassHistory.findIndex(e => e.date === date);
  if (vorhanden >= 0) kompassHistory[vorhanden] = { date, score };
  else kompassHistory.push({ date, score });
  kompassHistory.sort((a, b) => a.date.localeCompare(b.date));
  // Nur die jüngsten Stände behalten – LocalStorage ist kein Archiv
  if (kompassHistory.length > KOMPASS_HIST_MAX) {
    kompassHistory = kompassHistory.slice(kompassHistory.length - KOMPASS_HIST_MAX);
  }
  saveKompassHistory();
  return { date, score };
}
function clearKompassHistory() {
  kompassHistory = [];
  try { localStorage.removeItem(LS_KOMPASS_HIST); } catch (e) { /* ignorieren */ }
}
function kompassTrend() {
  if (kompassHistory.length < 2) return null;
  const erst = kompassHistory[0], letzt = kompassHistory[kompassHistory.length - 1];
  return { von: erst.score, auf: letzt.score, diff: letzt.score - erst.score,
           seit: erst.date, stand: letzt.date };
}

function renderKompassHistory() {
  const box = document.getElementById('kompass-history');
  if (!box) return;
  const t = kompassTrend();
  const balken = kompassHistory.map(e =>
    `<span class="khist-bar" aria-hidden="true" title="${esc(e.date)}: ${e.score} %">
       <span class="khist-fill" style="height:${Math.max(e.score, 2)}%"></span>
       <span class="khist-label">${esc(e.date.slice(5))}</span>
     </span>`).join('');

  box.innerHTML = `
    <div class="khist-head">
      <span class="khist-title"><i class="fas fa-chart-line"></i> Verlauf</span>
      <span class="khist-btns">
        <button class="pseudo-mini-btn" id="kompass-snap"><i class="fas fa-bookmark"></i> Stand festhalten</button>
        ${kompassHistory.length ? '<button class="pseudo-mini-btn" id="kompass-hist-clear"><i class="fas fa-trash-can"></i> Verlauf löschen</button>' : ''}
      </span>
    </div>
    ${kompassHistory.length
      ? `<div class="khist-chart" role="img" aria-label="Reifegrad-Verlauf: ${esc(kompassHistory.map(e => `${e.date} ${e.score} Prozent`).join(', '))}">${balken}</div>` +
        (t ? `<p class="khist-trend khist-trend--${t.diff > 0 ? 'up' : t.diff < 0 ? 'down' : 'flat'}">
                <i class="fas ${t.diff > 0 ? 'fa-arrow-trend-up' : t.diff < 0 ? 'fa-arrow-trend-down' : 'fa-minus'}"></i>
                ${t.diff > 0 ? '+' : ''}${t.diff} Punkte seit ${esc(t.seit)} (${t.von} → ${t.auf} %)
              </p>`
           : '<p class="khist-trend khist-trend--flat"><i class="fas fa-circle-info"></i> Ab dem zweiten festgehaltenen Stand zeigt sich hier die Entwicklung.</p>')
      : '<p class="khist-empty">Noch kein Stand festgehalten. „Stand festhalten" sichert den heutigen Reifegrad, um die Entwicklung später zu belegen – etwa gegenüber Leitung oder Gremium.</p>'}`;

  document.getElementById('kompass-snap')?.addEventListener('click', () => {
    const s = kompassSnapshot();
    renderKompassHistory();
    alert(`Stand vom ${s.date} festgehalten: ${s.score} von 100 Punkten.`);
  });
  document.getElementById('kompass-hist-clear')?.addEventListener('click', () => {
    if (!confirm('Den gesamten Reifegrad-Verlauf löschen?')) return;
    clearKompassHistory();
    renderKompassHistory();
  });
}

function renderKompassScore() {
  const box = document.getElementById('kompass-score');
  if (!box) return;
  const score = kompassOverall();
  const amp = kompassAmpel(score);
  box.className = `kompass-score kompass-score--${amp.cls}`;
  box.innerHTML =
    `<div class="kompass-score-num">${score}<span> / 100</span></div>
     <div class="kompass-score-meta"><strong>${amp.label}</strong><span>Open-Data-Reifegrad</span></div>
     <div class="kompass-score-bar"><span style="width:${score}%"></span></div>`;
}

function renderKompassDims() {
  const box = document.getElementById('kompass-dims');
  if (!box) return;
  box.innerHTML = KOMPASS_DIMENSIONS.map(dim => {
    const ds = kompassDimScore(dim);
    const dsCls = ds == null ? 'na' : ds >= 80 ? 'gruen' : ds >= 50 ? 'gelb' : 'rot';
    const items = dim.items.map(it => {
      const st = kompassStatus(dim.id, it.id);
      const stCls = ['erfuellt', 'teilweise', 'na'].includes(st) ? st : 'offen';
      return `<div class="kompass-item kompass-item--${stCls}">
        <span class="kompass-item-label">${esc(it.label)}</span>
        <select class="kompass-item-sel" aria-label="Status: ${esc(it.label)}" data-dim="${esc(dim.id)}" data-item="${esc(it.id)}">${optionsHTML(KOMPASS_STATUS, st)}</select>
      </div>`;
    }).join('');
    const incomplete = ds != null && ds < 100;
    const actionBtn = (dim.action && incomplete)
      ? `<button class="btn btn-secondary btn-sm kompass-action" data-kompass-action="${esc(dim.action.target)}"><i class="fas fa-arrow-right"></i> ${esc(dim.action.label)}</button>` : '';
    return `<div class="kompass-dim">
      <div class="kompass-dim-head">
        <div class="kompass-dim-title">
          <span class="kompass-dim-ic"><i class="fas ${esc(dim.icon)}"></i></span>
          <div><h3>${esc(dim.title)}</h3><span class="kompass-dim-src">${esc(dim.source)}</span></div>
        </div>
        <span class="kompass-dim-score kompass-dim-score--${dsCls}">${ds == null ? '–' : ds + ' %'}</span>
      </div>
      <div class="kompass-items">${items}</div>
      ${actionBtn}
    </div>`;
  }).join('');

  box.querySelectorAll('.kompass-item-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      kompassState[`${sel.dataset.dim}.${sel.dataset.item}`] = sel.value;
      saveState();
      renderKompass();
    });
  });
  box.querySelectorAll('[data-kompass-action]').forEach(btn =>
    btn.addEventListener('click', () => kompassAction(btn.dataset.kompassAction)));
}

function kompassAction(target) {
  if (target === 'phase3') openPhase3Wizard();
  else if (target === 'phase45') showModal('phase45-backdrop', true);
  else navTo(target);
}

function buildKompassReportHTML() {
  const score = kompassOverall();
  const amp = kompassAmpel(score);
  const ampColor = { gruen: '#2e9e60', gelb: '#d4820a', rot: '#c0392b' }[amp.cls];
  const stLabel = { erfuellt: 'Erfüllt', teilweise: 'Teilweise', offen: 'Offen', na: 'n/a' };
  const dims = KOMPASS_DIMENSIONS.map(dim => {
    const ds = kompassDimScore(dim);
    const rows = dim.items.map(it =>
      `<tr><td>${esc(it.label)}</td><td style="text-align:right;white-space:nowrap">${stLabel[kompassStatus(dim.id, it.id)]}</td></tr>`).join('');
    return `<h2>${esc(dim.title)} <span class="muted" style="font-weight:400">· ${ds == null ? '–' : ds + ' %'} · ${esc(dim.source)}</span></h2>
      <table><tbody>${rows}</tbody></table>`;
  }).join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>DatenLotse – Daten-Kompass</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1e1b2e;margin:32px;font-size:12px}
      h1{color:#420093;font-size:22px;margin:0 0 4px} h2{color:#420093;font-size:14px;margin:18px 0 6px}
      .muted{color:#7a7591} .score{display:inline-block;padding:10px 18px;border-radius:10px;color:#fff;font-weight:700;background:${ampColor}}
      table{border-collapse:collapse;width:100%;margin-top:4px} td{border:1px solid #d9d2e8;padding:5px 9px}
      @media print{body{margin:12mm}}
    </style></head><body>
    <h1>DatenLotse – Daten-Kompass</h1>
    <p class="muted">Open-Data-Reifegrad nach ODRA, EU Open Data Maturity, 5-Sterne-Open-Data, DCAT-AP.de und DSGVO/FAIR. Lokal erzeugt – keine Datenübertragung.</p>
    <p><span class="score">${score} / 100 · ${amp.label}</span></p>
    ${dims}
    </body></html>`;
}

function printKompass() {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildKompassReportHTML());
  w.document.close();
  const go = () => { w.focus(); w.print(); };
  if (w.document.readyState === 'complete') go();
  else w.addEventListener('load', go);
}
document.getElementById('kompass-print')?.addEventListener('click', printKompass);

/* ── Persistenz: Projekt speichern/laden & zurücksetzen ───────── */
document.getElementById('project-save-btn')?.addEventListener('click', () => { exportProject(); closeSidebar(); });
document.getElementById('project-load-btn')?.addEventListener('click', pickAndImportProject);
document.getElementById('reset-data-btn')?.addEventListener('click', () => {
  const hasData = inventory.length || Object.keys(governanceAnswers).length || Object.keys(kompassState).length;
  if (hasData && !confirm('Gespeicherte Daten (Inventar, Clearing, Governance, Kompass) wirklich löschen?')) return;
  clearState();
  document.getElementById('inventory-body') && (document.getElementById('inventory-body').innerHTML = '');
  showView('home');
  closeSidebar();
});

// Beim Laden den gespeicherten Stand wiederherstellen (still – Daten sind über die Views erreichbar)
loadState();
refreshDashboard();   // Status-Dashboard auf der Startseite zeigen, falls bereits Daten vorliegen
refreshTourHint();    // Rundgang-Hinweis nur für Erstnutzer

/* ──────────────────────────────────────────────────────────────
   ROADMAP / BAUAUFTRÄGE
   ────────────────────────────────────────────────────────────── */
// ✓ MVP  – Modul 2: Inventar-Import, Nacherfassung, DCAT-AP.de-Export
// ✓      – Modul 3a: Rot/Gelb/Grün-Clearing-Entscheidungsbaum
// ✓      – Modul 3b: Client-Side-Pseudonymisierung (Regex-Pack DE Verwaltung)
// ✓      – Modul 1: Governance-Fragebogen → RACI-Matrix + Reifegrad
