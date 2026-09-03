// PR 8: data-entry forms and repeaters (F2/F3 parity).
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';
import { DEFAULT_FORMULA_NOTES } from '../../src/core/catalog/formulaNotes.ts';

afterEach(cleanup);

function renderPanels(storage = new MemoryStorage()) {
  render(
    <AppStoreProvider storage={storage}>
      <SideNav />
      <PanelHost />
    </AppStoreProvider>,
  );
  return storage;
}

describe('statement forms', () => {
  it('shows four tabs with Statement selected and its six fields', () => {
    renderPanels();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['Statement', 'Parties', 'Work', 'Payment']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Statement No\./)).toHaveValue('RS-2026-0142');
    expect(screen.getByLabelText(/Prepared By/)).toHaveValue('Dana Whitfield, Senior Royalties Manager');
  });

  it('persists every keystroke to storage (oninput parity)', async () => {
    const storage = renderPanels();
    const input = screen.getByLabelText(/Statement No\./);
    await userEvent.type(input, 'X');
    expect(JSON.parse(storage.getItem(KEYS.state)!).statementNo).toBe('RS-2026-0142X');
  });

  it('field badges show category and BISG ID for catalog keys', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('tab', { name: 'Parties' }));
    const licenseeName = screen.getByText('Licensee Name').closest<HTMLElement>('.field')!;
    expect(within(licenseeName).getByText('Required')).toBeInTheDocument();
    expect(within(licenseeName).getByText('Con1_LicName')).toBeInTheDocument();
    // Hugo-extended field: no badges.
    const phone = screen.getByText('Licensee Phone').closest<HTMLElement>('.field')!;
    expect(within(phone).queryByText(/Con\d/)).toBeNull();
  });

  it('Formula Transparency is a textarea in the Statement tab with a restore-defaults button', async () => {
    const storage = renderPanels();
    const area = screen.getByLabelText(/Formula Transparency/);
    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveValue(DEFAULT_FORMULA_NOTES);
    expect(screen.queryByRole('button', { name: 'Restore standard formulas' })).toBeNull();
    await userEvent.clear(area);
    await userEvent.type(area, 'Royalty Earnings = Units × Fee per unit');
    expect(JSON.parse(storage.getItem(KEYS.state)!).formulaNotes).toBe('Royalty Earnings = Units × Fee per unit');
    await userEvent.click(screen.getByRole('button', { name: 'Restore standard formulas' }));
    expect(area).toHaveValue(DEFAULT_FORMULA_NOTES);
    expect(screen.queryByRole('button', { name: 'Restore standard formulas' })).toBeNull();
  });

  it('Show BISG IDs toggle persists', async () => {
    const storage = renderPanels();
    await userEvent.click(screen.getByLabelText(/Show BISG field IDs/));
    expect(storage.getItem(KEYS.showIds)).toBe('true');
  });
});

describe('repeaters', () => {
  it('renders sample product rows as cards with Row N heads', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('button', { name: /^Products/ }));
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 4')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(4);
  });

  it('Add product row appends the parity zero-defaults row', async () => {
    const storage = renderPanels();
    await userEvent.click(screen.getByRole('button', { name: /^Products/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add product row' }));
    const products = JSON.parse(storage.getItem(KEYS.products)!);
    expect(products).toHaveLength(5);
    expect(products[4]).toEqual({
      form: '',
      isbn: '',
      pubDate: '',
      listPrice: '0',
      basis: '',
      rate: '0',
      priorUnits: '0',
      periodUnits: '0',
      basisAmount: '',
      earnings: '0',
    });
  });

  it('deleting all rows is allowed (zero rows)', async () => {
    const storage = renderPanels();
    await userEvent.click(screen.getByRole('button', { name: /^Sublicenses/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(JSON.parse(storage.getItem(KEYS.sublicenses)!)).toEqual([]);
    expect(screen.queryByText('Row 1')).toBeNull();
  });

  it('editing a repeater cell persists', async () => {
    const storage = renderPanels();
    await userEvent.click(screen.getByRole('button', { name: /^Reserves/ }));
    const row1 = screen.getByText('Row 1').closest('.row-card')!;
    const withheld = within(row1 as HTMLElement).getByLabelText(/Reserve Withheld/);
    await userEvent.clear(withheld);
    await userEvent.type(withheld, '99.00');
    expect(JSON.parse(storage.getItem(KEYS.reserves)!)[0].withheld).toBe('99.00');
  });
});
