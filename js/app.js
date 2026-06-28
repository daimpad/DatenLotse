/* ──────────────────────────────────────────────────────────────
   DatenLotse – app.js (Skelett)

   Philosophie wie DatenGraf: Vanilla JS, kein Build, eine Datei,
   alles lokal im Browser. Keine externen Calls außer opt-in.

   Dieses Skelett enthält:
   - Die DatenGraf-Brücke: identischer CSV-Parser (gleiches Row-Schema)
   - Eine Stelle (importGrafCSV), an der das Inventar-Modul andockt
   - TODO-Marker für die drei Module
   ────────────────────────────────────────────────────────────── */

'use strict';

/* ── DatenGraf Row-Schema (1:1 übernehmen, NICHT divergieren) ──── */
const GRAF_COLUMNS = [
  'Quelle', 'QuelleAbteilung', 'QuelleBereich', 'QuelleOrganisation', 'QuelleRolle',
  'Beziehung', 'Ziel', 'Datentyp', 'Häufigkeit', 'Format', 'Schutzbedarf',
  'Erfassungsart', 'Anmerkungen', 'Ansprechpartner'
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

/* ── CSV-Parser (identisch zu DatenGraf parseCSV/splitCSVLine) ─── */
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

/* ── DCAT-AP.de Mapping (Phase 2 – Kern des MVP) ──────────────────
   Aus den DatenGraf-Zeilen werden Inventar-Kandidaten abgeleitet.
   Jede eindeutige (Quelle|Ziel)-Datenmenge wird ein Dataset-Eintrag.
   DCAT-AP.de-Pflichtfelder, die DatenGraf nicht kennt, bleiben leer
   und werden im UI nacherfasst.
   ────────────────────────────────────────────────────────────── */
function deriveInventory(rows) {
  const seen = new Map();
  for (const r of rows) {
    const key = `${r.Quelle}__${r.Datentyp}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      // DCAT-AP.de dcat:Dataset (Auswahl)
      title:            r.Datentyp || r.Quelle,
      publisher:        r.QuelleOrganisation || '',
      contactPoint:     r.Ansprechpartner || '',
      sourceSystem:     r.Quelle || '',
      format:           r.Format || '',
      // Felder zur Nacherfassung:
      accrualPeriodicity: '',   // Aktualisierungszyklus
      license:            '',   // z.B. dl-de/by-2-0
      accessRights:       mapSchutzToAccess(r.Schutzbedarf),
      _grafSchutzbedarf:  r.Schutzbedarf || ''
    });
  }
  return [...seen.values()];
}

function mapSchutzToAccess(schutz) {
  // grobe Vorbelegung – im Clearing-Modul (Phase 3) verfeinert
  if (/dsgvo/i.test(schutz)) return 'NON_PUBLIC';
  if (/intern/i.test(schutz)) return 'RESTRICTED';
  if (/öffentlich|oeffentlich/i.test(schutz)) return 'PUBLIC';
  return '';
}

/* ── DatenGraf-Brücke: CSV importieren ────────────────────────── */
function importGrafCSV(text) {
  grafRows = parseCSV(text);
  inventory = deriveInventory(grafRows);
  console.log(`[DatenLotse] ${grafRows.length} Zeilen importiert → ${inventory.length} Inventar-Kandidaten`);
  // TODO Modul 2: renderInventory(inventory);
  alert(`${grafRows.length} Datenflüsse importiert.\n${inventory.length} Inventar-Kandidaten abgeleitet.\n\n(Inventar-UI folgt – das ist der MVP-Bauauftrag.)`);
}

/* ── Datei-Import-Trigger (Skelett) ───────────────────────────── */
document.getElementById('btn-import-graf')?.addEventListener('click', () => {
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
});

/* ──────────────────────────────────────────────────────────────
   ROADMAP / BAUAUFTRÄGE
   ────────────────────────────────────────────────────────────── */
// MVP  – Modul 2: renderInventory() + DCAT-AP.de-Export (JSON/CSV)
// Next – Modul 3a: Rot/Gelb/Grün-Clearing-Entscheidungsbaum
// Next – Modul 3b: Client-Side-Pseudonymisierung (Regex-Pack DE Verwaltung)
// Last – Modul 1: Governance-Fragebogen → RACI-Matrix
