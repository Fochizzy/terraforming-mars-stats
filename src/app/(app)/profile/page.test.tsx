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
    vi.mocked(listCurrentUserGroups).mockReset();
    vi.mocked(listCurrentUserGroups).mockResolvedValue([]);
    vi.mocked(getProfileAnalytics).mockReset();
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
  });

  it('loads overall profile analytics without a profile group picker', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    vi.mocked(getProfileAnalytics).mockResolvedValue({
      coverage: null,
      headToHeadRows: [],
      performance: {
        averageLossGap: 2,
        averagePlacement: 1.5,
        averageScore: 84,
        averageWinMargin: 5,
        differentialComponent: 0.02,
        gamesPlayed: 10,
        groupId: 'linked-profile',
        placementComponent: 0.25,
        playerId: 'player-1',
        playerName: 'Friday Mars',
        weightedScore: 0.67,
        winRate: 0.6,
        winRateComponent: 0.4,
        wins: 6,
      },
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

    expect(getProfileAnalytics).toHaveBeenCalledTimes(1);
    expect(getProfileAnalytics).toHaveBeenCalledWith('user-1');
    expect(screen.queryByText(/group switcher/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/profile group/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view group stats/i)).not.toBeInTheDocument();
    expect(screen.getByText(/10 finalized games overall/i)).toBeInTheDocument();
  });

  it('autopopulates played groups and shows per-group deltas vs overall', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    vi.mocked(listCurrentUserGroups).mockResolvedValue([
      { groupId: 'group-1', groupName: 'Mars Club', role: 'owner' },
      { groupId: 'group-2', groupName: 'Luna League', role: 'editor' },
    ]);

    const basePerformance = {
      averageLossGap: 2,
      averagePlacement: 1.5,
      averageScore: 84,
      averageWinMargin: 5,
      differentialComponent: 0.02,
      gamesPlayed: 10,
      groupId: 'linked-profile',
      placementComponent: 0.25,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      weightedScore: 0.67,
      winRate: 0.6,
      winRateComponent: 0.4,
      wins: 6,
    };
    const baseAnalytics = {
      coverage: null,
      headToHeadRows: [],
      performance: basePerformance,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreAverages: null,
      styleAgreement: null,
    };

    vi.mocked(getProfileAnalytics).mockImplementation(
      async (_userId, options?: { groupId?: string | null }) => {
        if (options?.groupId === 'group-1') {
          return {
            ...baseAnalytics,
            performance: {
              ...basePerformance,
              averageScore: 90,
              gamesPlayed: 6,
              winRate: 0.8,
            },
          };
        }

        if (options?.groupId === 'group-2') {
          return {
            ...baseAnalytics,
            performance: {
              ...basePerformance,
              averageScore: 78,
              gamesPlayed: 4,
              winRate: 0.4,
            },
          };
        }

        return baseAnalytics;
      },
    );

    render(await ProfilePage({}));

    expect(getProfileAnalytics).toHaveBeenCalledWith('user-1');
    expect(getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-1',
    });
    expect(getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-2',
    });
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(screen.getByText(/luna league/i)).toBeInTheDocument();
    expect(screen.getByText(/6 finalized games in this group/i)).toBeInTheDocument();
    expect(screen.getByText(/4 finalized games in this group/i)).toBeInTheDocument();
    expect(screen.getByText(/\+20 pp vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/-20 pp vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/\+6 vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/-6 vs overall/i)).toBeInTheDocument();
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
