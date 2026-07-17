import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile',
}));

describe('AppShell', () => {
  it('renders the banner and the centralized desktop and mobile navigation', () => {
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
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();

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

    const bottomNavigation = screen.getByRole('navigation', {
      name: /bottom navigation/i,
    });
    expect(
      within(bottomNavigation).getByRole('link', { name: /profile/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(bottomNavigation).getByRole('button', { name: /more/i }),
    ).toBeInTheDocument();

    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
  });

  it('renders header controls when provided', () => {
    render(
      <AppShell hasActiveGroup headerActions={<div>group switcher</div>} title="My Profile">
        content
      </AppShell>,
    );

    expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
  });
});
