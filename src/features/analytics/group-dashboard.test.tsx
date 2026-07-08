import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { GroupDashboard } from './group-dashboard';

describe('GroupDashboard', () => {
  it('renders finalized-game analytics sections with live data props', () => {
    const props: ComponentProps<typeof GroupDashboard> = {
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
      ],
      playerEfficiencySummaries: [
        {
          averageAwardRoi: 1.2,
          averageExpectedScore: 82.1,
          averageLossGap: 2.5,
          averageNormalizedEfficiency: 1.08,
          averagePlacement: 1.25,
          averagePointsPerGeneration: 8.45,
          averageScore: 84.5,
          averageScoreDeltaVsExpected: 2.4,
          averageWinMargin: 6.2,
          awardScoreShare: 0.05,
          bestScoreSource: 'Card Points',
          bestTagLane: 'science',
          cardScoreShare: 0.3,
          citiesScoreShare: 0.08,
          closeGameCount: 2,
          closeGameWins: 1,
          closeGameWinRate: 0.5,
          gamesPlayed: 4,
          greeneryScoreShare: 0.12,
          groupId: 'group-1',
          milestoneScoreShare: 0.04,
          playerId: 'p1',
          tagEvidenceCoverage: 0.75,
          trScoreShare: 0.35,
          winRate: 0.75,
          wins: 3,
        },
      ],
      playerMapMetricRows: [
        {
          averageGenerations: 10,
          averageNormalizedEfficiency: 1.12,
          averagePoints: 84.5,
          averagePointsPerGeneration: 8.45,
          averageScoreDeltaVsExpected: 3.2,
          bestScoreSourceOnMap: 'Card Points',
          bestTagLaneOnMap: 'science',
          gamesPlayed: 4,
          groupId: 'group-1',
          mapId: '11111111-1111-4111-8111-111111111111',
          mapName: 'Tharsis',
          mapRankForPlayer: 1,
          playerId: 'p1',
          winRate: 0.75,
          wins: 3,
        },
      ],
      globalMapMetricRows: [
        {
          averageGenerations: 10.4,
          averageNormalizedEfficiency: 1.02,
          averagePoints: 82.6,
          averagePointsPerGeneration: 7.94,
          bestTagLane: 'building',
          expectedScoreBaseline: 81.5,
          gamesPlayed: 12,
          highestEfficiencyStyleCode: 'engine_builder',
          highestWinRateCorporationId: 'credicor',
          mapId: '22222222-2222-4222-8222-222222222222',
          mapName: 'Hellas',
          playerCount: 7,
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
          comparedGames: 4,
          exactMatchRate: 0.5,
          mismatchRate: 0.25,
          partialMatchRate: 0.25,
          playerName: 'Friday Mars',
        },
      ],
    };

    render(
      <GroupDashboard {...props} />,
    );

    expect(screen.getByText(/weighted leaderboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat, third seat/i)).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/declared style coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/3-1-0 over 4 games/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /persisted efficiency/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /efficiency summary/i })).not.toBeInTheDocument();
    expect(screen.getByText(/top player/i)).toBeInTheDocument();
    expect(screen.getAllByText(/8.45 pts\/gen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/map performance/i)).toBeInTheDocument();
    expect(screen.getByText(/tharsis/i)).toBeInTheDocument();
    expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
    expect(screen.getByText(/hellas/i)).toBeInTheDocument();
    expect(screen.getByText(/7 players/i)).toBeInTheDocument();
    expect(screen.getByText(/baseline 81.5/i)).toBeInTheDocument();
  });
});
