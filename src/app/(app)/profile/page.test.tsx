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
    showReviewSavedGamesLink,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    navItems?: Array<{ href: string; label: string }>;
    showReviewSavedGamesLink?: boolean;
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
      {showReviewSavedGamesLink ? (
        <a href="/log-game/review">Review Saved Games</a>
      ) : null}
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
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
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
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(screen.getByText(/10 finalized games overall/i)).toBeInTheDocument();
  });

  it('links to the play comparison screen instead of fanning out per-group queries', async () => {
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

    render(await ProfilePage({}));

    // The profile page loads overall analytics once; per-group deltas are the
    // comparison screen's job now.
    expect(getProfileAnalytics).toHaveBeenCalledTimes(1);
    expect(getProfileAnalytics).toHaveBeenCalledWith('user-1');
    expect(
      screen.getByRole('link', { name: /open my play vs overall/i }),
    ).toHaveAttribute('href', '/profile/comparison');
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
