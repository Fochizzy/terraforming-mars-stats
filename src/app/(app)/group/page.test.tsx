import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardRow } from '@/lib/db/analytics-repo';
import GroupPage from './page';

const mockState = vi.hoisted(() => ({
  getGroupAnalytics: vi.fn(),
  getProfileAnalytics: vi.fn(),
  listCurrentUserGroups: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    headerActions,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{headerActions}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/features/analytics/group-dashboard', () => ({
  GroupDashboard: () => <div data-testid="group-dashboard" />,
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getGroupAnalytics: mockState.getGroupAnalytics,
  getProfileAnalytics: mockState.getProfileAnalytics,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  listCurrentUserGroups: mockState.listCurrentUserGroups,
}));

function leaderboardRow(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    averageLossGap: null,
    averagePlacement: 2,
    averageScore: 80,
    averageWinMargin: null,
    differentialComponent: 0,
    gamesPlayed: 10,
    groupId: 'group-1',
    placementComponent: 0,
    playerId: 'player-1',
    playerName: 'Izzy Hodnett',
    weightedScore: 50,
    winRate: 0.5,
    winRateComponent: 0,
    wins: 5,
    ...overrides,
  };
}

function profileAnalytics(performance: LeaderboardRow | null) {
  return {
    coverage: null,
    headToHeadRows: [],
    performance,
    playerId: 'player-1',
    playerName: 'Izzy Hodnett',
    scoreAverages: null,
    styleAgreement: null,
  };
}

describe('GroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'viewer',
      userId: 'user-1',
    });
    mockState.getGroupAnalytics.mockResolvedValue({
      coverage: null,
      headToHeadRows: [],
      leaderboardRows: [],
      lineupEffectRows: [],
      scoreAverages: null,
      styleAgreementRows: [],
    });
    mockState.listCurrentUserGroups.mockResolvedValue([
      { groupId: 'group-1', groupName: 'Mars Club', role: 'viewer' },
      { groupId: 'group-2', groupName: 'Terraformers', role: 'editor' },
    ]);
    mockState.getProfileAnalytics.mockImplementation(
      (_userId: string, options?: { groupId?: string | null }) => {
        if (!options?.groupId) {
          return Promise.resolve(profileAnalytics(leaderboardRow()));
        }

        return Promise.resolve(
          profileAnalytics(
            leaderboardRow({
              gamesPlayed: 4,
              groupId: options.groupId,
              weightedScore: 60,
              winRate: 0.75,
            }),
          ),
        );
      },
    );
  });

  it('shows group settings access for any group member role', async () => {
    render(await GroupPage());

    expect(screen.getByRole('heading', { name: 'Group' })).toBeInTheDocument();
    expect(screen.getByText('Group Switcher')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /group settings/i }),
    ).toHaveAttribute('href', '/group/settings');
    expect(screen.getByTestId('group-dashboard')).toBeInTheDocument();
  });

  it('compares play in the active group against overall by default', async () => {
    render(await GroupPage());

    expect(screen.getByLabelText('Group')).toHaveValue('group-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-1',
    });
    expect(
      screen.getByText('4 finalized games in this group | 10 overall'),
    ).toBeInTheDocument();
    expect(screen.getByText('+10 vs overall')).toBeInTheDocument();
    expect(screen.getByText('+25 pp vs overall')).toBeInTheDocument();
  });

  it('compares the group selected through the compareGroupId param', async () => {
    render(
      await GroupPage({
        searchParams: Promise.resolve({ compareGroupId: 'group-2' }),
      }),
    );

    expect(screen.getByLabelText('Group')).toHaveValue('group-2');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-2',
    });
  });

  it('falls back to the active group when the requested group is not a membership', async () => {
    render(
      await GroupPage({
        searchParams: Promise.resolve({ compareGroupId: 'not-my-group' }),
      }),
    );

    expect(screen.getByLabelText('Group')).toHaveValue('group-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-1',
    });
  });

  it('still renders the group dashboard when the comparison fails to load', async () => {
    mockState.getProfileAnalytics.mockRejectedValue(
      new Error('analytics offline'),
    );

    render(await GroupPage());

    expect(screen.getByTestId('group-dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't load your finalized-game comparison/i),
    ).toBeInTheDocument();
  });
});
