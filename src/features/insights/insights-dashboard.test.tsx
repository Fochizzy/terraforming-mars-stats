import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
  SharedGameResultRow,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import type {
  FinalTerraformingActionStat,
  SelectionStats,
} from '@/lib/db/selection-stats-repo';
import { InsightsDashboard } from './insights-dashboard';

const emptyScoreAverages = {
  averageAnimalPoints: 1.1,
  averageAwardPoints: 2.5,
  averageCardPoints: 16.2,
  averageCitiesPoints: 6.4,
  averageGreeneryPoints: 10.2,
  averageJovianPoints: 1.3,
  averageMicrobePoints: 0.8,
  averageMilestonePoints: 2.1,
  averageOtherCardPoints: 12.1,
  averageTrPoints: 24.3,
};

function buildFocusPerson(
  overrides: Partial<CrossGroupFocusPerson> &
    Pick<CrossGroupFocusPerson, 'canonicalId' | 'displayName'>,
): CrossGroupFocusPerson {
  return {
    activeGroupPlayerId: null,
    bundle: {
      coverage: null,
      headToHeadRows: [],
      performance: null,
      scoreAverages: null,
      trendRows: [],
    },
    inActiveGroup: false,
    playerIds: [],
    ...overrides,
  };
}

function buildExtendedFixture(
  overrides: Partial<ExtendedGroupAnalytics> = {},
): ExtendedGroupAnalytics {
  return {
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
    ...overrides,
  };
}

function buildEmptyGroupAnalyticsFixture(): GroupAnalytics {
  return {
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
  };
}

function buildSharedGameRow(
  overrides: Pick<
    SharedGameResultRow,
    | 'gameId'
    | 'isWinner'
    | 'placement'
    | 'playedOn'
    | 'playerId'
    | 'playerName'
    | 'totalPoints'
  > &
    Partial<SharedGameResultRow>,
): SharedGameResultRow {
  const {
    gameId,
    isWinner,
    placement,
    playedOn,
    playerId,
    playerName,
    totalPoints,
    ...rest
  } = overrides;

  return {
    awardPoints: 2,
    cardPointsAnimals: 0,
    cardPointsJovian: 0,
    cardPointsMicrobes: 0,
    cardPointsTotal: 18,
    citiesPoints: 4,
    declaredModifierStyleCodes: [],
    declaredPrimaryStyleCode: 'balanced',
    gameId,
    generationCount: 10,
    greeneryPoints: 8,
    groupId: 'group-1',
    hasFullCardBreakdown: true,
    inferredPrimaryStyleCode: 'balanced',
    inferredStyleConfidence: 0.8,
    isWinner,
    keyCardCount: 1,
    lossGapPoints: isWinner ? null : 8,
    mapId: 'map-tharsis',
    milestonePoints: 5,
    otherCardPoints: 4,
    playedOn,
    placement,
    placementScore: placement === 1 ? 1 : 0.5,
    playerCount: 3,
    playerId,
    playerName,
    signedDifferentialPoints: isWinner ? 8 : -8,
    totalPoints,
    trPoints: 30,
    winDifferentialPoints: isWinner ? 8 : null,
    ...rest,
  };
}

describe('InsightsDashboard', () => {
  it('places the selected group switcher below player focus controls', () => {
    const { container } = render(
      <InsightsDashboard
        analytics={{
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
        } as never}
        extended={buildExtendedFixture()}
        focusPeople={[]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture()}
      >
        <div>Group Switcher</div>
      </InsightsDashboard>,
    );
    const labels = Array.from(container.querySelectorAll('.tm-data-label')).map(
      (element) => element.textContent?.trim(),
    );

    expect(labels.indexOf('Player Focus')).toBeLessThan(
      labels.indexOf('Selected Group'),
    );
    expect(screen.getByText('Group Switcher')).toBeInTheDocument();
  });

  it('analyzes group insights by selected player combination', async () => {
    const user = userEvent.setup();
    const sharedGameRows: SharedGameResultRow[] = [
      buildSharedGameRow({
        gameId: 'game-1',
        isWinner: true,
        placement: 1,
        playedOn: '2026-06-01',
        playerId: 'me-1',
        playerName: 'Friday Mars',
        totalPoints: 90,
      }),
      buildSharedGameRow({
        gameId: 'game-1',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-01',
        playerId: 'corey-1',
        playerName: 'Corey',
        totalPoints: 82,
      }),
      buildSharedGameRow({
        gameId: 'game-1',
        isWinner: false,
        placement: 3,
        playedOn: '2026-06-01',
        playerId: 'james-1',
        playerName: 'James',
        totalPoints: 78,
      }),
      buildSharedGameRow({
        gameId: 'game-2',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-02',
        playerId: 'me-1',
        playerName: 'Friday Mars',
        totalPoints: 80,
      }),
      buildSharedGameRow({
        gameId: 'game-2',
        isWinner: true,
        placement: 1,
        playedOn: '2026-06-02',
        playerId: 'corey-1',
        playerName: 'Corey',
        totalPoints: 88,
      }),
      buildSharedGameRow({
        gameId: 'game-2',
        isWinner: false,
        placement: 3,
        playedOn: '2026-06-02',
        playerId: 'sam-1',
        playerName: 'Sam',
        totalPoints: 75,
      }),
      buildSharedGameRow({
        gameId: 'game-3',
        isWinner: true,
        placement: 1,
        playedOn: '2026-06-03',
        playerId: 'me-1',
        playerName: 'Friday Mars',
        totalPoints: 93,
      }),
      buildSharedGameRow({
        gameId: 'game-3',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-03',
        playerId: 'james-1',
        playerName: 'James',
        totalPoints: 84,
      }),
      buildSharedGameRow({
        gameId: 'game-3',
        isWinner: false,
        placement: 3,
        playedOn: '2026-06-03',
        playerId: 'sam-1',
        playerName: 'Sam',
        totalPoints: 79,
      }),
      buildSharedGameRow({
        gameId: 'game-4',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-04',
        playerId: 'me-1',
        playerName: 'Friday Mars',
        totalPoints: 81,
      }),
      buildSharedGameRow({
        gameId: 'game-4',
        isWinner: true,
        placement: 1,
        playedOn: '2026-06-04',
        playerId: 'corey-1',
        playerName: 'Corey',
        totalPoints: 91,
      }),
      buildSharedGameRow({
        gameId: 'game-4',
        isWinner: false,
        placement: 3,
        playedOn: '2026-06-04',
        playerId: 'sam-1',
        playerName: 'Sam',
        totalPoints: 73,
      }),
    ];

    render(
      <InsightsDashboard
        analytics={buildEmptyGroupAnalyticsFixture()}
        currentUserCanonicalId="user:me"
        extended={buildExtendedFixture()}
        focusPeople={[
          buildFocusPerson({
            canonicalId: 'user:me',
            displayName: 'Friday Mars',
            playerIds: ['me-1'],
          }),
          buildFocusPerson({
            canonicalId: 'name:corey',
            displayName: 'Corey',
            playerIds: ['corey-1'],
          }),
          buildFocusPerson({
            canonicalId: 'name:james',
            displayName: 'James',
            playerIds: ['james-1'],
          }),
          buildFocusPerson({
            canonicalId: 'name:sam',
            displayName: 'Sam',
            playerIds: ['sam-1'],
          }),
        ]}
        mapAwardGroups={[
          {
            awardNames: ['Landlord'],
            mapCode: 'tharsis',
            mapId: 'map-tharsis',
            mapName: 'Tharsis',
            milestoneNames: ['Terraformer'],
          },
        ]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture({
          cardOutcomeRows: [
            {
              cardId: 'corey-card',
              cardName: 'Corey Card',
              fullImageUrl: null,
              gameId: 'game-1',
              groupId: 'overall',
              isWinner: false,
              playedOn: '2026-06-01',
              playerId: 'name:corey',
              playerName: 'Corey',
              thumbnailUrl: null,
            },
            {
              cardId: 'james-card',
              cardName: 'James Card',
              fullImageUrl: null,
              gameId: 'game-1',
              groupId: 'overall',
              isWinner: false,
              playedOn: '2026-06-01',
              playerId: 'name:james',
              playerName: 'James',
              thumbnailUrl: null,
            },
            {
              cardId: 'unselected-card',
              cardName: 'Unselected Player Card',
              fullImageUrl: null,
              gameId: 'game-1',
              groupId: 'overall',
              isWinner: true,
              playedOn: '2026-06-01',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              thumbnailUrl: null,
            },
          ],
        })}
        scopeMode="group"
        sharedGameRows={sharedGameRows}
      />,
    );

    expect(screen.queryByLabelText(/player focus/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').map((checkbox) => checkbox.id)).toEqual([
      'combination-player-0-user-me',
      'combination-player-1-name-corey',
      'combination-player-2-name-sam',
      'combination-player-3-name-james',
    ]);
    expect(screen.getByRole('checkbox', { name: /Corey/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /James/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Sam/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Friday Mars/ })).toBeInTheDocument();
    expect(screen.getByText(/4 shared games \| 12 player results/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Hide Sam/i }));

    expect(
      screen.queryByRole('checkbox', { name: /Sam/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Hidden players \(1\)/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Hidden players \(1\)/i));
    await user.click(
      screen.getByRole('button', {
        name: /Add Sam back to group selection/i,
      }),
    );

    expect(screen.getByRole('checkbox', { name: /Sam/ })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Corey/ }));
    await user.click(screen.getByRole('checkbox', { name: /James/ }));
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    expect(
      screen.getByText(/1 game containing Corey, James \| 2 player results/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Corey Card')).toBeInTheDocument();
    expect(screen.getByText('James Card')).toBeInTheDocument();
    expect(screen.queryByText('Unselected Player Card')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Combination Weighted Leaderboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2026-06-01/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /2026-06-02/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /2026-06-03/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the cross-group sections in the default overall view', () => {
    render(
      <InsightsDashboard
        analytics={buildEmptyGroupAnalyticsFixture()}
        extended={buildExtendedFixture()}
        focusPeople={[
          buildFocusPerson({
            bundle: {
              coverage: null,
              headToHeadRows: [],
              performance: null,
              scoreAverages: emptyScoreAverages,
              trendRows: [
                {
                  gameId: 'g1',
                  generationCount: 10,
                  groupId: 'group-1',
                  inferredPrimaryStyleCode: 'jovian_payoff',
                  isWinner: true,
                  placement: 1,
                  playedOn: '2026-06-20',
                  playerId: 'me-g1',
                  playerName: 'Me',
                  totalPoints: 88,
                },
              ],
            },
            canonicalId: 'user:me',
            displayName: 'Me',
          }),
        ]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture()}
      />,
    );

    // These extended sections used to be hidden in Overall scope; now that the
    // default view aggregates everyone you've played, their frames render.
    expect(
      screen.getByRole('heading', { name: /Map Performance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Milestone Economics/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Table Size Performance/i }),
    ).toBeInTheDocument();
  });

  it('renders all expanded individual metrics for a focused player', async () => {
    const user = userEvent.setup();
    const personalSelectionStats: SelectionStats = {
      awardFunding: [],
      baselineWinRate: 0.5,
      cards: [
        {
          card_name: 'Earth Catapult',
          plays: 2,
          win_rate_when_played: 1,
        },
      ],
      corporations: [
        {
          avg_animal_points: 0,
          avg_award_points: 3,
          avg_awards_won: 1,
          avg_card_points: 21,
          avg_cities_points: 5,
          avg_greenery_points: 9,
          avg_jovian_points: 0,
          avg_microbe_points: 0,
          avg_milestone_points: 5,
          avg_milestones_won: 1,
          avg_placement: 1,
          avg_points: 91,
          avg_tr_points: 31,
          corporation_name: 'Tharsis Republic',
          first_place_finishes: 2,
          plays: 2,
          second_place_finishes: 0,
          third_plus_finishes: 0,
          win_rate: 1,
        },
      ],
      corporationTags: [],
      pairs: [
        {
          avg_points: 91,
          corporation_name: 'Tharsis Republic',
          plays: 2,
          prelude_name: 'Allied Bank',
          win_rate: 1,
        },
      ],
      preludes: [
        {
          avg_animal_points: 0,
          avg_award_points: 3,
          avg_awards_won: 1,
          avg_card_points: 21,
          avg_cities_points: 5,
          avg_greenery_points: 9,
          avg_jovian_points: 0,
          avg_microbe_points: 0,
          avg_milestone_points: 5,
          avg_milestones_won: 1,
          avg_placement: 1,
          avg_points: 91,
          avg_tr_points: 31,
          first_place_finishes: 2,
          plays: 2,
          prelude_name: 'Allied Bank',
          second_place_finishes: 0,
          third_plus_finishes: 0,
          win_rate: 1,
        },
      ],
      tagWins: [],
      totalGames: 3,
    };
    const finalTerraformingActionStats: FinalTerraformingActionStat[] = [
      {
        final_action_games: 2,
        final_action_rate: 0.67,
        final_action_win_rate: 1,
        final_action_wins: 2,
        imported_games: 3,
        most_common_action_count: 2,
        most_common_action_type: 'greenery',
        overall_win_rate: 0.67,
        overall_wins: 2,
        player_id: 'p1',
        player_name: 'Friday Mars',
        win_rate_delta: 0.33,
      },
    ];
    const sharedGameRows: SharedGameResultRow[] = [
      buildSharedGameRow({
        awardPoints: 3,
        cardPointsTotal: 20,
        citiesPoints: 8,
        gameId: 'g1',
        generationCount: 9,
        greeneryPoints: 12,
        isWinner: true,
        lossGapPoints: null,
        placement: 1,
        playedOn: '2026-06-01',
        playerId: 'p1',
        playerName: 'Friday Mars',
        totalPoints: 90,
        trPoints: 35,
        winDifferentialPoints: 5,
      }),
      buildSharedGameRow({
        gameId: 'g1',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-01',
        playerId: 'p2',
        playerName: 'Second Seat',
        totalPoints: 83,
      }),
      buildSharedGameRow({
        awardPoints: 0,
        cardPointsTotal: 12,
        citiesPoints: 4,
        gameId: 'g2',
        generationCount: 12,
        greeneryPoints: 8,
        isWinner: false,
        lossGapPoints: 6,
        milestonePoints: 0,
        placement: 2,
        playedOn: '2026-06-08',
        playerId: 'p1',
        playerName: 'Friday Mars',
        totalPoints: 75,
        trPoints: 28,
        winDifferentialPoints: null,
      }),
      buildSharedGameRow({
        gameId: 'g2',
        isWinner: true,
        placement: 1,
        playedOn: '2026-06-08',
        playerId: 'p2',
        playerName: 'Second Seat',
        totalPoints: 88,
      }),
      buildSharedGameRow({
        awardPoints: 5,
        cardPointsTotal: 24,
        citiesPoints: 6,
        gameId: 'g3',
        generationCount: 10,
        greeneryPoints: 10,
        isWinner: true,
        lossGapPoints: null,
        placement: 1,
        playedOn: '2026-06-15',
        playerId: 'p1',
        playerName: 'Friday Mars',
        totalPoints: 92,
        trPoints: 32,
        winDifferentialPoints: 4,
      }),
      buildSharedGameRow({
        gameId: 'g3',
        isWinner: false,
        placement: 2,
        playedOn: '2026-06-15',
        playerId: 'p3',
        playerName: 'Third Seat',
        totalPoints: 80,
      }),
    ];

    render(
      <InsightsDashboard
        analytics={buildEmptyGroupAnalyticsFixture()}
        currentUserCanonicalId="user:me"
        extended={buildExtendedFixture()}
        finalTerraformingActionStats={finalTerraformingActionStats}
        focusPeople={[
          buildFocusPerson({
            bundle: {
              coverage: null,
              headToHeadRows: [
                {
                  averageScoreDifferential: 4,
                  gamesPlayed: 3,
                  label: 'Friday Mars vs Second Seat',
                  losses: 1,
                  ties: 0,
                  wins: 2,
                },
              ],
              performance: null,
              scoreAverages: emptyScoreAverages,
              styleBreakdownRows: [],
              trendRows: [
                {
                  gameId: 'g1',
                  generationCount: 9,
                  groupId: 'group-1',
                  inferredPrimaryStyleCode: 'engine_builder',
                  isWinner: true,
                  placement: 1,
                  playedOn: '2026-06-01',
                  playerId: 'p1',
                  playerName: 'Friday Mars',
                  totalPoints: 90,
                },
              ],
            },
            canonicalId: 'user:me',
            displayName: 'Friday Mars',
            playerIds: ['p1'],
          }),
          buildFocusPerson({
            bundle: {
              coverage: null,
              headToHeadRows: [],
              performance: null,
              scoreAverages: emptyScoreAverages,
              trendRows: [],
            },
            canonicalId: 'name:second seat',
            displayName: 'Second Seat',
            playerIds: ['p2'],
          }),
        ]}
        overallAnalytics={{
          ...buildEmptyGroupAnalyticsFixture(),
          playerInteractionRows: [
            {
              averagePlacement: 1.33,
              averageScore: 88.1,
              gamesPlayed: 3,
              groupId: 'overall',
              interactionType: 'corporation_prelude_pair',
              label: 'Tharsis Republic | Allied Bank',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              winRate: 0.67,
              wins: 2,
            },
          ],
          playerStylePerformanceRows: [
            {
              averageGenerationCount: 10.5,
              averagePlacement: 1.5,
              averageScore: 82,
              gamesPlayed: 2,
              groupId: 'overall',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              styleCode: 'engine_builder',
              winRate: 0.5,
              wins: 1,
            },
            {
              averageGenerationCount: 9,
              averagePlacement: 1,
              averageScore: 90,
              gamesPlayed: 1,
              groupId: 'overall',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              styleCode: 'board_control',
              winRate: 1,
              wins: 1,
            },
          ],
          styleAgreementRows: [
            {
              averageInferredConfidence: 0.8,
              comparedGames: 3,
              exactMatchRate: 0.67,
              groupId: 'overall',
              mismatchRate: 0,
              partialMatchRate: 0.33,
              playerId: 'user:me',
              playerName: 'Friday Mars',
            },
          ],
        } as never}
        overallExtended={buildExtendedFixture({
          cardOutcomeRows: [
            {
              cardId: 'earth-catapult',
              cardName: 'Earth Catapult',
              fullImageUrl: null,
              gameId: 'g1',
              groupId: 'overall',
              isWinner: true,
              playedOn: '2026-06-01',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              thumbnailUrl: null,
            },
          ],
          generationPaceRows: [
            {
              awardsFunded: 0,
              cardsPlayed: 2,
              citiesPlaced: 0,
              gameId: 'g1',
              generationNumber: 1,
              greeneriesPlaced: 1,
              groupId: 'overall',
              milestonesClaimed: 0,
              playedOn: '2026-06-01',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              tilesPlaced: 1,
            },
            {
              awardsFunded: 1,
              cardsPlayed: 1,
              citiesPlaced: 0,
              gameId: 'g1',
              generationNumber: 9,
              greeneriesPlaced: 1,
              groupId: 'overall',
              milestonesClaimed: 0,
              playedOn: '2026-06-01',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              tilesPlaced: 1,
            },
            {
              awardsFunded: 0,
              cardsPlayed: 1,
              citiesPlaced: 1,
              gameId: 'g2',
              generationNumber: 12,
              greeneriesPlaced: 0,
              groupId: 'overall',
              milestonesClaimed: 0,
              playedOn: '2026-06-08',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              tilesPlaced: 1,
            },
          ],
          playerMapPerformanceRows: [
            {
              averagePlacement: 1.33,
              averageScore: 85.7,
              gamesPlayed: 3,
              groupId: 'overall',
              mapId: 'map-tharsis',
              mapName: 'Tharsis',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              winRate: 0.67,
              wins: 2,
            },
          ],
          tilePlacementRows: [
            {
              boardSpace: 'A1',
              gameId: 'g1',
              groupId: 'overall',
              mapName: 'Tharsis',
              placements: 1,
              playedOn: '2026-06-01',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              tileType: 'greenery',
            },
            {
              boardSpace: 'B1',
              gameId: 'g2',
              groupId: 'overall',
              mapName: 'Tharsis',
              placements: 1,
              playedOn: '2026-06-08',
              playerId: 'user:me',
              playerName: 'Friday Mars',
              tileType: 'city',
            },
          ],
        })}
        personalSelectionStats={personalSelectionStats}
        scopeMode="individual"
        sharedGameRows={sharedGameRows}
      />,
    );

    const playerFocus = screen.getByLabelText(/player focus/i);

    expect(playerFocus).not.toBeDisabled();
    expect(playerFocus).toHaveValue('user:me');
    expect(
      screen.queryByText(/always follows your signed-in player/i),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /Expanded Individual Metrics/i }),
    ).toBeInTheDocument();

    for (const heading of [
      'Win Condition Delta',
      'Game Length Fit',
      'Opening Tempo Profile',
      'Endgame Conversion',
      'Opponent-Adjusted Performance',
      'Style Fit Gap',
      'Signature Selection Lift',
      'Interaction Resilience',
      'Board Control Efficiency',
      'Reliability / Volatility',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    expect(screen.getAllByText('Tharsis Republic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('greenery').length).toBeGreaterThan(0);

    await user.selectOptions(playerFocus, 'name:second seat');

    expect(playerFocus).toHaveValue('name:second seat');
    expect(screen.getByText(/Focused on Second Seat overall/i)).toBeInTheDocument();
  });

  it('does not surface promo catalog or map expansion interactions as stats', () => {
    render(
      <InsightsDashboard
        analytics={{
          coverage: null,
          groupInteractionRows: [
            {
              averagePlacement: 1.4,
              averageScore: 89.4,
              gamesPlayed: 5,
              groupId: 'group-1',
              interactionType: 'map_expansion_mix',
              label: 'Hellas | Prelude',
              winRate: 0.8,
            },
          ],
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
        } as never}
        extended={buildExtendedFixture()}
        focusPeople={[]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture()}
      />,
    );

    expect(screen.queryByText(/promo catalog/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Interaction Insights/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Hellas \| Prelude/i)).not.toBeInTheDocument();
  });

  it('lets the user focus comparisons on a selected player', async () => {
    const user = userEvent.setup();

    render(
      <InsightsDashboard
        analytics={{
          coverage: {
            animalCoverage: 0.25,
            cardBreakdownCoverage: 0.5,
            declaredStyleCoverage: 0.75,
            finalizedGames: 4,
            finalizedPlayerResults: 16,
            groupId: 'group-1',
            jovianCoverage: 0.5,
            keyCardCoverage: 0.25,
            microbeCoverage: 0.75,
          },
          headToHeadRows: [
            {
              averagePlacementEdge: 0.5,
              averageScoreDifferential: 4.2,
              gamesPlayed: 4,
              groupId: 'group-1',
              leftPlayerId: 'p1',
              leftPlayerName: 'Friday Mars',
              leftWins: 3,
              rightPlayerId: 'p2',
              rightPlayerName: 'Second Seat',
              rightWins: 1,
              ties: 0,
            },
          ],
          leaderboardRows: [
            {
              averageLossGap: 2.5,
              averagePlacement: 1.25,
              averageScore: 84.5,
              averageWinMargin: 6.2,
              differentialComponent: 0.067,
              gamesPlayed: 4,
              groupId: 'group-1',
              placementComponent: 0.281,
              playerId: 'p1',
              playerName: 'Friday Mars',
              weightedScore: 0.723,
              winRate: 0.75,
              winRateComponent: 0.375,
              wins: 3,
            },
            {
              averageLossGap: 5.1,
              averagePlacement: 2.25,
              averageScore: 78.1,
              averageWinMargin: 3.5,
              differentialComponent: -0.02,
              gamesPlayed: 4,
              groupId: 'group-1',
              placementComponent: 0.188,
              playerId: 'p2',
              playerName: 'Second Seat',
              weightedScore: 0.468,
              winRate: 0.25,
              winRateComponent: 0.125,
              wins: 1,
            },
          ],
          lineupEffectRows: [
            {
              averageGenerationCount: 10.7,
              averagePlacement: 1.33,
              averageScore: 86.4,
              gamesPlayed: 3,
              groupId: 'group-1',
              lineupLabel: 'Second Seat, Third Seat',
              playerId: 'p1',
              playerName: 'Friday Mars',
              winRate: 0.667,
            },
            {
              averageGenerationCount: 11.5,
              averagePlacement: 2.33,
              averageScore: 76.4,
              gamesPlayed: 3,
              groupId: 'group-1',
              lineupLabel: 'Friday Mars, Third Seat',
              playerId: 'p2',
              playerName: 'Second Seat',
              winRate: 0.333,
            },
          ],
          groupInteractionRows: [
            {
              averagePlacement: 1.4,
              averageScore: 89.4,
              gamesPlayed: 5,
              groupId: 'group-1',
              interactionType: 'corporation_prelude_pair',
              label: 'Tharsis Republic | Allied Bank',
              winRate: 0.8,
            },
          ],
          playerInteractionRows: [
            {
              averagePlacement: 1.67,
              averageScore: 86.1,
              gamesPlayed: 3,
              groupId: 'group-1',
              interactionType: 'corporation_prelude_pair',
              label: 'Tharsis Republic | Allied Bank',
              playerId: 'p2',
              playerName: 'Second Seat',
              winRate: 0.667,
            },
          ],
          playerTrendRows: [
            {
              gameId: 'g1',
              generationCount: 12,
              groupId: 'group-1',
              inferredPrimaryStyleCode: 'balanced',
              isWinner: false,
              placement: 3,
              playedOn: '2026-06-01',
              playerId: 'p1',
              playerName: 'Friday Mars',
              totalPoints: 72,
            },
            {
              gameId: 'g2',
              generationCount: 11,
              groupId: 'group-1',
              inferredPrimaryStyleCode: 'board_control',
              isWinner: true,
              placement: 1,
              playedOn: '2026-06-12',
              playerId: 'p1',
              playerName: 'Friday Mars',
              totalPoints: 86,
            },
            {
              gameId: 'g3',
              generationCount: 10,
              groupId: 'group-1',
              inferredPrimaryStyleCode: 'jovian_payoff',
              isWinner: true,
              placement: 1,
              playedOn: '2026-06-20',
              playerId: 'p2',
              playerName: 'Second Seat',
              totalPoints: 84,
            },
            {
              gameId: 'g4',
              generationCount: 9,
              groupId: 'group-1',
              inferredPrimaryStyleCode: 'jovian_payoff',
              isWinner: true,
              placement: 1,
              playedOn: '2026-06-28',
              playerId: 'p2',
              playerName: 'Second Seat',
              totalPoints: 92,
            },
          ],
          playerCoverages: [
            {
              animalCoverage: 0.5,
              cardBreakdownCoverage: 0.75,
              declaredStyleCoverage: 1,
              finalizedGames: 4,
              finalizedPlayerResults: 4,
              groupId: 'group-1',
              jovianCoverage: 0.75,
              keyCardCoverage: 0.5,
              microbeCoverage: 1,
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
          playerScoreAverages: [
            {
              averageAnimalPoints: 1.1,
              averageAwardPoints: 2.5,
              averageCardPoints: 16.2,
              averageCitiesPoints: 6.4,
              averageGreeneryPoints: 10.2,
              averageJovianPoints: 1.3,
              averageMicrobePoints: 0.8,
              averageMilestonePoints: 2.1,
              averageOtherCardPoints: 12.1,
              averageTrPoints: 24.3,
              groupId: 'group-1',
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
          playerStylePerformanceRows: [
            {
              averageGenerationCount: 10.5,
              averagePlacement: 1.5,
              averageScore: 89.2,
              gamesPlayed: 2,
              groupId: 'group-1',
              playerId: 'p2',
              playerName: 'Second Seat',
              styleCode: 'jovian_payoff',
              winRate: 1,
              wins: 2,
            },
          ],
          groupStylePerformanceRows: [
            {
              averageGenerationCount: 10.5,
              averagePlacement: 1.4,
              averageScore: 88.4,
              gamesPlayed: 4,
              groupId: 'group-1',
              styleCode: 'jovian_payoff',
              winRate: 0.75,
              wins: 3,
            },
          ],
          scoreAverages: {
            averageAnimalPoints: 2.1,
            averageAwardPoints: 3.5,
            averageCardPoints: 20.2,
            averageCitiesPoints: 7.4,
            averageGreeneryPoints: 11.6,
            averageJovianPoints: 3.3,
            averageMicrobePoints: 1.8,
            averageMilestonePoints: 4.1,
            averageOtherCardPoints: 11.2,
            averageTrPoints: 25.3,
          },
          styleAgreementRows: [
            {
              averageInferredConfidence: 0.82,
              comparedGames: 4,
              exactMatchRate: 0.5,
              groupId: 'group-1',
              mismatchRate: 0.25,
              partialMatchRate: 0.25,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
            {
              averageInferredConfidence: 0.76,
              comparedGames: 4,
              exactMatchRate: 0.25,
              groupId: 'group-1',
              mismatchRate: 0.5,
              partialMatchRate: 0.25,
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
        } as never}
        extended={buildExtendedFixture({
          generationDistributionRows: [
            { gamesPlayed: 2, generationCount: 10, groupId: 'group-1' },
            { gamesPlayed: 2, generationCount: 12, groupId: 'group-1' },
          ],
          milestoneEconomicsRows: [
            {
              averageClaimerPlacement: 1.3,
              claimRate: 0.75,
              claimerWinRate: 0.66,
              claimerWins: 2,
              claims: 3,
              groupId: 'group-1',
              milestoneId: 'm1',
              milestoneName: 'Terraformer',
            },
          ],
          placementDistributionRows: [
            {
              gamesPlayed: 3,
              groupId: 'group-1',
              placement: 1,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
            {
              gamesPlayed: 1,
              groupId: 'group-1',
              placement: 2,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
          ],
          playerCountPerformanceRows: [
            {
              averagePlacement: 1.5,
              averageScore: 82.3,
              gamesPlayed: 4,
              groupId: 'group-1',
              playerCount: 3,
              playerId: 'p1',
              playerName: 'Friday Mars',
              winRate: 0.5,
              wins: 2,
            },
          ],
        })}
        focusPeople={[
          buildFocusPerson({
            activeGroupPlayerId: 'p1',
            canonicalId: 'name:friday mars',
            displayName: 'Friday Mars',
            inActiveGroup: true,
            playerIds: ['p1'],
          }),
          buildFocusPerson({
            activeGroupPlayerId: 'p2',
            bundle: {
              coverage: null,
              headToHeadRows: [],
              performance: null,
              scoreAverages: emptyScoreAverages,
              trendRows: [
                {
                  gameId: 'g3',
                  generationCount: 10,
                  groupId: 'group-1',
                  inferredPrimaryStyleCode: 'jovian_payoff',
                  isWinner: true,
                  placement: 1,
                  playedOn: '2026-06-20',
                  playerId: 'p2',
                  playerName: 'Second Seat',
                  totalPoints: 84,
                },
                {
                  gameId: 'g4',
                  generationCount: 9,
                  groupId: 'group-1',
                  inferredPrimaryStyleCode: 'jovian_payoff',
                  isWinner: true,
                  placement: 1,
                  playedOn: '2026-06-28',
                  playerId: 'p2',
                  playerName: 'Second Seat',
                  totalPoints: 92,
                },
              ],
            },
            canonicalId: 'name:second seat',
            displayName: 'Second Seat',
            inActiveGroup: true,
            playerIds: ['p2'],
          }),
        ]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/insight scope/i), 'group');

    expect(screen.getByText(/Friday Mars currently leads the group/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Group Score Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Placement Spread/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Score Source Radar/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Table Size Performance$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Game Length$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Milestone Economics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Game Pace Replay/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Board Heatmap/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Best Style Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trend Over Time/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Interaction Insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tharsis Republic \| Allied Bank/i }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/player focus/i),
      'name:second seat',
    );

    expect(screen.getByText(/Focused on Second Seat/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Score Profile for Second Seat/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Jovian Payoff/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Friday Mars, Third Seat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /2026-06-28/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tharsis Republic \| Allied Bank/i }),
    ).toBeInTheDocument();
  });

  it('surfaces a cross-group person and hides group-only breakdowns for them', async () => {
    const user = userEvent.setup();

    render(
      <InsightsDashboard
        analytics={{
          coverage: null,
          groupInteractionRows: [],
          groupStylePerformanceRows: [],
          headToHeadRows: [],
          importCoverageRows: [],
          leaderboardRows: [
            {
              averageLossGap: 2.5,
              averagePlacement: 1.25,
              averageScore: 84.5,
              averageWinMargin: 6.2,
              differentialComponent: 0.067,
              gamesPlayed: 4,
              groupId: 'group-1',
              placementComponent: 0.281,
              playerId: 'p1',
              playerName: 'Friday Mars',
              weightedScore: 0.723,
              winRate: 0.75,
              winRateComponent: 0.375,
              wins: 3,
            },
          ],
          lineupEffectRows: [],
          playerCoverages: [],
          playerInteractionRows: [],
          playerScoreAverages: [],
          playerStylePerformanceRows: [],
          playerTrendRows: [],
          scoreAverages: emptyScoreAverages,
          styleAgreementRows: [],
        } as never}
        extended={buildExtendedFixture()}
        focusPeople={[
          buildFocusPerson({
            activeGroupPlayerId: null,
            bundle: {
              coverage: null,
              headToHeadRows: [
                {
                  averageScoreDifferential: -8.5,
                  gamesPlayed: 2,
                  label: 'Colette LeRoux vs Izzy Hodnett',
                  losses: 1,
                  ties: 0,
                  wins: 1,
                },
              ],
              performance: {
                averageLossGap: null,
                averagePlacement: 2,
                averageScore: 70,
                averageWinMargin: null,
                differentialComponent: 0,
                gamesPlayed: 2,
                groupId: 'other-group',
                placementComponent: 0.15,
                playerId: 'c1',
                playerName: 'Colette LeRoux',
                weightedScore: 0.4,
                winRate: 0.5,
                winRateComponent: 0.25,
                wins: 1,
              },
              scoreAverages: emptyScoreAverages,
              trendRows: [],
            },
            canonicalId: 'user:colette',
            displayName: 'Colette LeRoux',
            inActiveGroup: false,
            playerIds: ['c1'],
          }),
        ]}
        overallAnalytics={buildEmptyGroupAnalyticsFixture()}
        overallExtended={buildExtendedFixture()}
      />,
    );

    // Overall is the default scope, so the leaderboard spans shared games.
    expect(
      screen.getByRole('heading', { name: /Overall Weighted Leaderboard/i }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/player focus/i),
      'user:colette',
    );

    expect(screen.getByText(/Focused on Colette LeRoux overall/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Score Profile for Colette LeRoux/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Colette LeRoux vs Izzy Hodnett/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Selected Group Unavailable/i }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/insight scope/i), 'group');

    // Group-only breakdowns collapse into a single explanatory notice.
    expect(
      screen.getByRole('heading', { name: /Selected Group Unavailable/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Weighted Leaderboard Comparison/i }),
    ).not.toBeInTheDocument();
  });
});
