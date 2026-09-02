// PR 19: SHOULD polish — Clear-all confirm, Help focus trap presence,
// opening-balance explainer.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app/App.tsx';

afterEach(cleanup);

describe('Clear all confirm', () => {
  it('declining the confirm leaves the statement untouched', async () => {
    window.confirm = vi.fn(() => false);
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Clear all fields' }));
    expect(window.confirm).toHaveBeenCalledWith('Clear all statement fields? Custom import profiles are kept.');
    expect(screen.getByLabelText(/Statement No\./)).toHaveValue('RS-2026-0142');
  });

  it('accepting clears the fields', async () => {
    window.confirm = vi.fn(() => true);
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Clear all fields' }));
    expect(screen.getByLabelText(/Statement No\./)).toHaveValue('');
  });
});

describe('opening balance explainer', () => {
  it('shows the unearned-advance note under the Payment tab field', async () => {
    window.confirm = () => true;
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Payment' }));
    expect(screen.getByText(/part of the advance is still unearned/)).toBeInTheDocument();
  });
});

describe('Help focus trap', () => {
  it('Tab from the last focusable wraps to the first inside the dialog', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));
    const dialog = screen.getByRole('dialog', { name: 'Help Center' });
    const buttons = dialog.querySelectorAll('button');
    const last = buttons[buttons.length - 1] as HTMLElement;
    last.focus();
    await userEvent.keyboard('{Tab}');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });
});
