import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardRow } from '@/lib/db/analytics-repo';
import ProfileComparisonPage from './page';

const mockState = vi.hoisted(() => ({
  getProfileAnalytics: vi.fn(),
  listCurrentUserGroups: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockState.routerPush }),
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

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/analytics-repo', () => ({
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

describe('ProfileComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'viewer',
      userId: 'user-1',
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

  it('offers every group the player has played in', async () => {
    render(await ProfileComparisonPage({}));

    expect(
      screen.getByRole('heading', { level: 1, name: 'My Play vs Overall' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mars Club' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Terraformers' }),
    ).toBeInTheDocument();
  });

  it('compares play in the active group against overall by default', async () => {
    render(await ProfileComparisonPage({}));

    expect(screen.getByLabelText('Group')).toHaveValue('group-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-1',
    });
    const badges = screen.getByTestId('metadata-badges');
    expect(badges).toHaveTextContent('4 group games');
    expect(badges).toHaveTextContent('10 total games');
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('+25 pp')).toBeInTheDocument();
  });

  it('compares the group selected through the groupId param', async () => {
    render(
      await ProfileComparisonPage({
        searchParams: Promise.resolve({ groupId: 'group-2' }),
      }),
    );

    expect(screen.getByLabelText('Group')).toHaveValue('group-2');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-2',
    });
  });

  it('falls back to the active group when the requested group is not a membership', async () => {
    render(
      await ProfileComparisonPage({
        searchParams: Promise.resolve({ groupId: 'not-my-group' }),
      }),
    );

    expect(screen.getByLabelText('Group')).toHaveValue('group-1');
    expect(mockState.getProfileAnalytics).toHaveBeenCalledWith('user-1', {
      groupId: 'group-1',
    });
  });

  it('explains itself when the comparison fails to load', async () => {
    mockState.getProfileAnalytics.mockRejectedValue(
      new Error('analytics offline'),
    );

    render(await ProfileComparisonPage({}));

    expect(
      screen.getByText(/couldn't load your finalized-game comparison/i),
    ).toBeInTheDocument();
  });
});
