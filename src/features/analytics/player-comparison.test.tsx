import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  CrossGroupFocusPerson,
  GroupInteractionRow,
  LeaderboardRow,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import type { TagOutcomeRow } from '@/lib/db/extended-analytics-repo';
import { PlayerComparison } from './player-comparison';

function performance(
  overrides: Partial<LeaderboardRow> = {},
): LeaderboardRow {
  return {
    averageLossGap: null,
    averagePlacement: 2,
    averageScore: 80,
    averageWinMargin: null,
    differentialComponent: 0,
    gamesPlayed: 4,
    groupId: 'overall',
    placementComponent: 0,
    playerId: 'player-1',
    playerName: 'Izzy Mars',
    weightedScore: 0.5,
    winRate: 0.5,
    winRateComponent: 0,
    wins: 2,
    ...overrides,
  };
}

function scoreAverages(
  overrides: Partial<ScoreSourceAverages> = {},
): ScoreSourceAverages {
  return {
    averageAnimalPoints: 0,
    averageAwardPoints: 2,
    averageCardPoints: 12,
    averageCitiesPoints: 4,
    averageGreeneryPoints: 8,
    averageJovianPoints: 0,
    averageMicrobePoints: 0,
    averageMilestonePoints: 3,
    averageOtherCardPoints: 5,
    averageTrPoints: 25,
    ...overrides,
  };
}

function person(
  overrides: Partial<CrossGroupFocusPerson> = {},
): CrossGroupFocusPerson {
  return {
    activeGroupPlayerId: 'player-1',
    bundle: {
      coverage: null,
      headToHeadRows: [],
      performance: performance(),
      scoreAverages: scoreAverages(),
      styleBreakdownRows: [
        {
          averagePlacement: 1.5,
          averageScore: 84,
          gamesPlayed: 3,
          playRate: 0.75,
          styleCode: 'terraform_rush',
          styleName: 'Terraform Rush',
          winRate: 0.667,
          wins: 2,
        },
      ],
      trendRows: [],
    },
    canonicalId: 'user:user-1',
    displayName: 'Izzy Mars',
    inActiveGroup: true,
    playerIds: ['player-1'],
    ...overrides,
  };
}

function interaction(
  overrides: Partial<GroupInteractionRow & { playerId: string; playerName: string }>,
) {
  return {
    averagePlacement: 1.5,
    averageScore: 84,
    gamesPlayed: 3,
    groupId: 'overall',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Tharsis Republic | Merger',
    playerId: 'user:user-1',
    playerName: 'Izzy Mars',
    winRate: 0.667,
    wins: 2,
    ...overrides,
  };
}

function tagOutcome(overrides: Partial<TagOutcomeRow>): TagOutcomeRow {
  return {
    corporationId: 'corp-1',
    corporationName: 'Tharsis Republic',
    gameId: 'game-1',
    groupId: 'overall',
    isWinner: true,
    playedOn: '2026-07-01',
    playerId: 'user:user-1',
    playerName: 'Izzy Mars',
    tagCode: 'plant',
    tagCount: 3,
    totalPoints: 80,
    ...overrides,
  };
}

describe('PlayerComparison', () => {
  it('compares the signed-in player with a faced opponent across core categories', () => {
    const self = person({
      bundle: {
        ...person().bundle,
        headToHeadRows: [
          {
            averageScoreDifferential: 6,
            gamesPlayed: 3,
            label: 'Izzy Mars vs Alex Green',
            losses: 1,
            opponentId: 'name:alex-green',
            ties: 0,
            wins: 2,
          },
        ],
        trendRows: [
          {
            gameId: 'game-1',
            generationCount: 10,
            groupId: 'overall',
            inferredPrimaryStyleCode: null,
            isWinner: true,
            placement: 1,
            playedOn: '2026-07-01',
            playerId: 'user:user-1',
            playerName: 'Izzy Mars',
            totalPoints: 84,
          },
        ],
      },
    });
    const opponent = person({
      activeGroupPlayerId: 'player-2',
      bundle: {
        coverage: null,
        headToHeadRows: [],
        performance: performance({
          averagePlacement: 2.5,
          averageScore: 74,
          playerId: 'player-2',
          playerName: 'Alex Green',
          winRate: 0.25,
          wins: 1,
        }),
        scoreAverages: scoreAverages({
          averageCardPoints: 20,
          averageGreeneryPoints: 3,
          averageTrPoints: 18,
        }),
        styleBreakdownRows: [
          {
            averagePlacement: 2,
            averageScore: 78,
            gamesPlayed: 2,
            playRate: 0.5,
            styleCode: 'science_combo',
            styleName: 'Science Combo',
            winRate: 0.5,
            wins: 1,
          },
        ],
        trendRows: [
          {
            gameId: 'game-2',
            generationCount: 10,
            groupId: 'overall',
            inferredPrimaryStyleCode: null,
            isWinner: false,
            placement: 2,
            playedOn: '2026-07-02',
            playerId: 'name:alex-green',
            playerName: 'Alex Green',
            totalPoints: 74,
          },
        ],
      },
      canonicalId: 'name:alex-green',
      displayName: 'Alex Green',
      playerIds: ['player-2'],
    });

    render(
      <PlayerComparison
        overallAnalytics={{
          playerInteractionRows: [
            interaction({}),
            interaction({
              label: 'Saturn Systems | Donation',
              playerId: 'name:alex-green',
              playerName: 'Alex Green',
              winRate: 0.25,
              wins: 1,
            }),
          ],
        }}
        overallExtended={{
          tagOutcomeRows: [
            tagOutcome({}),
            tagOutcome({
              gameId: 'game-2',
              isWinner: false,
              playerId: 'name:alex-green',
              playerName: 'Alex Green',
              tagCode: 'science',
              tagCount: 4,
            }),
          ],
        }}
        people={[self, opponent]}
        selectedOpponentId="name:alex-green"
        selfCanonicalId="user:user-1"
      />,
    );

    expect(screen.getByLabelText(/player faced/i)).toHaveValue('name:alex-green');
    expect(screen.getByText(/direct record: 2-1-0/i)).toBeInTheDocument();
    expect(screen.getByText(/record and win rate/i)).toBeInTheDocument();
    expect(screen.getAllByText(/terraform rush/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/science combo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/preferred point sources/i)).toBeInTheDocument();
    expect(screen.getByText(/tag profiles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/plant/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/science/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/preferred corporations and preludes/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/tharsis republic \| merger/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/saturn systems \| donation/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/additional compare points/i)).toBeInTheDocument();
    expect(screen.getByText(/style clash/i)).toBeInTheDocument();
  });

  it('dedupes multi-corporation tag rows and scopes tag profiles to the compared games', () => {
    const self = person({
      bundle: {
        ...person().bundle,
        trendRows: [
          {
            gameId: 'shared-game',
            generationCount: 10,
            groupId: 'overall',
            inferredPrimaryStyleCode: null,
            isWinner: false,
            placement: 2,
            playedOn: '2026-07-01',
            playerId: 'user:user-1',
            playerName: 'Izzy Mars',
            totalPoints: 72,
          },
        ],
      },
    });
    const opponent = person({
      activeGroupPlayerId: 'player-2',
      bundle: {
        ...person().bundle,
        performance: performance({
          playerId: 'player-2',
          playerName: 'James Hodnett',
          winRate: 1,
          wins: 1,
        }),
        trendRows: [
          {
            gameId: 'shared-game',
            generationCount: 10,
            groupId: 'overall',
            inferredPrimaryStyleCode: null,
            isWinner: true,
            placement: 1,
            playedOn: '2026-07-01',
            playerId: 'user:rev-loki',
            playerName: 'RevLoki',
            totalPoints: 88,
          },
        ],
      },
      canonicalId: 'user:rev-loki',
      displayName: 'RevLoki',
      playerIds: ['player-2'],
    });

    render(
      <PlayerComparison
        overallAnalytics={{
          playerInteractionRows: [],
        }}
        overallExtended={{
          tagOutcomeRows: [
            tagOutcome({
              corporationId: 'corp-1',
              corporationName: 'Arklight',
              gameId: 'shared-game',
              isWinner: true,
              playerId: 'user:rev-loki',
              playerName: 'RevLoki',
              tagCode: 'building',
              tagCount: 4,
            }),
            tagOutcome({
              corporationId: 'corp-2',
              corporationName: 'Vitor',
              gameId: 'shared-game',
              isWinner: true,
              playerId: 'user:rev-loki',
              playerName: 'RevLoki',
              tagCode: 'building',
              tagCount: 4,
            }),
            tagOutcome({
              gameId: 'other-game',
              isWinner: false,
              playerId: 'user:rev-loki',
              playerName: 'RevLoki',
              tagCode: 'building',
              tagCount: 20,
            }),
            tagOutcome({
              gameId: 'shared-game',
              isWinner: true,
              playerId: 'user:rev-loki',
              playerName: 'RevLoki',
              tagCode: 'science',
              tagCount: 0,
            }),
          ],
        }}
        people={[self, opponent]}
        selectedOpponentId="user:rev-loki"
        selfCanonicalId="user:user-1"
      />,
    );

    expect(screen.getByText(/4 \/ game \| 100% wins with tag/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/24 \/ game|20 \/ game|science/i),
    ).not.toBeInTheDocument();
  });
});
