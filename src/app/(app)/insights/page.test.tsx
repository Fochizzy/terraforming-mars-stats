import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InsightsPage from './page';

type CapturedInsightsDashboardProps = {
  children?: ReactNode;
  focusPeople: Array<{ canonicalId: string; displayName: string }>;
};

const captureState = vi.hoisted(() => ({
  insightsDashboardProps: null as CapturedInsightsDashboardProps | null,
}));

const mockState = vi.hoisted(() => ({
  getHeadToHeadStats: vi.fn(),
  getCrossGroupFocusData: vi.fn(),
  getExtendedGroupAnalytics: vi.fn(),
  getGroupAnalytics: vi.fn(),
  getMergerImpactStats: vi.fn(),
  getSelectionStats: vi.fn(),
  listPromoCards: vi.fn(),
  listPromoSets: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    headerActions,
    showReviewSavedGamesLink,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    showReviewSavedGamesLink?: boolean;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
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

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/features/insights/insights-dashboard', () => ({
  InsightsDashboard: (props: CapturedInsightsDashboardProps) => {
    captureState.insightsDashboardProps = props;

    return (
      <div data-testid="insights-dashboard">
        {props.children}
        {props.focusPeople.map((person) => (
          <span key={person.canonicalId}>{person.displayName}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getCrossGroupFocusData: mockState.getCrossGroupFocusData,
  getGroupAnalytics: mockState.getGroupAnalytics,
}));

vi.mock('@/lib/db/extended-analytics-repo', () => ({
  getExtendedGroupAnalytics: mockState.getExtendedGroupAnalytics,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listPromoCards: mockState.listPromoCards,
  listPromoSets: mockState.listPromoSets,
}));

vi.mock('@/lib/db/selection-stats-repo', () => ({
  getHeadToHeadStats: mockState.getHeadToHeadStats,
  getMergerImpactStats: mockState.getMergerImpactStats,
  getSelectionStats: mockState.getSelectionStats,
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
    mockState.getCrossGroupFocusData.mockResolvedValue([
      {
        activeGroupPlayerId: 'player-self',
        bundle: {
          coverage: null,
          headToHeadRows: [],
          performance: null,
          scoreAverages: null,
          trendRows: [],
        },
        canonicalId: 'user:user-1',
        displayName: 'Friday Mars',
        inActiveGroup: true,
        playerIds: ['player-self'],
      },
      {
        activeGroupPlayerId: null,
        bundle: {
          coverage: null,
          headToHeadRows: [],
          performance: null,
          scoreAverages: null,
          trendRows: [],
        },
        canonicalId: 'user:colette',
        displayName: 'Colette LeRoux',
        inActiveGroup: false,
        playerIds: ['player-colette'],
      },
    ]);
    mockState.getExtendedGroupAnalytics.mockResolvedValue({
      awardFunderWinnerRows: [],
      awardOutcomeRows: [],
      cardOutcomeRows: [],
      gameLengthPerformanceRows: [],
      generationDistributionRows: [],
      generationPaceRows: [],
      groupMapPerformanceRows: [],
      milestoneEconomicsRows: [],
      placementDistributionRows: [],
      playerCountPerformanceRows: [],
      playerMapPerformanceRows: [],
      playerMilestoneClaimRows: [],
      tagOutcomeRows: [],
      tilePlacementRows: [],
    });
    mockState.listPromoCards.mockResolvedValue([]);
    mockState.listPromoSets.mockResolvedValue([]);
    mockState.getHeadToHeadStats.mockResolvedValue({
      corporationMatchups: [],
      pairs: [],
    });
    mockState.getMergerImpactStats.mockResolvedValue([]);
    mockState.getSelectionStats.mockResolvedValue({
      awardFunding: [],
      baselineWinRate: 0,
      cards: [],
      corporations: [],
      corporationTags: [],
      pairs: [],
      preludes: [],
      tagWins: [],
    });
  });

  it('forwards the cross-group focus people into player focus', async () => {
    render(await InsightsPage());

    expect(screen.getByRole('heading', { name: /insights/i })).toBeInTheDocument();
    expect(screen.getByText('Group Switcher')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(screen.getByTestId('insights-dashboard')).toBeInTheDocument();
    expect(mockState.getCrossGroupFocusData).toHaveBeenCalledWith('user-1', 'group-1');
    expect(
      captureState.insightsDashboardProps?.focusPeople.map((person) => person.displayName),
    ).toEqual(['Friday Mars', 'Colette LeRoux']);
    // A player from another group is offered even though they aren't in the
    // active group's analytics.
    expect(screen.getByText('Colette LeRoux')).toBeInTheDocument();
    expect(mockState.listPromoCards).not.toHaveBeenCalled();
    expect(mockState.listPromoSets).not.toHaveBeenCalled();
  });

  it('keeps the insights page renderable when optional analytics fail', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mockState.getExtendedGroupAnalytics.mockRejectedValueOnce(
      new Error('missing live analytics view'),
    );
    mockState.getSelectionStats.mockRejectedValue(new Error('stale stats rpc'));
    mockState.getHeadToHeadStats.mockRejectedValueOnce(
      new Error('stale head-to-head rpc'),
    );
    mockState.getMergerImpactStats.mockRejectedValueOnce(
      new Error('missing merger rpc'),
    );

    render(await InsightsPage());

    expect(screen.getByRole('heading', { name: /insights/i })).toBeInTheDocument();
    expect(screen.getByTestId('insights-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('selection-stats-section')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[insights] Failed to load extended analytics',
      expect.any(Error),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[insights] Failed to load personal selection stats',
      expect.any(Error),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[insights] Failed to load Merger impact stats',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
