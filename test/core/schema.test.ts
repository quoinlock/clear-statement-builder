// AC-PER-2, AC-PER-3, AC-IMP-1 (schema half), review-JSON detection
// (AC-REV-4 read rule), and custom-profile envelopes (AC-PRF-5 read side).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cloneSampleDocument, sample } from '../../src/core/sample/index.ts';
import { calculationWarnings, totals } from '../../src/core/calc/index.ts';
import { validation } from '../../src/core/validation/index.ts';
import { reviewData } from '../../src/core/review/index.ts';
import {
  isReviewJson,
  parseCustomProfiles,
  parseHugoOrCsbJson,
  serializeCustomProfiles,
  serializeDocument,
  serializeReviewCsv,
  serializeStatementCsv,
  statementFilename,
  StatementParseError,
} from '../../src/core/schema/index.ts';
import type { StatementDocument } from '../../src/core/types.ts';
import { DEFAULT_FORMULA_NOTES } from '../../src/core/catalog/formulaNotes.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const hugoJsonPath = join(FIXTURES, 'hugo', 'hugo-royalty-statement-RS-2026-0142.json');
const hugoCsvPath = join(FIXTURES, 'hugo', 'hugo-royalty-statement-RS-2026-0142.csv');

function sampleDoc(): StatementDocument {
  const { state, products, reserves, sublicenses } = cloneSampleDocument();
  return {
    version: '1.1.0',
    generatedAt: '2026-03-15T10:00:00.000Z',
    product: 'clear-statement-builder',
    priorArt: 'hugo-prototype-v1.7',
    statementType: 'translation',
    state,
    products,
    reserves,
    sublicenses,
  };
}

describe('AC-PER-2: statement JSON write', () => {
  it('writes version 1.1.0 with statementType (not schemaVersion, not 0.9) and never showIds', () => {
    const doc = sampleDoc();
    const out = serializeDocument(doc, {
      totals: totals(doc.state, doc.products),
      validation: validation(doc.state, doc.products, doc.sublicenses),
      calculationWarnings: calculationWarnings(doc.state, doc.products, doc.reserves, doc.sublicenses),
    }) as Record<string, unknown>;
    expect(out.version).toBe('1.1.0');
    expect(out.statementType).toBe('translation');
    expect(out).not.toHaveProperty('schemaVersion');
    expect(JSON.stringify(out)).not.toContain('showIds');
    expect(out.product).toBe('clear-statement-builder');
    expect(out.priorArt).toBe('hugo-prototype-v1.7');
    expect(out).toHaveProperty('totals');
    expect(out).toHaveProperty('validation');
    expect(out).toHaveProperty('calculationWarnings');
  });

  it('write filename is clear-statement-{statementNo||draft}', () => {
    expect(statementFilename(sample, 'json')).toBe('clear-statement-RS-2026-0142.json');
    expect(statementFilename({ ...sample, statementNo: '' }, 'csv')).toBe('clear-statement-draft.csv');
  });
});

describe('AC-PER-3 / AC-IMP-1: Hugo 0.9 read path', () => {
  // The Hugo fixture is a provenance artifact (the frozen snapshot's own
  // German sample), independent of the CSB Appendix B sample.
  it('parses the real Hugo 0.9 fixture and restores the full document as translation', () => {
    const raw = JSON.parse(readFileSync(hugoJsonPath, 'utf8'));
    expect(raw.version).toBe('0.9');
    const doc = parseHugoOrCsbJson(raw);
    expect(doc.version).toBe('1.1.0');
    expect(doc.statementType).toBe('translation');
    expect(doc.state.licenseeName).toBe('Nordlicht Verlag GmbH');
    expect(doc.state.statementNotes).toContain('best-practice template');
    expect(doc.products).toHaveLength(4);
    expect(doc.reserves).toHaveLength(2);
    expect(doc.sublicenses).toHaveLength(1);
  });

  it('a file without formulaNotes (Hugo 0.9 / CSB ≤ 2.2) reads the standard formula bullets', () => {
    const raw = JSON.parse(readFileSync(hugoJsonPath, 'utf8'));
    expect(raw.state.formulaNotes).toBeUndefined();
    expect(parseHugoOrCsbJson(raw).state.formulaNotes).toBe(DEFAULT_FORMULA_NOTES);
  });

  it('custom formulaNotes round-trip through JSON and CSV', () => {
    const doc = sampleDoc();
    doc.state.formulaNotes = 'Royalty Earnings = Period Units × Fee per unit\nRates escalate at 5,000 units.';
    const json = JSON.parse(JSON.stringify(serializeDocument(doc)));
    expect(parseHugoOrCsbJson(json).state.formulaNotes).toBe(doc.state.formulaNotes);
    expect(serializeStatementCsv(doc)).toContain('"Statement","formulaNotes","Royalty Earnings = Period Units × Fee per unit\nRates escalate at 5,000 units.","",""');
    // Default value: no row (Hugo byte parity); blank value: an empty row.
    expect(serializeStatementCsv(sampleDoc())).not.toContain('"formulaNotes"');
    const blank = sampleDoc();
    blank.state.formulaNotes = '';
    expect(serializeStatementCsv(blank)).toContain('"Statement","formulaNotes","","",""');
    expect(parseHugoOrCsbJson(JSON.parse(JSON.stringify(serializeDocument(blank)))).state.formulaNotes).toBe('');
  });

  it('accepts version-missing files without a product marker (hand-edited CSB → Hugo path)', () => {
    const raw = JSON.parse(readFileSync(hugoJsonPath, 'utf8'));
    delete raw.version;
    delete raw.generatedAt;
    expect(() => parseHugoOrCsbJson(raw)).not.toThrow();
  });

  it('round-trips CSB output through the parser', () => {
    const doc = sampleDoc();
    const parsed = parseHugoOrCsbJson(serializeDocument(doc));
    expect(parsed.state).toEqual(doc.state);
    expect(parsed.products).toEqual(doc.products);
  });

  it('round-trips statementType and reads legacy CSB 1.0.x as translation', () => {
    const standard = parseHugoOrCsbJson(serializeDocument({ ...sampleDoc(), statementType: 'standard' }));
    expect(standard.statementType).toBe('standard');
    // A CSB 1.0.x file predates statementType.
    const legacy: Record<string, unknown> = { ...serializeDocument(sampleDoc()), version: '1.0.0' };
    delete legacy.statementType;
    expect(parseHugoOrCsbJson(legacy).statementType).toBe('translation');
  });

  it('rejects unrecognized shapes', () => {
    expect(() => parseHugoOrCsbJson(null)).toThrow(StatementParseError);
    expect(() => parseHugoOrCsbJson({ version: '2.0', product: 'other', state: {}, products: [] })).toThrow(
      StatementParseError,
    );
    expect(() => parseHugoOrCsbJson({ version: '0.9' })).toThrow(StatementParseError);
  });

  it('rejects a review JSON with a distinct message (Hugo version 1.1 read rule)', () => {
    const review = reviewData(cloneSampleDocument());
    expect(isReviewJson(review)).toBe(true);
    // Hugo-shaped review payload: version '1.1', no reviewFormatVersion.
    const hugoReview = { ...(review as unknown as Record<string, unknown>) };
    delete hugoReview.reviewFormatVersion;
    hugoReview.version = '1.1';
    expect(isReviewJson(hugoReview)).toBe(true);
    expect(() => parseHugoOrCsbJson(hugoReview)).toThrow(/review report/);
  });
});

describe('statement CSV (v1.7 parity)', () => {
  it('serializes the parsed Hugo document byte-identically to the Hugo fixture CSV', () => {
    // Shape parity: our writer over Hugo's own data reproduces Hugo's CSV.
    const doc = parseHugoOrCsbJson(JSON.parse(readFileSync(hugoJsonPath, 'utf8')));
    expect(serializeStatementCsv(doc)).toBe(readFileSync(hugoCsvPath, 'utf8'));
  });

  it('sample CSV keeps the Section,Field,Value,BISG ID,Category shape', () => {
    const csv = serializeStatementCsv(sampleDoc());
    expect(csv.split('\n')[0]).toBe('"Section","Field","Value","BISG ID","Category"');
    expect(csv).toContain('"Statement","licenseeName","Harbor Light Press, Inc.","Con1_LicName","Required"');
    expect(csv).toContain('"Product 4","form","Audiobook Download","SS32_ProdFormDtl","Required"');
  });
});

describe('custom profiles envelope', () => {
  const profile = {
    id: 'ullstein-style-abc',
    name: 'Ullstein style',
    language: 'de',
    numberFormat: 'european' as const,
    splitPattern: 'Interne VertragsNr\\.?\\s*(\\d+)',
    fieldRules: 'Datum:\\s*([0-9.]+) => statementDate',
    abbreviations: 'NVE: Net Receipts',
    productAliases: 'TB => Paperback',
    calculationHint: 'earnings = units * nlp * rate',
  };

  it('writes the CSB envelope with both version markers', () => {
    const env = serializeCustomProfiles([profile]);
    expect(env.csbProfileVersion).toBe('1.0');
    expect(env.hugoProfileVersion).toBe('1.7');
    expect(env.profiles).toEqual([profile]);
  });

  it('reads CSB envelope, Hugo 1.7 envelope, bare array, and {profiles:[...]}', () => {
    expect(parseCustomProfiles(serializeCustomProfiles([profile]))).toEqual([profile]);
    expect(parseCustomProfiles({ hugoProfileVersion: '1.7', profiles: [profile] })).toEqual([profile]);
    expect(parseCustomProfiles([profile])).toEqual([profile]);
    expect(parseCustomProfiles({ profiles: [profile] })).toEqual([profile]);
  });

  it('drops malformed entries and normalizes numberFormat', () => {
    const parsed = parseCustomProfiles([profile, { id: '', name: 'x' }, 42, { ...profile, numberFormat: 'bogus' }]);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].numberFormat).toBe('auto');
  });

  it('throws on unrecognized JSON', () => {
    expect(() => parseCustomProfiles({ nope: true })).toThrow(StatementParseError);
  });
});

describe('AC-REV-4 (export side): disclaimer in JSON and CSV', () => {
  it('review CSV contains the fields table, warnings table, and disclaimer row', () => {
    const review = reviewData(cloneSampleDocument());
    const csv = serializeReviewCsv(review);
    expect(csv).toContain('"Status","Priority","BISG ID"');
    expect(csv).toContain('"Calculation warning","Detail"');
    expect(csv).toContain(review.disclaimer);
  });
});
