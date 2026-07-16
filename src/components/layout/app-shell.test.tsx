import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders the default bottom navigation items', () => {
    const { container } = render(<AppShell title="My Profile">content</AppShell>);

    expect(
      screen.getByRole('link', { name: /my profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log game/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /insights/i })).toBeInTheDocument();
    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
    expect(screen.getByRole('navigation')).toHaveClass('tm-bottom-nav');
  });

  it('accepts a reduced navigation set for profile-only access', () => {
    render(
      <AppShell
        navItems={[{ href: '/profile', label: 'My Profile' }]}
        title="My Profile"
      >
        content
      </AppShell>,
    );

    expect(
      screen.getByRole('link', { name: /my profile/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log game/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /group/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /insights/i })).not.toBeInTheDocument();
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
