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

    render(
      <ProfileDashboard {...props} />,
    );

    expect(screen.getByText(/my performance/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/profile group/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view group stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delta vs overall/i)).not.toBeInTheDocument();
    expect(screen.getByText(/4 finalized games overall/i)).toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat/i)).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/declared vs inferred style/i)).toBeInTheDocument();
    expect(screen.getByText(/based on 4 finalized games/i)).toBeInTheDocument();
  });

  it('renders per-group stats with deltas versus overall performance', () => {
    const overallPerformance = {
      averageLossGap: 2.5,
      averagePlacement: 2,
      averageScore: 80,
      averageWinMargin: 6.2,
      differentialComponent: 0.067,
      gamesPlayed: 10,
      groupId: 'linked-profile',
      placementComponent: 0.281,
      playerId: 'p1',
      playerName: 'Friday Mars',
      weightedScore: 0.6,
      winRate: 0.5,
      winRateComponent: 0.375,
      wins: 5,
    };

    render(
      <ProfileDashboard
        groupComparisons={[
          {
            groupId: 'group-1',
            groupName: 'Mars Club',
            performance: {
              ...overallPerformance,
              averagePlacement: 1.5,
              averageScore: 88,
              gamesPlayed: 6,
              weightedScore: 0.75,
              winRate: 0.75,
            },
          },
        ]}
        performance={overallPerformance}
        playerName="Friday Mars"
      />,
    );

    expect(screen.getByText(/group comparisons/i)).toBeInTheDocument();
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(
      screen.getByText(/6 finalized games in this group/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\+25 pp vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/\+8 vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/-0\.50 vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/\+0\.15 vs overall/i)).toBeInTheDocument();
  });

  it('renders a placeholder when no group comparisons are available yet', () => {
    render(<ProfileDashboard playerName="Friday Mars" />);

    expect(
      screen.getByText(/groups you have played in appear here automatically/i),
    ).toBeInTheDocument();
  });

  it('renders an onboarding empty state when no linked player is available', () => {
    render(<ProfileDashboard linkHref="/group/players" playerName={null} />);

    expect(screen.getByText(/link a saved player profile/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /link saved player/i }),
    ).toHaveAttribute('href', '/group/players');
  });
});
