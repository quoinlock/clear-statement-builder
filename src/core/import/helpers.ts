// Importer helpers, transcribed from the Hugo v1.7 snapshot (snapshot-
// normative per PRD Appendix A: if these and the snapshot diverge, the
// snapshot wins).
import { fieldMeta } from '../catalog/fieldMeta.ts';
import { notBlank } from '../calc/index.ts';
import type { Confidence, Detection } from '../types.ts';

export function normalizeText(txt: string): string {
  return String(txt || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/** European day-month display date; 2-digit years become 20xx. */
export function parseDateToDisplay(s: string): string {
  s = String(s || '').trim();
  const m = s.match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/);
  if (!m) return s;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return String(m[1]).padStart(2, '0') + ' ' + months[Number(m[2]) - 1] + ' ' + y;
}

export function findFirst(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] || m[0] || '').trim();
  }
  return '';
}

export function detectCurrencyValue(raw: string): string {
  return String(raw || '')
    .replace(/[^0-9,.\-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
}

/** German/US-tolerant number parse: 1.234,56 → '1234.56'. Empty on failure. */
export function parseGermanNumber(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/[€$£\s]/g, '');
  const neg = /^-/.test(s);
  s = s.replace(/^[+\-]/, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number((neg ? '-' : '') + s);
  return Number.isFinite(n) ? String(n) : '';
}

export function formatBasisCurrency(raw: string): string {
  const n = Number(parseGermanNumber(raw));
  if (!Number.isFinite(n)) return '';
  return '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isIntegerLikeLine(s: string): boolean {
  return /^\s*[-+]?\d{1,3}(?:\.\d{3})*\s*$|^\s*[-+]?\d+\s*$/.test(String(s || ''));
}

export function isMoneyLikeLine(s: string): boolean {
  return /^\s*[-+]?\d{1,3}(?:\.\d{3})*,\d{2}\s*$|^\s*[-+]?\d+,\d{2}\s*$/.test(String(s || ''));
}

export function cleanUnit(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\./g, '');
}

export function valueAfterOrBefore(
  lines: string[],
  idx: number,
  direction: 'before' | 'after',
  predicate: (s: string) => boolean,
  maxSteps?: number,
): string {
  for (let off = 1; off <= (maxSteps || 5); off++) {
    const j = idx + (direction === 'before' ? -off : off);
    if (j < 0 || j >= lines.length) continue;
    const val = String(lines[j] || '').trim();
    if (predicate(val)) return val;
  }
  return '';
}

/** Inline capture wins; else nearest predicate match BEFORE the label, then after. */
export function findValueForLabel(
  lines: string[],
  labelRegex: RegExp,
  predicate?: (s: string) => boolean,
): string {
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '').trim();
    const m = line.match(labelRegex);
    if (m && m[1]) return m[1].trim();
    if (labelRegex.test(line)) {
      const before = valueAfterOrBefore(lines, i, 'before', predicate || (() => true), 3);
      if (before) return before;
      const after = valueAfterOrBefore(lines, i, 'after', predicate || (() => true), 3);
      if (after) return after;
    }
  }
  return '';
}

/** Inline capture wins; else nearest predicate match AFTER the label, then before. */
export function findValueAfterLabel(
  lines: string[],
  labelRegex: RegExp,
  predicate?: (s: string) => boolean,
): string {
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '').trim();
    const m = line.match(labelRegex);
    if (m && m[1]) return m[1].trim();
    if (labelRegex.test(line)) {
      const after = valueAfterOrBefore(lines, i, 'after', predicate || (() => true), 4);
      if (after) return after;
      const before = valueAfterOrBefore(lines, i, 'before', predicate || (() => true), 3);
      if (before) return before;
    }
  }
  return '';
}

export function addDetection(
  list: Detection[],
  target: string,
  value: string,
  confidence: Confidence,
  source: string,
  reason: string,
): void {
  if (notBlank(value)) {
    list.push({
      target,
      value: String(value),
      confidence,
      source: source || '',
      reason: reason || '',
      bisg: fieldMeta(target)?.[0] ?? '',
      category: fieldMeta(target)?.[1] ?? '',
    });
  }
}

export const ABBREVIATIONS: Record<string, string> = {
  NR: 'Net Receipts',
  GR: 'Gross Receipts',
  GRP: 'Gross Retail Price',
  NRP: 'Net Retail Price',
  UT: 'Unit Price',
  ET: 'Publication Date / Erscheinungstermin',
  Gutschrift: 'Credit Note',
  'Brought forward': 'Opening Balance',
  'Carried forward': 'Closing Balance',
  'Royalty Contract-No.': 'Contract royalty / balance line',
  'Accounting period': 'Reporting Period',
  'Tax exemption until': 'Tax exemption status / expiry date',
};

/** Exactly 39 mappable targets: statementNo, preparedBy, and the computed closingBalance/paymentDue are deliberately absent. */
export const IMPORT_FIELD_OPTIONS = [
  'statementDate',
  'periodStart',
  'periodEnd',
  'licenseeName',
  'licenseeImprint',
  'licenseeAddress',
  'licenseePhone',
  'licenseeEmail',
  'licenseeWebsite',
  'payerName',
  'payerAddress',
  'payerPhone',
  'payerEmail',
  'payerWebsite',
  'licenseeContractId',
  'licensorName',
  'licensorContractId',
  'contributorNames',
  'licensorTitle',
  'licenseeTitle',
  'language',
  'salesTerritory',
  'advanceAmount',
  'advanceCurrency',
  'openingBalance',
  'reserveWithheld',
  'reserveReleased',
  'sublicenseIncomeTotal',
  'coAgentCommissionPercent',
  'taxId',
  'taxExemptionStatus',
  'taxWithheld',
  'scheduledPaymentDate',
  'paymentMethod',
  'beneficiary',
  'beneficiaryBank',
  'swiftBic',
  'accountReference',
  'statementNotes',
] as const;

export type ImportFieldOption = (typeof IMPORT_FIELD_OPTIONS)[number];

export function profileFromText(text: string, requested?: string): string {
  const lower = text.toLowerCase();
  if (requested && requested !== 'auto') return requested;
  if (
    lower.includes('ullstein') ||
    lower.includes('bonnier') ||
    lower.includes('royalty contract-no.') ||
    lower.includes('interne vertragsnr') ||
    lower.includes('honorarabrechnung')
  ) {
    return 'ullstein';
  }
  return 'generic';
}

export function lineLooksMapped(line: string): boolean {
  const pats = [
    /date:/i,
    /royalty statement/i,
    /accounting period/i,
    /copyright holder/i,
    /internal contract number/i,
    /royalty contract-no/i,
    /total sales until/i,
    /royalty\s+[0-9,.]+\s*%/i,
    /sales within accounting period/i,
    /brought forward/i,
    /carried forward/i,
    /amount of payment/i,
    /iban|bic|bank:/i,
    /ust-id|vat/i,
    /^\s*(hardcover|paperback|e-?book|audiobook|taschenbuch)/i,
    /97[89][\d\- ]{10,17}/i,
    /contact:|phone:|email:/i,
    /tax exemption/i,
    /et\s*\d/i,
  ];
  return pats.some(p => p.test(line));
}

/** De-duped interesting lines (7-179 chars), page banners excluded, capped at 80. */
export function unmappedImportantLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map(x => x.trim())
    .filter(x => x.length > 6 && x.length < 180);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!lineLooksMapped(line) && !/^[-–—]+ page/i.test(line) && !/^page \d+/i.test(line)) out.push(line);
    if (out.length >= 80) break;
  }
  return out;
}
