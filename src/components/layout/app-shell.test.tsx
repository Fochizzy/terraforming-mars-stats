import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders the banner, utility controls, and navigation', () => {
    const { container } = render(<AppShell title="My Profile">content</AppShell>);

    expect(
      screen.getByRole('img', { name: /terraforming mars statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saved games/i })).toHaveAttribute(
      'href',
      '/saved-games',
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
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole('link', { name: /individual insights/i }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole('link', { name: /group insights/i }),
    ).toBeInTheDocument();

    const leaderboardLink = within(primaryNavigation).getByRole('link', {
      name: /leaderboard/i,
    });
    expect(leaderboardLink).toHaveAttribute('href', '/group');
    expect(leaderboardLink).toHaveAttribute('data-leaderboard-button', 'true');

    expect(
      within(primaryNavigation).getByRole('link', { name: /global statistics/i }),
    ).toHaveAttribute('href', '/insights#global-statistics');
    expect(
      within(primaryNavigation).getByRole('link', { name: /compare/i }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).queryByRole('link', { name: /glossary/i }),
    ).not.toBeInTheDocument();

    const bottomNavigation = screen.getByRole('navigation', {
      name: /bottom navigation/i,
    });
    expect(
      within(bottomNavigation).getByRole('link', { name: /cards/i }),
    ).toHaveAttribute('href', '/cards');

    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
  });

  it('renders header controls when provided', () => {
    render(
      <AppShell headerActions={<div>group switcher</div>} title="My Profile">
        content
      </AppShell>,
    );

    expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
  });
});
