// Structured imports (JSON / Hugo CSV). Both land as a DetectionResult and
// are NEVER auto-applied (PRD Key Decision 4 / AC-IMP-15); the user applies
// them from the import review UI.
import { fieldMeta } from '../catalog/fieldMeta.ts';
import { PRODUCT_KEYS, RESERVE_KEYS, SUBLICENSE_KEYS } from '../catalog/groups.ts';
import { notBlank } from '../calc/index.ts';
import { parseHugoOrCsbJson } from '../schema/index.ts';
import type { Detection, DetectionResult } from '../types.ts';

function coerceRow<T extends object>(src: Record<string, string>, keys: readonly (keyof T)[]): T {
  const row = {} as Record<keyof T, string>;
  for (const key of keys) row[key] = src[key as string] ?? '';
  return row as T;
}

function detectionFor(target: string, value: string, source: string): Detection {
  return {
    target,
    value,
    confidence: 'High',
    source,
    reason: 'Structured import',
    bisg: fieldMeta(target)?.[0] ?? '',
    category: fieldMeta(target)?.[1] ?? '',
  };
}

/** Statement JSON (Hugo 0.9 or CSB 1.x) as a reviewable DetectionResult. */
export function jsonToDetectionResult(obj: unknown): DetectionResult {
  const doc = parseHugoOrCsbJson(obj);
  const detections = Object.entries(doc.state)
    .filter(([, v]) => notBlank(v))
    .map(([k, v]) => detectionFor(k, v, 'Hugo JSON export'));
  return {
    sourceType: 'Hugo JSON export',
    profile: 'structured',
    statementType: doc.statementType,
    state: doc.state,
    products: doc.products,
    reserves: doc.reserves,
    sublicenses: doc.sublicenses,
    detections,
    unmappedLines: [],
    calcInferences: [],
    notes: ['Recognized JSON structure.'],
  };
}

/**
 * CSV import, Hugo parity: the Section/Field/Value header restores keys with
 * High confidence; any other CSV becomes unmapped lines only — never
 * auto-mapped (AC-IMP-2).
 */
export function parseImportedCsv(csv: string): DetectionResult {
  // Quote-aware record/field parsing. Deliberate deviation from Hugo, which
  // split on newlines before handling quotes and therefore corrupted its own
  // multi-line statementNotes on round-trip; the PRD mandates RFC4180 and
  // AC-IMP-2 requires keys to restore.
  const rows: string[][] = [];
  {
    let cur = '';
    let row: string[] = [];
    let q = false;
    const src = csv.replace(/\r\n/g, '\n');
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '"' && q && src[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === ',' && !q) {
        row.push(cur);
        cur = '';
        continue;
      }
      if (ch === '\n' && !q) {
        row.push(cur);
        cur = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        continue;
      }
      cur += ch;
    }
    row.push(cur);
    if (row.some(c => c !== '')) rows.push(row);
  }
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = (rows[0] ?? []).map(x => x.toLowerCase());
  if (header.includes('section') && header.includes('field') && header.includes('value')) {
    const sectionIdx = header.indexOf('section');
    const fieldIdx = header.indexOf('field');
    const valueIdx = header.indexOf('value');
    const newState: Record<string, string> = {};
    const prodMap: Record<number, Record<string, string>> = {};
    const resMap: Record<number, Record<string, string>> = {};
    const subMap: Record<number, Record<string, string>> = {};
    const detections: Detection[] = [];
    for (const r of rows.slice(1)) {
      const sec = r[sectionIdx] || '';
      const field = r[fieldIdx] || '';
      const val = r[valueIdx] || '';
      if (sec === 'Statement') {
        newState[field] = val;
        if (notBlank(val)) detections.push(detectionFor(field, val, 'Hugo CSV export'));
      } else if (sec.startsWith('Product')) {
        const i = Number(sec.match(/\d+/)?.[0] || 1) - 1;
        (prodMap[i] ??= {})[field] = val;
      } else if (sec.startsWith('Reserve')) {
        const i = Number(sec.match(/\d+/)?.[0] || 1) - 1;
        (resMap[i] ??= {})[field] = val;
      } else if (sec.startsWith('Sublicense')) {
        const i = Number(sec.match(/\d+/)?.[0] || 1) - 1;
        (subMap[i] ??= {})[field] = val;
      }
    }
    return {
      sourceType: 'Hugo CSV export',
      profile: 'structured',
      state: newState,
      products: Object.values(prodMap).map(r => coerceRow(r, PRODUCT_KEYS)),
      reserves: Object.values(resMap).map(r => coerceRow(r, RESERVE_KEYS)),
      sublicenses: Object.values(subMap).map(r => coerceRow(r, SUBLICENSE_KEYS)),
      detections,
      unmappedLines: [],
      calcInferences: [],
      notes: ['Recognized Hugo CSV export format.'],
    };
  }
  return {
    sourceType: 'Generic CSV',
    profile: 'generic',
    state: {},
    products: [],
    reserves: [],
    sublicenses: [],
    detections: [],
    unmappedLines: lines.slice(0, 80),
    calcInferences: [],
    notes: [
      'CSV did not match the statement export format. Paste statement text or use a JSON/CSV export for structured import.',
    ],
  };
}
