import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile',
}));

describe('AppShell', () => {
  it('renders the banner and the one centralized navigation source used at every viewport width', () => {
    const { container } = render(
      <AppShell hasActiveGroup title="My Profile">
        content
      </AppShell>,
    );

    expect(
      screen.getByRole('img', { name: /terraforming mars statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^games$/i })).toHaveAttribute(
      'href',
      '/games',
    );
    expect(screen.getAllByRole('button', { name: /log out/i }).length).toBeGreaterThan(0);

    const primaryNavigation = screen.getByRole('navigation', {
      name: /primary navigation/i,
    });
    expect(
      within(primaryNavigation).getByRole('link', { name: /log a game/i }),
    ).toHaveAttribute('data-highlighted', 'true');
    expect(
      within(primaryNavigation).getByRole('link', { name: /my profile/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(primaryNavigation).getByRole('link', { name: /individual insights/i }),
    ).toHaveAttribute('href', '/insights/individual');
    expect(
      within(primaryNavigation).getByRole('link', { name: /group insights/i }),
    ).toHaveAttribute('href', '/insights/group');
    expect(
      within(primaryNavigation).getByRole('link', { name: /global insights/i }),
    ).toHaveAttribute('href', '/insights/global');
    expect(
      within(primaryNavigation).getByRole('link', { name: /leaderboard/i }),
    ).toHaveAttribute('href', '/leaderboard');
    expect(
      within(primaryNavigation).getByRole('link', { name: /^compare$/i }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole('link', { name: /improvement/i }),
    ).toBeInTheDocument();

    const menuTrigger = screen.getByRole('button', { name: /^menu$/i });
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(menuTrigger).toHaveAttribute('aria-haspopup', 'dialog');

    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
    expect(container.querySelector('.tm-bottom-nav')).toBeNull();
  });

  it('renders header controls when provided', () => {
    render(
      <AppShell hasActiveGroup headerActions={<div>group switcher</div>} title="My Profile">
        content
      </AppShell>,
    );

    expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
  });

  it('supports a compact page treatment without the global image banner', () => {
    render(
      <AppShell showBanner={false} title="Log a Game">
        content
      </AppShell>,
    );

    expect(
      screen.queryByRole('img', { name: /terraforming mars statistics/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /log a game/i }),
    ).toBeInTheDocument();
  });
});
