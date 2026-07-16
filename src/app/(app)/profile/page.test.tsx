import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import {
  getCurrentGroupContext,
  listCurrentUserGroups,
} from '@/lib/db/group-context-repo';
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
    headerActions,
    navItems,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    navItems?: Array<{ href: string; label: string }>;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <nav>
        {navItems?.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div>{headerActions}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
  listCurrentUserGroups: vi.fn(),
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getProfileAnalytics: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentGroupContext).mockReset();
    vi.mocked(getProfileAnalytics).mockReset();
    vi.mocked(listCurrentUserGroups).mockReset();
    vi.mocked(listCurrentUserGroups).mockResolvedValue([]);
  });

  it('renders a claim prompt when the signed-in user has no group yet', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);

    render(await ProfilePage({}));

    expect(
      screen.getByText(
        /claim a saved player profile to join the group that already has your history/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved player matches/i }),
    ).toHaveAttribute('href', '/claim-player');
    expect(screen.getByRole('link', { name: /log game/i })).toHaveAttribute(
      'href',
      '/log-game',
    );
    expect(
      screen.queryByRole('link', { name: /^group$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /insights/i }),
    ).not.toBeInTheDocument();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
    expect(getProfileAnalytics).not.toHaveBeenCalled();
    expect(listCurrentUserGroups).not.toHaveBeenCalled();
  });

  it('loads selected-group and overall profile analytics for comparison', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    vi.mocked(listCurrentUserGroups).mockResolvedValue([
      { groupId: 'group-1', groupName: 'Mars Club', role: 'owner' },
      { groupId: 'group-2', groupName: 'Weeknight Mars', role: 'editor' },
    ]);
    vi.mocked(getProfileAnalytics)
      .mockResolvedValueOnce({
        coverage: null,
        headToHeadRows: [],
        performance: null,
        playerId: 'player-1',
        playerName: 'Friday Mars',
        scoreAverages: null,
        styleAgreement: null,
      })
      .mockResolvedValueOnce({
        coverage: null,
        headToHeadRows: [],
        performance: null,
        playerId: 'player-1',
        playerName: 'Friday Mars',
        scoreAverages: null,
        styleAgreement: null,
      });

    render(
      await ProfilePage({
        searchParams: Promise.resolve({ groupId: 'group-2' }),
      }),
    );

    expect(getProfileAnalytics).toHaveBeenNthCalledWith(1, 'user-1', {
      groupId: 'group-2',
    });
    expect(getProfileAnalytics).toHaveBeenNthCalledWith(2, 'user-1');
    expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
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

    render(await ProfilePage({}));

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
