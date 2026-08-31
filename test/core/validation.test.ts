// AC-VAL-1..5 (PRD "Acceptance criteria > Validation").
import { describe, expect, it } from 'vitest';
import { FIELD_META } from '../../src/core/catalog/fieldMeta.ts';
import { cloneSampleDocument } from '../../src/core/sample/index.ts';
import { validation } from '../../src/core/validation/index.ts';

describe('AC-VAL: presence validation on the sample fixture', () => {
  it('AC-VAL-1: sample data required score is 100', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const v = validation(state, products, sublicenses);
    expect(v.score).toBe(100);
    expect(v.checks.filter(c => !c.ok)).toEqual([]);
  });

  it('AC-VAL-2: clearing licensee name drops the score and lists a Required missing check', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    state.licenseeName = '';
    const v = validation(state, products, sublicenses);
    expect(v.score).toBeLessThan(100);
    const failing = v.checks.filter(c => !c.ok);
    expect(failing).toEqual([{ label: 'Licensee name', key: 'licenseeName', cat: 'Required', ok: false }]);
  });

  it('AC-VAL-3: zero products yields the "At least one product-form row" Required failure', () => {
    const { state, sublicenses } = cloneSampleDocument();
    const v = validation(state, [], sublicenses);
    const failing = v.checks.filter(c => !c.ok);
    expect(failing).toEqual([
      { label: 'At least one product-form row', key: 'form', cat: 'Required', ok: false },
    ]);
    expect(v.score).toBeLessThan(100);
  });

  it('AC-VAL-4: sublicense income without rows is a Conditional failure; score unchanged', () => {
    const { state, products } = cloneSampleDocument();
    state.sublicenseIncomeTotal = '10';
    const v = validation(state, products, []);
    const failing = v.checks.filter(c => !c.ok);
    expect(failing).toEqual([
      {
        label: 'Sublicense detail rows for sublicense income',
        key: 'sublicenseeName',
        cat: 'Conditional',
        ok: false,
      },
    ]);
    expect(v.score).toBe(100);
  });

  it('AC-VAL-5: blank Recommended imprint does not change the score', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    state.licenseeImprint = '';
    const v = validation(state, products, sublicenses);
    expect(v.score).toBe(100);
    expect(v.checks.find(c => c.key === 'licenseeImprint')?.ok).toBe(false);
  });

  it('sample checks count is 23 statement-level + 6 per product', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const v = validation(state, products, sublicenses);
    expect(v.checks).toHaveLength(23 + products.length * 6);
  });
});

describe('the validation table is NOT the Required catalog set (PRD mandate)', () => {
  it('the naive equivalence a reviewer might write must fail', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const v = validation(state, products, sublicenses);
    const validatedKeys = new Set(v.checks.map(c => c.key));
    const requiredCatalogKeys = Object.entries(FIELD_META)
      .filter(([, [, cat]]) => cat === 'Required')
      .map(([k]) => k);
    const missing = requiredCatalogKeys.filter(k => !validatedKeys.has(k));
    // These Required catalog keys are intentionally absent from validation().
    expect(missing.sort()).toEqual(['closingBalance', 'ltdUnits', 'paymentDue', 'priorUnits', 'totalRoyalty']);
  });

  it('payer Conditional fields are catalogued but not scored', () => {
    const { state, products, sublicenses } = cloneSampleDocument();
    const v = validation(state, products, sublicenses);
    const keys = v.checks.map(c => c.key);
    expect(keys).not.toContain('payerName');
    expect(keys).not.toContain('payerAddress');
  });
});
