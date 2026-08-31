// Shell chrome smoke tests (PR 7): app bar, nav order, default section
// (AC-UX-2), Clear all / Load sample behavior against a memory storage.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AppBar } from '../../src/ui/app/AppBar.tsx';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider, SECTIONS } from '../../src/ui/app/store.tsx';
import { MemoryStorage, KEYS } from '../../src/core/persist/index.ts';
import { sample } from '../../src/core/sample/index.ts';

afterEach(cleanup);

function renderShell(storage = new MemoryStorage()) {
  render(
    <AppStoreProvider storage={storage}>
      <AppBar />
      <div>
        <SideNav />
        <PanelHost />
      </div>
    </AppStoreProvider>,
  );
  return storage;
}

describe('shell chrome', () => {
  it('renders the title, version badge, and all eight app-bar buttons', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 1, name: 'Clear Statement Builder' })).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    for (const label of ['Clear all fields', 'Load sample', 'Export JSON', 'Export CSV', 'Import', 'Review', 'Help', 'Print']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the ten nav items in parity order', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const items = within(nav).getAllByRole('button');
    expect(items.map(b => b.textContent)).toEqual([...SECTIONS]);
  });

  it('AC-UX-2: default nav is Statement data', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const active = within(nav)
      .getAllByRole('button')
      .find(b => b.getAttribute('aria-current') === 'page');
    expect(active?.textContent).toBe('Statement data');
  });

  it('nav switches the hosted panel', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Validation' }));
    expect(screen.getByRole('region', { name: 'Validation' })).toBeInTheDocument();
  });

  it('Clear all wipes statement storage keys and returns to Statement data', async () => {
    const storage = renderShell();
    storage.setItem(KEYS.customImportProfiles, '[]');
    await userEvent.click(screen.getByRole('button', { name: 'Load sample' }));
    expect(storage.getItem(KEYS.state)).toContain(sample.licenseeName);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all fields' }));
    expect(storage.getItem(KEYS.state)).toBeNull();
    // Profiles key survives.
    expect(storage.getItem(KEYS.customImportProfiles)).toBe('[]');
  });
});
