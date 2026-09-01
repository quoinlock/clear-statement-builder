// PR 9: A4 preview (F4). AC-UX-1 (two .page nodes), AC-UX-3 (Show IDs
// reveals Con61_SalesTerr and SS92_PayDue), non-certification subtitle,
// remit-ID template, negative-money reserve line, XSS-safe text rendering
// (AC-SEC-2), and the sample vs user-data note variants.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { Preview } from '../../src/ui/preview/Preview.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';
import { cloneSampleDocument, sample } from '../../src/core/sample/index.ts';

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
    expect(screen.getByText(/This fictional sample was generated with Clear Statement Builder/)).toBeInTheDocument();
    cleanup();
    renderPreview(storageWith(ws => (ws.state.licenseeName = 'Real Verlag GmbH')));
    expect(screen.getByText(/^Generated with Clear Statement Builder\./)).toBeInTheDocument();
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
    expect(view.container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('<img src=x onerror=alert(1)>').length).toBeGreaterThan(0);
  });

  it('statement notes render as list items from non-empty lines', () => {
    renderPreview();
    const items = sample.statementNotes.split('\n').filter(Boolean);
    for (const item of items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('advance amount renders without euro prefix', () => {
    renderPreview();
    const advance = screen.getByText('Advance Amount:').closest('.line')!;
    expect(advance.textContent).toContain('8,000.00');
    expect(advance.textContent).not.toContain('$8,000.00');
  });
});
