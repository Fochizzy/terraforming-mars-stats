import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders the banner, utility controls, and primary navigation', () => {
    const { container } = render(<AppShell title="My Profile">content</AppShell>);

    expect(
      screen.getByRole('img', { name: /terraforming mars statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saved games/i })).toHaveAttribute(
      'href',
      '/saved-games',
    );
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /log a game/i })).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    expect(screen.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /individual insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /group insights/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /compare/i })).toBeInTheDocument();

    expect(container.querySelector('main')).toHaveClass('tm-app-shell');
    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
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
