import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNavigation } from './app-navigation';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/insights/individual',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
}));

vi.mock('./logout-button', () => ({
  LogoutButton: ({ className }: { className?: string }) => (
    <button className={className} type="button">
      Log Out
    </button>
  ),
}));

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
});

describe('AppNavigation', () => {
  it('uses one route source for desktop current-page state and mobile primary navigation', () => {
    render(<AppNavigation hasActiveGroup />);

    const desktop = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(
      within(desktop).getByRole('link', { name: /individual insights/i }),
    ).toHaveAttribute('aria-current', 'page');

    const mobile = screen.getByRole('navigation', { name: /bottom navigation/i });
    expect(within(mobile).getByRole('link', { name: /^insights$/i })).toBeInTheDocument();
    expect(within(mobile).getByRole('link', { name: /^compare$/i })).toBeInTheDocument();
  });

  it('moves focus into More, closes on Escape, and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    render(<AppNavigation hasActiveGroup />);

    const mobile = screen.getByRole('navigation', { name: /bottom navigation/i });
    const trigger = within(mobile).getByRole('button', { name: /more/i });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /more navigation/i });
    const close = within(dialog).getByRole('button', { name: /close menu/i });
    expect(dialog).toHaveAttribute('open');
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
  });

  it('does not expose group destinations when the server filtered them out', () => {
    render(<AppNavigation hasActiveGroup={false} />);

    expect(screen.queryByRole('navigation', { name: /primary navigation/i })).not.toHaveTextContent(
      /log a game/i,
    );
    const more = document.querySelector('dialog');
    expect(more).not.toBeNull();
    expect(
      within(more!).getByRole('link', { hidden: true, name: /glossary/i }),
    ).toBeInTheDocument();
    expect(
      within(more!).queryByRole('link', { hidden: true, name: /cards/i }),
    ).not.toBeInTheDocument();
  });
});
