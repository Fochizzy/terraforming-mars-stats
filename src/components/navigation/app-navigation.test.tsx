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
  it('renders every primary destination in the one row used at every viewport width', () => {
    render(<AppNavigation hasActiveGroup />);

    const primary = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(
      within(primary).getByRole('link', { name: /individual insights/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(within(primary).getByRole('link', { name: /^compare$/i })).toBeInTheDocument();
    expect(within(primary).getByRole('link', { name: /log a game/i })).toHaveAttribute(
      'data-highlighted',
      'true',
    );
  });

  it('does not duplicate aria-current across two different destinations for one route', () => {
    render(<AppNavigation hasActiveGroup />);

    const currentLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toHaveTextContent(/individual insights/i);
  });

  it('opens the Menu overflow, moves focus in, closes on Escape, and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    render(<AppNavigation hasActiveGroup />);

    const trigger = screen.getByRole('button', { name: /^menu$/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: /^menu$/i });
    const close = within(dialog).getByRole('button', { name: /close menu/i });
    expect(dialog).toHaveAttribute('open');
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
  });

  it('closes the Menu overflow on route selection', async () => {
    const user = userEvent.setup();
    render(<AppNavigation hasActiveGroup />);

    const trigger = screen.getByRole('button', { name: /^menu$/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /^menu$/i });
    const glossaryLink = within(dialog).getByRole('link', { name: /glossary/i });

    await user.click(glossaryLink);
    expect(dialog).not.toHaveAttribute('open');
  });

  it('does not expose group destinations when the server filtered them out', () => {
    render(<AppNavigation hasActiveGroup={false} />);

    expect(screen.queryByRole('navigation', { name: /primary navigation/i })).not.toHaveTextContent(
      /log a game/i,
    );
    const menu = document.querySelector('dialog');
    expect(menu).not.toBeNull();
    expect(
      within(menu!).getByRole('link', { hidden: true, name: /glossary/i }),
    ).toBeInTheDocument();
    expect(
      within(menu!).queryByRole('link', { hidden: true, name: /cards/i }),
    ).not.toBeInTheDocument();
  });
});
