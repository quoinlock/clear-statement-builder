// PR 18: Help modal (AC-UX-4), About notices, version history.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app/App.tsx';
import { HELP_SECTIONS } from '../../src/ui/help/helpContent.tsx';

afterEach(cleanup);

describe('Help modal', () => {
  it('AC-UX-4: has 8 tabs; opens from the Help button; Escape closes', async () => {
    render(<App />);
    expect(HELP_SECTIONS).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));
    const dialog = screen.getByRole('dialog', { name: 'Help Center' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const nav = within(dialog).getByRole('navigation', { name: 'Help sections' });
    expect(within(nav).getAllByRole('button')).toHaveLength(8);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches sections and credits Hugo in tab 1 and tab 8', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));
    const dialog = screen.getByRole('dialog', { name: 'Help Center' });
    expect(within(dialog).getByText(/prior art: Hugo prototype v1\.7 by Sebastian Ritscher/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guides & credits' }));
    expect(within(dialog).getByText(/hugo-prototype\.netlify\.app/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Demo mode & limits' }));
    expect(within(dialog).getByText(/OS user account is the/)).toBeInTheDocument();
  });
});

describe('About and version history panels', () => {
  it('About shows the mandatory privacy and demo notices', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByText(/never uploaded/)).toBeInTheDocument();
    expect(screen.getByText(/Do not enter confidential royalty, tax, or banking information/)).toBeInTheDocument();
    expect(screen.getByText(/not a certification tool/)).toBeInTheDocument();
  });

  it('Version history lists v1.0.0 and the collapsed Hugo lineage', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Version history' }));
    expect(screen.getAllByText('v1.0.0').length).toBeGreaterThanOrEqual(1);
    const details = screen.getByText(/Hugo prototype history/).closest('details')!;
    expect(details.open).toBe(false);
    await userEvent.click(screen.getByText(/Hugo prototype history/));
    expect(screen.getByText(/Custom Import Profiles \/ Profile Builder/)).toBeInTheDocument();
  });
});
