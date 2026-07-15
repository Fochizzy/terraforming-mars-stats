import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { ProfileDashboard } from './profile-dashboard';

describe('ProfileDashboard', () => {
  it('renders personal finalized-game analytics when a linked player exists', () => {
    const props: ComponentProps<typeof ProfileDashboard> = {
      coverage: {
        animalCoverage: 0.25,
        cardBreakdownCoverage: 0.5,
        declaredStyleCoverage: 0.75,
        finalizedGames: 4,
        finalizedPlayerResults: 4,
        groupId: 'group-1',
        jovianCoverage: 0.5,
        keyCardCoverage: 0.25,
        microbeCoverage: 0.75,
        playerId: 'p1',
        playerName: 'Friday Mars',
      },
      groupScoreAverages: {
        averageAnimalPoints: 1.7,
        averageAwardPoints: 4.2,
        averageCardPoints: 18.6,
        averageCitiesPoints: 8.1,
        averageGreeneryPoints: 10.4,
        averageJovianPoints: 2.9,
        averageMicrobePoints: 1.3,
        averageMilestonePoints: 3.6,
        averageOtherCardPoints: 9.8,
        averageTrPoints: 27.8,
      },
      headToHeadRows: [
        {
          averagePlacementEdge: 0.75,
          averageScoreDifferential: 5.8,
          gamesPlayed: 4,
          losses: 1,
          opponentName: 'Second Seat',
          ties: 0,
          wins: 3,
        },
      ],
      efficiencySummary: {
        averageAwardRoi: 1.4,
        averageExpectedScore: 80.2,
        averageLossGap: 2.5,
        averageNormalizedEfficiency: 1.08,
        averagePlacement: 1.25,
        averagePointsPerGeneration: 8.4,
        averageScore: 84.5,
        averageScoreDeltaVsExpected: 4.3,
        averageWinMargin: 6.2,
        awardScoreShare: 0.08,
        bestScoreSource: 'cards',
        bestTagLane: 'science',
        cardScoreShare: 0.32,
        citiesScoreShare: 0.1,
        closeGameCount: 2,
        closeGameWins: 1,
        closeGameWinRate: 0.5,
        gamesPlayed: 4,
        greeneryScoreShare: 0.14,
        groupId: 'group-1',
        milestoneScoreShare: 0.07,
        playerId: 'p1',
        tagEvidenceCoverage: 0.75,
        trScoreShare: 0.29,
        winRate: 0.75,
        wins: 3,
      },
      mapMetricRows: [
        {
          averageGenerations: 10,
          averageNormalizedEfficiency: 1.12,
          averagePoints: 84.5,
          averagePointsPerGeneration: 8.4,
          averageScoreDeltaVsExpected: 4.3,
          bestScoreSourceOnMap: 'cards',
          bestTagLaneOnMap: 'science',
          gamesPlayed: 3,
          groupId: 'group-1',
          mapId: 'tharsis',
          mapName: 'Tharsis',
          mapRankForPlayer: 1,
          playerId: 'p1',
          winRate: 0.67,
          wins: 2,
        },
      ],
      performance: {
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
      playerName: 'Friday Mars',
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
      styleAgreement: {
        comparedGames: 4,
        exactMatchRate: 0.5,
        mismatchRate: 0.25,
        partialMatchRate: 0.25,
      },
    };

    render(<ProfileDashboard {...props} />);

    expect(screen.getByText(/my performance/i)).toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /score source radar/i })).toBeInTheDocument();
    expect(screen.getAllByText(/group average/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/declared vs inferred style/i)).toBeInTheDocument();
    expect(screen.getByText(/based on 4 finalized games/i)).toBeInTheDocument();
    expect(screen.getByText(/efficiency summary/i)).toBeInTheDocument();
    expect(screen.getAllByText(/8\.4 pts\/gen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/84\.5 avg points/i)).toBeInTheDocument();
    expect(screen.getAllByText(/science/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/awards\/milestones\/coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/award roi/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.4x/i)).toBeInTheDocument();
    expect(screen.getByText(/tag evidence coverage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/75%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/milestone \/ award share/i)).toBeInTheDocument();
    expect(screen.getByText(/7% \/ 8%/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/2 close games/i)).toBeInTheDocument();
  });

  it('renders an onboarding empty state when no linked player is available', () => {
    render(<ProfileDashboard playerName={null} />);

    expect(screen.getByText(/link a saved player profile/i)).toBeInTheDocument();
  });
});
