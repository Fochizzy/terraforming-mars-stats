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
});
