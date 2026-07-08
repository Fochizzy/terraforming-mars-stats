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
      groupOptions: [
        { groupId: 'group-1', groupName: 'Friday Mars', role: 'owner' },
        { groupId: 'group-2', groupName: 'Tuesday Terraformers', role: 'editor' },
      ],
      overallPerformance: {
        averageLossGap: 3.5,
        averagePlacement: 1.5,
        averageScore: 80,
        averageWinMargin: 5.5,
        differentialComponent: 0.04,
        gamesPlayed: 10,
        groupId: 'linked-profile',
        placementComponent: 0.24,
        playerId: 'p1',
        playerName: 'Friday Mars',
        weightedScore: 0.68,
        winRate: 0.6,
        winRateComponent: 0.3,
        wins: 6,
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
      selectedGroupId: 'group-1',
      selectedGroupName: 'Friday Mars',
    };

    render(
      <ProfileDashboard {...props} />,
    );

    expect(screen.getByText(/my performance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profile group/i)).toHaveValue('group-1');
    expect(screen.getByText(/delta vs overall/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4\.50/)).toBeInTheDocument();
    expect(screen.getByText(/\+15 pp/)).toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat/i)).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/declared vs inferred style/i)).toBeInTheDocument();
    expect(screen.getByText(/based on 4 finalized games/i)).toBeInTheDocument();
  });

  it('renders an onboarding empty state when no linked player is available', () => {
    render(<ProfileDashboard linkHref="/group/players" playerName={null} />);

    expect(screen.getByText(/link a saved player profile/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /link saved player/i }),
    ).toHaveAttribute('href', '/group/players');
  });
});
