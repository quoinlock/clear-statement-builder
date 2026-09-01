// The real balance-reconciliation warning that replaces Hugo's tautological
// "net remitted" check (PRD proposed improvement, v1 SHOULD; owner PR 13).
// Uses the imported Ullstein Vortrag / Verrechenbare Honorare / Neuer
// Vortrag figures, which Hugo captured but never verified.
import { roughlyEqual, type CalculationWarning } from '../calc/index.ts';
import type { ContractStatement, StatementState, Totals } from '../types.ts';

const TOL = 0.05;

// These figures come from imported German (Ullstein-style) statements and
// are euro-denominated, so they keep the € display even though the
// statement currency is USD (OQ4).
function euro(v: number): string {
  const sign = v < 0 ? '-' : '';
  return sign + '€' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function compareImportedBalance(
  _state: StatementState,
  _totals: Totals,
  contractStatements?: ContractStatement[],
): CalculationWarning[] {
  const warnings: CalculationWarning[] = [];
  for (const cs of contractStatements ?? []) {
    const opening = Number(cs.openingBalance || NaN);
    const current = Number(cs.currentRoyalty || NaN);
    const newBal = Number(cs.newBalance || NaN);
    // Internal identity of the imported statement:
    // Neuer Vortrag = Vortrag + verrechenbare Honorare.
    if ([opening, current, newBal].every(Number.isFinite) && !roughlyEqual(opening + current, newBal, TOL)) {
      warnings.push({
        label: `Imported balance identity (contract ${cs.contractId})`,
        detail: `Vortrag ${euro(opening)} + verrechenbare Honorare ${euro(current)} = ${euro(opening + current)}, but the statement reports Neuer Vortrag ${euro(newBal)}.`,
      });
    }
    // Imported current-period royalties vs the earnings actually applied.
    const rowEarnings = (cs.products ?? []).reduce((s, p) => s + Number(p.earnings || 0), 0);
    if (Number.isFinite(current) && (cs.products ?? []).length && !roughlyEqual(rowEarnings, current, TOL)) {
      warnings.push({
        label: `Imported royalty total (contract ${cs.contractId})`,
        detail: `Product rows total ${euro(rowEarnings)}, but the statement reports verrechenbare Honorare ${euro(current)}.`,
      });
    }
  }
  return warnings;
}
