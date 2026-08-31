// AC-CAT-1..3 (PRD "Acceptance criteria / test cases > Catalog").
import { describe, expect, it } from 'vitest';
import {
  FIELD_META,
  GROUPS,
  GROUP_NAMES,
  PRODUCT_KEYS,
  RESERVE_KEYS,
  STATEMENT_STATE_KEYS,
  SUBLICENSE_KEYS,
  bisgCategory,
  bisgId,
} from '../../src/core/catalog/index.ts';

describe('AC-CAT-1: FIELD_META has exactly the 44 keys/IDs/categories', () => {
  it('has exactly 44 entries', () => {
    expect(Object.keys(FIELD_META)).toHaveLength(44);
  });

  it('has the Hugo category tally: 28 Required, 4 Recommended, 8 Conditional, 4 Remittance', () => {
    const tally: Record<string, number> = {};
    for (const [, cat] of Object.values(FIELD_META)) tally[cat] = (tally[cat] ?? 0) + 1;
    expect(tally).toEqual({ Required: 28, Recommended: 4, Conditional: 8, Remittance: 4 });
  });

  it('spot-checks IDs and categories from the PRD field tables', () => {
    expect(FIELD_META.licenseeName).toEqual(['Con1_LicName', 'Required']);
    expect(FIELD_META.advanceCurrency).toEqual(['Con71_AdvCurr', 'Required']);
    expect(FIELD_META.paymentDue).toEqual(['SS92_PayDue', 'Required']);
    expect(FIELD_META.licensorAmountDue).toEqual(['SC23_LicensorAmtInc', 'Conditional']);
    expect(FIELD_META.remitId).toEqual(['RA4_RemitIDInfo', 'Remittance']);
    // RA-prefixed but Conditional (PRD calls this out explicitly).
    expect(FIELD_META.coAgentCommissionPercent).toEqual(['RA9_CoAgentCommPerc', 'Conditional']);
    // Recommended set is exactly these four.
    const recommended = Object.entries(FIELD_META)
      .filter(([, [, cat]]) => cat === 'Recommended')
      .map(([k]) => k)
      .sort();
    expect(recommended).toEqual(['licenseeImprint', 'licensorContractId', 'listPrice', 'pubDate']);
  });

  it('prefix tally: 15 Con*, 19 SS*, 5 SC*, 5 RA*', () => {
    const prefix = (id: string) => id.match(/^[A-Za-z]+/)![0].replace(/[a-z].*/, m => m);
    const tally: Record<string, number> = {};
    for (const [id] of Object.values(FIELD_META)) {
      const p = id.startsWith('Con') ? 'Con' : id.slice(0, 2);
      tally[p] = (tally[p] ?? 0) + 1;
    }
    void prefix;
    expect(tally).toEqual({ Con: 15, SS: 19, SC: 5, RA: 5 });
  });
});

describe('AC-CAT-2: every groups form key exists on StatementState', () => {
  it('all group keys are statement-state keys', () => {
    const stateKeys = new Set<string>(STATEMENT_STATE_KEYS);
    for (const name of GROUP_NAMES) {
      for (const field of GROUPS[name]) {
        expect(stateKeys.has(field.key), `${name}:${field.key}`).toBe(true);
      }
    }
  });

  it('groups have the parity shape: 5 + 11 + 10 + 15 fields, Statement Notes is a textarea', () => {
    expect(GROUPS.Statement).toHaveLength(5);
    expect(GROUPS.Parties).toHaveLength(11);
    expect(GROUPS.Work).toHaveLength(10);
    expect(GROUPS.Payment).toHaveLength(15);
    expect(GROUPS.Payment.at(-1)).toEqual({ label: 'Statement Notes', key: 'statementNotes', control: 'textarea' });
  });

  it('repeater key lists match parity', () => {
    expect(PRODUCT_KEYS).toHaveLength(10);
    expect(RESERVE_KEYS).toEqual(['form', 'rate', 'withheld', 'released']);
    expect(SUBLICENSE_KEYS).toEqual(['name', 'type', 'income', 'share', 'amountDue']);
  });
});

describe('AC-CAT-3: Hugo-extended keys have no BISG ID', () => {
  const hugoExtended = [
    'statementNo',
    'preparedBy',
    'licenseePhone',
    'licenseeEmail',
    'licenseeWebsite',
    'payerPhone',
    'payerEmail',
    'payerWebsite',
    'sublicenseIncomeTotal',
    'scheduledPaymentDate',
    'paymentMethod',
    'beneficiary',
    'beneficiaryBank',
    'swiftBic',
    'accountReference',
    'statementNotes',
    'basisAmount', // product row
    'name', // sublicense row storage key
    'withheld', // reserve row storage key
  ];

  it.each(hugoExtended)('%s has no BISG ID or category', key => {
    expect(bisgId(key)).toBe('');
    expect(bisgCategory(key)).toBe('');
  });
});
