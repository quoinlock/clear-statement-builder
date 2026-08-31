// The 44 BISG field IDs as implemented in Hugo v1.7 FIELD_META (transcribed
// verbatim from the snapshot). These track the BISG Translation Rights
// Royalty Statement Standard but are Hugo's catalog, not an independently
// verified extract of the Knowledge Center table.
import type { BisgCategory } from '../types.ts';

export type FieldMetaEntry = readonly [bisgId: string, category: BisgCategory];

export const FIELD_META = {
  licenseeName: ['Con1_LicName', 'Required'],
  licenseeAddress: ['Con6_LicConInfo', 'Required'],
  licenseeImprint: ['Con11_LicImp', 'Recommended'],
  payerName: ['Con16_PayName', 'Conditional'],
  payerAddress: ['Con21_PayConInfo', 'Conditional'],
  licenseeContractId: ['Con26_LicContID', 'Required'],
  licensorName: ['Con31_LicensorName', 'Required'],
  licensorContractId: ['Con36_LicensorContID', 'Recommended'],
  contributorNames: ['Con41_ContribNames', 'Required'],
  licensorTitle: ['Con46_LicensorWorkTitle', 'Required'],
  licenseeTitle: ['Con51_LicWorkTitle', 'Required'],
  language: ['Con56_LangLicWork', 'Required'],
  salesTerritory: ['Con61_SalesTerr', 'Required'],
  advanceAmount: ['Con66_AdvAmount', 'Required'],
  advanceCurrency: ['Con71_AdvCurr', 'Required'],
  statementDate: ['SS2_RoyStmntDate', 'Required'],
  periodStart: ['SS7_RoyRptStartDt', 'Required'],
  periodEnd: ['SS12_RoyRptEndDt', 'Required'],
  openingBalance: ['SS17_OpenBal', 'Required'],
  priorUnits: ['SS22_NetUnitstoBegPer', 'Required'],
  isbn: ['SS27_LicProdIdentifier', 'Required'],
  form: ['SS32_ProdFormDtl', 'Required'],
  pubDate: ['SS37_LicPubDate', 'Recommended'],
  listPrice: ['SS42_LicListPrice', 'Recommended'],
  rate: ['SS47_RoyRate', 'Required'],
  basis: ['SS52_RoyBasis', 'Required'],
  periodUnits: ['SS57_UnitsSldinPer', 'Required'],
  earnings: ['SS62_RoyEarnings', 'Required'],
  totalRoyalty: ['SS67_TotRoyEarnings', 'Required'],
  ltdUnits: ['SS72_LTDUnitsSold', 'Required'],
  reserveWithheld: ['SS77_ResWithheld', 'Required'],
  reserveReleased: ['SS82_ResReleased', 'Required'],
  closingBalance: ['SS87_ClosingBal', 'Required'],
  paymentDue: ['SS92_PayDue', 'Required'],
  sublicenseeName: ['SC3_SubLicName', 'Conditional'],
  sublicenseType: ['SC8_SubLicType', 'Conditional'],
  sublicenseIncome: ['SC13_SubLicIncome', 'Conditional'],
  licensorShare: ['SC18_LicensorShare', 'Conditional'],
  licensorAmountDue: ['SC23_LicensorAmtInc', 'Conditional'],
  remitId: ['RA4_RemitIDInfo', 'Remittance'],
  coAgentCommissionPercent: ['RA9_CoAgentCommPerc', 'Conditional'],
  taxId: ['RA14_LicTaxID', 'Remittance'],
  taxExemptionStatus: ['RA19_LicensorTaxExStatus', 'Remittance'],
  taxWithheld: ['RA24_LicensorTaxHeldAmt', 'Remittance'],
} as const satisfies Record<string, FieldMetaEntry>;

export type CatalogKey = keyof typeof FIELD_META;

export function fieldMeta(key: string): FieldMetaEntry | undefined {
  return (FIELD_META as Record<string, FieldMetaEntry>)[key];
}

export function bisgId(key: string): string {
  return fieldMeta(key)?.[0] ?? '';
}

export function bisgCategory(key: string): BisgCategory | '' {
  return fieldMeta(key)?.[1] ?? '';
}
