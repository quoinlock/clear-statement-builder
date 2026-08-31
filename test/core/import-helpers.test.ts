// PR 12: importer helper units (PRD "Shared helpers, must be unit-tested")
// and AC-IMP-3/7/9.
import { describe, expect, it } from 'vitest';
import {
  ABBREVIATIONS,
  IMPORT_FIELD_OPTIONS,
  cleanUnit,
  detectCurrencyValue,
  findFirst,
  findValueAfterLabel,
  findValueForLabel,
  formatBasisCurrency,
  isIntegerLikeLine,
  isMoneyLikeLine,
  lineLooksMapped,
  normalizeText,
  parseDateToDisplay,
  parseGermanNumber,
  profileFromText,
  unmappedImportantLines,
} from '../../src/core/import/helpers.ts';

describe('normalizeText', () => {
  it('strips CR, collapses runs of spaces/tabs and 3+ newlines', () => {
    expect(normalizeText('a\r\nb\t\tc   d\n\n\n\ne')).toBe('a\nb c d\n\ne');
  });
});

describe('AC-IMP-9: parseDateToDisplay', () => {
  it("parseDateToDisplay('15.03.2026') === '15 Mar 2026'", () => {
    expect(parseDateToDisplay('15.03.2026')).toBe('15 Mar 2026');
  });

  it('handles separators, 2-digit years (→ 20xx), and passthrough', () => {
    expect(parseDateToDisplay('1/4/26')).toBe('01 Apr 2026');
    expect(parseDateToDisplay('31-12-2025')).toBe('31 Dec 2025');
    expect(parseDateToDisplay('March 2026')).toBe('March 2026');
    expect(parseDateToDisplay('')).toBe('');
  });
});

describe('AC-IMP-7: parseGermanNumber', () => {
  it("'1.234,56' → '1234.56'", () => {
    expect(parseGermanNumber('1.234,56')).toBe('1234.56');
  });

  it('handles plain, comma-only, currency symbols, signs, and garbage', () => {
    expect(parseGermanNumber('1234.56')).toBe('1234.56');
    expect(parseGermanNumber('263,68')).toBe('263.68');
    expect(parseGermanNumber('-120,50')).toBe('-120.5');
    expect(parseGermanNumber('€ 1.222,50')).toBe('1222.5');
    expect(parseGermanNumber('')).toBe('');
    expect(parseGermanNumber('abc')).toBe('');
  });
});

describe('currency/format helpers', () => {
  it('detectCurrencyValue strips currency and thousands separators', () => {
    expect(detectCurrencyValue('€1.234,56')).toBe('1234.56');
  });

  it('formatBasisCurrency renders euro en-US', () => {
    expect(formatBasisCurrency('4.890,00')).toBe('€4,890.00');
    expect(formatBasisCurrency('12,14')).toBe('€12.14');
  });

  it('line classifiers', () => {
    expect(isIntegerLikeLine('1.240')).toBe(true);
    expect(isIntegerLikeLine('362')).toBe(true);
    expect(isIntegerLikeLine('263,68')).toBe(false);
    expect(isMoneyLikeLine('-120,50')).toBe(true);
    expect(isMoneyLikeLine('1.222,50')).toBe(true);
    expect(isMoneyLikeLine('1240')).toBe(false);
    expect(cleanUnit(' 1.240 ')).toBe('1240');
  });
});

describe('proximity search', () => {
  const lines = ['800', 'honorarpflichtige Menge Gesamt per 01.01.2024', '55,00', 'Vortrag lt. letzter Abrechnung', '168,15'];

  it('findValueAfterLabel prefers after', () => {
    expect(findValueAfterLabel(['label x', '42'], /label x/, isIntegerLikeLine)).toBe('42');
  });

  it('findValueForLabel prefers before', () => {
    expect(findValueForLabel(lines, /Vortrag lt\. letzter Abrechnung/, isMoneyLikeLine)).toBe('55,00');
  });

  it('inline capture group wins in both', () => {
    expect(findValueForLabel(['Vortrag lt. letzter Abrechnung -9,99'], /Vortrag lt\. letzter Abrechnung(?:\s+([-+]?\d[\d.]*,\d{2}))?/, isMoneyLikeLine)).toBe('-9,99');
  });

  it('findFirst returns first matching pattern capture', () => {
    expect(findFirst('Datum: 15.03.2026', [/\bDate:\s*([0-9.]+)/i, /\bDatum:\s*([0-9.]+)/i])).toBe('15.03.2026');
    expect(findFirst('nothing', [/\bDate:\s*([0-9.]+)/i])).toBe('');
  });
});

describe('AC-IMP-3: profile auto-detection', () => {
  it('Interne VertragsNr. → ullstein', () => {
    expect(profileFromText('... Interne VertragsNr. 401877 ...')).toBe('ullstein');
  });

  it('other cues and fallbacks', () => {
    expect(profileFromText('Ullstein Buchverlage')).toBe('ullstein');
    expect(profileFromText('BONNIER media')).toBe('ullstein');
    expect(profileFromText('Honorarabrechnung 2025')).toBe('ullstein');
    expect(profileFromText('Royalty Contract-No. 12')).toBe('ullstein');
    expect(profileFromText('Some US publisher statement')).toBe('generic');
    expect(profileFromText('whatever', 'generic')).toBe('generic');
    expect(profileFromText('generic text', 'custom:my-profile')).toBe('custom:my-profile');
  });
});

describe('catalog constants', () => {
  it('IMPORT_FIELD_OPTIONS is exactly 39 keys and excludes the four unmappables', () => {
    expect(IMPORT_FIELD_OPTIONS).toHaveLength(39);
    for (const excluded of ['statementNo', 'preparedBy', 'closingBalance', 'paymentDue']) {
      expect(IMPORT_FIELD_OPTIONS).not.toContain(excluded);
    }
  });

  it('abbreviation dictionary has the 12 built-in entries', () => {
    expect(Object.keys(ABBREVIATIONS)).toHaveLength(12);
    expect(ABBREVIATIONS.ET).toBe('Publication Date / Erscheinungstermin');
  });
});

describe('unmapped lines', () => {
  it('filters mapped lines, page banners, short/long lines; de-dupes; caps at 80', () => {
    const text = [
      '--- Page 1 ---',
      'Page 2',
      'short',
      'Date: 15.03.2026', // mapped
      'Some interesting unmapped line',
      'Some interesting unmapped line', // dupe
      'x'.repeat(200), // too long
      ...Array.from({ length: 100 }, (_, i) => `Filler unmapped line number ${i}`),
    ].join('\n');
    const out = unmappedImportantLines(text);
    expect(out[0]).toBe('Some interesting unmapped line');
    expect(out.filter(l => l === 'Some interesting unmapped line')).toHaveLength(1);
    expect(out.length).toBe(80);
  });

  it('lineLooksMapped covers the allowlist shapes', () => {
    expect(lineLooksMapped('Date: 01.01.2025')).toBe(true);
    expect(lineLooksMapped('978-3-548-06612-3')).toBe(true);
    expect(lineLooksMapped('Hardcover edition')).toBe(true);
    expect(lineLooksMapped('Brought forward 100')).toBe(true);
    expect(lineLooksMapped('A completely novel line')).toBe(false);
  });
});
