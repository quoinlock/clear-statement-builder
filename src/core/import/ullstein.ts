// Ullstein/Bonnier multi-contract split. PR 12 ships the hook as a stub so
// the generic digest is complete; PR 13 implements the seven-step split
// (markers, title walk-back, per-segment parse, balance lines).
import type { ContractStatement, StatementState } from '../types.ts';

export function parseUllsteinContracts(_text: string, _baseState: Partial<StatementState>): ContractStatement[] {
  return [];
}
