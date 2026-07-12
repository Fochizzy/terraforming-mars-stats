import { render, screen, within } from '@testing-library/react';
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
      styleBreakdownRows: [
        {
          averagePlacement: 1.5,
          averageScore: 82,
          gamesPlayed: 3,
          playRate: 0.75,
          styleCode: 'board_control',
          styleName: 'Board Control',
          winRate: 0.667,
          wins: 2,
        },
        {
          averagePlacement: 2,
          averageScore: 88,
          gamesPlayed: 1,
          playRate: 0.25,
          styleCode: 'jovian_payoff',
          styleName: 'Jovian Payoff',
          winRate: 1,
          wins: 1,
        },
      ],
      styleInsights: [
        {
          body: 'Your most logged style is Board Control: 3 finishes out of 4 finalized style reads (75%), averaging place 1.5 and 82 points.',
          confidence: 'medium',
          evidenceLabel: '3 finalized style reads',
          sampleSize: 3,
          title: 'Style Identity',
        },
        {
          body: 'Imported game logs add texture to your Board Control games: Commercial District is your most repeated logged card there, appearing in 2 plays with a 50% win rate.',
          confidence: 'low',
          evidenceLabel: '2 logged card plays',
          sampleSize: 2,
          title: 'Game Log Signal',
        },
      ],
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
    expect(screen.getByText(/play analysis/i)).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', {
          name: /what friday mars does well/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      within(
        screen.getByRole('list', {
          name: /how friday mars could improve/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(4);
    expect(
      screen.getByText(/terraform rating is the strongest scoring lane/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/awards is the lightest major score source/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/styles breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/most played/i)).toBeInTheDocument();
    expect(screen.getByText(/most wins/i)).toBeInTheDocument();
    expect(screen.getAllByText(/board control/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jovian payoff/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/style insights/i)).toBeInTheDocument();
    expect(screen.getByText(/style identity/i)).toBeInTheDocument();
    expect(screen.getByText(/game log signal/i)).toBeInTheDocument();
    expect(screen.getByText(/commercial district/i)).toBeInTheDocument();
  });

  it('links out to the dedicated play comparison screen', () => {
    render(<ProfileDashboard playerName="Friday Mars" />);

    expect(
      within(
        screen.getByRole('list', {
          name: /what friday mars does well/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(
        screen.getByRole('list', {
          name: /how friday mars could improve/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(screen.getByText(/group comparisons/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open my play vs overall/i }),
    ).toHaveAttribute('href', '/profile/comparison');
  });


  it('renders an onboarding empty state when no linked player is available', () => {
    render(<ProfileDashboard linkHref="/group/players" playerName={null} />);

    expect(screen.getByText(/link a saved player profile/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /link saved player/i }),
    ).toHaveAttribute('href', '/group/players');
  });
});
