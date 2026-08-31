// PR 12: generic digest behavior — puts table, ISBN fallback for any
// profile (AC-IMP-13), inline honor line (AC-IMP-6 without contract split),
// TB form mapping (AC-IMP-8), calc inferences, notes.
import { describe, expect, it } from 'vitest';
import { digestStatementText } from '../../src/core/import/digest.ts';
import { parseUllsteinProductSegment } from '../../src/core/import/productSegment.ts';

const GENERIC_TEXT = `Royalty Statement
Date: 15.03.2026
Accounting period 01.01.2025 - 31.12.2025
Copyright Holder: Amelia Hart
Nordlicht Verlag GmbH
Friedrichstraße 88, 10117 Berlin
Telefon: +49 30 555 018 40
rights@nordlicht-verlag.de
www.nordlicht-verlag.de
Internal contract number NV-DE-TR-2024-00981
Brought forward -2450.00
Tax exemption until: 31.12.2027
UST-ID: DE 339221908
`;

describe('generic digest puts', () => {
  const r = digestStatementText(GENERIC_TEXT, 'generic');

  it('maps direct labels with High confidence', () => {
    expect(r.profile).toBe('generic');
    expect(r.state.statementDate).toBe('15 Mar 2026');
    expect(r.state.periodStart).toBe('01 Jan 2025');
    expect(r.state.periodEnd).toBe('31 Dec 2025');
    expect(r.state.licensorName).toBe('Amelia Hart');
    expect(r.state.licenseeContractId).toBe('NV-DE-TR-2024-00981');
    expect(r.state.openingBalance).toBe('-2450');
    const det = (t: string) => r.detections.find(d => d.target === t);
    expect(det('statementDate')?.confidence).toBe('High');
    expect(det('licenseeName')?.confidence).toBe('Medium'); // non-Ullstein heading
  });

  it('maps pattern-based fields', () => {
    expect(r.state.licenseeName).toBe('Nordlicht Verlag GmbH');
    expect(r.state.licenseeAddress).toContain('Friedrichstraße 88');
    expect(r.state.licenseePhone).toBe('+49 30 555 018 40');
    expect(r.state.licenseeEmail).toBe('rights@nordlicht-verlag.de');
    expect(r.state.licenseeWebsite).toBe('www.nordlicht-verlag.de');
    expect(r.state.taxId).toBe('DE 339221908');
  });

  it('emits notes and never applies anything itself', () => {
    expect(r.notes.some(n => /statement-level fields detected/.test(n))).toBe(true);
    expect(r.notes.at(-1)).toMatch(/Review all detected values before applying/);
  });
});

describe('AC-IMP-13: ISBN fallback runs for any profile', () => {
  it('generic profile, no Ullstein markers, ISBN present → product row via segment parser', () => {
    const text = 'Some publisher statement\nHardcover 978-3-9812345-1-2\nET 20.05.2024\n';
    const r = digestStatementText(text, 'generic');
    expect(r.profile).toBe('generic');
    expect(r.products).toHaveLength(1);
    expect(r.products[0].form).toBe('Hardcover');
    expect(r.products[0].isbn).toBe('978-3-9812345-1-2');
    expect(r.products[0].pubDate).toBe('20 May 2024');
  });

  it('bare ISBN with no form tokens still creates an identifier-only row', () => {
    const r = digestStatementText('line one\n978-3-16-148410-0 mentioned here\n', 'generic');
    expect(r.products).toHaveLength(1);
    expect(r.products[0].isbn).toBe('978-3-16-148410-0');
  });
});

describe('AC-IMP-6/8: inline honor line via the segment parser', () => {
  const seg = 'TB 978-3-548-29981-1\nET 12.09.2024\n362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 263,68';
  const p = parseUllsteinProductSegment(seg, '');

  it('parses units, rate, listPrice, earnings, basis (AC-IMP-6)', () => {
    expect(p.periodUnits).toBe('362');
    expect(p.rate).toBe('6');
    expect(p.listPrice).toBe('12.99');
    expect(p.earnings).toBe('263.68');
    expect(p.basis).toBe('Net List Price (NLP)');
    expect(p.basisAmount).toBe('€12.14 per copy (NLP)');
  });

  it('AC-IMP-8: TB maps to Paperback', () => {
    expect(p.form).toBe('Paperback');
    expect(p.isbn).toBe('978-3-548-29981-1');
  });

  it('earnings inference matches within 0.05 via digest calcInferences', () => {
    const r = digestStatementText('Nordlicht Verlag\n' + seg + '\n', 'generic');
    expect(r.calcInferences).toHaveLength(1);
    expect(r.calcInferences[0].status).toBe('matches');
    expect(r.calcInferences[0].reported).toBe('263.68');
  });

  it('a wrong reported amount flags review', () => {
    const bad = 'TB 978-3-548-29981-1\n362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 999,99';
    const r = digestStatementText('Nordlicht Verlag\n' + bad + '\n', 'generic');
    expect(r.calcInferences[0].status).toBe('review');
  });
});

describe('AC-IMP-11 (v1 MUST): generalized Menge Gesamt date regex', () => {
  it('parses prior units from a 2024-period segment (Hugo hardcoded 2025 and failed)', () => {
    const seg = [
      'TB 978-3-548-06612-3',
      'Honorar 5,0000 %; NLP 11,21',
      'honorarpflichtige Menge Gesamt per 01.01.2024',
      '800',
      'honorarpflichtige Menge Gesamt per 31.12.2024',
      '1.100',
    ].join('\n');
    const p = parseUllsteinProductSegment(seg, '');
    expect(p.priorUnits).toBe('800');
    expect(p.periodUnits).toBe('300'); // LTD − prior
    expect(p.rate).toBe('5');
    expect(p.basisAmount).toBe('€11.21 per copy (NLP)');
  });

  it('still parses the 2025 layouts Hugo handled', () => {
    const seg = [
      'TB 978-3-548-06612-3',
      'honorarpflichtige Menge Gesamt per 01.01.2025',
      '1.240',
      'honorarpflichtige Menge Gesamt per 31.12.2025',
      '1.602',
      '362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 263,68',
    ].join('\n');
    const p = parseUllsteinProductSegment(seg, '');
    expect(p.priorUnits).toBe('1240');
    expect(p.periodUnits).toBe('362');
  });

  it('keine honorarpflichtigen Verkäufe zeroes the row', () => {
    const seg = 'TB 978-3-548-06612-3\nkeine honorarpflichtigen Verkäufe';
    const p = parseUllsteinProductSegment(seg, '');
    expect(p.periodUnits).toBe('0');
    expect(p.earnings).toBe('0');
  });
});
