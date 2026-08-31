// AC-IMP-1 (detection half), AC-IMP-2, AC-IMP-15 (PRD "Acceptance criteria
// > Import / Ullstein" — structured intake).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { jsonToDetectionResult, parseImportedCsv } from '../../src/core/import/structured.ts';
import { sample, sampleProducts, sampleReserves, sampleSublicenses } from '../../src/core/sample/index.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'hugo');

describe('AC-IMP-1: Hugo JSON as DetectionResult', () => {
  it('restores state/products/reserves/sublicenses with High-confidence detections', () => {
    const obj = JSON.parse(readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.json'), 'utf8'));
    const result = jsonToDetectionResult(obj);
    expect(result.sourceType).toBe('Hugo JSON export');
    expect(result.profile).toBe('structured');
    expect(result.state).toEqual(sample);
    expect(result.products).toEqual(sampleProducts);
    expect(result.reserves).toEqual(sampleReserves);
    expect(result.sublicenses).toEqual(sampleSublicenses);
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
  it('Hugo CSV restores keys and rows with High confidence', () => {
    const csv = readFileSync(join(FIXTURES, 'hugo-royalty-statement-RS-2026-0142.csv'), 'utf8');
    const result = parseImportedCsv(csv);
    expect(result.sourceType).toBe('Hugo CSV export');
    expect(result.state).toEqual(sample);
    expect(result.products).toEqual(sampleProducts);
    expect(result.reserves).toEqual(sampleReserves);
    expect(result.sublicenses).toEqual(sampleSublicenses);
    expect(result.detections.every(d => d.confidence === 'High')).toBe(true);
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
