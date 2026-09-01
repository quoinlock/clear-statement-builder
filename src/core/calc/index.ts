// Calculation core, parity with Hugo v1.7 (PRD "Calculation rules"). The
// formulas are behavior-frozen: do not "fix" the state-sourced
// reserve/sublicense totals or the tautological net check (warning #5)
// here — those are governed by PRD Open Questions / PR 13. Statement
// currency is USD per the OQ4 answer (2026-09-01); the importer keeps its
// own euro formatter for German source statements.
import type { ProductRow, ReserveRow, StatementState, StatementType, SublicenseRow, Totals } from '../types.ts';

/** USD money display (OQ4: statement currency USD, no FX); negatives render as -$1,234.56. */
export function money(v: unknown): string {
  const n = Number(v || 0);
  const sign = n < 0 ? '-' : '';
  return (
    sign +
    '$' +
    Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function num(v: unknown): string {
  return Number(v || 0).toLocaleString('en-US');
}

export function notBlank(v: unknown): boolean {
  return String(v ?? '').trim() !== '';
}

/** US-shaped loose money parse: strips commas, takes the first decimal number. */
export function parseMoneyLike(v: unknown): number {
  const m = String(v ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

export function roughlyEqual(a: unknown, b: unknown, tol = 0.02): boolean {
  return Math.abs(Number(a || 0) - Number(b || 0)) <= tol;
}

/** Life-to-date units for a product row (prior + period). */
export function ltdUnits(p: ProductRow): number {
  return Number(p.priorUnits || 0) + Number(p.periodUnits || 0);
}

/**
 * Statement totals. Withheld/released/sublicense figures come from the
 * payment-section STATE fields, not from row sums (parity). Negative payment
 * is not clamped; commission applies only to positive payment. In v2
 * 'standard' mode co-agent commission is not applicable, so any kept value
 * in that field is ignored (commission = 0).
 */
export function totals(
  state: StatementState,
  products: ProductRow[],
  statementType: StatementType = 'translation',
): Totals {
  const totalRoyalty = products.reduce((s, p) => s + Number(p.earnings || 0), 0);
  const opening = Number(state.openingBalance || 0);
  const withheld = Number(state.reserveWithheld || 0);
  const released = Number(state.reserveReleased || 0);
  const sub = Number(state.sublicenseIncomeTotal || 0);
  const closing = totalRoyalty - withheld + released + sub;
  const payment = opening + closing;
  const commissionPct = statementType === 'standard' ? 0 : Number(state.coAgentCommissionPercent || 0);
  const commission = payment > 0 ? payment * (commissionPct / 100) : 0;
  const net = payment - commission - Number(state.taxWithheld || 0);
  return { totalRoyalty, opening, withheld, released, sub, closing, payment, commission, net };
}

/**
 * Expected earnings for one product row, or null when the basis/rate do not
 * support an inference. `basis.includes('list')` intentionally also matches
 * "Net List Price (NLP)" (Ullstein per-copy basis).
 */
export function expectedProductEarnings(p: ProductRow): number | null {
  const rate = Number(p.rate || 0) / 100;
  const basis = String(p.basis || '').toLowerCase();
  if (!rate) return null;
  if (basis.includes('list')) {
    const unitBasis = parseMoneyLike(p.listPrice || p.basisAmount);
    const units = Number(p.periodUnits || 0);
    return unitBasis * units * rate;
  }
  if (basis.includes('net')) {
    const totalBasis = parseMoneyLike(p.basisAmount);
    return totalBasis * rate;
  }
  return null;
}

export interface CalculationWarning {
  label: string;
  detail: string;
}

/**
 * Calculation warnings at tolerance 0.05. Empty reserve/sublicense arrays
 * suppress their row-sum warnings even when state totals are non-zero
 * (parity). Warning #5 (net remitted) is tautological in Hugo and can never
 * fire — kept for parity; the real Vortrag/Auszahlung identity ships via
 * compareImportedBalance (PR 13).
 */
export function calculationWarnings(
  state: StatementState,
  products: ProductRow[],
  reserves: ReserveRow[],
  sublicenses: SublicenseRow[],
): CalculationWarning[] {
  const warnings: CalculationWarning[] = [];
  products.forEach((p, i) => {
    const expected = expectedProductEarnings(p);
    const entered = Number(p.earnings || 0);
    if (expected !== null && notBlank(p.earnings) && !roughlyEqual(expected, entered, 0.05)) {
      warnings.push({
        label: `Product ${i + 1} royalty earnings`,
        detail: `Expected approximately ${money(expected)} from the entered basis, units, and rate; entered ${money(entered)}.`,
      });
    }
  });
  const reserveWithheldRows = reserves.reduce((s, r) => s + Number(r.withheld || 0), 0);
  const reserveReleasedRows = reserves.reduce((s, r) => s + Number(r.released || 0), 0);
  if (reserves.length && !roughlyEqual(reserveWithheldRows, Number(state.reserveWithheld || 0), 0.05)) {
    warnings.push({
      label: 'Reserve withheld total',
      detail: `Reserve rows total ${money(reserveWithheldRows)}; payment section shows ${money(state.reserveWithheld)}.`,
    });
  }
  if (reserves.length && !roughlyEqual(reserveReleasedRows, Number(state.reserveReleased || 0), 0.05)) {
    warnings.push({
      label: 'Reserve released total',
      detail: `Reserve rows total ${money(reserveReleasedRows)}; payment section shows ${money(state.reserveReleased)}.`,
    });
  }
  const sublicenseRows = sublicenses.reduce((s, r) => s + Number(r.amountDue || 0), 0);
  if (sublicenses.length && !roughlyEqual(sublicenseRows, Number(state.sublicenseIncomeTotal || 0), 0.05)) {
    warnings.push({
      label: 'Sublicense income total',
      detail: `Sublicense rows total ${money(sublicenseRows)}; payment section shows ${money(state.sublicenseIncomeTotal)}.`,
    });
  }
  const t = totals(state, products);
  const expectedNet = t.payment - t.commission - Number(state.taxWithheld || 0);
  if (!roughlyEqual(expectedNet, t.net, 0.05)) {
    warnings.push({
      label: 'Net remitted calculation',
      detail: 'Net remitted should equal payment due minus co-agent commission and tax withheld.',
    });
  }
  return warnings;
}
