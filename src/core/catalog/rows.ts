// Row/state factories. Hugo v1.7 parity is deliberately inconsistent (PRD
// "In-memory + persistence"): Clear all resets repeaters to one row of empty
// strings, while Add row seeds numeric-ish fields with '0'. Both behaviors
// are preserved.
import type { ProductRow, ReserveRow, StatementState, SublicenseRow } from '../types.ts';
import { STATEMENT_STATE_KEYS } from './groups.ts';
import { DEFAULT_FORMULA_NOTES } from './formulaNotes.ts';

/** Every key blank except formulaNotes, which starts as the standard bullets. */
export function emptyState(): StatementState {
  const out = {} as Record<keyof StatementState, string>;
  for (const key of STATEMENT_STATE_KEYS) out[key] = '';
  out.formulaNotes = DEFAULT_FORMULA_NOTES;
  return out as StatementState;
}

/**
 * Fills keys missing from a stored/imported state with emptyState()
 * defaults, so workspaces saved before a field existed (v2.3 formulaNotes)
 * load without undefined values. Present keys are never touched.
 */
export function withStateDefaults(raw: Partial<StatementState> | undefined | null): StatementState {
  const out = emptyState();
  if (raw) {
    for (const key of STATEMENT_STATE_KEYS) {
      const v = raw[key];
      if (v != null) out[key] = String(v);
    }
  }
  return out;
}

/** Clear-all repeater row: all empty strings. */
export function emptyProductRow(): ProductRow {
  return { form: '', isbn: '', pubDate: '', listPrice: '', basis: '', rate: '', priorUnits: '', periodUnits: '', basisAmount: '', earnings: '' };
}

export function emptyReserveRow(): ReserveRow {
  return { form: '', rate: '', withheld: '', released: '' };
}

export function emptySublicenseRow(): SublicenseRow {
  return { name: '', type: '', income: '', share: '', amountDue: '' };
}

/** Add-row defaults: '0' in numeric-ish fields (parity with Hugo's add buttons). */
export function newProductRow(): ProductRow {
  return { form: '', isbn: '', pubDate: '', listPrice: '0', basis: '', rate: '0', priorUnits: '0', periodUnits: '0', basisAmount: '', earnings: '0' };
}

export function newReserveRow(): ReserveRow {
  return { form: '', rate: '', withheld: '0', released: '0' };
}

export function newSublicenseRow(): SublicenseRow {
  return { name: '', type: '', income: '0', share: '0', amountDue: '0' };
}
