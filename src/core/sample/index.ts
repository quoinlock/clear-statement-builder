// Normative sample fixture, cloned verbatim from PRD Appendix B (which
// transcribes the Hugo v1.7 snapshot objects). Do not edit values here
// without updating the PRD; tests pin totals computed from this data.
import type { ProductRow, ReserveRow, StatementState, SublicenseRow } from '../types.ts';

export const sample: StatementState = {
  statementNo: 'RS-2026-0142',
  statementDate: '15 Mar 2026',
  periodStart: '01 Jan 2025',
  periodEnd: '31 Dec 2025',
  preparedBy: 'Maria Köhler, Senior Royalties Manager',
  licenseeName: 'Nordlicht Verlag GmbH',
  licenseeImprint: 'Nordlicht Belletristik',
  licenseeAddress: 'Friedrichstraße 88, 10117 Berlin, Germany',
  licenseePhone: '+49 30 555 018 40',
  licenseeEmail: 'rights@nordlicht-verlag.de',
  licenseeWebsite: 'www.nordlicht-verlag.de',
  payerName: 'Aurora Media Deutschland GmbH',
  payerAddress: 'Friedrichstraße 88, 10117 Berlin, Germany',
  payerPhone: '+49 30 555 018 99',
  payerEmail: 'finance@auroramedia.de',
  payerWebsite: 'www.auroramedia.de',
  licenseeContractId: 'NV-DE-TR-2024-00981',
  licensorName: 'Cedar Lane Rights LLC, c/o Bright Quill Agency',
  licensorContractId: 'BQA-US-4471',
  contributorNames: 'Amelia Hart (ISNI 0000000123456789)',
  licensorTitle: 'The Long Summer Road',
  licenseeTitle: 'Der lange Sommerweg',
  language: 'German',
  salesTerritory: 'Germany, Austria, Switzerland, Luxembourg',
  advanceAmount: '8000.00',
  advanceCurrency: 'USD',
  openingBalance: '-2450.00',
  reserveWithheld: '236.40',
  reserveReleased: '95.00',
  sublicenseIncomeTotal: '600.00',
  coAgentCommissionPercent: '10',
  taxId: 'DE339221908',
  taxExemptionStatus: 'Waived under Germany–US tax treaty; Form W-8BEN-E valid through 31 Dec 2027',
  taxWithheld: '0.00',
  scheduledPaymentDate: '31 Mar 2026',
  paymentMethod: 'International bank transfer (SWIFT)',
  beneficiary: 'Bright Quill Agency Client Account',
  beneficiaryBank: 'Hudson Trust Bank, New York',
  swiftBic: 'HUTBUS33',
  accountReference: 'Client Account ending 0281',
  statementNotes:
    'This example is intended as a best-practice template for publisher royalty statements.\nAll BISG core, statement-specific, conditional, and remittance fields are shown.\nAdvance Amount is stated separately from statement currency.\nCo-agent commission is deducted from Payment Due before remittance.\nNo foreign tax was withheld for this payment.',
};

export const sampleProducts: ProductRow[] = [
  { form: 'Hardcover', isbn: '978-3-9812345-1-2', pubDate: '20 May 2024', listPrice: '24.00', basis: 'List Price', rate: '8.0', priorUnits: '960', periodUnits: '450', basisAmount: '€24.00 per copy', earnings: '864.00' },
  { form: 'Paperback', isbn: '978-3-9812345-2-9', pubDate: '15 Mar 2025', listPrice: '16.00', basis: 'List Price', rate: '7.5', priorUnits: '0', periodUnits: '1250', basisAmount: '€16.00 per copy', earnings: '1500.00' },
  { form: 'E-Book', isbn: '978-3-9812345-3-6', pubDate: '20 May 2024', listPrice: '12.99', basis: 'Net Receipts', rate: '25.0', priorUnits: '1640', periodUnits: '780', basisAmount: '€7,140.00 total net receipts', earnings: '1785.00' },
  { form: 'Audiobook Download', isbn: '978-3-9812345-4-3', pubDate: '01 Jun 2024', listPrice: '19.99', basis: 'Net Receipts', rate: '25.0', priorUnits: '410', periodUnits: '315', basisAmount: '€4,260.00 total net receipts', earnings: '1065.00' },
];

export const sampleReserves: ReserveRow[] = [
  { form: 'Hardcover', rate: '10% of royalty earnings', withheld: '86.40', released: '35.00' },
  { form: 'Paperback', rate: '10% of royalty earnings', withheld: '150.00', released: '60.00' },
];

export const sampleSublicenses: SublicenseRow[] = [
  { name: 'Lesering Deutschland GmbH', type: 'German book club edition', income: '1500.00', share: '40', amountDue: '600.00' },
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
