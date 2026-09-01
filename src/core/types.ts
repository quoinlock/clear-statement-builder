// Normative core types, transcribed from the PRD ("Core types (normative)").
// Keys match Hugo v1.7 state/rows so 0.9 JSON round-trips.

export type BisgCategory = 'Required' | 'Recommended' | 'Conditional' | 'Remittance';
/** v2: 'translation' is the v1 behavior and the default everywhere a type is absent. */
export type StatementType = 'translation' | 'standard';
export type Confidence = 'High' | 'Medium' | 'Low';
export type ReviewStatus =
  | 'Detected'
  | 'Detected but unclear'
  | 'Missing'
  | 'Not applicable / not shown';

export interface ProductRow {
  form: string;
  isbn: string;
  pubDate: string;
  listPrice: string;
  basis: string;
  rate: string;
  priorUnits: string;
  periodUnits: string;
  basisAmount: string; // Hugo-extended
  earnings: string;
}

export interface ReserveRow {
  form: string;
  rate: string;
  withheld: string;
  released: string;
}

export interface SublicenseRow {
  name: string;
  type: string;
  income: string;
  share: string;
  amountDue: string;
}

/** Keys match Hugo `state` so 0.9 JSON round-trips. */
export interface StatementState {
  statementNo: string; // Hugo-extended
  statementDate: string; // SS2_RoyStmntDate
  periodStart: string; // SS7_RoyRptStartDt
  periodEnd: string; // SS12_RoyRptEndDt
  preparedBy: string; // Hugo-extended
  licenseeName: string;
  licenseeImprint: string;
  licenseeAddress: string;
  licenseePhone: string; // Hugo-extended
  licenseeEmail: string; // Hugo-extended
  licenseeWebsite: string; // Hugo-extended
  payerName: string;
  payerAddress: string;
  payerPhone: string; // Hugo-extended
  payerEmail: string; // Hugo-extended
  payerWebsite: string; // Hugo-extended
  licenseeContractId: string;
  licensorName: string;
  licensorContractId: string;
  contributorNames: string;
  licensorTitle: string;
  licenseeTitle: string;
  language: string;
  salesTerritory: string;
  advanceAmount: string;
  advanceCurrency: string;
  openingBalance: string;
  reserveWithheld: string;
  reserveReleased: string;
  sublicenseIncomeTotal: string; // Hugo-extended rollup of SC23
  coAgentCommissionPercent: string;
  taxId: string;
  taxExemptionStatus: string;
  taxWithheld: string;
  scheduledPaymentDate: string; // Hugo-extended
  paymentMethod: string; // Hugo-extended
  beneficiary: string; // Hugo-extended
  beneficiaryBank: string; // Hugo-extended
  swiftBic: string; // Hugo-extended
  accountReference: string; // Hugo-extended
  statementNotes: string; // Hugo-extended
}

export interface Totals {
  totalRoyalty: number;
  opening: number;
  withheld: number;
  released: number;
  sub: number;
  closing: number;
  payment: number;
  commission: number;
  net: number;
}

/** In-memory working document. `showIds` is UI/persistence only — not written to statement JSON. */
export interface StatementDocument {
  version: '1.1.0';
  generatedAt: string; // ISO-8601
  product?: 'clear-statement-builder';
  priorArt?: 'hugo-prototype-v1.7';
  /** v2 document-level field; absent (Hugo 0.9 / CSB 1.0.x reads) means 'translation'. */
  statementType?: StatementType;
  state: StatementState;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
}

export interface UiPersistence {
  showIds: boolean;
  firstVisitMode: 'sample' | 'empty';
}

export interface Detection {
  target: keyof StatementState | string;
  value: string;
  confidence: Confidence;
  source: string;
  reason: string;
  bisg: string;
  category: string;
}

export interface CalcInference {
  product: string;
  calculation: string;
  reported: string;
  status: 'matches' | 'review';
}

export interface ContractStatement {
  contractId: string;
  title: string;
  state: Partial<StatementState>;
  products: ProductRow[];
  sourceText?: string;
  openingBalance: string;
  currentRoyalty: string;
  newBalance: string;
}

export interface DetectionResult {
  sourceType: string;
  profile: string;
  /** Set by statement JSON imports (Hugo/1.0.x read as 'translation'); applying adopts it. */
  statementType?: StatementType;
  state: Partial<StatementState>;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
  detections: Detection[];
  unmappedLines: string[];
  calcInferences: CalcInference[];
  notes: string[];
  rawText?: string;
  contractStatements?: ContractStatement[];
}

export interface CustomImportProfile {
  id: string;
  name: string;
  language: string;
  numberFormat: 'auto' | 'european' | 'us';
  splitPattern: string;
  fieldRules: string;
  abbreviations: string;
  productAliases: string;
  calculationHint: string;
}
