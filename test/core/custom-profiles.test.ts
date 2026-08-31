// AC-PRF-1..8 and AC-IMP-14 (PRD "Acceptance criteria > Custom profiles").
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE_DRAFT,
  ULLSTEIN_STYLE_TEMPLATE,
  makeRegex,
  normalizeCustomNumber,
  parseKeyValueLines,
  parseRuleLines,
  slugifyProfileName,
} from '../../src/core/import/customProfiles.ts';
import { digestStatementText } from '../../src/core/import/digest.ts';
import { parseCustomProfiles, serializeCustomProfiles } from '../../src/core/schema/index.ts';
import type { CustomImportProfile } from '../../src/core/types.ts';

function profile(patch: Partial<CustomImportProfile>): CustomImportProfile {
  return { ...DEFAULT_PROFILE_DRAFT, id: 'test-prof-1', name: 'Test profile', ...patch };
}

const LABELED_TWO_BLOCKS = `Publisher Statement
Block Contract No. A-100
Statement Date: 15.03.2026
Amount due 1.234,56
Block Contract No. B-200
Statement Date: 16.03.2026
`;

describe('rule parsing primitives', () => {
  it('parseRuleLines splits on =>, skips comments and non-rules', () => {
    expect(parseRuleLines('# comment\nfoo => bar\nbad line')).toEqual([{ pattern: 'foo', target: 'bar' }]);
    // Parity quirk: a literal "=>" inside the pattern splits there too; the
    // remainder is rejoined into the target (Hugo parts.slice(1).join('=>')).
    expect(parseRuleLines('x\\s*=>\\s*y => target')).toEqual([{ pattern: 'x\\s*', target: '\\s*y=>target' }]);
  });

  it('parseKeyValueLines builds a dictionary', () => {
    expect(parseKeyValueLines('TB => Paperback\n# no\nHC => Hardcover')).toEqual({ TB: 'Paperback', HC: 'Hardcover' });
  });

  it('slugify + template shape', () => {
    expect(slugifyProfileName('Ullstein Style! Profile')).toBe('ullstein-style-profile');
    expect(ULLSTEIN_STYLE_TEMPLATE.numberFormat).toBe('european');
    expect(parseRuleLines(ULLSTEIN_STYLE_TEMPLATE.fieldRules)).toHaveLength(8);
  });
});

describe('AC-PRF-1: template split pattern extracts multiple contracts', () => {
  it('custom split creates one contract statement per labeled block', () => {
    const p = profile({ splitPattern: 'Block Contract No\\.\\s*([A-Z0-9-]+)' });
    const r = digestStatementText(LABELED_TWO_BLOCKS, 'custom:test-prof-1', [p]);
    expect(r.sourceType).toBe('Text/PDF digest with custom profile');
    expect(r.profile).toBe('custom: Test profile');
    expect(r.contractStatements).toHaveLength(2);
    expect(r.contractStatements!.map(c => c.contractId)).toEqual(['A-100', 'B-200']);
  });
});

describe('AC-PRF-2: field rule fills with High confidence', () => {
  it('Contract No rule maps licenseeContractId', () => {
    const p = profile({ fieldRules: 'Block Contract No\\.?\\s*([A-Z0-9-]+) => licenseeContractId' });
    const r = digestStatementText(LABELED_TWO_BLOCKS, 'custom:test-prof-1', [p]);
    expect(r.state.licenseeContractId).toBe('A-100');
    const det = r.detections.find(d => d.target === 'licenseeContractId' && d.source.startsWith('Custom profile'))!;
    expect(det.confidence).toBe('High');
  });
});

describe('AC-PRF-3: numberFormat=european', () => {
  it('normalizes 1.234,56 for numeric targets', () => {
    const p = profile({ numberFormat: 'european', fieldRules: 'Amount due\\s*([-0-9.,]+) => advanceAmount' });
    const r = digestStatementText(LABELED_TWO_BLOCKS, 'custom:test-prof-1', [p]);
    expect(r.state.advanceAmount).toBe('1234.56');
  });

  it('normalizeCustomNumber respects the format setting', () => {
    const eu = profile({ numberFormat: 'european' });
    const us = profile({ numberFormat: 'us' });
    expect(normalizeCustomNumber('1.234,56', eu)).toBe('1234.56');
    expect(normalizeCustomNumber('1,234.56', us)).toBe('1234.56');
    expect(normalizeCustomNumber('1.234,56', undefined)).toBe('1234.56'); // auto
  });
});

describe('AC-PRF-4: product form aliases', () => {
  it('rewrites detected forms without creating rows', () => {
    const text = 'Nordlicht Verlag\nTB 978-3-548-06612-3\n362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 263,68\n';
    // The generic ISBN fallback creates the row (form Paperback via TB); an
    // alias can rewrite it further.
    const p = profile({ productAliases: 'Paperback => Softcover Edition' });
    const r = digestStatementText(text, 'custom:test-prof-1', [p]);
    expect(r.products).toHaveLength(1);
    expect(r.products[0].form).toBe('Softcover Edition');
  });

  it('aliases never create rows from nothing', () => {
    const p = profile({ productAliases: 'TB => Paperback' });
    const r = digestStatementText('No products in this text at all\n', 'custom:test-prof-1', [p]);
    expect(r.products).toEqual([]);
  });
});

describe('AC-PRF-5: profiles JSON round-trip', () => {
  it('export envelope reads back through both accepted shapes', () => {
    const p = profile({});
    const csbEnvelope = serializeCustomProfiles([p]);
    expect(parseCustomProfiles(JSON.parse(JSON.stringify(csbEnvelope)))).toEqual([p]);
    expect(parseCustomProfiles({ hugoProfileVersion: '1.7', profiles: [p] })).toEqual([p]);
  });
});

describe('AC-PRF-6: invalid regex never throws out of digest', () => {
  it('falls back to an escaped-literal match', () => {
    const p = profile({ fieldRules: '((((bad regex => licenseeName', splitPattern: '((((' });
    expect(() => digestStatementText(LABELED_TWO_BLOCKS, 'custom:test-prof-1', [p])).not.toThrow();
  });

  it('makeRegex literal fallback matches the raw text', () => {
    const re = makeRegex('a(b');
    expect(re).not.toBeNull();
    expect(re!.test('xx a(b yy')).toBe(true);
  });
});

describe('AC-PRF-7/8: unmappable targets silently no-op', () => {
  it('Neuer Vortrag => closingBalance never writes state', () => {
    const p = profile({ fieldRules: 'Neuer Vortrag\\s*([-0-9.,]+) => closingBalance' });
    const r = digestStatementText('Neuer Vortrag 143,18\n', 'custom:test-prof-1', [p]);
    expect((r.state as Record<string, string>).closingBalance).toBeUndefined();
    expect(r.detections.find(d => d.target === 'closingBalance')).toBeUndefined();
  });

  it('Statement No. => statementNo never writes state', () => {
    const p = profile({ fieldRules: 'Statement No\\.\\s*([A-Z0-9-]+) => statementNo' });
    const r = digestStatementText('Statement No. RS-2026-0001\n', 'custom:test-prof-1', [p]);
    expect((r.state as Record<string, string>).statementNo).toBeUndefined();
  });
});

describe('AC-IMP-14: custom profiles never invoke the Ullstein contract split', () => {
  it('Interne VertragsNr. text with a custom profile and no splitPattern → no contract table', () => {
    const p = profile({ splitPattern: '' });
    const text = 'Ullstein Buchverlage\nHart, Amelia, Titel\nInterne VertragsNr. 401877\nTB 978-3-548-06612-3\n';
    const r = digestStatementText(text, 'custom:test-prof-1', [p]);
    expect(r.contractStatements ?? []).toEqual([]);
  });

  it('with a splitPattern, splitting is by the custom rule, not parseUllsteinContracts', () => {
    const p = profile({ splitPattern: 'Interne VertragsNr\\.?\\s*(\\d+)' });
    const text = 'Ullstein Buchverlage\nInterne VertragsNr. 401877\nTB 978-3-548-06612-3\nInterne VertragsNr. 401912\n';
    const r = digestStatementText(text, 'custom:test-prof-1', [p]);
    expect(r.contractStatements).toHaveLength(2);
    // Custom split segments carry no Ullstein balance capture.
    expect(r.contractStatements![0].newBalance).toBe('');
  });

  it('unknown custom id falls back to a generic digest', () => {
    const r = digestStatementText('Interne VertragsNr. 401877\n', 'custom:missing', []);
    expect(r.profile).toBe('generic');
  });
});
