import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InsightsPageContent } from './insights-page';

type CapturedInsightsDashboardProps = {
  children?: ReactNode;
  currentUserCanonicalId?: string;
  focusPeople: Array<{ canonicalId: string; displayName: string }>;
  mapAwardGroups?: Array<{
    awardNames: string[];
    mapCode: string;
    mapId: string;
    mapName: string;
    milestoneNames: string[];
  }>;
  scopeMode?: 'all' | 'group' | 'individual';
};

const captureState = vi.hoisted(() => ({
  insightsDashboardProps: null as CapturedInsightsDashboardProps | null,
}));

const mockState = vi.hoisted(() => ({
  getFinalTerraformingActionStats: vi.fn(),
  getHeadToHeadStats: vi.fn(),
  getCrossGroupFocusData: vi.fn(),
  getExtendedGroupAnalytics: vi.fn(),
  getGroupAnalytics: vi.fn(),
  getMergerImpactStats: vi.fn(),
  getOverallAnalytics: vi.fn(),
  getSelectionDialogData: vi.fn(),
  getSelectionStats: vi.fn(),
  getStyleEffectiveness: vi.fn(),
  listMapAwardGroups: vi.fn(),
  listPromoCards: vi.fn(),
  listPromoSets: vi.fn(),
  listSharedGameResultRows: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
}));

const emptyGroupAnalyticsFixture = vi.hoisted(() => () => ({
  coverage: null,
  groupInteractionRows: [],
  groupStylePerformanceRows: [],
  headToHeadRows: [],
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
}));

const emptyExtendedAnalyticsFixture = vi.hoisted(() => () => ({
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
  GroupSwitcher: ({
    returnPath,
  }: {
    currentGroupId: string;
    returnPath: string;
  }) => <div>Group Switcher: {returnPath}</div>,
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
  buildEmptyGroupAnalytics: emptyGroupAnalyticsFixture,
  getCrossGroupFocusData: mockState.getCrossGroupFocusData,
  getGroupAnalytics: mockState.getGroupAnalytics,
  getOverallAnalytics: mockState.getOverallAnalytics,
  getStyleEffectiveness: mockState.getStyleEffectiveness,
  listSharedGameResultRows: mockState.listSharedGameResultRows,
}));

vi.mock('@/lib/db/extended-analytics-repo', () => ({
  getExtendedGroupAnalytics: mockState.getExtendedGroupAnalytics,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listMapAwardGroups: mockState.listMapAwardGroups,
  listPromoCards: mockState.listPromoCards,
  listPromoSets: mockState.listPromoSets,
}));

vi.mock('@/lib/db/selection-stats-repo', () => ({
  getFinalTerraformingActionStats: mockState.getFinalTerraformingActionStats,
  getHeadToHeadStats: mockState.getHeadToHeadStats,
  getMergerImpactStats: mockState.getMergerImpactStats,
  getSelectionDialogData: mockState.getSelectionDialogData,
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
    mockState.getOverallAnalytics.mockResolvedValue({
      analytics: emptyGroupAnalyticsFixture(),
      extended: emptyExtendedAnalyticsFixture(),
    });
    mockState.listMapAwardGroups.mockResolvedValue([]);
    mockState.getSelectionDialogData.mockResolvedValue({
      cardMetaByName: new Map(),
      corporationWinRates: new Map(),
      preludeWinRates: new Map(),
    });
    mockState.listPromoCards.mockResolvedValue([]);
    mockState.listPromoSets.mockResolvedValue([]);
    mockState.listSharedGameResultRows.mockResolvedValue([]);
    mockState.getHeadToHeadStats.mockResolvedValue({
      corporationMatchups: [],
      pairs: [],
    });
    mockState.getMergerImpactStats.mockResolvedValue([]);
    mockState.getFinalTerraformingActionStats.mockResolvedValue([]);
    mockState.getSelectionStats.mockResolvedValue({
      awardFunding: [],
      baselineWinRate: 0,
      cards: [],
      corporations: [],
      corporationTags: [],
      pairs: [],
      preludes: [],
      tagWins: [],
      totalGames: 0,
    });
    mockState.getStyleEffectiveness.mockResolvedValue({
      scoreAverages: null,
      styleRows: [],
    });
  });

  it('forwards the cross-group focus people into player focus', async () => {
    const mapAwardGroups = [
      {
        awardNames: ['Landlord'],
        mapCode: 'tharsis',
        mapId: 'map-tharsis',
        mapName: 'Tharsis',
        milestoneNames: ['Terraformer'],
      },
    ];

    mockState.listMapAwardGroups.mockResolvedValueOnce(mapAwardGroups);

    render(await InsightsPageContent({ mode: 'individual' }));

    expect(
      screen.getByRole('heading', { name: /individual insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Group Switcher: /insights/individual'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(screen.getByTestId('insights-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('selection-stats-section')).toBeInTheDocument();
    expect(captureState.insightsDashboardProps?.scopeMode).toBe('individual');
    expect(captureState.insightsDashboardProps?.currentUserCanonicalId).toBe(
      'user:user-1',
    );
    expect(mockState.getCrossGroupFocusData).toHaveBeenCalledWith('user-1', 'group-1');
    expect(mockState.listSharedGameResultRows).toHaveBeenCalledWith('user-1');
    expect(mockState.getFinalTerraformingActionStats).toHaveBeenCalledWith({
      scope: 'personal',
    });
    expect(mockState.getHeadToHeadStats).not.toHaveBeenCalled();
    expect(mockState.getMergerImpactStats).not.toHaveBeenCalled();
    expect(
      captureState.insightsDashboardProps?.focusPeople.map((person) => person.displayName),
    ).toEqual(['Friday Mars', 'Colette LeRoux']);
    expect(captureState.insightsDashboardProps?.mapAwardGroups).toEqual(
      mapAwardGroups,
    );
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
    mockState.getFinalTerraformingActionStats.mockRejectedValueOnce(
      new Error('missing final action rpc'),
    );

    render(await InsightsPageContent({ mode: 'individual' }));

    expect(
      screen.getByRole('heading', { name: /individual insights/i }),
    ).toBeInTheDocument();
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
      '[insights] Failed to load final terraforming action stats',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it('renders group insights as a separate group-scoped page', async () => {
    render(await InsightsPageContent({ mode: 'group' }));

    expect(
      screen.getByRole('heading', { name: /group insights/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Group Switcher: /insights/group')).toBeInTheDocument();
    expect(screen.getByTestId('insights-dashboard')).toBeInTheDocument();
    expect(captureState.insightsDashboardProps?.scopeMode).toBe('group');
    expect(mockState.getFinalTerraformingActionStats).not.toHaveBeenCalled();
    expect(screen.queryByTestId('selection-stats-section')).not.toBeInTheDocument();
  });
});
