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
          clutchCloseRate: 0.5,
          consistencyIndex: 0.7143,
          closeGameWins: 1,
          closeGameWinRate: 0.5,
          gamesPlayed: 4,
          greeneryScoreShare: 0.12,
          groupId: 'group-1',
          milestoneScoreShare: 0.04,
          playerId: 'p1',
          tagEvidenceCoverage: 0.75,
          trScoreShare: 0.35,
          winConversionOverExpected: 0.1875,
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
          clutchCloseRate: 0.3333,
          consistencyIndex: 0.8,
          bestScoreSourceOnMap: 'Card Points',
          bestTagLaneOnMap: 'science',
          gamesPlayed: 4,
          groupId: 'group-1',
          mapId: '11111111-1111-4111-8111-111111111111',
          mapName: 'Tharsis',
          mapRankForPlayer: 1,
          playerId: 'p1',
          winConversionOverExpected: 0.125,
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
          winConversionOverExpected: 0.05,
          consistencyIndex: 0.76,
          clutchCloseRate: 0.4,
        },
      ],
      globalCorporationMetricRows: [
        {
          averageNormalizedEfficiency: 1.11,
          averagePoints: 86.2,
          averagePointsPerGeneration: 8.62,
          corporationId: 'corp-1',
          corporationName: 'CrediCor',
          gamesPlayed: 8,
          mapId: '22222222-2222-4222-8222-222222222222',
          mapName: 'Hellas',
          playerCount: 4,
          winConversionOverExpected: 0.175,
          consistencyIndex: 0.69,
          clutchCloseRate: 0.6667,
          winRate: 0.625,
          wins: 5,
        },
      ],
      globalStyleMetricRows: [
        {
          averageNormalizedEfficiency: 1.09,
          averagePoints: 84.1,
          averagePointsPerGeneration: 8.41,
          gamesPlayed: 7,
          mapId: null,
          mapName: null,
          playerCount: 4,
          styleCode: 'engine_builder',
          winConversionOverExpected: 0.0714,
          consistencyIndex: 0.72,
          clutchCloseRate: 0.5,
          winRate: 0.571,
          wins: 4,
        },
      ],
      globalTagMetricRows: [
        {
          averageNormalizedEfficiency: 1.14,
          averagePoints: 88.3,
          averagePointsPerGeneration: 8.83,
          averageTagCount: 6.4,
          gamesPlayed: 9,
          mapId: null,
          mapName: null,
          playerCount: 4,
          tagCode: 'science',
          winConversionOverExpected: 0.1667,
          consistencyIndex: 0.81,
          clutchCloseRate: 0.75,
          winRate: 0.667,
          wins: 6,
        },
      ],
      globalMilestoneMetricRows: [
        {
          averageClaimedGeneration: 6.5,
          averageWinnerPointsPerGeneration: 8.9,
          gamesPlayed: 6,
          mapId: null,
          mapName: null,
          milestoneId: 'milestone-1',
          milestoneName: 'Gardener',
          milestoneWinnerWinRate: 0.5,
          playerCount: 4,
          winnerWinConversionOverExpected: 0.125,
          winnerConsistencyIndex: 0.78,
          winnerClutchCloseRate: 0.5,
          winnerWins: 3,
        },
      ],
      globalAwardMetricRows: [
        {
          averageAwardRoi: -1.25,
          averageFundedGeneration: 7.25,
          awardId: 'award-1',
          awardName: 'Banker',
          awardWinnerWinRate: 0.5,
          funderSuccessRate: 0.75,
          funderWins: 2,
          gamesPlayed: 4,
          mapId: null,
          mapName: null,
          playerCount: 4,
          winnerFunderMismatchRate: 0.25,
          awardWinnerWinConversionOverExpected: 0.125,
          awardWinnerConsistencyIndex: 0.74,
          awardWinnerClutchCloseRate: 0.5,
          funderWinConversionOverExpected: 0.25,
          funderConsistencyIndex: 0.82,
          funderClutchCloseRate: 0.75,
          winnerWins: 2,
        },
      ],
      globalPlayerCountMetricRows: [
        {
          averageGenerations: 10.5,
          averagePoints: 83.4,
          averagePointsPerGeneration: 7.94,
          expectedScoreBaseline: 82.1,
          gamesPlayed: 11,
          playerCount: 4,
          winConversionOverExpected: 0.0909,
          consistencyIndex: 0.7,
          clutchCloseRate: 0.5455,
        },
      ],
      globalGenerationMetricRows: [
        {
          averagePoints: 85.7,
          averagePointsPerGeneration: 8.57,
          expectedScoreBaseline: 84.2,
          gamesPlayed: 5,
          generationCount: 10,
          winConversionOverExpected: 0.1,
          consistencyIndex: 0.68,
          clutchCloseRate: 0.6,
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
    expect(screen.getByText(/win conversion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\+18\.8 pts/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/consistency index/i)).toBeInTheDocument();
    expect(screen.getAllByText(/clutch close rate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/map performance/i)).toBeInTheDocument();
    expect(screen.getByText(/tharsis/i)).toBeInTheDocument();
    expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
    expect(screen.getAllByText(/hellas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/7 players/i)).toBeInTheDocument();
    expect(screen.getByText(/baseline 81.5/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Global Corporation Meta/i })).toBeInTheDocument();
    expect(screen.getAllByText(/CrediCor/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Global Style Meta/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Engine Builder/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Global Tag Meta/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Science/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Global Milestone Meta/i })).toBeInTheDocument();
    expect(screen.getByText(/Gardener/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Global Award Meta/i })).toBeInTheDocument();
    expect(screen.getByText(/Banker/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Global Player Count Baselines/i })).toBeInTheDocument();
    expect(screen.getByText(/4-player games/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Global Generation Baselines/i })).toBeInTheDocument();
    expect(screen.getByText(/10 generations/i)).toBeInTheDocument();
    expect(screen.getAllByText(/conversion \+9\.1 pts/i).length).toBeGreaterThan(0);
  });
});
