// v2 statement-type (Standard vs Translation): applicability catalog,
// validation exclusion, totals commission rule, review N/A rows and
// scoring, and the document-level statementType field.
import { describe, expect, it } from 'vitest';
import {
  TRANSLATION_ONLY_KEYS,
  coerceStatementType,
  fieldLabel,
  isFieldApplicable,
  statementSubtitle,
  statementTitle,
} from '../../src/core/catalog/applicability.ts';
import { FIELD_META, fieldMeta } from '../../src/core/catalog/fieldMeta.ts';
import { STATEMENT_STATE_KEYS } from '../../src/core/catalog/groups.ts';
import { totals } from '../../src/core/calc/index.ts';
import { validation } from '../../src/core/validation/index.ts';
import { reviewData, reviewRows } from '../../src/core/review/index.ts';
import { cloneSampleDocument, sample, sampleProducts, sampleSublicenses } from '../../src/core/sample/index.ts';

describe('applicability catalog', () => {
  it('the five translation-only keys exist on StatementState and in FIELD_META', () => {
    expect(TRANSLATION_ONLY_KEYS).toEqual([
      'licenseeTitle',
      'language',
      'salesTerritory',
      'advanceCurrency',
      'coAgentCommissionPercent',
    ]);
    for (const key of TRANSLATION_ONLY_KEYS) {
      expect(STATEMENT_STATE_KEYS).toContain(key);
      expect(fieldMeta(key)).toBeDefined();
    }
  });

  it('every field is applicable in translation mode; only translation-only keys drop in standard', () => {
    for (const key of Object.keys(FIELD_META)) {
      expect(isFieldApplicable(key, 'translation')).toBe(true);
      expect(isFieldApplicable(key, 'standard')).toBe(!TRANSLATION_ONLY_KEYS.includes(key as never));
    }
  });

  it('relabels only licensorTitle in standard mode and retitles the statement', () => {
    expect(fieldLabel('Licensor Title of Work', 'licensorTitle', 'standard')).toBe('Title of Work');
    expect(fieldLabel('Licensor Title of Work', 'licensorTitle', 'translation')).toBe('Licensor Title of Work');
    expect(fieldLabel('Licensee Name', 'licenseeName', 'standard')).toBe('Licensee Name');
    expect(statementTitle('standard')).toBe('Royalty Statement');
    expect(statementTitle('translation')).toBe('Translation Rights Royalty Statement');
    expect(statementSubtitle('standard')).toBe('BISG-aligned royalty statement — not a certification');
  });

  it('coerces unknown statement types to translation', () => {
    expect(coerceStatementType('standard')).toBe('standard');
    expect(coerceStatementType('translation')).toBe('translation');
    expect(coerceStatementType(undefined)).toBe('translation');
    expect(coerceStatementType('bogus')).toBe('translation');
  });
});

describe('validation in standard mode', () => {
  it('drops exactly the five translation-only checks (18 + 6·products)', () => {
    const v = validation(sample, sampleProducts, sampleSublicenses, 'standard');
    expect(v.checks).toHaveLength(18 + sampleProducts.length * 6);
    for (const key of TRANSLATION_ONLY_KEYS) {
      expect(v.checks.find(c => c.key === key && !c.label.startsWith('Product'))).toBeUndefined();
    }
  });

  it('blank translation-only fields no longer cost score in standard mode', () => {
    const state = { ...sample, language: '', licenseeTitle: '', salesTerritory: '', advanceCurrency: '' };
    expect(validation(state, sampleProducts, sampleSublicenses, 'translation').score).toBeLessThan(100);
    expect(validation(state, sampleProducts, sampleSublicenses, 'standard').score).toBe(100);
  });

  it('defaults to translation (v1 behavior) when no type is passed', () => {
    expect(validation(sample, sampleProducts, sampleSublicenses).checks).toHaveLength(23 + sampleProducts.length * 6);
  });
});

describe('totals in standard mode', () => {
  it('ignores a kept co-agent commission value (commission = 0, net rises)', () => {
    const translation = totals(sample, sampleProducts, 'translation');
    const standard = totals(sample, sampleProducts, 'standard');
    expect(translation.commission).toBeGreaterThan(0); // sample has 10%
    expect(standard.commission).toBe(0);
    expect(standard.net).toBeCloseTo(standard.payment - Number(sample.taxWithheld || 0), 2);
    expect(standard.payment).toBe(translation.payment); // payment itself is unchanged
  });
});

describe('review in standard mode', () => {
  it('reports translation-only fields as Not applicable and excludes them from scoring', () => {
    const input = { ...cloneSampleDocument(), statementType: 'standard' as const };
    const rows = reviewRows(input);
    for (const key of TRANSLATION_ONLY_KEYS) {
      const row = rows.find(r => r.key === key && !r.label.startsWith('Product'));
      expect(row?.status).toBe('Not applicable / not shown');
      expect(row?.recommendation).toContain('Not applicable to a standard');
    }
    const doc = reviewData(input);
    expect(doc.statementType).toBe('standard');
    // N/A rows never appear in a category denominator.
    const naCategories = ['Work information', 'Contract economics', 'Remittance / tax'];
    for (const cat of doc.categoryScores.filter(c => naCategories.includes(c.category))) {
      const catRows = doc.fields.filter(r => r.category === cat.category);
      const na = catRows.filter(r => r.status === 'Not applicable / not shown').length;
      expect(cat.total).toBe(catRows.length - na);
    }
  });

  it('blank translation-only fields do not lower the standard-mode overall score', () => {
    const blanked = cloneSampleDocument();
    blanked.state.language = '';
    blanked.state.licenseeTitle = '';
    blanked.state.salesTerritory = '';
    blanked.state.advanceCurrency = '';
    const translation = reviewData(blanked);
    const standard = reviewData({ ...blanked, statementType: 'standard' });
    expect(standard.overallScore).toBeGreaterThan(translation.overallScore);
    expect(standard.missingFields.map(r => r.key)).not.toContain('language');
  });

  it('defaults to translation with no N/A translation rows', () => {
    const doc = reviewData(cloneSampleDocument());
    expect(doc.statementType).toBe('translation');
    expect(doc.fields.find(r => r.key === 'language')?.status).toBe('Detected');
  });
});
