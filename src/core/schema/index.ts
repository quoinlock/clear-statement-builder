// File interchange (PRD "File interchange"): statement JSON write 1.0.0 /
// read 0.9 and 1.0.x, statement CSV (v1.7 parity shape), custom-profile
// envelopes, and review JSON/CSV serialization.
import { STATEMENT_STATE_KEYS, PRODUCT_KEYS, RESERVE_KEYS, SUBLICENSE_KEYS } from '../catalog/groups.ts';
import { emptyState } from '../catalog/rows.ts';
import { bisgCategory, bisgId } from '../catalog/fieldMeta.ts';
import type { CalculationWarning } from '../calc/index.ts';
import type { ValidationResult } from '../validation/index.ts';
import type { ReviewDocument } from '../review/index.ts';
import type {
  CustomImportProfile,
  ProductRow,
  ReserveRow,
  StatementDocument,
  StatementState,
  SublicenseRow,
  Totals,
} from '../types.ts';

export interface SerializeExtras {
  totals: Totals;
  validation: ValidationResult;
  calculationWarnings: CalculationWarning[];
}

/** Statement JSON write shape. Never includes showIds. */
export function serializeDocument(doc: StatementDocument, extras?: SerializeExtras): object {
  return {
    version: '1.0.0',
    generatedAt: doc.generatedAt,
    product: 'clear-statement-builder',
    priorArt: 'hugo-prototype-v1.7',
    state: doc.state,
    products: doc.products,
    reserves: doc.reserves,
    sublicenses: doc.sublicenses,
    ...(extras
      ? {
          totals: extras.totals,
          validation: extras.validation,
          calculationWarnings: extras.calculationWarnings,
        }
      : {}),
  };
}

export class StatementParseError extends Error {}

/** True when the object is a review payload, not a statement document. */
export function isReviewJson(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.reviewFormatVersion === 'string') return true;
  // Hugo review JSON: version '1.1' with review fields and no statement state.
  return o.version === '1.1' && !('state' in o) && Array.isArray(o.fields);
}

function coerceState(raw: unknown): StatementState {
  const out = emptyState();
  if (typeof raw === 'object' && raw !== null) {
    const src = raw as Record<string, unknown>;
    for (const key of STATEMENT_STATE_KEYS) {
      if (key in src && src[key] != null) out[key] = String(src[key]);
    }
  }
  return out;
}

function coerceRows<T extends object>(raw: unknown, keys: readonly (keyof T)[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    const src = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const row = {} as Record<keyof T, string>;
    for (const key of keys) row[key] = src[key as string] != null ? String(src[key as string]) : '';
    return row as T;
  });
}

/**
 * Accepts a CSB 1.0.x export or a Hugo 0.9 dataPackage. Hugo acceptance rule:
 * version === '0.9', or version missing/unknown with `product` missing, as
 * long as state/products exist. generatedAt is not required. A review JSON
 * is rejected with a distinct error.
 */
export function parseHugoOrCsbJson(obj: unknown): StatementDocument {
  if (typeof obj !== 'object' || obj === null) {
    throw new StatementParseError('Not a statement JSON object.');
  }
  if (isReviewJson(obj)) {
    throw new StatementParseError(
      'This file is a review report export, not a statement. Open it with the review tools instead.',
    );
  }
  const o = obj as Record<string, unknown>;
  const version = typeof o.version === 'string' ? o.version : '';
  const hasStructure = typeof o.state === 'object' && o.state !== null && Array.isArray(o.products);
  const isCsb = version.startsWith('1.0') && o.product === 'clear-statement-builder';
  const isHugo = (version === '0.9' || (!isCsb && o.product === undefined)) && hasStructure;
  if (!hasStructure || (!isCsb && !isHugo)) {
    throw new StatementParseError('Unrecognized statement JSON (expected Hugo 0.9 or Clear Statement Builder 1.0).');
  }
  return {
    version: '1.0.0',
    generatedAt: typeof o.generatedAt === 'string' ? o.generatedAt : '',
    product: 'clear-statement-builder',
    priorArt: 'hugo-prototype-v1.7',
    state: coerceState(o.state),
    products: coerceRows<ProductRow>(o.products, PRODUCT_KEYS),
    reserves: coerceRows<ReserveRow>(o.reserves, RESERVE_KEYS),
    sublicenses: coerceRows<SublicenseRow>(o.sublicenses, SUBLICENSE_KEYS),
  };
}

export function csvEscape(v: unknown): string {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

/** Statement CSV, v1.7 parity: Section,Field,Value,BISG ID,Category rows. */
export function serializeStatementCsv(doc: StatementDocument): string {
  const rows: unknown[][] = [['Section', 'Field', 'Value', 'BISG ID', 'Category']];
  for (const key of STATEMENT_STATE_KEYS) {
    rows.push(['Statement', key, doc.state[key], bisgId(key), bisgCategory(key)]);
  }
  doc.products.forEach((p, i) =>
    PRODUCT_KEYS.forEach(k => rows.push([`Product ${i + 1}`, k, p[k], bisgId(k), bisgCategory(k)])),
  );
  doc.reserves.forEach((r, i) =>
    RESERVE_KEYS.forEach(k => rows.push([`Reserve ${i + 1}`, k, r[k], bisgId(k), bisgCategory(k)])),
  );
  doc.sublicenses.forEach((s, i) =>
    SUBLICENSE_KEYS.forEach(k => rows.push([`Sublicense ${i + 1}`, k, s[k], bisgId(k), bisgCategory(k)])),
  );
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

/** clear-statement-{statementNo||draft}.{ext}; hugo-royalty-statement-* stays readable. */
export function statementFilename(state: StatementState, ext: 'json' | 'csv'): string {
  return `clear-statement-${state.statementNo || 'draft'}.${ext}`;
}

export function reviewFilename(state: StatementState, ext: 'json' | 'csv'): string {
  return `clear-statement-review-${state.statementNo || state.licenseeContractId || 'draft'}.${ext}`;
}

// --- Custom profiles envelope ---

export interface CustomProfilesEnvelope {
  csbProfileVersion: '1.0';
  hugoProfileVersion: '1.7';
  profiles: CustomImportProfile[];
}

export function serializeCustomProfiles(profiles: CustomImportProfile[]): CustomProfilesEnvelope {
  return { csbProfileVersion: '1.0', hugoProfileVersion: '1.7', profiles };
}

const PROFILE_STRING_KEYS: (keyof CustomImportProfile)[] = [
  'id',
  'name',
  'language',
  'splitPattern',
  'fieldRules',
  'abbreviations',
  'productAliases',
  'calculationHint',
];

function coerceProfile(item: unknown): CustomImportProfile | null {
  if (typeof item !== 'object' || item === null) return null;
  const src = item as Record<string, unknown>;
  if (typeof src.id !== 'string' || typeof src.name !== 'string' || !src.id || !src.name) return null;
  const out = {} as Record<keyof CustomImportProfile, string>;
  for (const key of PROFILE_STRING_KEYS) out[key] = src[key] != null ? String(src[key]) : '';
  const nf = src.numberFormat;
  out.numberFormat = nf === 'european' || nf === 'us' ? nf : 'auto';
  return out as CustomImportProfile;
}

/** Reads the CSB envelope, the Hugo 1.7 envelope, a bare array, or {profiles:[...]}. */
export function parseCustomProfiles(obj: unknown): CustomImportProfile[] {
  const list = Array.isArray(obj)
    ? obj
    : typeof obj === 'object' && obj !== null && Array.isArray((obj as Record<string, unknown>).profiles)
      ? ((obj as Record<string, unknown>).profiles as unknown[])
      : null;
  if (!list) throw new StatementParseError('Unrecognized custom profiles JSON.');
  return list.map(coerceProfile).filter((p): p is CustomImportProfile => p !== null);
}

// --- Review exports ---

export function serializeReviewJson(review: ReviewDocument): string {
  return JSON.stringify(review, null, 2);
}

/**
 * Review CSV, parity shape (fields table + warnings table) plus a trailing
 * disclaimer row — AC-REV-4 requires the disclaimer in every export format
 * (Hugo's CSV omitted it; labeled v1 improvement).
 */
export function serializeReviewCsv(review: ReviewDocument): string {
  const rows: unknown[][] = [
    ['Status', 'Priority', 'BISG ID', 'Field', 'Category', 'Field Category', 'Confidence', 'Why it matters', 'Recommendation'],
  ];
  review.fields.forEach(f =>
    rows.push([f.status, f.priority, f.bisgId, f.label, f.category, f.fieldCategory, f.confidence, f.why, f.recommendation]),
  );
  rows.push([]);
  rows.push(['Calculation warning', 'Detail']);
  review.calculationWarnings.forEach(w => rows.push([w.label, w.detail]));
  rows.push([]);
  rows.push(['Disclaimer', review.disclaimer]);
  return rows.map(row => row.map(csvEscape).join(',')).join('\n');
}
