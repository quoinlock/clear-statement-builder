// Per-field help copy shown when a form label is clicked. Every data-entry
// field (the four statement groups plus the three repeaters) has an entry
// with two parts:
//
//   standard — what the field is in the BISG Translation Rights Royalty
//              Statement Standard (TRRSS), paraphrased from the field list
//              (ID, section, category). Fields CLEAR carries beyond the
//              numbered TRRSS list say so explicitly.
//   plain    — the everyday meaning for a publisher or rights team filling
//              in or reading the statement.
//
// Repeater columns are namespaced ("product.form", "reserve.rate",
// "sublicense.name") because the bare keys collide across repeaters.
import type { ProductRow, ReserveRow, StatementState, SublicenseRow } from '../types.ts';

export interface FieldHelp {
  /** The field in the BISG TRRSS (or a note that it is CLEAR-extended). */
  standard: string;
  /** Plain-language meaning for publishers. */
  plain: string;
}

export type RepeaterPrefix = 'product' | 'reserve' | 'sublicense';

type StatementHelpKey = keyof StatementState;
type RepeaterHelpKey =
  | `product.${keyof ProductRow}`
  | `reserve.${keyof ReserveRow}`
  | `sublicense.${keyof SublicenseRow}`;
export type FieldHelpKey = StatementHelpKey | RepeaterHelpKey;

const NOT_NUMBERED =
  'Not a numbered TRRSS field. CLEAR carries it because publishers expect it on a statement and it helps the recipient reconcile and file the statement.';

export const FIELD_HELP: Record<FieldHelpKey, FieldHelp> = {
  // --- Statement ---
  statementNo: {
    standard: NOT_NUMBERED,
    plain:
      'Your own reference number for this statement, such as RS-2026-0142. Use one consistent scheme so a licensor can quote it back to you when asking a question or matching a payment.',
  },
  statementDate: {
    standard:
      'TRRSS field SS2_RoyStmntDate (Sales & Statement section, Required): the date on which the royalty statement is issued.',
    plain:
      'The date you produce and send the statement. It is usually after the reporting period ends and is the date licensors use when tracking whether statements arrived on time under the contract.',
  },
  periodStart: {
    standard:
      'TRRSS field SS7_RoyRptStartDt (Sales & Statement section, Required): the first day of the royalty reporting period the statement covers.',
    plain:
      'The first day of the sales window being reported, for example 1 January for a calendar-year or first-half statement. Together with the end date it tells the reader exactly which sales are included.',
  },
  periodEnd: {
    standard:
      'TRRSS field SS12_RoyRptEndDt (Sales & Statement section, Required): the last day of the royalty reporting period the statement covers.',
    plain:
      'The last day of the sales window being reported. Sales after this date belong on the next statement. Reporting periods are set by the contract and are usually half-yearly or annual.',
  },
  preparedBy: {
    standard: NOT_NUMBERED,
    plain:
      'The person or team who compiled the statement, with a role where useful. It gives the licensor a named contact for queries and appears in the page footer of the printed statement.',
  },

  // --- Parties ---
  licenseeName: {
    standard:
      'TRRSS field Con1_LicName (Contract section, Required): the legal name of the licensee, the party that acquired the rights and is reporting.',
    plain:
      'The publisher issuing this statement, meaning the company that licensed the rights and sold the edition. Use the full legal entity name as it appears in the contract, not a brand or imprint.',
  },
  licenseeImprint: {
    standard:
      'TRRSS field Con11_LicImp (Contract section, Recommended): the imprint or division of the licensee under which the licensed work was published.',
    plain:
      'The imprint or list the book appeared under, if your company publishes under several names. It helps the licensor recognise the edition and route the statement internally.',
  },
  licenseeAddress: {
    standard:
      'TRRSS field Con6_LicConInfo (Contract section, Required): the licensee’s contact information, typically the postal address and a general contact point.',
    plain:
      'Your business address and how to reach you. The recipient needs this to send queries, tax paperwork, or a formal notice, so keep it current.',
  },
  licenseePhone: {
    standard: NOT_NUMBERED + ' The TRRSS folds contact details into Con6_LicConInfo; CLEAR splits them out for clarity.',
    plain: 'A phone number for the royalties or rights department that handles statement questions.',
  },
  licenseeEmail: {
    standard: NOT_NUMBERED + ' The TRRSS folds contact details into Con6_LicConInfo; CLEAR splits them out for clarity.',
    plain:
      'The mailbox that should receive statement queries. A shared departmental address is better than a personal one so questions are not lost when staff change.',
  },
  licenseeWebsite: {
    standard: NOT_NUMBERED + ' The TRRSS folds contact details into Con6_LicConInfo; CLEAR splits them out for clarity.',
    plain: 'Your company website. Optional, but it helps a licensor confirm they are dealing with the right entity.',
  },
  payerName: {
    standard:
      'TRRSS field Con16_PayName (Contract section, Conditional): the name of the party making the payment, when that party is not the licensee.',
    plain:
      'Who actually pays. Fill this in only when the money comes from a different company than the publisher, for example a parent company, a distributor, or a group treasury. Leave it blank if the licensee pays directly.',
  },
  payerAddress: {
    standard:
      'TRRSS field Con21_PayConInfo (Contract section, Conditional): contact information for the paying party, when different from the licensee.',
    plain:
      'The paying company’s address and contact point. The licensor’s finance team uses this to match incoming payments to the statement and to issue receipts or tax forms to the right entity.',
  },
  payerPhone: {
    standard: NOT_NUMBERED + ' Contact details for the payer sit in Con21_PayConInfo in the TRRSS.',
    plain: 'A phone number for the paying company’s accounts department.',
  },
  payerEmail: {
    standard: NOT_NUMBERED + ' Contact details for the payer sit in Con21_PayConInfo in the TRRSS.',
    plain: 'An email address at the paying company for remittance advice and payment queries.',
  },
  payerWebsite: {
    standard: NOT_NUMBERED + ' Contact details for the payer sit in Con21_PayConInfo in the TRRSS.',
    plain: 'The paying company’s website, if different from the licensee’s. Optional, but it helps identify the entity.',
  },

  // --- Work ---
  licenseeContractId: {
    standard:
      'TRRSS field Con26_LicContID (Contract section, Required): the licensee’s own identifier for the contract under which the work was licensed.',
    plain:
      'Your internal contract or agreement number for this deal. Quoting it lets both sides find the right agreement quickly when there are several titles or editions with the same licensor.',
  },
  licensorName: {
    standard:
      'TRRSS field Con31_LicensorName (Contract section, Required): the name of the licensor, the rights holder or their agent who granted the licence.',
    plain:
      'Who you licensed the rights from and who receives this statement: the original publisher, the author’s agent, or the author directly. Use the name exactly as it appears in the contract.',
  },
  licensorContractId: {
    standard:
      'TRRSS field Con36_LicensorContID (Contract section, Recommended): the licensor’s reference for the same contract.',
    plain:
      'The licensor’s own contract number, if they gave you one. Including it saves their team from having to look it up and reduces the chance the statement is filed against the wrong deal.',
  },
  contributorNames: {
    standard:
      'TRRSS field Con41_ContribNames (Contract section, Required): the names of the work’s contributors, such as the author, illustrator, or translator.',
    plain:
      'The author and any other main creators of the book. This is how most people recognise a title, so it should match the licensor’s records. Add an ISNI or similar identifier if you have one.',
  },
  licensorTitle: {
    standard:
      'TRRSS field Con46_LicensorWorkTitle (Contract section, Required): the title of the work as published or held by the licensor, in the original language.',
    plain:
      'The original title of the book as the licensor knows it. For a translation deal this is the source-language title; for a standard statement it is simply the title of the work.',
  },
  licenseeTitle: {
    standard:
      'TRRSS field Con51_LicWorkTitle (Contract section, Required): the title of the licensee’s edition, typically the translated title.',
    plain:
      'The title you published the book under. In translation deals this is the translated title, which the licensor may not recognise on its own, so pair it with the original title above.',
  },
  language: {
    standard:
      'TRRSS field Con56_LangLicWork (Contract section, Required): the language of the licensee’s edition.',
    plain:
      'The language your edition is published in, for example German or Brazilian Portuguese. One licence usually covers one language, so this identifies which deal the statement belongs to.',
  },
  salesTerritory: {
    standard:
      'TRRSS field Con61_SalesTerr (Contract section, Required): the territory or territories in which the licensee may sell the licensed edition.',
    plain:
      'Where you are allowed to sell the edition under the contract, such as “World”, “Germany, Austria and Switzerland”, or “Spain only”. It reminds both parties of the scope of the licence and frames the sales being reported.',
  },
  advanceAmount: {
    standard:
      'TRRSS field Con66_AdvAmount (Contract section, Required): the total advance payable under the contract against future royalties.',
    plain:
      'The advance you agreed to pay up front. Royalties are earned against it, so it explains why early statements may show earnings but no payment: the advance has to be recouped first.',
  },
  advanceCurrency: {
    standard:
      'TRRSS field Con71_AdvCurr (Contract section, Required): the currency in which the advance, and normally the statement, is denominated.',
    plain:
      'The currency of the advance and of the amounts on this statement, for example EUR or USD. Cross-border deals often involve conversion, so state the currency plainly to avoid disputes over exchange rates.',
  },

  // --- Payment ---
  openingBalance: {
    standard:
      'TRRSS field SS17_OpenBal (Sales & Statement section, Required): the balance carried forward from the previous statement at the start of this period.',
    plain:
      'Where the account stood before this period began. A negative figure usually means part of the advance is still unearned and carries forward; a positive figure means earnings were owed but not yet paid. Payment Due = Opening Balance + Closing Balance.',
  },
  reserveWithheld: {
    standard:
      'TRRSS field SS77_ResWithheld (Sales & Statement section, Required): the amount of royalties held back this period as a reserve against anticipated returns.',
    plain:
      'Money earned this period that you are holding back, usually a percentage of royalties on returnable formats, because some books sold to shops may come back unsold. The contract sets whether reserves are allowed and how large they can be.',
  },
  reserveReleased: {
    standard:
      'TRRSS field SS82_ResReleased (Sales & Statement section, Required): the amount of previously withheld reserves released for payment this period.',
    plain:
      'Reserves held on earlier statements that you are now paying out because the returns window has closed. Releases increase the closing balance; withholdings reduce it.',
  },
  sublicenseIncomeTotal: {
    standard:
      'Summary of the TRRSS Subsidiary Rights section (SC3–SC23). The TRRSS reports sublicence income line by line; CLEAR also carries the licensor’s total so it can be checked against the rows.',
    plain:
      'The total amount from sublicensing (book club, audio, serial, and similar deals) that is due to the licensor this period. It should equal the sum of the Licensor Amount Due column in the sublicense rows; the review flags it if it does not.',
  },
  coAgentCommissionPercent: {
    standard:
      'TRRSS field RA9_CoAgentCommPerc (Remittance Advice section, Conditional): the commission percentage retained by a co-agent or sub-agent in the licensee’s territory.',
    plain:
      'The cut taken by a local agent who brokered the translation deal, if there is one. It is deducted before the money reaches the licensor, so showing it explains the gap between earnings and the amount remitted.',
  },
  taxId: {
    standard:
      'TRRSS field RA14_LicTaxID (Remittance Advice section, Remittance): the licensee’s tax identifier, such as a VAT number or EIN.',
    plain:
      'Your company’s tax number. Licensors need it for their own tax filings and to reclaim or document withholding tax on cross-border royalty payments.',
  },
  taxExemptionStatus: {
    standard:
      'TRRSS field RA19_LicensorTaxExStatus (Remittance Advice section, Remittance): whether and on what basis the licensor is exempt from withholding tax on this payment.',
    plain:
      'Whether tax was withheld and why or why not, for example “W-8BEN on file, treaty rate 0%” or “not applicable, domestic payment”. This is the first thing a licensor checks when the amount received is less than expected.',
  },
  taxWithheld: {
    standard:
      'TRRSS field RA24_LicensorTaxHeldAmt (Remittance Advice section, Remittance): the amount of tax withheld from the payment to the licensor.',
    plain:
      'The amount deducted at source for tax before payment. Enter 0.00 if none was withheld. The licensor uses this figure, with a tax certificate, to claim credit in their own country.',
  },
  scheduledPaymentDate: {
    standard: NOT_NUMBERED + ' Remittance timing sits alongside the RA4–RA24 fields in practice.',
    plain:
      'When the payment will be, or was, sent. Contracts typically require payment within a set number of days after the statement, so this shows the licensor you are paying within that deadline.',
  },
  paymentMethod: {
    standard: NOT_NUMBERED,
    plain:
      'How the money is being sent, for example ACH, SEPA, international wire, or cheque. It tells the licensor where to look for the funds and how long clearing is likely to take.',
  },
  beneficiary: {
    standard: NOT_NUMBERED,
    plain:
      'The account holder the payment is made to, which may be the licensor’s agency client account rather than the licensor itself. Confirming it on the statement helps catch misdirected payments early.',
  },
  beneficiaryBank: {
    standard: NOT_NUMBERED,
    plain: 'The name of the bank holding the beneficiary account. Part of the remittance detail the licensor’s finance team matches against their records.',
  },
  swiftBic: {
    standard: NOT_NUMBERED,
    plain:
      'The bank’s SWIFT/BIC code used for international transfers. Show only what is needed to identify the transfer; never print full account numbers on a statement that may be widely circulated.',
  },
  accountReference: {
    standard: NOT_NUMBERED,
    plain:
      'A masked reference to the receiving account, such as the last four digits, or the payment reference quoted on the transfer. Enough to match the payment without exposing the full account number.',
  },
  statementNotes: {
    standard: NOT_NUMBERED,
    plain:
      'Free-text notes to the reader: explanations of unusual figures, a change of contact, currency conversion rates used, or anything else that avoids a follow-up email. Keep it factual and brief.',
  },

  // --- Product rows ---
  'product.form': {
    standard:
      'TRRSS field SS32_ProdFormDtl (Sales & Statement section, Required): the product form of the edition being reported, for example hardcover, paperback, e-book, or audio download.',
    plain:
      'The format this row covers. Royalty rates almost always differ by format, so each format gets its own row with its own units, rate, and earnings.',
  },
  'product.isbn': {
    standard:
      'TRRSS field SS27_LicProdIdentifier (Sales & Statement section, Required): the product identifier of the licensee’s edition, normally the ISBN-13.',
    plain:
      'The ISBN of your edition in this format. It is the unambiguous identifier for the product, so the licensor can match the row to the actual book on sale.',
  },
  'product.pubDate': {
    standard:
      'TRRSS field SS37_LicPubDate (Sales & Statement section, Recommended): the publication date of the licensee’s edition in this format.',
    plain:
      'When this format was first published. It helps the licensor judge whether sales figures look reasonable and confirms you published within any deadline the contract sets.',
  },
  'product.listPrice': {
    standard:
      'TRRSS field SS42_LicListPrice (Sales & Statement section, Recommended): the licensee’s list or retail price for the edition in this format.',
    plain:
      'The cover or retail price of this format. When royalties are calculated on list price, this is the figure the rate is applied to, so the licensor needs it to check the arithmetic.',
  },
  'product.basis': {
    standard:
      'TRRSS field SS52_RoyBasis (Sales & Statement section, Required): the basis on which the royalty is calculated, typically list price or net receipts.',
    plain:
      'What the royalty percentage is applied to: the cover price of each copy, or the money you actually received after trade discounts. The contract fixes this per format, and it makes a large difference to the earnings.',
  },
  'product.rate': {
    standard:
      'TRRSS field SS47_RoyRate (Sales & Statement section, Required): the royalty rate applied to sales in this row, expressed as a percentage.',
    plain:
      'The royalty percentage for this format and, if the contract has escalators, for this sales band. Enter it as a number such as 8 for eight percent.',
  },
  'product.priorUnits': {
    standard:
      'TRRSS field SS22_NetUnitstoBegPer (Sales & Statement section, Required): net units sold up to the beginning of this reporting period.',
    plain:
      'Cumulative net sales of this format before the period started, meaning copies sold minus copies returned. It lets the licensor see the running total and check escalator thresholds.',
  },
  'product.periodUnits': {
    standard:
      'TRRSS field SS57_UnitsSldinPer (Sales & Statement section, Required): net units sold during this reporting period.',
    plain:
      'Copies of this format sold in the period, net of returns. Multiplied by the basis amount and the rate, this produces the royalty earnings for the row. Prior units plus period units gives the life-to-date total.',
  },
  'product.basisAmount': {
    standard:
      'Not a numbered TRRSS field. It is the monetary figure that SS52_RoyBasis refers to: the per-copy price for list-price royalties, or the total net receipts for net-receipts royalties.',
    plain:
      'The money the rate is applied to. For list-price rows you can leave it blank and CLEAR uses the list price per copy; for net-receipts rows enter the total net receipts for the period, for example “7,140.00 total net receipts”.',
  },
  'product.earnings': {
    standard:
      'TRRSS field SS62_RoyEarnings (Sales & Statement section, Required): the royalty earned on this row for the period.',
    plain:
      'The royalty amount this format earned in the period: units times basis amount times rate for list-price rows, or net receipts times rate for net-receipts rows. The rows sum to Total Royalty Earnings on the statement.',
  },

  // --- Reserve rows ---
  'reserve.form': {
    standard:
      'Reuses TRRSS field SS32_ProdFormDtl so a reserve can be tied to the product form it relates to.',
    plain:
      'The format this reserve applies to. Reserves are usually taken only on returnable formats such as hardcover and paperback, not on e-books or audio downloads.',
  },
  'reserve.rate': {
    standard:
      'Not a numbered TRRSS field. It explains how the SS77_ResWithheld amount was arrived at.',
    plain:
      'How the reserve was calculated, for example “10% of royalty earnings” or “15% of units”. The contract normally caps the rate and says how long reserves may be held.',
  },
  'reserve.withheld': {
    standard:
      'Per-format detail behind TRRSS field SS77_ResWithheld (Required): the reserve against returns taken on this format in the period.',
    plain:
      'The amount held back on this format this period. The rows add up to the Reserve Withheld figure in the payment section.',
  },
  'reserve.released': {
    standard:
      'Per-format detail behind TRRSS field SS82_ResReleased (Required): reserves from earlier periods released on this format.',
    plain:
      'Money previously held back on this format that is now being paid out. The rows add up to the Reserve Released figure in the payment section.',
  },

  // --- Sublicense rows ---
  'sublicense.name': {
    standard:
      'TRRSS field SC3_SubLicName (Subsidiary Rights section, Conditional): the name of the sublicensee, the third party to whom the licensee granted a subsidiary right.',
    plain:
      'The company you sold a secondary right to, such as a book club, audio publisher, or newspaper for serialisation. Required only if you made such deals; otherwise leave the section empty or note “not applicable”.',
  },
  'sublicense.type': {
    standard:
      'TRRSS field SC8_SubLicType (Subsidiary Rights section, Conditional): the type of subsidiary right sublicensed.',
    plain:
      'What kind of deal it was: book club edition, audio, large print, first serial, anthology, and so on. Contracts often set different licensor shares for different types.',
  },
  'sublicense.income': {
    standard:
      'TRRSS field SC13_SubLicIncome (Subsidiary Rights section, Conditional): the gross income received by the licensee from the sublicence in the period.',
    plain:
      'What the sublicensee paid you this period, before splitting it with the licensor. Report the gross figure so the licensor can verify their share.',
  },
  'sublicense.share': {
    standard:
      'TRRSS field SC18_LicensorShare (Subsidiary Rights section, Conditional): the licensor’s share of sublicence income, as a percentage.',
    plain:
      'The percentage of the sublicence income that goes to the licensor under the head contract, commonly 50% or more for translation deals. Enter it as a number such as 40.',
  },
  'sublicense.amountDue': {
    standard:
      'TRRSS field SC23_LicensorAmtInc (Subsidiary Rights section, Conditional): the amount of sublicence income due to the licensor.',
    plain:
      'Income times share: the money the licensor gets from this sublicence. The rows add up to Sublicense Income Total in the payment section and feed into the closing balance.',
  },
};

export const FIELD_HELP_KEYS = Object.keys(FIELD_HELP) as FieldHelpKey[];

export function fieldHelp(key: string): FieldHelp | undefined {
  return (FIELD_HELP as Record<string, FieldHelp>)[key];
}

/** Namespaced help key for a repeater column. */
export function repeaterHelpKey(prefix: RepeaterPrefix, key: string): string {
  return `${prefix}.${key}`;
}
