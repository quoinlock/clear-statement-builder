// Formula Transparency notes (preview page 1, under the Sales and Royalty
// Detail table). v2.3 makes the bullets a statement field
// (`state.formulaNotes`, one bullet per line) so a publisher whose contract
// computes earnings differently can describe what the statement actually
// does. The default is the PRD's four identity strings (v1.7 parity); files
// and stored workspaces that predate the field read as the default, so
// nothing changes for existing statements.

export const DEFAULT_FORMULA_NOTES = [
  'Life to Date Units = Prior Units + Period Units',
  'Royalty Earnings = Royalty Rate × Royalty Basis Amount',
  'Total Royalty Earnings = Sum of Royalty Earnings across product forms',
  'For list-price rows, the basis amount is usually list price per copy. For net-receipts rows, the basis amount is total net receipts for the period.',
].join('\n');

/** Non-empty lines of the field, in order; tolerates a missing value. */
export function formulaNoteLines(text: string | undefined | null): string[] {
  return (text ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

/**
 * A line written as an identity ("A = B + C") is typeset in the monospace
 * formula style; explanatory prose stays in the body font.
 */
export function isFormulaLine(line: string): boolean {
  return line.includes('=');
}

export function isDefaultFormulaNotes(text: string | undefined | null): boolean {
  return formulaNoteLines(text).join('\n') === DEFAULT_FORMULA_NOTES;
}
