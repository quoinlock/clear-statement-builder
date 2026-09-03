// Shell chrome smoke tests (PR 7, relaid out in PR 24 "layout A"): app bar,
// grouped nav, default section (AC-UX-2), Clear all / Load sample behavior
// against a memory storage.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AppBar } from '../../src/ui/app/AppBar.tsx';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider, SECTIONS } from '../../src/ui/app/store.tsx';
import { NAV_FOOTER, NAV_GROUPS } from '../../src/ui/app/SideNav.tsx';
import { MemoryStorage, KEYS } from '../../src/core/persist/index.ts';
import { sample, sampleProducts } from '../../src/core/sample/index.ts';

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
  it('renders the title, version badge, primary actions, and completeness meter', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 1, name: 'CLEAR Statement Builder' })).toBeInTheDocument();
    expect(screen.getByText('v2.2.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CLEAR' })).toHaveAttribute('href', '/');
    const bar = within(screen.getByRole('banner'));
    for (const label of ['Import', 'Review', 'Export', 'Print', 'More actions']) {
      expect(bar.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completeness \d+%, open validation/ })).toBeInTheDocument();
  });

  it('Export and More menus hold the secondary actions', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByRole('menuitem', { name: 'Export JSON' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Export CSV' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Load sample' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Clear all fields' })).toBeInTheDocument();
  });

  it('completeness meter jumps to Validation', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: /Completeness/ }));
    expect(screen.getByRole('region', { name: 'Validation' })).toBeInTheDocument();
  });

  it('renders the CLEAR logo and tagline (brand)', () => {
    renderShell();
    const logo = screen.getByRole('img', { name: 'CLEAR' });
    expect(logo).toHaveAttribute('src', '/brand/clear-logo.png');
    expect(screen.getByText('The Common Licensing & Earnings Accounting Report Standard')).toBeInTheDocument();
  });

  it('renders all ten sections, grouped Build / Check / Import with a footer', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const entries = [...NAV_GROUPS.flatMap(g => g.entries), ...NAV_FOOTER];
    expect([...entries.map(e => e.section)].sort()).toEqual([...SECTIONS].sort());
    const labels = within(nav)
      .getAllByRole('button')
      .map(b => b.querySelector('.nav-label')?.textContent ?? b.textContent);
    expect(labels).toEqual([...entries.map(e => e.label), 'Help']);
    expect(within(nav).getByText('Build')).toBeInTheDocument();
    expect(within(nav).getByText('Check')).toBeInTheDocument();
    expect(within(nav).getByText('Import')).toBeInTheDocument();
  });

  it('repeater sections show row counts', () => {
    renderShell();
    const products = screen.getByRole('button', { name: /^Products/ });
    expect(within(products).getByLabelText(/rows$/)).toHaveTextContent(String(sampleProducts.length));
  });

  it('AC-UX-2: default nav is Statement data', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const active = within(nav)
      .getAllByRole('button')
      .find(b => b.getAttribute('aria-current') === 'page');
    expect(active?.querySelector('.nav-label')?.textContent).toBe('Statement');
  });

  it('nav switches the hosted panel', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Validation' }));
    expect(screen.getByRole('region', { name: 'Validation' })).toBeInTheDocument();
  });

  it('Clear all wipes statement storage keys and returns to Statement data', async () => {
    // PR 19 added the confirm dialog (SHOULD); accept it.
    window.confirm = () => true;
    const storage = renderShell();
    storage.setItem(KEYS.customImportProfiles, '[]');
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Load sample' }));
    expect(storage.getItem(KEYS.state)).toContain(sample.licenseeName);
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Clear all fields' }));
    expect(storage.getItem(KEYS.state)).toBeNull();
    // Profiles key survives.
    expect(storage.getItem(KEYS.customImportProfiles)).toBe('[]');
  });
});
