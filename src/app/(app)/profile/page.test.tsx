import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    title,
  }: {
    children: ReactNode;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getProfileAnalytics: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to web import when the signed-in user has no group yet', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);

    await ProfilePage();

    expect(navigationMocks.redirect).toHaveBeenCalledWith('/log-game/import');
    expect(getProfileAnalytics).not.toHaveBeenCalled();
  });

  it('renders a safe fallback when loading analytics throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    vi.mocked(getProfileAnalytics).mockRejectedValue(
      new Error('permission denied for schema analytics'),
    );

    render(await ProfilePage());

    expect(
      screen.getByText(/couldn't load your finalized-game profile analytics right now/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open saved players/i }),
    ).toHaveAttribute('href', '/group/players');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
