import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InsightsPage from './page';

type CapturedInsightsDashboardProps = {
  players: Array<{ displayName: string; id: string }>;
};

const captureState = vi.hoisted(() => ({
  insightsDashboardProps: null as CapturedInsightsDashboardProps | null,
}));

const mockState = vi.hoisted(() => ({
  getGroupAnalytics: vi.fn(),
  listPlayers: vi.fn(),
  listPromoCards: vi.fn(),
  listPromoSets: vi.fn(),
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

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/features/insights/insights-dashboard', () => ({
  InsightsDashboard: (props: CapturedInsightsDashboardProps) => {
    captureState.insightsDashboardProps = props;

    return (
      <div data-testid="insights-dashboard">
        {props.players.map((player) => (
          <span key={player.id}>{player.displayName}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getGroupAnalytics: mockState.getGroupAnalytics,
}));

vi.mock('@/lib/db/player-repo', () => ({
  listPlayers: mockState.listPlayers,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listPromoCards: mockState.listPromoCards,
  listPromoSets: mockState.listPromoSets,
}));

vi.mock('@/lib/db/selection-stats-repo', () => ({
  getHeadToHeadStats: vi.fn(async () => []),
  getSelectionStats: vi.fn(async () => []),
}));

vi.mock('@/features/insights/selection-stats-section', () => ({
  SelectionStatsSection: () => <div data-testid="selection-stats-section" />,
}));

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureState.insightsDashboardProps = null;

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'viewer',
      userId: 'user-1',
    });
    mockState.getGroupAnalytics.mockResolvedValue({
      coverage: null,
      groupInteractionRows: [],
      groupStylePerformanceRows: [],
      headToHeadRows: [
        {
          averagePlacementEdge: 0.5,
          averageScoreDifferential: 6.25,
          gamesPlayed: 2,
          groupId: 'group-1',
          leftPlayerId: 'player-self',
          leftPlayerName: 'Friday Mars',
          leftWins: 2,
          rightPlayerId: 'player-rival',
          rightPlayerName: 'Second Seat',
          rightWins: 0,
          ties: 0,
        },
        {
          averagePlacementEdge: 0.5,
          averageScoreDifferential: 4.5,
          gamesPlayed: 1,
          groupId: 'group-1',
          leftPlayerId: 'player-other-a',
          leftPlayerName: 'Third Seat',
          leftWins: 1,
          rightPlayerId: 'player-other-b',
          rightPlayerName: 'Fourth Seat',
          rightWins: 0,
          ties: 0,
        },
      ],
      importCoverageRows: [],
      leaderboardRows: [],
      lineupEffectRows: [],
      playerCoverages: [],
      playerInteractionRows: [],
      playerScoreAverages: [],
      playerStylePerformanceRows: [],
      playerTrendRows: [],
      scoreAverages: null,
      styleAgreementRows: [],
    });
    mockState.listPlayers.mockResolvedValue([
      {
        display_name: 'Friday Mars',
        id: 'player-self',
        linked_user_id: 'user-1',
      },
      {
        display_name: 'Second Seat',
        id: 'player-rival',
        linked_user_id: null,
      },
      {
        display_name: 'Third Seat',
        id: 'player-other-a',
        linked_user_id: null,
      },
      {
        display_name: 'Fourth Seat',
        id: 'player-other-b',
        linked_user_id: null,
      },
    ]);
    mockState.listPromoCards.mockResolvedValue([]);
    mockState.listPromoSets.mockResolvedValue([]);
  });

  it('only forwards the signed-in player and shared-game opponents into player focus', async () => {
    render(await InsightsPage());

    expect(screen.getByRole('heading', { name: /insights/i })).toBeInTheDocument();
    expect(screen.getByText('Group Switcher')).toBeInTheDocument();
    expect(screen.getByTestId('insights-dashboard')).toBeInTheDocument();
    expect(captureState.insightsDashboardProps?.players).toEqual([
      { displayName: 'Friday Mars', id: 'player-self' },
      { displayName: 'Second Seat', id: 'player-rival' },
    ]);
    expect(screen.queryByText('Third Seat')).not.toBeInTheDocument();
    expect(screen.queryByText('Fourth Seat')).not.toBeInTheDocument();
  });
});
