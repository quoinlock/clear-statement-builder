// PR 13 goldens: digestStatementText over the Ullstein fixtures, asserted
// against the parity oracles produced by the frozen Hugo v1.7 snapshot
// (test/fixtures/ullstein/expected/*.hugo-parity.json).
//
// Fixtures are SYNTHETIC (TODO-REAL-FIXTURE, see the fixtures README):
// real anonymized extracts must replace them before demo-eligibility.
//
// Parity comparison covers profile, state, products, contractStatements,
// calcInferences, and unmapped lines. Notes are excluded (CSB rewords the
// Hugo-branded note text), and the labeled AC-IMP-11 improvement makes the
// non-2025 fixture intentionally BETTER than its oracle.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { digestStatementText } from '../../src/core/import/digest.ts';
import { compareImportedBalance } from '../../src/core/validation/compareImportedBalance.ts';
import { totals } from '../../src/core/calc/index.ts';
import { emptyState } from '../../src/core/catalog/rows.ts';
import type { DetectionResult, ProductRow } from '../../src/core/types.ts';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'ullstein');

function fixture(name: string): string {
  return readFileSync(join(FIX, name), 'utf8');
}

interface Oracle {
  profile: string;
  state: Record<string, string>;
  products: (ProductRow & { titleLine?: string; periodStart?: string; periodEnd?: string })[];
  contractStatements: {
    contractId: string;
    title: string;
    state: Record<string, string>;
    products: ProductRow[];
    openingBalance: string;
    currentRoyalty: string;
    newBalance: string;
  }[];
  calcInferences: { product: string; calculation: string; reported: string; status: string }[];
  unmappedLines: string[];
}

function oracle(name: string): Oracle {
  return JSON.parse(readFileSync(join(FIX, 'expected', name), 'utf8'));
}

const PRODUCT_KEYS: (keyof ProductRow)[] = ['form', 'isbn', 'pubDate', 'listPrice', 'basis', 'rate', 'priorUnits', 'periodUnits', 'basisAmount', 'earnings'];

function productCore(p: ProductRow): Record<string, string> {
  return Object.fromEntries(PRODUCT_KEYS.map(k => [k, p[k]]));
}

function expectParity(result: DetectionResult, expected: Oracle) {
  expect(result.profile).toBe(expected.profile);
  expect(result.state).toEqual(expected.state);
  expect(result.products.map(productCore)).toEqual(expected.products.map(p => productCore(p as ProductRow)));
  expect(result.contractStatements).toHaveLength(expected.contractStatements.length);
  result.contractStatements!.forEach((cs, i) => {
    const exp = expected.contractStatements[i];
    expect(cs.contractId).toBe(exp.contractId);
    expect(cs.title).toBe(exp.title);
    expect(cs.state).toEqual(exp.state);
    expect(cs.openingBalance).toBe(exp.openingBalance);
    expect(cs.currentRoyalty).toBe(exp.currentRoyalty);
    expect(cs.newBalance).toBe(exp.newBalance);
    expect(cs.products.map(productCore)).toEqual(exp.products.map(p => productCore(p)));
  });
  expect(result.calcInferences).toEqual(expected.calcInferences);
  expect(result.unmappedLines).toEqual(expected.unmappedLines);
}

describe('golden: two-contracts.txt', () => {
  const result = digestStatementText(fixture('two-contracts.txt'), 'auto');

  it('matches the Hugo parity oracle end to end', () => {
    expectParity(result, oracle('two-contracts.hugo-parity.json'));
  });

  it('AC-IMP-4: two Interne VertragsNr. blocks → contractStatements.length === 2', () => {
    expect(result.contractStatements).toHaveLength(2);
  });

  it('splits contract ids from both marker styles (inline and bare-label)', () => {
    expect(result.contractStatements!.map(c => c.contractId)).toEqual(['401877', '401912']);
  });

  it('captures balances and injects the parity note strings', () => {
    const [c1, c2] = result.contractStatements!;
    expect(c1.openingBalance).toBe('-120.5');
    expect(c1.currentRoyalty).toBe('263.68');
    expect(c1.newBalance).toBe('143.18');
    expect(c1.state.statementNotes).toContain('Ullstein current-period verrechenbare Honorare: €263.68.');
    expect(c1.state.statementNotes).toContain('Ullstein Neuer Vortrag / new carried-forward balance: €143.18.');
    expect(c2.currentRoyalty).toBe('1222.5');
  });

  it('parses the NVE e-book product on contract 2', () => {
    const p = result.contractStatements![1].products[0];
    expect(p.form).toBe('E-Book');
    expect(p.basis).toBe('Net Receipts (NVE)');
    expect(p.basisAmount).toBe('€4,890.00 total net receipts');
    expect(p.periodUnits).toBe('518');
    expect(p.earnings).toBe('1222.5');
  });
});

describe('golden: inline-honorar.txt', () => {
  const result = digestStatementText(fixture('inline-honorar.txt'), 'auto');

  it('matches the Hugo parity oracle end to end', () => {
    expectParity(result, oracle('inline-honorar.hugo-parity.json'));
  });

  it('AC-IMP-6 on a full statement: the PRD worked example parses exactly', () => {
    const p = result.products[0];
    expect(p.periodUnits).toBe('362');
    expect(p.rate).toBe('6');
    expect(p.listPrice).toBe('12.99');
    expect(p.earnings).toBe('263.68');
    expect(p.basis).toBe('Net List Price (NLP)');
  });
});

describe('golden: non-2025-period.txt (AC-IMP-11, labeled improvement over oracle)', () => {
  const result = digestStatementText(fixture('non-2025-period.txt'), 'auto');
  const exp = oracle('non-2025-period.hugo-parity.json');

  it('the Hugo oracle proves the hardcoded-2025 bug: empty prior/period units', () => {
    expect(exp.products[0].priorUnits).toBe('');
    expect(exp.products[0].periodUnits).toBe('');
  });

  it('CSB parses the 2024 period: prior 800, period 300 (LTD 1100 − prior)', () => {
    const p = result.products[0];
    expect(p.priorUnits).toBe('800');
    expect(p.periodUnits).toBe('300');
  });

  it('everything except the improved units matches the oracle', () => {
    const strip = (p: ProductRow) => ({ ...productCore(p), priorUnits: 'X', periodUnits: 'X' });
    expect(result.products.map(strip)).toEqual(exp.products.map(p => strip(p as ProductRow)));
    expect(result.state).toEqual(exp.state);
    expect(result.contractStatements!.map(c => c.contractId)).toEqual(exp.contractStatements.map(c => c.contractId));
  });
});

describe('compareImportedBalance (real Vortrag/Auszahlung identity)', () => {
  const result = digestStatementText(fixture('two-contracts.txt'), 'auto');

  it('consistent imported statements produce no warnings', () => {
    const t = totals(emptyState(), []);
    expect(compareImportedBalance(emptyState(), t, result.contractStatements)).toEqual([]);
  });

  it('a broken Neuer Vortrag identity fires the warning', () => {
    const t = totals(emptyState(), []);
    const tampered = structuredClone(result.contractStatements!);
    tampered[0].newBalance = '999';
    const warnings = compareImportedBalance(emptyState(), t, tampered);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].label).toBe('Imported balance identity (contract 401877)');
    expect(warnings[0].detail).toContain('€143.18');
    expect(warnings[0].detail).toContain('€999.00');
  });

  it('product rows disagreeing with verrechenbare Honorare fire the royalty-total warning', () => {
    const t = totals(emptyState(), []);
    const tampered = structuredClone(result.contractStatements!);
    tampered[1].products[0].earnings = '1.00';
    const warnings = compareImportedBalance(emptyState(), t, tampered);
    expect(warnings.some(w => w.label === 'Imported royalty total (contract 401912)')).toBe(true);
  });
});
