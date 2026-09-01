// AC-REV-1/2/3/6 (PRD "Acceptance criteria > Review"); AC-REV-4 finishes in
// PR 5/17 (exports), AC-REV-5 is UI.
import { describe, expect, it } from 'vitest';
import { cloneSampleDocument } from '../../src/core/sample/index.ts';
import {
  REVIEW_DISCLAIMER,
  categoryScores,
  importConfidenceFor,
  reviewData,
  reviewRows,
  scoreBand,
  statusForField,
} from '../../src/core/review/index.ts';
import { compareImportedBalance } from '../../src/core/validation/compareImportedBalance.ts';
import { totals } from '../../src/core/calc/index.ts';
import type { Detection } from '../../src/core/types.ts';

function det(target: string, confidence: 'High' | 'Medium' | 'Low'): Detection {
  return { target, value: 'x', confidence, source: 's', reason: 'r', bisg: '', category: '' };
}

describe('AC-REV-1: sample overall score', () => {
  it('is >= 85 and lands in the high band', () => {
    const doc = reviewData({ ...cloneSampleDocument(), generatedAt: '2026-03-15T10:00:00.000Z' });
    expect(doc.overallScore).toBeGreaterThanOrEqual(85);
    expect(scoreBand(doc.overallScore)).toBe('high');
  });

  it('carries the review format version, product marker, and disclaimer', () => {
    const doc = reviewData(cloneSampleDocument());
    expect(doc.reviewFormatVersion).toBe('1.2');
    expect(doc.product).toBe('clear-statement-builder');
    expect(doc.disclaimer).toBe(REVIEW_DISCLAIMER);
    expect(doc.topRecommendations.length).toBeLessThanOrEqual(7);
  });
});

describe('AC-REV-2: conditional status text', () => {
  it('blank coAgentCommissionPercent starts with "Not applicable"', () => {
    const input = cloneSampleDocument();
    input.state.coAgentCommissionPercent = '';
    const rows = reviewRows(input);
    const row = rows.find(r => r.key === 'coAgentCommissionPercent')!;
    expect(row.status.startsWith('Not applicable')).toBe(true);
  });

  it('payerName / payerAddress are not review rows', () => {
    const rows = reviewRows(cloneSampleDocument());
    expect(rows.find(r => r.key === 'payerName')).toBeUndefined();
    expect(rows.find(r => r.key === 'payerAddress')).toBeUndefined();
  });
});

describe('AC-REV-3: import confidence drives "Detected but unclear"', () => {
  it('a Low-confidence detection downgrades a present field', () => {
    const input = cloneSampleDocument();
    const rows = reviewRows({ ...input, detections: [det('licenseeName', 'Low')] });
    const row = rows.find(r => r.key === 'licenseeName')!;
    expect(row.status).toBe('Detected but unclear');
    expect(row.confidence).toBe('Low');
  });

  it('worst confidence wins across detections for the same key', () => {
    expect(importConfidenceFor('x', [det('x', 'High'), det('x', 'Medium')])).toBe('Medium');
    expect(importConfidenceFor('x', [det('x', 'Medium'), det('x', 'Low')])).toBe('Low');
    expect(importConfidenceFor('x', [det('x', 'High')])).toBe('High');
    expect(importConfidenceFor('x', [det('y', 'Low')])).toBe('');
    expect(importConfidenceFor('x', undefined)).toBe('');
  });

  it('product detail rows ignore import confidence (parity)', () => {
    const input = cloneSampleDocument();
    const rows = reviewRows({ ...input, detections: [det('form', 'Low'), det('earnings', 'Low')] });
    // The pushed product detail rows (category 'Product / sales / royalty
    // detail' with descriptive labels) never consult confidence...
    const detailRows = rows.filter(r => r.label === 'Product 1: Product form detail' || r.label === 'Product 1: Royalty earnings');
    expect(detailRows).toHaveLength(2);
    for (const r of detailRows) {
      expect(r.status).toBe('Detected');
      expect(r.confidence).toBe('—');
    }
    // ...while the validation-check-derived rows (labels like 'Product 1:
    // form') do, exactly as Hugo maps every check through statusForField.
    const checkRow = rows.find(r => r.label === 'Product 1: form')!;
    expect(checkRow.status).toBe('Detected but unclear');
  });

  it('statusForField handles missing/conditional precedence', () => {
    expect(statusForField('k', false, 'Conditional')).toBe('Not applicable / not shown');
    expect(statusForField('k', false, 'Required')).toBe('Missing');
    expect(statusForField('k', true, 'Required')).toBe('Detected');
  });
});

describe('AC-REV-6: sublicense pseudo-row parity', () => {
  it('sample data (total 600 + one row) adds zero extra sublicense rows', () => {
    const rows = reviewRows(cloneSampleDocument());
    expect(rows.filter(r => r.key === 'sublicense')).toHaveLength(0);
  });

  it('total > 0 with no rows adds one Missing High row', () => {
    const input = cloneSampleDocument();
    input.sublicenses = [];
    const rows = reviewRows(input).filter(r => r.key === 'sublicense');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('Missing');
    expect(rows[0].priority).toBe('High');
  });

  it('total not > 0 adds one N/A row', () => {
    const input = cloneSampleDocument();
    input.state.sublicenseIncomeTotal = '0';
    input.sublicenses = [];
    const rows = reviewRows(input).filter(r => r.key === 'sublicense');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('Not applicable / not shown');
  });
});

describe('category scores', () => {
  it('score formula: round(100 * (detected + 0.5*unclear) / relevant), N/A rows excluded', () => {
    const input = cloneSampleDocument();
    const rows = reviewRows({ ...input, detections: [det('licenseeName', 'Medium')] });
    const cats = categoryScores(rows);
    const contract = cats.find(c => c.category === 'Contract information')!;
    expect(contract.unclear).toBe(1);
    expect(contract.score).toBe(
      Math.round(((contract.detected + contract.unclear * 0.5) / contract.total) * 100),
    );
  });
});

describe('compareImportedBalance hook (inert until PR 13)', () => {
  it('returns no warnings', () => {
    const { state, products } = cloneSampleDocument();
    expect(compareImportedBalance(state, totals(state, products))).toEqual([]);
  });
});
