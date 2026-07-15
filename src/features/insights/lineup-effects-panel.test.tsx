import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LineupEffectsPanel } from './lineup-effects-panel';

const rows = [
  {
    averageGenerationCount: 10.75,
    averagePlacement: 1.33,
    averageScore: 91.47,
    gamesPlayed: 15,
    groupId: 'group-1',
    lineupLabel: 'Second Seat, Third Seat',
    playerId: 'p1',
    playerName: 'Friday Mars',
    winRate: 0.6,
  },
  {
    averageGenerationCount: 11.25,
    averagePlacement: 2,
    averageScore: 80.93,
    gamesPlayed: 4,
    groupId: 'group-1',
    lineupLabel: 'Second Seat, Third Seat, Fourth Seat',
    playerId: 'p1',
    playerName: 'Friday Mars',
    winRate: 0.27,
  },
  {
    averageGenerationCount: 10,
    averagePlacement: 1.5,
    averageScore: 86.4,
    gamesPlayed: 8,
    groupId: 'group-1',
    lineupLabel: 'Friday Mars, Third Seat',
    playerId: 'p2',
    playerName: 'Second Seat',
    winRate: 0.5,
  },
];

describe('LineupEffectsPanel', () => {
  it('groups players, keeps full lineup names, and formats averages consistently', () => {
    render(<LineupEffectsPanel rows={rows} />);

    expect(
      screen.getAllByRole('heading', { name: 'Friday Mars' }),
    ).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        name: 'With Second Seat, Third Seat, Fourth Seat',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('91.5 avg pts')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('filters by sample size and table size', async () => {
    const user = userEvent.setup();
    render(<LineupEffectsPanel rows={rows} />);

    await user.selectOptions(screen.getByLabelText('Minimum lineup games'), '5');

    expect(screen.queryByText('4 games')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 3 lineups')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Lineup size'), '4');

    const emptyState = screen.getByText('No lineups match these filters.').parentElement;
    expect(emptyState).not.toBeNull();
    expect(within(emptyState as HTMLElement).getByText(/lower the minimum/i)).toBeInTheDocument();
  });
});
