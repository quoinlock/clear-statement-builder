// Standards-completeness review, parity with Hugo v1.7 (reviewRows,
// categoryScores, reviewData). Product rows ignore import confidence
// (parity). The JSON payload uses reviewFormatVersion '1.1' plus a `product`
// marker per the PRD file-interchange spec; Hugo wrote `version: '1.1'` and
// readers must treat that as review format, not statement schema (PR 5).
import { fieldMeta } from '../catalog/fieldMeta.ts';
import { calculationWarnings, notBlank, totals, type CalculationWarning } from '../calc/index.ts';
import { validation } from '../validation/index.ts';
import type {
  Confidence,
  Detection,
  ProductRow,
  ReserveRow,
  ReviewStatus,
  StatementState,
  SublicenseRow,
  Totals,
} from '../types.ts';

export interface ReviewRow {
  label: string;
  key: string;
  bisgId: string;
  category: string;
  fieldCategory: string;
  priority: string;
  why: string;
  recommendation: string;
  status: ReviewStatus;
  detected: 'Yes' | 'No';
  confidence: Confidence | '—';
}

export interface CategoryScore {
  category: string;
  score: number;
  detected: number;
  unclear: number;
  missing: number;
  total: number;
}

export interface ReviewRecommendation {
  field: string;
  bisgId: string;
  priority: string;
  recommendation: string;
  why: string;
}

export interface ReviewDocument {
  reviewFormatVersion: '1.1';
  product: 'clear-statement-builder';
  generatedAt: string;
  overallScore: number;
  profile: string;
  statement: Pick<
    StatementState,
    'statementNo' | 'licenseeContractId' | 'licensorTitle' | 'licenseeTitle' | 'periodStart' | 'periodEnd'
  >;
  categoryScores: CategoryScore[];
  fields: ReviewRow[];
  missingFields: ReviewRow[];
  unclearFields: ReviewRow[];
  calculationWarnings: CalculationWarning[];
  topRecommendations: ReviewRecommendation[];
  totals: Totals;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
  disclaimer: string;
}

export const REVIEW_DISCLAIMER =
  'This report is an automated standards-completeness review. It is intended for guidance and discussion only and does not constitute an audit, certification, legal opinion, or accounting advice.';

type FieldDetail = [category: string, priority: string, why: string, recommendation: string];

export const REVIEW_FIELD_DETAILS: Record<string, FieldDetail> = {
  licenseeName: ['Contract information', 'High', 'Identifies the party issuing the statement.', 'Add the publisher/licensee legal name.'],
  licenseeAddress: ['Contract information', 'Medium', 'Gives contact information for follow-up questions.', 'Add full postal address and rights/royalty contact details.'],
  licenseeImprint: ['Contract information', 'Medium', 'Shows the publishing imprint connected to the edition.', 'Add the imprint if different from the legal publisher.'],
  licenseeContractId: ['Contract information', 'High', 'Allows publisher and recipient to match the statement to the relevant agreement.', 'Add the internal contract number or contract reference.'],
  licensorName: ['Contract information', 'High', 'Identifies the rights holder or recipient principal.', 'Add the licensor/proprietor name.'],
  licensorContractId: ['Contract information', 'Medium', 'Helps the licensor/agent match the statement to its own records.', 'Add the licensor or agency contract reference where available.'],
  contributorNames: ['Work information', 'High', 'Identifies the author or creator whose work is being reported.', 'Add contributor name(s), ideally with identifiers where available.'],
  licensorTitle: ['Work information', 'High', 'Identifies the original licensed work.', 'Add the original title as published by the licensor.'],
  licenseeTitle: ['Work information', 'High', 'Identifies the translated/local edition.', 'Add the local title as published by the licensee.'],
  language: ['Work information', 'High', 'Shows the language covered by the licensed edition.', 'Add the language of the licensee work.'],
  salesTerritory: ['Contract information', 'High', 'Clarifies the market or territory in which sales occurred.', 'Add sales territory or market such as Germany, DACH, or German-language world.'],
  advanceAmount: ['Contract economics', 'High', 'Explains what royalties are recouping against.', 'Show the advance/minimum guarantee amount paid to date.'],
  advanceCurrency: ['Contract economics', 'High', 'Clarifies the currency of the advance.', 'Add the advance currency, especially if different from statement currency.'],
  statementDate: ['Statement period', 'High', 'Shows when the statement was generated.', 'Add the statement date.'],
  periodStart: ['Statement period', 'High', 'Defines the beginning of the royalty reporting period.', 'Add reporting period start date.'],
  periodEnd: ['Statement period', 'High', 'Defines the end of the royalty reporting period.', 'Add reporting period end date.'],
  openingBalance: ['Balance reconciliation', 'High', 'Shows carry-forward/unearned amount from the prior period.', 'Label the opening balance or balance forward clearly.'],
  reserveWithheld: ['Reserves', 'High', 'Shows amounts withheld against future returns.', 'Add reserve withheld this period, even if zero.'],
  reserveReleased: ['Reserves', 'High', 'Shows prior reserves released in this period.', 'Add reserve released this period, even if zero.'],
  coAgentCommissionPercent: ['Remittance / tax', 'Medium', 'Explains any co-agent deduction before remittance.', 'Show percentage and amount if applicable, or state not applicable.'],
  taxId: ['Remittance / tax', 'Medium', 'Supports tax/VAT reconciliation on remittance paperwork.', 'Add licensee VAT/tax ID where relevant.'],
  taxExemptionStatus: ['Remittance / tax', 'Medium', 'Clarifies whether withholding tax is waived or exempt.', 'Add treaty/exemption status or expiry date if applicable.'],
  taxWithheld: ['Remittance / tax', 'High', 'Explains deductions from the gross amount payable.', 'Show withholding tax rate and amount, even if zero.'],
};

const FALLBACK_DETAIL = (cat: string): FieldDetail => [
  'Product / sales / royalty detail',
  cat === 'Required' ? 'High' : 'Medium',
  'This field supports BISG-aligned statement clarity.',
  'Add or clarify this field.',
];

/** Worst confidence among detections targeting `key`, or '' when none. */
export function importConfidenceFor(key: string, detections: Detection[] | undefined): Confidence | '' {
  if (!detections?.length) return '';
  const candidates = detections.filter(d => d.target === key);
  if (!candidates.length) return '';
  return candidates.some(d => d.confidence === 'Low')
    ? 'Low'
    : candidates.some(d => d.confidence === 'Medium')
      ? 'Medium'
      : 'High';
}

export function statusForField(
  key: string,
  ok: boolean,
  cat: string,
  detections?: Detection[],
): ReviewStatus {
  if (cat === 'Conditional' && !ok) return 'Not applicable / not shown';
  if (!ok) return 'Missing';
  const conf = importConfidenceFor(key, detections);
  if (conf === 'Low' || conf === 'Medium') return 'Detected but unclear';
  return 'Detected';
}

export function statusClass(status: ReviewStatus): string {
  if (status === 'Detected') return 'status-detected';
  if (status === 'Detected but unclear') return 'status-unclear';
  if (status === 'Missing') return 'status-missing';
  return 'status-na';
}

const PRODUCT_REVIEW_KEYS: [key: keyof ProductRow, label: string][] = [
  ['form', 'Product form detail'],
  ['isbn', 'Licensee product identifier / ISBN'],
  ['pubDate', 'Publication date'],
  ['listPrice', 'List price'],
  ['basis', 'Royalty basis'],
  ['rate', 'Royalty rate'],
  ['periodUnits', 'Units sold in period'],
  ['earnings', 'Royalty earnings'],
];

export interface ReviewInput {
  state: StatementState;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
  /** Detections from the current import, if any (drives confidence). */
  detections?: Detection[];
  profile?: string;
  generatedAt?: string;
}

export function reviewRows(input: ReviewInput): ReviewRow[] {
  const { state, products, sublicenses, detections } = input;
  const v = validation(state, products, sublicenses);
  const rows: ReviewRow[] = v.checks.map(c => {
    const meta = fieldMeta(c.key) ?? ['', ''];
    const detail = REVIEW_FIELD_DETAILS[c.key] ?? FALLBACK_DETAIL(c.cat);
    const status = statusForField(c.key, c.ok, c.cat, detections);
    return {
      label: c.label,
      key: c.key,
      bisgId: meta[0] || '',
      category: detail[0],
      fieldCategory: c.cat,
      priority: detail[1],
      why: detail[2],
      recommendation: detail[3],
      status,
      detected: c.ok ? 'Yes' : 'No',
      confidence: importConfidenceFor(c.key, detections) || '—',
    };
  });
  products.forEach((p, i) => {
    PRODUCT_REVIEW_KEYS.forEach(([k, label]) => {
      const ok = notBlank(p[k]);
      const meta = fieldMeta(k) ?? ['', ''];
      const priority = ['basis', 'rate', 'periodUnits', 'earnings', 'isbn', 'form'].includes(k) ? 'High' : 'Medium';
      rows.push({
        label: `Product ${i + 1}: ${label}`,
        key: k,
        bisgId: meta[0] || '',
        category: 'Product / sales / royalty detail',
        fieldCategory: meta[1] || 'Required',
        priority,
        why: 'Allows the recipient to identify the edition and verify the royalty calculation.',
        recommendation: 'Add this value for each product form or mark not applicable if no such format exists.',
        // Product rows deliberately ignore import confidence (parity).
        status: ok ? 'Detected' : 'Missing',
        detected: ok ? 'Yes' : 'No',
        confidence: '—',
      });
    });
  });
  if (Number(state.sublicenseIncomeTotal || 0) > 0) {
    if (!sublicenses.length) {
      rows.push({
        label: 'Sublicense detail rows',
        key: 'sublicense',
        bisgId: 'SC3–SC23',
        category: 'Sublicense income',
        fieldCategory: 'Conditional',
        priority: 'High',
        why: 'Sublicense income is payable only when applicable, but must be explained when reported.',
        recommendation: 'Add sublicensee, sublicense type, income, licensor share, and amount due.',
        status: 'Missing',
        detected: 'No',
        confidence: '—',
      });
    }
    // Populated case adds zero extra sublicense rows (parity; AC-REV-6).
  } else {
    rows.push({
      label: 'Sublicense income section',
      key: 'sublicense',
      bisgId: 'SC3–SC23',
      category: 'Sublicense income',
      fieldCategory: 'Conditional',
      priority: 'Medium',
      why: 'Clarifies whether subsidiary rights income exists for the period.',
      recommendation: 'State “not applicable” or show a zero-value sublicense section.',
      status: 'Not applicable / not shown',
      detected: 'No',
      confidence: '—',
    });
  }
  return rows;
}

export function categoryScores(rows: ReviewRow[]): CategoryScore[] {
  const grouped: Record<string, ReviewRow[]> = {};
  rows.forEach(r => {
    (grouped[r.category] ??= []).push(r);
  });
  return Object.entries(grouped).map(([cat, items]) => {
    const relevant = items.filter(i => !i.status.startsWith('Not applicable'));
    const ok = relevant.filter(i => i.status === 'Detected').length;
    const warn = relevant.filter(i => i.status === 'Detected but unclear').length;
    const score = Math.round(((ok + warn * 0.5) / Math.max(relevant.length, 1)) * 100);
    return {
      category: cat,
      score,
      detected: ok,
      unclear: warn,
      missing: relevant.filter(i => i.status === 'Missing').length,
      total: relevant.length,
    };
  });
}

/** Score bands for summary copy: >= 85 high, >= 65 medium, else low. */
export function scoreBand(score: number): 'high' | 'medium' | 'low' {
  return score >= 85 ? 'high' : score >= 65 ? 'medium' : 'low';
}

export function reviewData(input: ReviewInput): ReviewDocument {
  const { state, products, reserves, sublicenses } = input;
  const rows = reviewRows(input);
  const cats = categoryScores(rows);
  const warnings = calculationWarnings(state, products, reserves, sublicenses);
  const score = Math.round(cats.reduce((s, c) => s + c.score, 0) / Math.max(cats.length, 1));
  const highMissing = rows.filter(r => r.status === 'Missing' && r.priority === 'High');
  const unclear = rows.filter(r => r.status === 'Detected but unclear');
  const top = [
    ...highMissing,
    ...unclear,
    ...rows.filter(r => r.status === 'Missing' && r.priority !== 'High'),
  ].slice(0, 7);
  return {
    reviewFormatVersion: '1.1',
    product: 'clear-statement-builder',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overallScore: score,
    profile: input.profile ?? 'auto',
    statement: {
      statementNo: state.statementNo,
      licenseeContractId: state.licenseeContractId,
      licensorTitle: state.licensorTitle,
      licenseeTitle: state.licenseeTitle,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
    },
    categoryScores: cats,
    fields: rows,
    missingFields: rows.filter(r => r.status === 'Missing'),
    unclearFields: unclear,
    calculationWarnings: warnings,
    topRecommendations: top.map(r => ({
      field: r.label,
      bisgId: r.bisgId,
      priority: r.priority,
      recommendation: r.recommendation,
      why: r.why,
    })),
    totals: totals(state, products),
    products,
    reserves,
    sublicenses,
    disclaimer: REVIEW_DISCLAIMER,
  };
}
