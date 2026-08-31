// PR 15: import panel flow — digest pasted text, review pane, refuse bulk
// apply on multi-contract, per-contract apply, manual mapping (UI half of
// AC-IMP-4/5/10/15).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ImportPanel } from '../../src/ui/import/ImportPanel.tsx';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { KEYS, MemoryStorage } from '../../src/core/persist/index.ts';

afterEach(cleanup);

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'ullstein');
const twoContractsText = readFileSync(join(FIX, 'two-contracts.txt'), 'utf8');

function renderPanel(storage = new MemoryStorage()) {
  render(
    <AppStoreProvider storage={storage}>
      <ImportPanel />
    </AppStoreProvider>,
  );
  return storage;
}

async function digestFixture() {
  await userEvent.click(screen.getByLabelText(/Or paste statement text/));
  await userEvent.paste(twoContractsText);
  await userEvent.click(screen.getByRole('button', { name: 'Digest pasted text' }));
}

describe('import panel', () => {
  it('starts empty with the review-before-apply framing', () => {
    renderPanel();
    expect(screen.getByText('No statement imported yet.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Import profile/)).toHaveValue('auto');
  });

  it('digesting the Ullstein fixture shows pills, contract table, fields, and products', async () => {
    renderPanel();
    await digestFixture();
    expect(screen.getByText('Text/PDF heuristic digest')).toBeInTheDocument();
    expect(screen.getByText('Profile: ullstein')).toBeInTheDocument();
    expect(screen.getByText('Review before applying')).toBeInTheDocument();
    expect(screen.getByText('Detected separate contract statements')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Apply this statement' })).toHaveLength(2);
    // 401877 appears in the contract table and again as licenseeContractId
    // in the detected-fields table.
    expect(screen.getAllByText('401877').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('401912')).toBeInTheDocument();
  });

  it('bulk Apply refuses on two contracts and leaves state untouched', async () => {
    const storage = renderPanel();
    await digestFixture();
    const before = storage.getItem(KEYS.state);
    await userEvent.click(screen.getByRole('button', { name: 'Apply to statement' }));
    expect(screen.getByRole('status').textContent).toContain('Multiple contract statements detected');
    expect(storage.getItem(KEYS.state)).toBe(before);
  });

  it('per-contract Apply copies that contract into the workspace', async () => {
    const storage = renderPanel();
    await digestFixture();
    await userEvent.click(screen.getAllByRole('button', { name: 'Apply this statement' })[0]);
    const state = JSON.parse(storage.getItem(KEYS.state)!);
    expect(state.licenseeContractId).toBe('401877');
    expect(state.contributorNames).toBe('Hart, Amelia');
    const products = JSON.parse(storage.getItem(KEYS.products)!);
    expect(products).toHaveLength(1);
    expect(products[0].isbn).toBe('978-3-548-06612-3');
    expect(screen.getByRole('status').textContent).toContain('Contract 401877');
  });

  it('manual mapping applies Low confidence and removes the line', async () => {
    renderPanel();
    await userEvent.click(screen.getByLabelText(/Or paste statement text/));
    await userEvent.paste('A very important custom payment reference\n');
    await userEvent.click(screen.getByRole('button', { name: 'Digest pasted text' }));
    const lineSelect = screen.getByLabelText(/Unmapped line/);
    expect(lineSelect).toHaveTextContent('A very important custom payment reference');
    await userEvent.selectOptions(screen.getByLabelText(/Map to field/), 'accountReference');
    await userEvent.click(screen.getByRole('button', { name: 'Map selected line' }));
    const row = screen.getByText('accountReference').closest('tr')!;
    expect(row.textContent).toContain('A very important custom payment reference');
    expect(row.textContent).toContain('Low');
    expect(screen.queryByLabelText(/Unmapped line/)).toBeNull();
  });

  it('Clear import empties the result pane', async () => {
    renderPanel();
    await digestFixture();
    await userEvent.click(screen.getByRole('button', { name: 'Clear import' }));
    expect(screen.getByText('No statement imported yet.')).toBeInTheDocument();
  });
});
