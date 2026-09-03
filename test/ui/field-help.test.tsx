// Field-help dialog: every data-entry label opens an explanation with a
// TRRSS section and a plain-meaning section; the catalog covers every form
// field and repeater column.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PanelHost } from '../../src/ui/app/PanelHost.tsx';
import { SideNav } from '../../src/ui/app/SideNav.tsx';
import { AppStoreProvider } from '../../src/ui/app/store.tsx';
import { FieldHelpModal } from '../../src/ui/statement/FieldHelp.tsx';
import { MemoryStorage } from '../../src/core/persist/index.ts';
import { FIELD_HELP, FIELD_HELP_KEYS, fieldHelp, repeaterHelpKey } from '../../src/core/catalog/fieldHelp.ts';
import { GROUPS, PRODUCT_KEYS, RESERVE_KEYS, SUBLICENSE_KEYS, STATEMENT_STATE_KEYS } from '../../src/core/catalog/groups.ts';

afterEach(cleanup);

function renderApp() {
  render(
    <AppStoreProvider storage={new MemoryStorage()}>
      <SideNav />
      <PanelHost />
      <FieldHelpModal />
    </AppStoreProvider>,
  );
}

describe('field help catalog', () => {
  it('covers every statement field, every form group, and every repeater column', () => {
    for (const key of STATEMENT_STATE_KEYS) expect(fieldHelp(key), key).toBeDefined();
    for (const group of Object.values(GROUPS)) for (const f of group) expect(fieldHelp(f.key), f.key).toBeDefined();
    for (const k of PRODUCT_KEYS) expect(fieldHelp(repeaterHelpKey('product', k)), k).toBeDefined();
    for (const k of RESERVE_KEYS) expect(fieldHelp(repeaterHelpKey('reserve', k)), k).toBeDefined();
    for (const k of SUBLICENSE_KEYS) expect(fieldHelp(repeaterHelpKey('sublicense', k)), k).toBeDefined();
  });

  it('every entry has non-trivial standard and plain text', () => {
    for (const key of FIELD_HELP_KEYS) {
      const { standard, plain } = FIELD_HELP[key];
      expect(standard.length, `${key}.standard`).toBeGreaterThan(40);
      expect(plain.length, `${key}.plain`).toBeGreaterThan(40);
    }
  });

  it('numbered TRRSS fields cite their BISG ID; extended fields say they are not numbered', () => {
    expect(FIELD_HELP.statementDate.standard).toContain('SS2_RoyStmntDate');
    expect(FIELD_HELP['product.isbn'].standard).toContain('SS27_LicProdIdentifier');
    expect(FIELD_HELP.statementNo.standard).toMatch(/Not a numbered TRRSS field/);
    expect(FIELD_HELP.preparedBy.standard).toMatch(/Not a numbered TRRSS field/);
  });
});

describe('field help dialog', () => {
  it('opens from a statement label with both sections and the badges, and closes on Escape', async () => {
    renderApp();
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Statement No.' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Statement No.');
    expect(within(dialog).getByRole('heading', { name: 'In the BISG standard (TRRSS)' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'What it means for publishers' })).toBeInTheDocument();
    expect(within(dialog).getByText(FIELD_HELP.statementNo.plain)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the BISG badges for catalog fields and the standard text for the field', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: 'Royalty Statement Date' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('SS2_RoyStmntDate')).toBeInTheDocument();
    expect(within(dialog).getByText('Required')).toBeInTheDocument();
    expect(within(dialog).getByText(FIELD_HELP.statementDate.standard)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('inputs stay associated with their label text after the label became a button', () => {
    renderApp();
    expect(screen.getByLabelText(/Statement No\./)).toHaveValue('RS-2026-0142');
    expect(screen.getByLabelText(/Prepared By/)).toHaveValue('Dana Whitfield, Senior Royalties Manager');
  });

  it('repeater columns open namespaced help (product vs reserve "Product Form Detail")', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /^Products/ }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Product Form Detail' })[0]);
    expect(within(screen.getByRole('dialog')).getByText(FIELD_HELP['product.form'].plain)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: /^Reserves/ }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Product Form Detail' })[0]);
    expect(within(screen.getByRole('dialog')).getByText(FIELD_HELP['reserve.form'].plain)).toBeInTheDocument();
  });

  it('uses the statement-type label override in the dialog title', async () => {
    renderApp();
    // Fresh storage defaults to a standard statement, where Con46 is "Title of Work".
    await userEvent.click(screen.getByRole('tab', { name: 'Work' }));
    expect(screen.queryByRole('button', { name: 'Licensor Title of Work' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Title of Work' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Title of Work');
    expect(within(screen.getByRole('dialog')).getByText('Con46_LicensorWorkTitle')).toBeInTheDocument();
  });
});
