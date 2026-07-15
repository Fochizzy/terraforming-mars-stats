import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardRow, ProfileAnalytics, ScoreSourceAverages } from '@/lib/db/analytics-repo';
import { GroupPlayComparison } from './group-play-comparison';

// next/navigation is used for auto-submit on select change
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

    // No separate View button — auto-submit on change
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();

    // Metric deltas
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('+25 pp')).toBeInTheDocument();
    expect(screen.getByText('0.50 places better')).toBeInTheDocument();
  });

  it('shows compact metadata badges instead of prose game-count sentence', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={leaderboardRow({
          gamesPlayed: 4,
          groupId: 'group-2',
        })}
      />,
    );

    const badges = screen.getByTestId('metadata-badges');
    expect(badges).toBeInTheDocument();
    expect(badges).toHaveTextContent('4 group games');
    expect(badges).toHaveTextContent('10 total games');
    // Old prose sentence must not appear
    expect(screen.queryByText(/finalized games in this group \|/)).not.toBeInTheDocument();
  });

  it('shows Early trend badge for fewer than 5 group games', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={leaderboardRow({
          gamesPlayed: 3,
          groupId: 'group-2',
        })}
      />,
    );

    expect(screen.getByText('Early trend')).toBeInTheDocument();
  });

  it('shows Developing trend badge for 5–9 group games', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={leaderboardRow({
          gamesPlayed: 7,
          groupId: 'group-2',
        })}
      />,
    );

    expect(screen.getByText('Developing trend')).toBeInTheDocument();
  });

  it('shows Established trend badge for 10 or more group games', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-1"
        selectedGroupPerformance={leaderboardRow({ gamesPlayed: 12 })}
      />,
    );

    expect(screen.getByText('Established trend')).toBeInTheDocument();
  });

  it('renders a Weighted Score tooltip with accessible label', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-1"
        selectedGroupPerformance={leaderboardRow()}
      />,
    );

    // The tooltip span carries an aria-label describing the metric
    const tooltip = screen.getByRole('img', {
      name: /composite performance metric/i,
    });
    expect(tooltip).toBeInTheDocument();
  });

  it('shows signed deltas with direction arrows in the table', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow({ averageScore: 70, weightedScore: 40, winRate: 0.4 })}
        playerName="Izzy Hodnett"
        selectedGroupId="group-2"
        selectedGroupPerformance={leaderboardRow({
          averageScore: 90,
          gamesPlayed: 5,
          groupId: 'group-2',
          weightedScore: 55,
          winRate: 0.6,
        })}
      />,
    );

    // Signed delta values should be present
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('+20 pp')).toBeInTheDocument();
  });

  it('formats averages to 2 decimal places, never 3', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow({ averageScore: 70.333 })}
        playerName="Izzy Hodnett"
        selectedGroupId="group-1"
        selectedGroupPerformance={leaderboardRow({ averageScore: 83.4567 })}
      />,
    );

    // Should show 2dp, not 3dp
    expect(screen.queryByText(/\.\d{3}/)).not.toBeInTheDocument();
  });

  it('renders scoring cards in a responsive grid', () => {
    const scoreAverages: ScoreSourceAverages = {
      averageAnimalPoints: 0,
      averageAwardPoints: 6,
      averageCardPoints: 20,
      averageCitiesPoints: 5,
      averageGreeneryPoints: 10,
      averageJovianPoints: 0,
      averageMicrobePoints: 0,
      averageMilestonePoints: 8,
      averageOtherCardPoints: 0,
      averageTrPoints: 24,
    };
    const profile: ProfileAnalytics = {
      cardOutcomes: [],
      coverage: null,
      expansionProfile: null,
      gameLengthProfile: null,
      globalParameterTempoProfile: null,
      headToHeadRows: [],
      keyCards: [],
      leadPressure: null,
      lossCards: [],
      performance: leaderboardRow(),
      phaseTempoProfile: null,
      playerId: 'player-1',
      playerName: 'Izzy',
      resourceRemovalProfile: null,
      scoreAverages,
      scorePace: null,
      styleAgreement: null,
      styleBreakdownRows: [],
      styleInsights: [],
      tagOutcomes: [],
    };
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        overallProfile={profile}
        playerName="Izzy Hodnett"
        selectedGroupId="group-1"
        selectedGroupPerformance={leaderboardRow()}
        selectedGroupProfile={profile}
      />,
    );

    const grid = screen.getByTestId('scoring-cards');
    expect(grid).toBeInTheDocument();
    // responsive classes are applied
    expect(grid.className).toMatch(/sm:grid-cols-2/);
    expect(grid.className).toMatch(/lg:grid-cols-3/);
  });

  it('shows merged Game Context section with Style and Pace subsections', () => {
    render(
      <GroupPlayComparison
        groups={groups}
        overallPerformance={leaderboardRow()}
        playerName="Izzy Hodnett"
        selectedGroupId="group-1"
        selectedGroupPerformance={leaderboardRow()}
      />,
    );

    const ctx = screen.getByTestId('game-context');
    expect(ctx).toBeInTheDocument();
    // Should contain both "Style" and "Pace" subsection labels
    expect(ctx).toHaveTextContent('Style');
    expect(ctx).toHaveTextContent('Pace');
    // Old separate section titles must not appear
    expect(screen.queryByRole('heading', { name: /Style Context/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Pace Context/i })).not.toBeInTheDocument();
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
