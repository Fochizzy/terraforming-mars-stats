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
    };

    render(
      <GroupDashboard {...props} />,
    );

    expect(screen.queryByText(/weighted leaderboard/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat, third seat/i)).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/key-card coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/3-1-0 over 4 games/i)).toBeInTheDocument();
  });

  it('renders no declared-style surfaces', () => {
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
    };

    render(<GroupDashboard {...props} />);

    expect(screen.queryByText(/declared style coverage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/style agreement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/declared-versus-inferred/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/declared/i);
  });
});
