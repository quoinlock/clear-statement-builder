// Hook for the real balance-reconciliation warning that replaces Hugo's
// tautological "net remitted" check (PRD proposed improvement, v1 SHOULD).
// PR 4 ships it inert; PR 13 (Ullstein parser) fills it in by comparing the
// imported Vortrag / Verrechenbare Honorare / Neuer Vortrag figures against
// the computed closing balance.
import type { CalculationWarning } from '../calc/index.ts';
import type { ContractStatement, StatementState, Totals } from '../types.ts';

export function compareImportedBalance(
  _state: StatementState,
  _totals: Totals,
  _contractStatements?: ContractStatement[],
): CalculationWarning[] {
  return [];
}
