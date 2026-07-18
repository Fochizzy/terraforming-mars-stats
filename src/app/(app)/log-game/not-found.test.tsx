import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LogGameDraftNotFound from './not-found';

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

describe('LogGameDraftNotFound', () => {
  it('keeps unavailable draft recovery inside the Log a Game product area', () => {
    render(<LogGameDraftNotFound />);

    expect(screen.getByRole('heading', { level: 1, name: 'Log a Game' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /saved draft cannot be opened/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start manual entry/i })).toHaveAttribute(
      'href',
      '/log-game',
    );
    expect(screen.getByRole('link', { name: /import game/i })).toHaveAttribute(
      'href',
      '/log-game/import',
    );
    expect(screen.getByRole('link', { name: /saved games/i })).toHaveAttribute(
      'href',
      '/games',
    );
  });
});
