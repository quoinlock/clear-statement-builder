// Product-segment parser (Hugo parseUllsteinProductSegment parity). Despite
// the name's origin it is NOT Ullstein-only: the generic ISBN fallback runs
// it over a 950-character window for any profile (AC-IMP-13).
//
// v1 MUST bugfix (AC-IMP-11): prior/LTD units use a generalized
// `honorarpflichtige Menge Gesamt per dd.mm.yyyy` date regex — Hugo
// hardcoded 01.01.2025 / 31.12.2025 and silently failed on other periods.
import type { ProductRow } from '../types.ts';
import {
  cleanUnit,
  findFirst,
  findValueAfterLabel,
  formatBasisCurrency,
  isIntegerLikeLine,
  isMoneyLikeLine,
  parseDateToDisplay,
  parseGermanNumber,
  valueAfterOrBefore,
} from './helpers.ts';

export interface ParsedProductSegment extends ProductRow {
  titleLine: string;
  periodStart: string;
  periodEnd: string;
  sourceText: string;
}

const FORM_MAP: Record<string, string> = {
  TB: 'Paperback',
  Taschenbuch: 'Paperback',
  'Standard E-Book': 'E-Book',
  EBook: 'E-Book',
  'E-Book': 'E-Book',
};

export function mapForm(raw: string): string {
  return FORM_MAP[raw] || raw || 'Book';
}

/**
 * Finds "honorarpflichtige Menge Gesamt per <date>" unit lines. The earlier
 * date is the prior-period cumulative figure; the later date is life-to-date.
 */
function mengeGesamtUnits(lines: string[], segText: string): { prior: string; ltd: string } {
  const dateOf = (s: string) => {
    const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}${m[2]}${m[1]}` : '';
  };
  const labels: string[] = [];
  for (const line of lines) {
    const m = line.match(/honorarpflichtige Menge Gesamt per\s+(\d{2}\.\d{2}\.\d{4})/i);
    if (m && !labels.includes(m[1])) labels.push(m[1]);
  }
  // Also catch value-before-label single-line variants present only in the
  // raw segment text.
  for (const m of segText.matchAll(/[0-9.]+\s+honorarpflichtige Menge Gesamt per\s+(\d{2}\.\d{2}\.\d{4})/gi)) {
    if (!labels.includes(m[1])) labels.push(m[1]);
  }
  if (!labels.length) return { prior: '', ltd: '' };
  const sorted = [...labels].sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const priorDate = sorted[0];
  const ltdDate = sorted.length > 1 ? sorted[sorted.length - 1] : '';
  const unitsFor = (date: string): string => {
    if (!date) return '';
    const esc = date.replace(/\./g, '\\.');
    const labelRe = new RegExp(`honorarpflichtige Menge Gesamt per\\s+${esc}(?:\\s+([\\d.]+))?`, 'i');
    return (
      findValueAfterLabel(lines, labelRe, isIntegerLikeLine) ||
      findFirst(segText, [new RegExp(`([0-9.]+)\\s+honorarpflichtige Menge Gesamt per\\s+${esc}`, 'i')])
    );
  };
  return { prior: cleanUnit(unitsFor(priorDate)), ltd: cleanUnit(unitsFor(ltdDate)) };
}

export function parseUllsteinProductSegment(segText: string, contractTitle: string): ParsedProductSegment {
  const lines = segText
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
  const first = lines[0] || '';
  let formRaw = '';
  let isbn = '';
  const m = first.match(/^(TB|Taschenbuch|E-?Book|Standard E-?Book|Hardcover|Paperback)\s+(97[89][\d\- ]{10,17})/i);
  if (m) {
    formRaw = m[1];
    isbn = m[2];
  } else {
    formRaw = first.match(/^(TB|Taschenbuch|E-?Book|Standard E-?Book|Hardcover|Paperback)$/i)?.[1] || '';
    isbn =
      lines.find(l => /^97[89][\d\- ]{10,17}$/.test(l)) || segText.match(/97[89][\d\- ]{10,17}/)?.[0] || '';
  }
  const form = mapForm(formRaw);
  const pub = parseDateToDisplay(findFirst(segText, [/ET\s*([0-9.\-/]+)/i, /Publication Date:\s*([^\n]+)/i]));
  const periodStart = parseDateToDisplay(
    findFirst(segText, [/Abrechnungszeitraum\s+([0-9.\-/]+)\s*[-–]/i, /Accounting period\s+([0-9.\-/]+)\s*[-–]/i]),
  );
  const periodEnd = parseDateToDisplay(
    findFirst(segText, [
      /Abrechnungszeitraum\s+[0-9.\-/]+\s*[-–]\s*([0-9.\-/]+)/i,
      /Accounting period\s+[0-9.\-/]+\s*[-–]\s*([0-9.\-/]+)/i,
    ]),
  );
  let rate = '';
  let earnings = '';
  let periodUnits = '';
  let nve = '';
  let nlp = '';
  let blp = '';
  let basis = '';
  let basisAmount = '';
  let listPrice = '';
  // Inline form used by some PDF text extractors:
  // "362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 263,68".
  // Line-based so basis amounts such as NLP 12,14 are not mistaken for the
  // final royalty amount.
  for (const oneLine of lines) {
    const inlineHon = oneLine.match(
      /^\s*([-+]?\d{1,3}(?:\.\d{3})*|[-+]?\d+)\s+Honorar\s+([0-9.,]+)\s*%\s*;\s*((?:(?:NVE|NLP|BLP|BVE|STP)\s+[0-9.,]+(?:;\s*)?)+)\s+([-+]?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\d+,\d{2})\s*$/i,
    );
    if (inlineHon) {
      periodUnits = cleanUnit(inlineHon[1]);
      rate = parseGermanNumber(inlineHon[2]);
      earnings = parseGermanNumber(inlineHon[4]);
      const basisText = inlineHon[3];
      nve = findFirst(basisText, [/NVE\s*([0-9.,]+)/i]);
      nlp = findFirst(basisText, [/NLP\s*([0-9.,]+)/i]);
      blp = findFirst(basisText, [/BLP\s*([0-9.,]+)/i]);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hm = line.match(/Honorar\s+([0-9.,]+)\s*%\s*;\s*(.*)$/i);
    if (hm) {
      rate = rate || parseGermanNumber(hm[1]);
      const basisText = hm[2] || '';
      nve = nve || findFirst(basisText, [/NVE\s*([0-9.,]+)/i]);
      nlp = nlp || findFirst(basisText, [/NLP\s*([0-9.,]+)/i]);
      blp = blp || findFirst(basisText, [/BLP\s*([0-9.,]+)/i]);
      periodUnits = periodUnits || cleanUnit(valueAfterOrBefore(lines, i, 'before', isIntegerLikeLine, 4));
      earnings = earnings || parseGermanNumber(valueAfterOrBefore(lines, i, 'before', isMoneyLikeLine, 4));
    }
    if (/keine honorarpflichtigen Verkäufe|no sales/i.test(line)) {
      periodUnits = periodUnits || cleanUnit(valueAfterOrBefore(lines, i, 'before', isIntegerLikeLine, 4)) || '0';
      earnings = earnings || parseGermanNumber(valueAfterOrBefore(lines, i, 'before', isMoneyLikeLine, 4)) || '0';
    }
    if (/Honorarpflichtige Menge im Abrechnungszeitraum/i.test(line)) {
      periodUnits = periodUnits || cleanUnit(valueAfterOrBefore(lines, i, 'before', isIntegerLikeLine, 3));
      earnings = earnings || parseGermanNumber(valueAfterOrBefore(lines, i, 'after', isMoneyLikeLine, 3));
    }
  }
  const { prior: priorUnits, ltd } = mengeGesamtUnits(lines, segText);
  if (!periodUnits && priorUnits && ltd) periodUnits = String(Number(ltd) - Number(priorUnits));
  if (nve) {
    basis = 'Net Receipts (NVE)';
    basisAmount = `${formatBasisCurrency(nve)} total net receipts`;
  } else if (nlp) {
    basis = 'Net List Price (NLP)';
    basisAmount = `${formatBasisCurrency(nlp)} per copy (NLP)`;
  }
  if (blp) listPrice = parseGermanNumber(blp);
  if (!basis && /NLP/i.test(segText)) basis = 'Net List Price (NLP)';
  if (!basis && /NVE/i.test(segText)) basis = 'Net Receipts (NVE)';
  const titleLine =
    lines.find(
      l => l.includes(',') && !/^Interne VertragsNr/i.test(l) && !/^Honorar/i.test(l) && !/^Abrechnungszeitraum/i.test(l),
    ) ||
    contractTitle ||
    '';
  return {
    form,
    isbn: isbn.trim().replace(/\s+/g, ''),
    pubDate: pub,
    listPrice,
    basis,
    rate,
    priorUnits,
    periodUnits,
    basisAmount,
    earnings,
    titleLine,
    periodStart,
    periodEnd,
    sourceText: segText,
  };
}
