// AC-IMP-4/5/10/15 — apply semantics and manual mapping.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyContractStatement, applyDetectionResult, mapUnmappedLine } from '../../src/core/import/apply.ts';
import { digestStatementText } from '../../src/core/import/digest.ts';
import { emptyProductRow, emptyReserveRow, emptyState, emptySublicenseRow } from '../../src/core/catalog/rows.ts';
import { cloneSampleDocument } from '../../src/core/sample/index.ts';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'ullstein');
const twoContracts = digestStatementText(readFileSync(join(FIX, 'two-contracts.txt'), 'utf8'), 'auto');

function blankTarget() {
  return {
    state: emptyState(),
    products: [emptyProductRow()],
    reserves: [emptyReserveRow()],
    sublicenses: [emptySublicenseRow()],
  };
}

describe('AC-IMP-4: bulk apply refuses multiple contracts', () => {
  it('refuses with the per-contract guidance', () => {
    const outcome = applyDetectionResult(blankTarget(), twoContracts);
    expect(outcome.kind).toBe('refused');
    if (outcome.kind === 'refused') {
      expect(outcome.reason).toBe('multiple-contracts');
      expect(outcome.message).toContain('Apply this statement');
    }
  });

  it('refuses when nothing was imported', () => {
    const outcome = applyDetectionResult(blankTarget(), null);
    expect(outcome.kind).toBe('refused');
  });
});

describe('AC-IMP-5: applying contract 0', () => {
  it('copies that licenseeContractId and only that contract’s products; reserves/sublicenses untouched', () => {
    const target = cloneSampleDocument();
    const cs = twoContracts.contractStatements![0];
    const next = applyContractStatement(target, cs);
    expect(next.state.licenseeContractId).toBe('401877');
    expect(next.products).toHaveLength(1);
    expect(next.products[0].isbn).toBe('978-3-548-06612-3');
    // Blank imported values never overwrite existing state (notBlank rule).
    expect(next.state.advanceAmount).toBe(target.state.advanceAmount);
    // Reserves and sublicenses are untouched by contract apply.
    expect(next.reserves).toEqual(target.reserves);
    expect(next.sublicenses).toEqual(target.sublicenses);
  });

  it('single-contract results apply through the bulk path', () => {
    const single = { ...twoContracts, contractStatements: [twoContracts.contractStatements![1]] };
    const outcome = applyDetectionResult(blankTarget(), single);
    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.target.state.licenseeContractId).toBe('401912');
      expect(outcome.target.products[0].form).toBe('E-Book');
    }
  });
});

describe('AC-IMP-15: structured apply whitelists keys', () => {
  it('unknown keys in imported state are dropped; blank values ignored', () => {
    const d = { ...twoContracts, contractStatements: [] as never[], state: { licenseeName: 'X Verlag', bogusKey: 'nope', advanceAmount: '' } };
    const outcome = applyDetectionResult(blankTarget(), d);
    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.target.state.licenseeName).toBe('X Verlag');
      expect('bogusKey' in outcome.target.state).toBe(false);
      expect(outcome.target.state.advanceAmount).toBe('');
    }
  });
});

describe('AC-IMP-10: manual mapping', () => {
  it('sets Low confidence and removes the line', () => {
    const d = digestStatementText('An interesting unmapped payment reference line\n', 'generic');
    expect(d.unmappedLines).toContain('An interesting unmapped payment reference line');
    const mapped = mapUnmappedLine(d, d.unmappedLines.indexOf('An interesting unmapped payment reference line'), 'accountReference');
    expect(mapped.state.accountReference).toBe('An interesting unmapped payment reference line');
    const det = mapped.detections.find(x => x.target === 'accountReference')!;
    expect(det.confidence).toBe('Low');
    expect(det.source).toBe('Manual mapping');
    expect(mapped.unmappedLines).not.toContain('An interesting unmapped payment reference line');
  });

  it('is a no-op for a missing line or field', () => {
    const d = digestStatementText('Another unmapped candidate line here\n', 'generic');
    expect(mapUnmappedLine(d, 99, 'accountReference')).toBe(d);
  });
});
