// Data-entry form groups and repeater key lists, transcribed from the Hugo
// v1.7 snapshot `groups` object and repeater render calls (parity).
import type { ProductRow, ReserveRow, StatementState, SublicenseRow } from '../types.ts';

export type FieldControl = 'input' | 'textarea';

export interface GroupField {
  label: string;
  key: keyof StatementState;
  control: FieldControl;
}

export type GroupName = 'Statement' | 'Parties' | 'Work' | 'Payment';

function f(label: string, key: keyof StatementState, control: FieldControl = 'input'): GroupField {
  return { label, key, control };
}

export const GROUPS: Record<GroupName, GroupField[]> = {
  Statement: [
    f('Statement No.', 'statementNo'),
    f('Royalty Statement Date', 'statementDate'),
    f('Reporting Period Start Date', 'periodStart'),
    f('Reporting Period End Date', 'periodEnd'),
    f('Prepared By', 'preparedBy'),
    f('Formula Transparency', 'formulaNotes', 'textarea'),
  ],
  Parties: [
    f('Licensee Name', 'licenseeName'),
    f('Licensee Imprint', 'licenseeImprint'),
    f('Licensee Contact Information', 'licenseeAddress'),
    f('Licensee Phone', 'licenseePhone'),
    f('Licensee Email', 'licenseeEmail'),
    f('Licensee Website', 'licenseeWebsite'),
    f('Payer Name', 'payerName'),
    f('Payer Contact Information', 'payerAddress'),
    f('Payer Phone', 'payerPhone'),
    f('Payer Email', 'payerEmail'),
    f('Payer Website', 'payerWebsite'),
  ],
  Work: [
    f('Licensee Contract ID', 'licenseeContractId'),
    f('Licensor Name', 'licensorName'),
    f('Licensor Contract ID', 'licensorContractId'),
    f('Contributor Name(s)', 'contributorNames'),
    f('Licensor Title of Work', 'licensorTitle'),
    f('Licensee Title of Work', 'licenseeTitle'),
    f('Language of Licensee Work', 'language'),
    f('Sales Territory', 'salesTerritory'),
    f('Advance Amount', 'advanceAmount'),
    f('Advance Currency', 'advanceCurrency'),
  ],
  Payment: [
    f('Opening Balance', 'openingBalance'),
    f('Reserve Withheld', 'reserveWithheld'),
    f('Reserve Released', 'reserveReleased'),
    f('Sublicense Income Total', 'sublicenseIncomeTotal'),
    f('Co-Agent Commission %', 'coAgentCommissionPercent'),
    f('Licensee VAT / Tax ID', 'taxId'),
    f('Tax Exemption Status', 'taxExemptionStatus'),
    f('Tax Withheld', 'taxWithheld'),
    f('Scheduled Payment Date', 'scheduledPaymentDate'),
    f('Payment Method', 'paymentMethod'),
    f('Beneficiary', 'beneficiary'),
    f('Beneficiary Bank', 'beneficiaryBank'),
    f('SWIFT / BIC', 'swiftBic'),
    f('Account Reference', 'accountReference'),
    f('Statement Notes', 'statementNotes', 'textarea'),
  ],
};

export const GROUP_NAMES: GroupName[] = ['Statement', 'Parties', 'Work', 'Payment'];

export const PRODUCT_KEYS: (keyof ProductRow)[] = [
  'form',
  'isbn',
  'pubDate',
  'listPrice',
  'basis',
  'rate',
  'priorUnits',
  'periodUnits',
  'basisAmount',
  'earnings',
];

export const RESERVE_KEYS: (keyof ReserveRow)[] = ['form', 'rate', 'withheld', 'released'];

export const SUBLICENSE_KEYS: (keyof SublicenseRow)[] = ['name', 'type', 'income', 'share', 'amountDue'];

/**
 * Every key of StatementState, in Hugo `sample` declaration order. This is
 * the effective whitelist for import apply (Hugo copies only keys already
 * present on `state`) and the row order for CSV export.
 */
export const STATEMENT_STATE_KEYS = [
  'statementNo',
  'statementDate',
  'periodStart',
  'periodEnd',
  'preparedBy',
  'licenseeName',
  'licenseeImprint',
  'licenseeAddress',
  'licenseePhone',
  'licenseeEmail',
  'licenseeWebsite',
  'payerName',
  'payerAddress',
  'payerPhone',
  'payerEmail',
  'payerWebsite',
  'licenseeContractId',
  'licensorName',
  'licensorContractId',
  'contributorNames',
  'licensorTitle',
  'licenseeTitle',
  'language',
  'salesTerritory',
  'advanceAmount',
  'advanceCurrency',
  'openingBalance',
  'reserveWithheld',
  'reserveReleased',
  'sublicenseIncomeTotal',
  'coAgentCommissionPercent',
  'taxId',
  'taxExemptionStatus',
  'taxWithheld',
  'scheduledPaymentDate',
  'paymentMethod',
  'beneficiary',
  'beneficiaryBank',
  'swiftBic',
  'accountReference',
  'statementNotes',
  'formulaNotes',
] as const satisfies readonly (keyof StatementState)[];

// Compile-time completeness: fails to typecheck if STATEMENT_STATE_KEYS
// misses any StatementState key.
type MissingStateKeys = Exclude<keyof StatementState, (typeof STATEMENT_STATE_KEYS)[number]>;
const _allStateKeysListed: MissingStateKeys extends never ? true : never = true;
void _allStateKeysListed;
