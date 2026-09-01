// Presence-only validation, parity with Hugo v1.7 validation(). The check
// list below is the snapshot's explicit table — it is NOT the set of
// Required catalog keys (priorUnits and the computed totalRoyalty/ltdUnits/
// closingBalance/paymentDue are Required in the catalog but absent here, and
// payer Conditional fields are catalogued but not scored). Do not "complete"
// it.
import { FIELD_META, fieldMeta } from '../catalog/fieldMeta.ts';
import { isFieldApplicable } from '../catalog/applicability.ts';
import { notBlank } from '../calc/index.ts';
import type { BisgCategory, ProductRow, StatementState, StatementType, SublicenseRow } from '../types.ts';

export interface Check {
  label: string;
  key: string;
  cat: BisgCategory;
  ok: boolean;
}

export interface ValidationResult {
  checks: Check[];
  score: number;
}

const STATEMENT_CHECKS: [label: string, key: keyof StatementState, cat: BisgCategory][] = [
  ['Licensee name', 'licenseeName', 'Required'],
  ['Licensee contact information', 'licenseeAddress', 'Required'],
  ['Licensee imprint', 'licenseeImprint', 'Recommended'],
  ['Licensee contract ID', 'licenseeContractId', 'Required'],
  ['Licensor name', 'licensorName', 'Required'],
  ['Licensor contract ID', 'licensorContractId', 'Recommended'],
  ['Contributor name(s)', 'contributorNames', 'Required'],
  ['Licensor title', 'licensorTitle', 'Required'],
  ['Licensee title', 'licenseeTitle', 'Required'],
  ['Language', 'language', 'Required'],
  ['Sales territory', 'salesTerritory', 'Required'],
  ['Advance amount', 'advanceAmount', 'Required'],
  ['Advance currency', 'advanceCurrency', 'Required'],
  ['Statement date', 'statementDate', 'Required'],
  ['Reporting period start', 'periodStart', 'Required'],
  ['Reporting period end', 'periodEnd', 'Required'],
  ['Opening balance', 'openingBalance', 'Required'],
  ['Reserve withheld', 'reserveWithheld', 'Required'],
  ['Reserve released', 'reserveReleased', 'Required'],
  ['Co-agent commission percent', 'coAgentCommissionPercent', 'Conditional'],
  ['Licensee VAT / Tax ID', 'taxId', 'Remittance'],
  ['Tax exemption status', 'taxExemptionStatus', 'Remittance'],
  ['Tax withheld amount', 'taxWithheld', 'Remittance'],
];

export const PRODUCT_REQUIRED_KEYS: (keyof ProductRow)[] = [
  'form',
  'isbn',
  'basis',
  'rate',
  'periodUnits',
  'earnings',
];

export function validation(
  state: StatementState,
  products: ProductRow[],
  sublicenses: SublicenseRow[],
  statementType: StatementType = 'translation',
): ValidationResult {
  // v2: standard mode drops the translation-only checks entirely (the score
  // denominator shrinks with them); review re-surfaces those fields as
  // "Not applicable / not shown".
  const checks: Check[] = STATEMENT_CHECKS.filter(([, key]) => isFieldApplicable(key, statementType)).map(
    ([label, key, cat]) => ({
      label,
      key,
      cat,
      ok: notBlank(state[key]),
    }),
  );
  products.forEach((p, i) =>
    PRODUCT_REQUIRED_KEYS.forEach(k =>
      checks.push({
        label: `Product ${i + 1}: ${k}`,
        key: k,
        cat: fieldMeta(k)?.[1] ?? 'Required',
        ok: notBlank(p[k]),
      }),
    ),
  );
  if (products.length === 0) {
    checks.push({ label: 'At least one product-form row', key: 'form', cat: 'Required', ok: false });
  }
  if (Number(state.sublicenseIncomeTotal || 0) > 0 && sublicenses.length === 0) {
    checks.push({
      label: 'Sublicense detail rows for sublicense income',
      key: 'sublicenseeName',
      cat: 'Conditional',
      ok: false,
    });
  }
  const required = checks.filter(c => c.cat === 'Required');
  const okReq = required.filter(c => c.ok).length;
  const score = Math.round((okReq / Math.max(required.length, 1)) * 100);
  return { checks, score };
}

// Documented so nobody "cleans this up": these FIELD_META Required keys are
// intentionally not in the validation table.
export const REQUIRED_CATALOG_KEYS_NOT_VALIDATED = ['priorUnits', 'totalRoyalty', 'ltdUnits', 'closingBalance', 'paymentDue'] as const;
void FIELD_META;
