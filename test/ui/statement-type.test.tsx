// v2 statement-type toggle: app-bar segmented control, persisted mode,
// disabled translation-only fields (values kept), and the standard-mode
// preview header/lines.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AppBar } from '../../src/ui/app/AppBar.tsx';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { Preview } from '../../src/ui/preview/Preview.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';

afterEach(cleanup);

function standardStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(KEYS.statementType, JSON.stringify('standard'));
  return storage;
}

function renderApp(storage = new MemoryStorage()) {
  render(
    <AppStoreProvider storage={storage}>
      <AppBar />
      <SideNav />
      <PanelHost />
    </AppStoreProvider>,
  );
  return storage;
}

describe('statement-type toggle', () => {
  it('first visit defaults to Standard (US sample) and persists switching to Translation', async () => {
    const storage = renderApp();
    const standardBtn = screen.getByRole('button', { name: 'Standard' });
    const translationBtn = screen.getByRole('button', { name: 'Translation' });
    expect(standardBtn).toHaveAttribute('aria-pressed', 'true');
    expect(translationBtn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(translationBtn);
    expect(translationBtn).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(storage.getItem(KEYS.statementType)!)).toBe('translation');
  });

  it('disables the translation-only Work fields but keeps their values', async () => {
    renderApp(standardStorage());
    await userEvent.click(screen.getByRole('tab', { name: 'Work' }));
    const language = screen.getByLabelText(/Language of Licensee Work/);
    expect(language).toBeDisabled();
    expect(language).toHaveValue('English'); // sample value kept, not cleared
    expect(screen.getByLabelText(/Sales Territory/)).toBeDisabled();
    expect(screen.getByLabelText(/Advance Currency/)).toBeDisabled();
    // licensorTitle is relabeled, enabled, and still holds the sample title.
    expect(screen.queryByLabelText(/Licensor Title of Work/)).toBeNull();
    expect(screen.getByLabelText(/^Title of Work/)).toBeEnabled();
    expect(screen.getAllByText(/Not applicable to standard statements/).length).toBeGreaterThan(0);
  });

  it('re-enables the fields when switching back to Translation', async () => {
    renderApp(standardStorage());
    await userEvent.click(screen.getByRole('button', { name: 'Translation' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Work' }));
    expect(screen.getByLabelText(/Language of Licensee Work/)).toBeEnabled();
    expect(screen.getByLabelText(/Language of Licensee Work/)).toHaveValue('English');
  });
});

describe('standard-mode preview', () => {
  function renderPreview(storage: MemoryStorage) {
    return render(
      <AppStoreProvider storage={storage}>
        <Preview />
      </AppStoreProvider>,
    );
  }

  it('retitles both pages and hides the translation-only lines', () => {
    renderPreview(standardStorage());
    expect(screen.getAllByRole('heading', { level: 1, name: 'Royalty Statement' })).toHaveLength(2);
    expect(screen.getAllByText('BISG-aligned royalty statement — not a certification')).toHaveLength(2);
    expect(screen.queryByText('Language:')).toBeNull();
    expect(screen.queryByText('Sales Territory:')).toBeNull();
    expect(screen.queryByText('Advance Currency:')).toBeNull();
    expect(screen.queryByText('Licensee Title of Work:')).toBeNull();
    expect(screen.queryByText(/Co-Agent Commission/)).toBeNull();
    expect(screen.getByText('Title of Work:')).toBeInTheDocument();
  });

  it('keeps the translation header and lines in translation mode', () => {
    const storage = new MemoryStorage();
    storage.setItem(KEYS.statementType, JSON.stringify('translation'));
    renderPreview(storage);
    expect(screen.getAllByRole('heading', { level: 1, name: 'Translation Rights Royalty Statement' })).toHaveLength(2);
    expect(screen.getByText('Language:')).toBeInTheDocument();
    expect(screen.getByText('Licensor Title of Work:')).toBeInTheDocument();
  });
});
