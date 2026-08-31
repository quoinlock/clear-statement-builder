// AC-CALC-1..8 (PRD "Acceptance criteria > Calculations (sample fixture)").
import { describe, expect, it } from 'vitest';
import {
  calculationWarnings,
  expectedProductEarnings,
  ltdUnits,
  money,
  parseMoneyLike,
  roughlyEqual,
  totals,
} from '../../src/core/calc/index.ts';
import { cloneSampleDocument, sample, sampleProducts } from '../../src/core/sample/index.ts';

describe('AC-CALC: totals on the sample fixture', () => {
  const t = totals(sample, sampleProducts);

  it('AC-CALC-1: totalRoyalty === 5214 (integer, === ok)', () => {
    expect(t.totalRoyalty).toBe(5214);
  });

  it('AC-CALC-2: float totals compared via toFixed(2)/roughlyEqual, never ===', () => {
    expect(t.closing.toFixed(2)).toBe('5672.60');
    expect(t.payment.toFixed(2)).toBe('3222.60');
    expect(t.commission.toFixed(2)).toBe('322.26');
    expect(t.net.toFixed(2)).toBe('2900.34');
    expect(roughlyEqual(t.payment, 3222.6)).toBe(true);
    expect(roughlyEqual(t.commission, 322.26)).toBe(true);
    // Documented V8 float artifact — a strict equality on 3222.60 would fail.
    expect(t.payment).not.toBe(3222.6);
  });

  it('pins the remaining totals fields', () => {
    expect(t.opening).toBe(-2450);
    expect(t.withheld).toBe(236.4);
    expect(t.released).toBe(95);
    expect(t.sub).toBe(600);
  });
});

describe('AC-CALC: product earnings inference', () => {
  it('AC-CALC-3: Hardcover inferred earnings 24 * 450 * 0.08 === 864; no warning', () => {
    expect(expectedProductEarnings(sampleProducts[0])).toBe(24 * 450 * 0.08);
    expect(expectedProductEarnings(sampleProducts[0])).toBe(864);
  });

  it('AC-CALC-4: E-Book inferred 7140 * 0.25 === 1785; no warning', () => {
    expect(expectedProductEarnings(sampleProducts[2])).toBe(7140 * 0.25);
  });

  it('sample data produces zero calculation warnings', () => {
    const { state, products, reserves, sublicenses } = cloneSampleDocument();
    expect(calculationWarnings(state, products, reserves, sublicenses)).toEqual([]);
  });

  it('AC-CALC-5: Hardcover earnings 800 fires the warning with €864.00 vs €800.00', () => {
    const { state, products, reserves, sublicenses } = cloneSampleDocument();
    products[0].earnings = '800';
    const warnings = calculationWarnings(state, products, reserves, sublicenses);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].label).toBe('Product 1 royalty earnings');
    expect(warnings[0].detail).toBe(
      'Expected approximately €864.00 from the entered basis, units, and rate; entered €800.00.',
    );
  });

  it('returns null with no rate or an unrecognized basis', () => {
    expect(expectedProductEarnings({ ...sampleProducts[0], rate: '' })).toBeNull();
    expect(expectedProductEarnings({ ...sampleProducts[0], basis: 'Flat fee' })).toBeNull();
  });

  it('basis "Net List Price (NLP)" takes the list branch (per-copy), by design', () => {
    const p = { ...sampleProducts[0], basis: 'Net List Price (NLP)', listPrice: '12.14', periodUnits: '362', rate: '6' };
    expect(expectedProductEarnings(p)!.toFixed(2)).toBe((12.14 * 362 * 0.06).toFixed(2));
  });
});

describe('AC-CALC-6: commission only on positive payment', () => {
  it('payment <= 0 → commission === 0 even at 10%', () => {
    const { state } = cloneSampleDocument();
    state.openingBalance = '-99999';
    const t = totals(state, sampleProducts);
    expect(t.payment).toBeLessThanOrEqual(0);
    expect(t.commission).toBe(0);
    // Negative payment is not clamped.
    expect(t.net).toBe(t.payment - 0 - Number(state.taxWithheld || 0));
  });
});

describe('AC-CALC-7: money() formatting', () => {
  it('money(-2450) is -€2,450.00', () => {
    expect(money(-2450)).toBe('-€2,450.00');
  });

  it('formats positives and blanks', () => {
    expect(money(1234.5)).toBe('€1,234.50');
    expect(money('')).toBe('€0.00');
    expect(money(undefined)).toBe('€0.00');
  });
});

describe('AC-CALC-8: LTD units', () => {
  it('Hardcover LTD is 1410; all sample rows match the PRD pins', () => {
    expect(sampleProducts.map(ltdUnits)).toEqual([1410, 1250, 2420, 725]);
  });
});

describe('warning suppression parity', () => {
  it('empty reserve rows suppress the reserve warnings even with non-zero state totals', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const warnings = calculationWarnings(state, products, [], sublicenses);
    expect(warnings.filter(w => w.label.startsWith('Reserve'))).toEqual([]);
  });

  it('mismatched reserve rows fire both reserve warnings', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const reserves = [{ form: 'Hardcover', rate: '', withheld: '10.00', released: '1.00' }];
    const labels = calculationWarnings(state, products, reserves, sublicenses).map(w => w.label);
    expect(labels).toContain('Reserve withheld total');
    expect(labels).toContain('Reserve released total');
  });

  it('sublicense row-sum mismatch fires; the tautological net warning never does', () => {
    const { state, products, reserves } = cloneSampleDocument();
    const sublicenses = [{ name: 'X', type: '', income: '100', share: '10', amountDue: '10.00' }];
    const labels = calculationWarnings(state, products, reserves, sublicenses).map(w => w.label);
    expect(labels).toEqual(['Sublicense income total']);
  });
});

describe('parseMoneyLike / roughlyEqual helpers', () => {
  it('parseMoneyLike is US-shaped', () => {
    expect(parseMoneyLike('€24.00 per copy')).toBe(24);
    expect(parseMoneyLike('€7,140.00 total net receipts')).toBe(7140);
    expect(parseMoneyLike('-12.5')).toBe(-12.5);
    expect(parseMoneyLike('no number')).toBe(0);
  });

  it('roughlyEqual default tolerance is 0.02', () => {
    // Avoid the exact 0.02 boundary: |1 - 1.02| is 0.020000000000000018 in
    // IEEE 754, which is precisely why the PRD bans strict float comparisons.
    expect(roughlyEqual(1, 1.019)).toBe(true);
    expect(roughlyEqual(1, 1.03)).toBe(false);
  });
});
