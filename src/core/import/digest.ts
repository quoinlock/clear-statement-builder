// Deterministic heuristic digest (Hugo digestStatementText parity). Pure
// function: text + profile (+ custom profiles, PR 16) → DetectionResult.
// The generic put() table below is snapshot-normative (PRD Appendix A).
import type { ContractStatement, Detection, DetectionResult, ProductRow } from '../types.ts';
import { notBlank } from '../calc/index.ts';
import {
  ABBREVIATIONS,
  addDetection,
  findFirst,
  normalizeText,
  parseDateToDisplay,
  parseGermanNumber,
  profileFromText,
  unmappedImportantLines,
} from './helpers.ts';
import { parseUllsteinProductSegment } from './productSegment.ts';
import { parseUllsteinContracts } from './ullstein.ts';
import type { CalcInference, CustomImportProfile, StatementState } from '../types.ts';

export function digestStatementText(
  rawText: string,
  requestedProfile?: string,
  _customProfiles?: CustomImportProfile[],
): DetectionResult {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();
  const profile = profileFromText(text, requestedProfile || 'auto');
  const st: Partial<StatementState> = {};
  const products: ProductRow[] = [];
  const notes: string[] = [];
  const detections: Detection[] = [];
  const calcInferences: CalcInference[] = [];
  const isUllstein = profile === 'ullstein';

  function put(key: keyof StatementState, value: string, conf: 'High' | 'Medium' | 'Low', source: string, reason: string) {
    if (notBlank(value)) {
      st[key] = String(value);
      addDetection(detections, key, value, conf, source, reason);
    }
  }

  put('statementDate', parseDateToDisplay(findFirst(text, [/\bDate:\s*([0-9.\-/]+)/i, /\bDatum:\s*([0-9.\-/]+)/i, /Royalty Statement Date:\s*([^\n]+)/i])), 'High', 'Date/Datum label', 'Direct label match');
  put('periodStart', parseDateToDisplay(findFirst(text, [/Accounting period\s+([0-9.\-/]+)\s*[-–]/i, /Abrechnungszeitraum\s+([0-9.\-/]+)\s*[-–]/i, /Reporting Period Start Date:\s*([^\n]+)/i])), 'High', 'Accounting period / Abrechnungszeitraum', 'Direct label match');
  put('periodEnd', parseDateToDisplay(findFirst(text, [/Accounting period\s+[0-9.\-/]+\s*[-–]\s*([0-9.\-/]+)/i, /Abrechnungszeitraum\s+[0-9.\-/]+\s*[-–]\s*([0-9.\-/]+)/i, /Reporting Period End Date:\s*([^\n]+)/i, /as of\s+([0-9.\-/]+)/i, /per\s+([0-9.\-/]+)/i])), 'High', 'Accounting period / Abrechnungszeitraum', 'Direct label match');
  const rightsHolder = findFirst(text, [/Rechtegeber:\s*(?:Frau|Herr|Mrs\.?|Mr\.?)?\s*([^\n]+)/i, /Copyright Holder:\s*([^\n]+)/i, /Licensor Name:\s*([^\n]+)/i, /Royalty Statement for\s+(.+?)\s+as of/i]);
  put('licensorName', rightsHolder && rightsHolder.length > 2 ? rightsHolder : findFirst(text, [/Rechtegeber:\s*(?:Frau|Herr)?\s*\n\s*([^\n]+)/i]), 'High', 'Rechtegeber / Copyright Holder', 'Direct label match');
  put('licenseeName', findFirst(text, [/^([^\n]+?(?:Verlag|Publisher|Press|Buchverlage|Publishing)[^\n]*)/im, /Licensee Name:\s*([^\n]+)/i]), isUllstein ? 'High' : 'Medium', 'Publisher heading', 'Profile/label match');
  put('licenseeAddress', findFirst(text, [/([A-Za-zÄÖÜäöüß.\- ]+str(?:aße|\.)\s*\d+[^\n]+)/i]), 'Medium', 'Address-like line', 'Pattern match');
  put('licenseePhone', findFirst(text, [/(?:phone|Telefon)\s*:?\s*([^\n]+)/i]), 'High', 'Phone/Telefon label', 'Direct label match');
  put('licenseeEmail', findFirst(text, [/(?:email|E-Mail)\s*:?\s*([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i, /([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i]), 'High', 'Email/E-Mail label', 'Direct label match');
  put('licenseeWebsite', findFirst(text, [/(www\.[^\s]+)/i]), 'Medium', 'Website pattern', 'Pattern match');
  const cId = findFirst(text, [/Internal contract number\s*([A-Z0-9\-]+)/i, /Interne VertragsNr\.?\s*([0-9]+)/i, /([0-9]{6,})\s*\n\s*Interne VertragsNr\.?/i, /Royalty Contract-No\.\s*([A-Z0-9\-]+)/i, /Licensee Contract ID:\s*([^\n]+)/i]);
  put('licenseeContractId', cId, 'High', 'Internal contract number / Interne VertragsNr.', 'Direct/profile label match');
  put('contributorNames', findFirst(text, [/^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+,\s*[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+)/m, /Contributor Name\(s\):\s*([^\n]+)/i]), 'Medium', 'Name-like title block', 'Pattern match');
  put('licenseeTitle', findFirst(text, [/^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+,\s*[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+,\s*([^\n]+)/m, /Licensee Title of Work:\s*([^\n]+)/i]), isUllstein ? 'High' : 'Medium', 'Title block', 'Profile/pattern match');
  put('licensorTitle', findFirst(text, [/\n(The [^\n]+|A [^\n]+|An [^\n]+)\n/i, /Licensor Title of Work:\s*([^\n]+)/i]), 'Medium', 'Original title line', 'Pattern match');
  put('language', lower.includes('deutsche') || lower.includes('german') ? 'German' : '', lower.includes('deutsche') ? 'High' : 'Medium', 'Language cue', 'Inferred from “Deutsche” or “German”');
  put('taxId', findFirst(text, [/(?:UST-ID|VAT|Tax Identification Number)\s*:?\s*([A-Z]{2}\s*[0-9 ]+)/i, /Steuernummer:\s*([^\n]+)/i]), 'High', 'Tax/VAT label', 'Direct label match');
  put('taxExemptionStatus', findFirst(text, [/Tax exemption until:\s*([^\n]*)/i, /Tax Exemption Status:\s*([^\n]+)/i]), 'Medium', 'Tax exemption label', 'Direct label; may be blank');
  put('openingBalance', parseGermanNumber(findFirst(text, [/Brought forward\s*([-0-9.,]+)/i, /Vortrag lt\. letzter Abrechnung\s*([-0-9.,]+)/i, /Opening Balance[^\n]*?([-€$£0-9.,]+)/i])), 'High', 'Brought forward / Vortrag', 'Mapped to opening balance');
  put('reserveWithheld', parseGermanNumber(findFirst(text, [/Reserve Withheld[^\n]*?([-€$£0-9.,]+)/i])), 'High', 'Reserve Withheld', 'Direct label match');
  put('reserveReleased', parseGermanNumber(findFirst(text, [/Reserve Released[^\n]*?([-€$£0-9.,]+)/i])), 'High', 'Reserve Released', 'Direct label match');
  put('sublicenseIncomeTotal', parseGermanNumber(findFirst(text, [/Licensor Amount of Sublicense Income[^\n]*?([-€$£0-9.,]+)/i])), 'High', 'Sublicense income', 'Direct label match');
  put('taxWithheld', parseGermanNumber(findFirst(text, [/Tax Withheld[^\n]*?([-€$£0-9.,]+)/i])), 'High', 'Tax withheld', 'Direct label match');

  if (isUllstein) {
    notes.push(
      'Ullstein/Bonnier profile applied: German labels such as Abrechnungszeitraum, Interne VertragsNr., Honorar, honorarpflichtige Menge, Berechnung in EUR/Guthaben in EUR, Vortrag and Neuer Vortrag are recognized.',
    );
    put('payerName', findFirst(text, [/c\/o\s*([^,\n]+(?:GmbH|AG|Ltd\.?|Inc\.?))/i]), 'Medium', 'c/o payer line', 'Ullstein profile inference');
  }

  let contractStatements: ContractStatement[] = [];
  if (isUllstein) {
    contractStatements = parseUllsteinContracts(text, st);
    if (contractStatements.length) {
      notes.push(
        `${contractStatements.length} separate Ullstein contract statement${contractStatements.length === 1 ? '' : 's'} detected by Interne VertragsNr.`,
      );
      const first = contractStatements[0];
      Object.assign(st, first.state || {});
      contractStatements.forEach(cs => (cs.products || []).forEach(p => products.push(p)));
      contractStatements.forEach((cs, idx) => {
        addDetection(
          detections,
          'licenseeContractId',
          cs.contractId,
          'High',
          `Interne VertragsNr. statement ${idx + 1}`,
          'Used to split the imported statement into separate contract statements.',
        );
      });
    }
  }

  // ISBN-window product fallback — runs for ANY profile with zero rows
  // (AC-IMP-13), reusing the product-segment parser over a 950-char window.
  if (!products.length) {
    const isbnRegex = /(Hardcover|Paperback|E-?Book|Audiobook(?: Download)?|Taschenbuch|TB|Standard E-?Book)?\s*(97[89][\d\- ]{10,17})/gi;
    let match: RegExpExecArray | null;
    while ((match = isbnRegex.exec(text))) {
      const rawForm = (match[1] || '').trim();
      const isbn = match[2].trim().replace(/\s+/g, '');
      const after = text.slice(match.index, Math.min(text.length, match.index + 950));
      const p = parseUllsteinProductSegment((rawForm || 'Book') + '\n' + isbn + '\n' + after, st.licenseeTitle || '');
      if (p.isbn || p.form) products.push(p);
    }
  }

  products.forEach(p => {
    if (p.basisAmount && p.rate && p.earnings) {
      let expected: number | null = null;
      if (/per copy/i.test(p.basisAmount) && p.periodUnits) {
        const b = Number((p.basisAmount.match(/€([0-9,.]+)/) || [])[1]?.replace(/,/g, '') || NaN);
        expected = Number(p.periodUnits) * b * (Number(p.rate) / 100);
      } else if (/total net receipts/i.test(p.basisAmount)) {
        const b = Number((p.basisAmount.match(/€([0-9,.]+)/) || [])[1]?.replace(/,/g, '') || NaN);
        expected = b * (Number(p.rate) / 100);
      }
      if (expected !== null && Number.isFinite(expected)) {
        const diff = Math.abs(expected - Number(p.earnings));
        calcInferences.push({
          product: p.form || p.isbn,
          calculation: `${p.basisAmount} × ${p.rate}%${/per copy/i.test(p.basisAmount) ? ' × ' + p.periodUnits + ' units' : ''} = ${expected.toFixed(2)}`,
          reported: Number(p.earnings).toFixed(2),
          status: diff < 0.05 ? 'matches' : 'review',
        });
      }
    }
  });

  // Bare-ISBN fallback: rows with only an identifier.
  if (!products.length) {
    const isbns = [...text.matchAll(/97[89][\d\- ]{10,17}/g)].map(x => x[0]);
    isbns.forEach(isbn =>
      products.push({
        form: '',
        isbn: isbn.trim().replace(/\s+/g, ''),
        pubDate: '',
        listPrice: '',
        basis: '',
        rate: '',
        priorUnits: '',
        periodUnits: '',
        basisAmount: '',
        earnings: '',
      }),
    );
  }

  const abbreviationHits = Object.entries(ABBREVIATIONS)
    .filter(([abbr]) => new RegExp('\\b' + abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text))
    .map(([abbr, meaning]) => `${abbr} = ${meaning}`);
  const populated = Object.fromEntries(Object.entries(st).filter(([, v]) => notBlank(v))) as Partial<StatementState>;
  notes.push(`${Object.keys(populated).length} statement-level fields detected.`);
  notes.push(
    `${products.length} product row${products.length === 1 ? '' : 's'} detected${contractStatements.length ? ` across ${contractStatements.length} contract statement${contractStatements.length === 1 ? '' : 's'}` : ''}.`,
  );
  if (abbreviationHits.length) notes.push(`Abbreviation dictionary hits: ${abbreviationHits.slice(0, 10).join('; ')}.`);
  if (calcInferences.length) notes.push(`${calcInferences.length} royalty calculation inference${calcInferences.length === 1 ? '' : 's'} detected.`);
  if (!products.length) notes.push('No product rows detected. Try copying statement text into the paste box, or import JSON/CSV.');
  notes.push('Review all detected values before applying them; publisher statement layouts vary significantly.');

  return {
    sourceType: 'Text/PDF heuristic digest',
    profile,
    state: populated,
    products,
    reserves: [],
    sublicenses: [],
    detections,
    unmappedLines: unmappedImportantLines(text),
    calcInferences,
    notes,
    rawText: text,
    contractStatements,
  };
}
