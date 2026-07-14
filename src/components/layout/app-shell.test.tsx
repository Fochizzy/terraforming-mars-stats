import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

function getBottomNav(container: HTMLElement) {
  const bottomNav = container.querySelector<HTMLElement>('.tm-bottom-nav');
  if (!bottomNav) {
    throw new Error('bottom navigation not found');
  }
  return within(bottomNav);
}

describe('AppShell', () => {
  it('renders the default bottom navigation items', () => {
    const { container } = render(<AppShell title="My Profile">content</AppShell>);
    const nav = getBottomNav(container);

    expect(nav.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: /log game/i })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: /global/i })).toBeInTheDocument();
    expect(
      nav.getByRole('link', { name: /individual insights/i }),
    ).toHaveAttribute('href', '/insights/individual');
    expect(nav.getByRole('link', { name: /group insights/i })).toHaveAttribute(
      'href',
      '/insights/group',
    );
    expect(nav.getByRole('link', { name: /cards/i })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: /glossary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
    expect(container.querySelector('.tm-bottom-nav')).toBeInTheDocument();
  });

  it('accepts a reduced navigation set for profile-only access', () => {
    const { container } = render(
      <AppShell
        navItems={[{ href: '/profile', label: 'My Profile' }]}
        title="My Profile"
      >
        content
      </AppShell>,
    );
    const nav = getBottomNav(container);

    expect(nav.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: /log game/i })).not.toBeInTheDocument();
    expect(nav.queryByRole('link', { name: /global/i })).not.toBeInTheDocument();
    expect(nav.queryByRole('link', { name: /insights/i })).not.toBeInTheDocument();
  });

  it('renders header controls when provided', () => {
    render(
      <AppShell headerActions={<div>group switcher</div>} title="My Profile">
        content
      </AppShell>,
    );

    expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('renders review saved games immediately before log out when requested', () => {
    const { container } = render(
      <AppShell showReviewSavedGamesLink title="My Profile">
        content
      </AppShell>,
    );

    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');

    const actionLabels = Array.from(
      container.querySelectorAll(
        '.tm-app-header__actions a, .tm-app-header__actions button',
      ),
    ).map((element) => element.textContent?.trim());

    expect(actionLabels).toEqual(['Review Saved Games', 'Log Out']);
  });

  it('renders the shared header with the login-style cropped banner', () => {
    const { container } = render(<AppShell title="My Profile">content</AppShell>);

    const bannerFrame = container.querySelector(
      '.tm-app-header-banner .tm-landing-banner-frame--cropped',
    );
    const bannerImage = screen.getByAltText(/terraforming mars statistics/i);

    expect(bannerFrame).toBeInTheDocument();
    expect(bannerImage).toHaveClass('tm-landing-banner-image');
    expect(bannerImage).not.toHaveClass('h-8');
    expect(screen.getByText(/mission control/i)).toHaveClass('tm-display-eyebrow');
  });
});
