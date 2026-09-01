// PR 10: validation and review panels (F5/F8).
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';
import { cloneSampleDocument } from '../../src/core/sample/index.ts';

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

describe('validation panel', () => {
  it('sample data shows 100% with green states and the legend', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('button', { name: 'Validation' }));
    expect(screen.getByText('100% required complete')).toBeInTheDocument();
    expect(screen.getByText('Required fields complete')).toBeInTheDocument();
    expect(screen.getByText('No calculation warnings')).toBeInTheDocument();
    expect(screen.getByText('Legend')).toBeInTheDocument();
  });

  it('missing required field surfaces with its BISG ID; calc warning shows detail', async () => {
    renderPanels(
      storageWith(ws => {
        ws.state.licenseeName = '';
        ws.products[0].earnings = '800';
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Validation' }));
    expect(screen.getByText('Licensee name')).toBeInTheDocument();
    expect(screen.getByText(/Con1_LicName —/)).toBeInTheDocument();
    expect(screen.getByText('Product 1 royalty earnings')).toBeInTheDocument();
    expect(screen.getByText(/Expected approximately \$864\.00/)).toBeInTheDocument();
  });
});

describe('review panel', () => {
  it('shows the overall score, high band copy, category cards, and disclaimer', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('button', { name: 'Review my statement' }));
    expect(screen.getByText(/Overall score:/)).toBeInTheDocument();
    expect(screen.getByText(/Strong BISG alignment/)).toBeInTheDocument();
    expect(screen.getByText('Contract information')).toBeInTheDocument();
    expect(screen.getByText(/automated standards-completeness review/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export review JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export review CSV' })).toBeInTheDocument();
  });

  it('missing high-priority fields appear as top recommendations', async () => {
    renderPanels(
      storageWith(ws => {
        ws.state.openingBalance = '';
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Review my statement' }));
    expect(screen.getByText('Opening balance')).toBeInTheDocument();
    expect(screen.getByText(/Label the opening balance/)).toBeInTheDocument();
  });
});
