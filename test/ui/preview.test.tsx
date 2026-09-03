// PR 9: A4 preview (F4). AC-UX-1 (two .page nodes), AC-UX-3 (Show IDs
// reveals Con61_SalesTerr and SS92_PayDue), non-certification subtitle,
// remit-ID template, negative-money reserve line, XSS-safe text rendering
// (AC-SEC-2), and the sample vs user-data note variants.
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { Preview } from '../../src/ui/preview/Preview.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';
import { cloneSampleDocument, sample } from '../../src/core/sample/index.ts';
import { DEFAULT_FORMULA_NOTES } from '../../src/core/catalog/formulaNotes.ts';

afterEach(cleanup);

function renderPreview(storage = new MemoryStorage()) {
  const view = render(
    <AppStoreProvider storage={storage}>
      <Preview />
    </AppStoreProvider>,
  );
  return { storage, view };
}

function storageWith(mutate: (ws: ReturnType<typeof cloneSampleDocument>) => void): MemoryStorage {
  const storage = new MemoryStorage();
  const ws = cloneSampleDocument();
  mutate(ws);
  storage.setItem(KEYS.state, JSON.stringify(ws.state));
  storage.setItem(KEYS.products, JSON.stringify(ws.products));
  storage.setItem(KEYS.reserves, JSON.stringify(ws.reserves));
  storage.setItem(KEYS.sublicenses, JSON.stringify(ws.sublicenses));
  return storage;
}

/** Seed translation mode (the sample first-visit default is standard in v2). */
function translationMode(storage = new MemoryStorage()): MemoryStorage {
  storage.setItem(KEYS.statementType, JSON.stringify('translation'));
  return storage;
}

describe('A4 preview', () => {
  it('AC-UX-1: renders exactly two .page nodes', () => {
    const { view } = renderPreview();
    expect(view.container.querySelectorAll('.page')).toHaveLength(2);
  });

  it('shows the non-certification teal subtitle, never the Hugo compliance copy', () => {
    renderPreview(translationMode());
    expect(
      screen.getAllByText('BISG-aligned translation-rights royalty statement — not a certification'),
    ).toHaveLength(2);
    expect(screen.queryByText(/BISG-compliant publisher royalty statement/)).toBeNull();
  });

  it('AC-UX-3: Show IDs reveals Con61_SalesTerr and SS92_PayDue', () => {
    const off = renderPreview(translationMode());
    expect(screen.queryByText('Con61_SalesTerr')).toBeNull();
    off.view.unmount();
    const storage = translationMode(storageWith(() => {}));
    storage.setItem(KEYS.showIds, 'true');
    renderPreview(storage);
    expect(screen.getByText('Con61_SalesTerr')).toBeInTheDocument();
    expect(screen.getByText('SS92_PayDue')).toBeInTheDocument();
  });

  it('sample data shows the sample explanatory note; edited data switches variants', () => {
    renderPreview();
    expect(screen.getByText(/This fictional sample was generated with CLEAR Statement Builder/)).toBeInTheDocument();
    cleanup();
    renderPreview(storageWith(ws => (ws.state.licenseeName = 'Real Verlag GmbH')));
    expect(screen.getByText(/^Generated with CLEAR Statement Builder\./)).toBeInTheDocument();
  });

  it('renders the pinned totals: Total Royalty $5,214.00, Payment Due $3,222.60', () => {
    renderPreview();
    expect(screen.getByText(/Total Royalty Earnings: \$5,214\.00/)).toBeInTheDocument();
    // In standard mode (sample default) net remitted equals payment due, so
    // scope the amount to the Payment Due row.
    const paymentRow = screen.getByText('Payment Due (EARNED)').closest('tr')!;
    expect(paymentRow.textContent).toContain('$3,222.60');
  });

  it('reserve withheld shows as negative money; reserve total row uses state totals', () => {
    // Make row sums differ from state so the total row provably uses state.
    const storage = storageWith(ws => {
      ws.reserves = [{ form: 'Hardcover', rate: '10%', withheld: '1.00', released: '1.00' }];
    });
    renderPreview(storage);
    expect(screen.getByText('-$236.40')).toBeInTheDocument(); // balance line, negative money
    const totalRow = screen.getByText('Total').closest('tr')!;
    expect(totalRow.textContent).toContain('$236.40');
    expect(totalRow.textContent).toContain('$95.00');
  });

  it('remit ID drops the ISNI parenthetical from contributor names', () => {
    renderPreview();
    const remitLine = screen.getByText('Remit ID Information:').closest('.line')!;
    expect(remitLine.textContent).toContain('BQA-US-4471 | Amelia Hart |');
    expect(remitLine.textContent).not.toContain('ISNI');
  });

  it('payer column is always rendered even when payer fields are empty', () => {
    renderPreview(
      storageWith(ws => {
        ws.state.payerName = '';
        ws.state.payerAddress = '';
      }),
    );
    expect(screen.getByText('▣ Payer (if different from Licensee)')).toBeInTheDocument();
  });

  it('AC-SEC-2: markup in licensee name renders as text, not HTML', () => {
    const { view } = renderPreview(
      storageWith(ws => {
        ws.state.licenseeName = '<img src=x onerror=alert(1)>';
      }),
    );
    // The only images are the two static brand logos in the page footers.
    const imgs = [...view.container.querySelectorAll('img')];
    expect(imgs.map(i => i.getAttribute('src'))).toEqual(['/brand/clear-logo.png', '/brand/clear-logo.png']);
    expect(screen.getAllByText('<img src=x onerror=alert(1)>').length).toBeGreaterThan(0);
  });

  it('statement notes render as list items from non-empty lines', () => {
    renderPreview();
    const items = sample.statementNotes.split('\n').filter(Boolean);
    for (const item of items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  describe('Formula Transparency (v2.3, configurable)', () => {
    it('renders the four standard bullets by default, formulas in the monospace style', () => {
      const { view } = renderPreview();
      const section = view.container.querySelector('.formula-notes')!;
      expect(section).not.toBeNull();
      const items = [...section.querySelectorAll('li')].map(li => li.textContent);
      expect(items).toEqual(DEFAULT_FORMULA_NOTES.split('\n'));
      expect(section.querySelectorAll('li .formula')).toHaveLength(3);
    });

    it('renders custom lines from state.formulaNotes, prose lines without the formula style', () => {
      const storage = storageWith(ws => {
        ws.state.formulaNotes = 'Royalty Earnings = Period Units × Fee per unit\n\nRates escalate at 5,000 units.\n';
      });
      const { view } = renderPreview(storage);
      const section = view.container.querySelector('.formula-notes')!;
      const items = [...section.querySelectorAll('li')];
      expect(items.map(li => li.textContent)).toEqual([
        'Royalty Earnings = Period Units × Fee per unit',
        'Rates escalate at 5,000 units.',
      ]);
      expect(items[0].querySelector('.formula')).not.toBeNull();
      expect(items[1].querySelector('.formula')).toBeNull();
      expect(screen.queryByText('Life to Date Units = Prior Units + Period Units')).toBeNull();
    });

    it('omits the section when the field is blank', () => {
      const { view } = renderPreview(storageWith(ws => void (ws.state.formulaNotes = '  \n')));
      expect(view.container.querySelector('.formula-notes')).toBeNull();
      expect(screen.queryByText('Formula Transparency')).toBeNull();
    });

    it('a stored workspace saved before v2.3 (no formulaNotes key) shows the defaults', () => {
      const storage = storageWith(ws => {
        delete (ws.state as Partial<typeof ws.state>).formulaNotes;
      });
      const { view } = renderPreview(storage);
      expect(view.container.querySelectorAll('.formula-notes li')).toHaveLength(4);
    });
  });

  it('advance amount renders without euro prefix', () => {
    renderPreview();
    const advance = screen.getByText('Advance Amount:').closest('.line')!;
    expect(advance.textContent).toContain('8,000.00');
    expect(advance.textContent).not.toContain('$8,000.00');
  });

  it('page footers carry the CLEAR brand line, standard name, and tagline', () => {
    const { view } = renderPreview();
    const logos = screen.getAllByRole('img', { name: 'CLEAR' });
    expect(logos).toHaveLength(2);
    expect(logos[0]).toHaveAttribute('src', '/brand/clear-logo.png');
    expect(screen.getAllByText('This is a CLEAR Statement')).toHaveLength(2);
    const lines = [...view.container.querySelectorAll('.footer-brand-line')].map(el => el.textContent);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatch(/^This is a CLEAR Statement — prepared in accordance with the BISG (Translation Rights )?Royalty Statement Standard\.$/);
    }
    expect(screen.getAllByText('The Common Licensing & Earnings Accounting Report Standard')).toHaveLength(2);
  });
});

// Fit-to-width regression: the ResizeObserver must measure the un-zoomed
// viewport wrapper, not the element that carries CSS zoom. WebKit reports a
// zoomed element's contentRect in its own zoomed space, so observing it made
// the preview oscillate ("shaking") on iPhone.
describe('fit zoom measurement', () => {
  it('observes the un-zoomed wrapper and scales pages from its width', () => {
    const observed: Element[] = [];
    let fire: ((width: number) => void) | undefined;
    class FakeResizeObserver {
      constructor(cb: (entries: { contentRect: { width: number } }[]) => void) {
        fire = (width: number) => cb([{ contentRect: { width } }]);
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
    }
    const prev = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
    try {
      const { view } = renderPreview();
      const viewport = view.container.querySelector('.preview-viewport') as HTMLElement;
      const pages = view.container.querySelector('.preview-pages') as HTMLElement;
      expect(observed).toEqual([viewport]);
      expect(observed).not.toContain(pages);
      act(() => fire?.(397));
      expect(pages.style.zoom).toBe('0.5');
      expect(viewport.getAttribute('style')).toBeNull();
      act(() => fire?.(2000));
      expect(pages.style.zoom).toBe('1');
    } finally {
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = prev;
    }
  });
});
