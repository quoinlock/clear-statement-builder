// Landing page (PR 30): the static page at / that explains CLEAR before the
// user opens the builder at /builder/. Copy is prose; the tests pin the parts
// that must stay correct — entry links, catalog-derived counts, and the
// non-certification framing.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FIELD_META } from '../../src/core/catalog/fieldMeta.ts';
import { FIELD_COUNT, Landing, categoryCounts } from '../../src/landing/Landing.tsx';
import { APP_VERSION, BUILDER_URL, TAGLINE } from '../../src/ui/brand.ts';

afterEach(cleanup);

describe('landing page', () => {
  it('renders the hero with the tagline and links into the builder', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Royalty statements/);
    expect(screen.getAllByText(TAGLINE).length).toBeGreaterThan(0);
    const cta = screen.getAllByRole('link', { name: /Open the Statement Builder/ });
    expect(cta.length).toBeGreaterThanOrEqual(2);
    for (const link of cta) expect(link).toHaveAttribute('href', BUILDER_URL);
    expect(BUILDER_URL).toBe('/builder/');
    expect(screen.getByRole('link', { name: /Open the builder/ })).toHaveAttribute('href', BUILDER_URL);
  });

  it('derives the field counts from the catalog', () => {
    const counts = categoryCounts();
    expect(FIELD_COUNT).toBe(44);
    expect(counts).toEqual({ Required: 28, Recommended: 4, Conditional: 8, Remittance: 4 });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(FIELD_COUNT);
    render(<Landing />);
    for (const category of ['Required', 'Recommended', 'Conditional', 'Remittance'] as const) {
      const card = screen.getByRole('heading', { level: 3, name: category }).closest('article')!;
      expect(within(card).getByText(String(counts[category]))).toBeInTheDocument();
    }
  });

  it('decodes printed labels to real catalog codes', () => {
    render(<Landing />);
    const table = screen.getByRole('table', { name: /printed labels/ });
    expect(within(table).getByText('Vortrag lt. letzter Abrechnung')).toBeInTheDocument();
    expect(within(table).getAllByText(FIELD_META.openingBalance[0]).length).toBeGreaterThan(0);
    expect(within(table).getByText(FIELD_META.paymentDue[0])).toBeInTheDocument();
  });

  it('carries the section anchors, privacy notice, credits, and disclaimers', () => {
    render(<Landing />);
    const nav = within(screen.getByRole('navigation', { name: 'Page sections' }));
    for (const [label, href] of [
      ['What it is', '#what'],
      ['The codes', '#fields'],
      ['How it works', '#how'],
      ['Privacy', '#privacy'],
      ['The standard', '#standard'],
    ]) {
      expect(nav.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
    expect(screen.getByRole('heading', { name: 'Nothing leaves this browser.' })).toBeInTheDocument();
    expect(screen.getByText(/Sebastian Ritscher of Mohrbooks Literary Agency/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BISG Knowledge Center/ })).toHaveAttribute('href', 'https://knowledgecenter.bisg.org/226a2o7/');
    expect(screen.getByRole('link', { name: /Visit the Hugo prototype/ })).toHaveAttribute('href', 'https://hugo-prototype.netlify.app/');
    expect(screen.getAllByText(/not an official BISG product/i).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(`CLEAR Statement Builder ${APP_VERSION}`))).toBeInTheDocument();
  });
});
