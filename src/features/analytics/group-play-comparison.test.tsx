import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LeaderboardRow } from '@/lib/db/analytics-repo';
import { GroupPlayComparison } from './group-play-comparison';

function leaderboardRow(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    averageLossGap: null,
    averagePlacement: 2,
    averageScore: 80,
    averageWinMargin: null,
    differentialComponent: 0,
    gamesPlayed: 10,
    groupId: 'group-1',
    placementComponent: 0,
    playerId: 'player-1',
    playerName: 'Izzy Hodnett',
    weightedScore: 50,
    winRate: 0.5,
    winRateComponent: 0,
    wins: 5,
    ...overrides,
  };
}

const groups = [
  { groupId: 'group-1', groupName: 'Mars Club' },
  { groupId: 'group-2', groupName: 'Terraformers' },
];

describe('GroupPlayComparison', () => {
  it('renders a group dropdown and deltas of group play versus overall', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={leaderboardRow({
          averagePlacement: 1.5,
          averageScore: 95,
          gamesPlayed: 4,
          groupId: 'group-2',
          weightedScore: 60,
          winRate: 0.75,
        })}
      />,
    );

    const dropdown = screen.getByLabelText('Group');
    expect(dropdown).toHaveValue('group-2');
    expect(
      screen.getByRole('option', { name: 'Mars Club' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Terraformers' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('4 finalized games in this group | 10 overall'),
    ).toBeInTheDocument();
    expect(screen.getByText('+10 vs overall')).toBeInTheDocument();
    expect(screen.getByText('+15 vs overall')).toBeInTheDocument();
    expect(screen.getByText('+25 pp vs overall')).toBeInTheDocument();
    expect(screen.getByText('-0.50 vs overall')).toBeInTheDocument();
  });

  it('explains when the player has no finalized games in the selected group', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={null}
      />,
    );

    expect(
      screen.getByText(/has no finalized games in this group yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/vs overall$/)).not.toBeInTheDocument();
  });

  it('asks the user to link a saved player when none is linked', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={null}
        playerName={null}
        selectedGroupId="group-1"
        selectedGroupPerformance={null}
      />,
    );

    expect(
      screen.getByRole('link', { name: /link saved player/i }),
    ).toHaveAttribute('href', '/group/players');
  });

  it('shows fallback copy when the comparison cannot be loaded', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={null}
        playerName={null}
        selectedGroupId="group-1"
        selectedGroupPerformance={null}
        unavailable
      />,
    );

    expect(
      screen.getByText(/couldn't load your finalized-game comparison/i),
    ).toBeInTheDocument();
  });
});
