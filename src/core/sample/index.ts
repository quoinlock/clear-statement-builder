// Normative sample fixture per PRD Appendix B (v2: a standard US domestic
// deal — Harbor Light Press reporting to the author's agency; the German
// translation sample was replaced 2026-09-01). Do not edit values here
// without updating the PRD; tests pin totals computed from this data.
import type { ProductRow, ReserveRow, StatementState, SublicenseRow } from '../types.ts';
import { DEFAULT_FORMULA_NOTES } from '../catalog/formulaNotes.ts';

export const sample: StatementState = {
  statementNo: 'RS-2026-0142',
  statementDate: '15 Mar 2026',
  periodStart: '01 Jan 2025',
  periodEnd: '31 Dec 2025',
  preparedBy: 'Dana Whitfield, Senior Royalties Manager',
  licenseeName: 'Harbor Light Press, Inc.',
  licenseeImprint: 'Harbor Light Fiction',
  licenseeAddress: '175 Varick Street, New York, NY 10014, USA',
  licenseePhone: '+1 212 555 0184',
  licenseeEmail: 'royalties@harborlightpress.com',
  licenseeWebsite: 'www.harborlightpress.com',
  payerName: 'Harbor Light Media Group, Inc.',
  payerAddress: '175 Varick Street, New York, NY 10014, USA',
  payerPhone: '+1 212 555 0199',
  payerEmail: 'finance@harborlightmedia.com',
  payerWebsite: 'www.harborlightmedia.com',
  licenseeContractId: 'HLP-US-2024-00981',
  licensorName: 'Cedar Lane Rights LLC, c/o Bright Quill Agency',
  licensorContractId: 'BQA-US-4471',
  contributorNames: 'Amelia Hart (ISNI 0000000123456789)',
  licensorTitle: 'The Long Summer Road',
  // Translation-only fields hold sensible kept values so the sample still
  // validates at 100 when toggled to Translation mode.
  licenseeTitle: 'The Long Summer Road',
  language: 'English',
  salesTerritory: 'United States and Canada',
  advanceAmount: '8000.00',
  advanceCurrency: 'USD',
  openingBalance: '-2450.00',
  reserveWithheld: '236.40',
  reserveReleased: '95.00',
  sublicenseIncomeTotal: '600.00',
  coAgentCommissionPercent: '10',
  taxId: 'EIN 13-5559821',
  taxExemptionStatus: 'Not applicable — domestic US payment; Form W-9 on file',
  taxWithheld: '0.00',
  scheduledPaymentDate: '31 Mar 2026',
  paymentMethod: 'ACH transfer (domestic US)',
  beneficiary: 'Bright Quill Agency Client Account',
  beneficiaryBank: 'Hudson Trust Bank, New York',
  swiftBic: 'HUTBUS33',
  accountReference: 'Client Account ending 0281',
  statementNotes:
    'This example is intended as a best-practice template for publisher royalty statements.\nAll BISG core, statement-specific, conditional, and remittance fields are shown.\nStatement currency is US dollars; no currency conversion applies.\nSublicense income reflects the licensor share of the book club edition.\nNo tax was withheld for this payment.',
  formulaNotes: DEFAULT_FORMULA_NOTES,
};

export const sampleProducts: ProductRow[] = [
  { form: 'Hardcover', isbn: '978-1-9812345-1-2', pubDate: '20 May 2024', listPrice: '24.00', basis: 'List Price', rate: '8.0', priorUnits: '960', periodUnits: '450', basisAmount: '$24.00 per copy', earnings: '864.00' },
  { form: 'Paperback', isbn: '978-1-9812345-2-9', pubDate: '15 Mar 2025', listPrice: '16.00', basis: 'List Price', rate: '7.5', priorUnits: '0', periodUnits: '1250', basisAmount: '$16.00 per copy', earnings: '1500.00' },
  { form: 'E-Book', isbn: '978-1-9812345-3-6', pubDate: '20 May 2024', listPrice: '12.99', basis: 'Net Receipts', rate: '25.0', priorUnits: '1640', periodUnits: '780', basisAmount: '$7,140.00 total net receipts', earnings: '1785.00' },
  { form: 'Audiobook Download', isbn: '978-1-9812345-4-3', pubDate: '01 Jun 2024', listPrice: '19.99', basis: 'Net Receipts', rate: '25.0', priorUnits: '410', periodUnits: '315', basisAmount: '$4,260.00 total net receipts', earnings: '1065.00' },
];

export const sampleReserves: ReserveRow[] = [
  { form: 'Hardcover', rate: '10% of royalty earnings', withheld: '86.40', released: '35.00' },
  { form: 'Paperback', rate: '10% of royalty earnings', withheld: '150.00', released: '60.00' },
];

export const sampleSublicenses: SublicenseRow[] = [
  { name: 'Meadowbrook Book Club LLC', type: 'Book club edition', income: '1500.00', share: '40', amountDue: '600.00' },
];

/** Deep-clone the sample set for loading into a working document. */
export function cloneSampleDocument(): {
  state: StatementState;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
} {
  return structuredClone({
    state: sample,
    products: sampleProducts,
    reserves: sampleReserves,
    sublicenses: sampleSublicenses,
  });
}
