// v2 statement-type applicability. In 'standard' (non-translation) mode the
// translation-only fields below are kept in state (the toggle is
// non-destructive) but excluded from data entry, validation, review scoring,
// totals (co-agent commission), and the preview. The field set is a product
// decision recorded in the PRD ("v2: statement type").
import type { StatementState, StatementType } from '../types.ts';

/** BISG fields that only exist because a translated licensee edition exists. */
export const TRANSLATION_ONLY_KEYS = [
  'licenseeTitle', // Con51_LicWorkTitle — the translated/local edition title
  'language', // Con56_LangLicWork
  'salesTerritory', // Con61_SalesTerr
  'advanceCurrency', // Con71_AdvCurr
  'coAgentCommissionPercent', // RA9_CoAgentCommPerc
] as const satisfies readonly (keyof StatementState)[];

const TRANSLATION_ONLY = new Set<string>(TRANSLATION_ONLY_KEYS);

export function isFieldApplicable(key: string, type: StatementType): boolean {
  return type === 'translation' || !TRANSLATION_ONLY.has(key);
}

/** Standard-mode label overrides: with no translated edition there is one title. */
const STANDARD_LABELS: Partial<Record<keyof StatementState, string>> = {
  licensorTitle: 'Title of Work',
};

export function fieldLabel(label: string, key: string, type: StatementType): string {
  if (type === 'standard') {
    const override = STANDARD_LABELS[key as keyof StatementState];
    if (override) return override;
  }
  return label;
}

export function statementTitle(type: StatementType): string {
  return type === 'standard' ? 'Royalty Statement' : 'Translation Rights Royalty Statement';
}

export function statementSubtitle(type: StatementType): string {
  return type === 'standard'
    ? 'BISG-aligned royalty statement — not a certification'
    : 'BISG-aligned translation-rights royalty statement — not a certification';
}

/** Reader-side coercion shared by persistence and statement JSON parsing. */
export function coerceStatementType(raw: unknown): StatementType {
  return raw === 'standard' ? 'standard' : 'translation';
}
