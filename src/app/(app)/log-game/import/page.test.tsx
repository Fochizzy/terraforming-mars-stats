import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGameImportPage from './page';

const groupContextMocks = vi.hoisted(() => ({
  getCurrentGroupContext: vi.fn(),
  requireCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-context-repo', () => groupContextMocks);
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

describe('LogGameImportPage', () => {
  beforeEach(() => {
    groupContextMocks.getCurrentGroupContext.mockReset();
    groupContextMocks.requireCurrentGroupContext.mockReset();
  });

  it('renders a clear unavailable state instead of throwing when no group exists', async () => {
    groupContextMocks.getCurrentGroupContext.mockResolvedValue(null);

    render(await LogGameImportPage());

    expect(screen.getByRole('heading', { level: 1, name: 'Log a Game' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /group is required to log a game/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Manual Entry and Import Game/i)).toBeInTheDocument();
    expect(groupContextMocks.requireCurrentGroupContext).not.toHaveBeenCalled();
  });
});
