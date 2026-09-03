// AC-IMP-1 (detection half), AC-IMP-2, AC-IMP-15 (PRD "Acceptance criteria
// > Import / Ullstein" — structured intake).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { jsonToDetectionResult, parseImportedCsv } from '../../src/core/import/structured.ts';
import { DEFAULT_FORMULA_NOTES } from '../../src/core/catalog/formulaNotes.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'hugo');

// The fixtures were produced by executing the frozen Hugo v1.7 snapshot's
// own export logic over its (German) sample — they are provenance
// artifacts and deliberately do NOT track the CSB Appendix B sample.
describe('AC-IMP-1: Hugo JSON as DetectionResult', () => {
  it('restores state/products/reserves/sublicenses with High-confidence detections', () => {
    const obj = JSON.parse(readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.json'), 'utf8'));
    const result = jsonToDetectionResult(obj);
    expect(result.sourceType).toBe('Hugo JSON export');
    expect(result.profile).toBe('structured');
    expect(result.state.licenseeName).toBe('Nordlicht Verlag GmbH');
    expect(result.state.licenseeTitle).toBe('Der lange Sommerweg');
    expect(result.products).toHaveLength(4);
    expect(result.reserves).toHaveLength(2);
    expect(result.sublicenses).toHaveLength(1);
    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.detections.every(d => d.confidence === 'High')).toBe(true);
    const licensee = result.detections.find(d => d.target === 'licenseeName')!;
    expect(licensee.bisg).toBe('Con1_LicName');
  });

  it('AC-IMP-15: produces a result object only — nothing is applied implicitly', () => {
    const obj = JSON.parse(readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.json'), 'utf8'));
    const result = jsonToDetectionResult(obj);
    // The result carries data for review; the store applies it only via the
    // explicit Apply action (covered again in the import UI tests).
    expect(result.notes).toContain('Recognized JSON structure.');
  });
});

describe('AC-IMP-2: CSV intake', () => {
  it('Hugo CSV restores exactly what the Hugo JSON export carries', () => {
    const csv = readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.csv'), 'utf8');
    const fromJson = jsonToDetectionResult(
      JSON.parse(readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.json'), 'utf8')),
    );
    const result = parseImportedCsv(csv);
    expect(result.sourceType).toBe('Hugo CSV export');
    expect(result.state).toEqual(fromJson.state);
    expect(result.products).toEqual(fromJson.products);
    expect(result.reserves).toEqual(fromJson.reserves);
    expect(result.sublicenses).toEqual(fromJson.sublicenses);
    expect(result.detections.every(d => d.confidence === 'High')).toBe(true);
  });

  it('formulaNotes (v2.3): missing row reads as the default without a detection; a custom row restores and is detected', () => {
    const csv = readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.csv'), 'utf8');
    const plain = parseImportedCsv(csv);
    expect(plain.state.formulaNotes).toBe(DEFAULT_FORMULA_NOTES);
    expect(plain.detections.some(d => d.target === 'formulaNotes')).toBe(false);
    const custom = parseImportedCsv(
      csv + '\n"Statement","formulaNotes","Royalty Earnings = Period Units × Fee per unit\nRates escalate at 5,000 units.","",""',
    );
    expect(custom.state.formulaNotes).toBe('Royalty Earnings = Period Units × Fee per unit\nRates escalate at 5,000 units.');
    expect(custom.detections.filter(d => d.target === 'formulaNotes')).toHaveLength(1);
  });

  it('random CSV becomes unmapped lines only — no state, no detections', () => {
    const result = parseImportedCsv('Name,Amount\nFoo,12\nBar,34');
    expect(result.sourceType).toBe('Generic CSV');
    expect(result.state).toEqual({});
    expect(result.detections).toEqual([]);
    expect(result.unmappedLines).toEqual(['Name,Amount', 'Foo,12', 'Bar,34']);
  });

  it('handles RFC4180 quoting (embedded commas and doubled quotes)', () => {
    const csv = '"Section","Field","Value","BISG ID","Category"\n"Statement","licenseeName","Verlag ""Nord"", GmbH","Con1_LicName","Required"';
    const result = parseImportedCsv(csv);
    expect(result.state.licenseeName).toBe('Verlag "Nord", GmbH');
  });
});
