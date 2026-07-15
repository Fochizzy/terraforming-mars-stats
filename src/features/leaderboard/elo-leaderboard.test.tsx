import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EloLeaderboard } from './elo-leaderboard';
import type { EloLeaderboardRow } from '@/lib/elo-leaderboard-model';

const actionMocks = vi.hoisted(() => ({
  toggleHiddenLeaderboardPlayer: vi.fn(),
}));

vi.mock('@/app/(app)/leaderboard/actions', () => ({
  toggleHiddenLeaderboardPlayer: actionMocks.toggleHiddenLeaderboardPlayer,
}));

const rows: EloLeaderboardRow[] = [
  {
    averageWinMargin: 12,
    eloRating: 1620,
    gamesPlayed: 10,
    lastChange: 8,
    playerId: 'player-1',
    playerName: 'Gold Player',
    winRate: 0.6,
    wins: 6,
  },
  {
    averageWinMargin: 8,
    eloRating: 1580,
    gamesPlayed: 10,
    lastChange: 2,
    playerId: 'player-2',
    playerName: 'Silver Player',
    winRate: 0.5,
    wins: 5,
  },
  {
    averageWinMargin: 4,
    eloRating: 1540,
    gamesPlayed: 10,
    lastChange: -1,
    playerId: 'player-3',
    playerName: 'Bronze Player',
    winRate: 0.4,
    wins: 4,
  },
  {
    averageWinMargin: null,
    eloRating: 1500,
    gamesPlayed: 10,
    lastChange: 0,
    playerId: 'player-4',
    playerName: 'Fourth Player',
    winRate: 0.3,
    wins: 3,
  },
];

describe('EloLeaderboard', () => {
  it('uses gold, silver, and bronze emblems for the first three places', () => {
    const { container } = render(
      <EloLeaderboard initialHiddenIds={[]} rows={rows} />,
    );

    expect(
      screen.getByRole('img', {
        name: /gold first-place terraforming mars emblem/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: /silver second-place terraforming mars emblem/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: /bronze third-place terraforming mars emblem/i,
      }),
    ).toBeInTheDocument();
    expect(container.querySelector('[src*="leaderboard-trophy"]')).toBeNull();
  });

  it('uses hidden players instead of a duplicate tracked leaderboard', () => {
    render(<EloLeaderboard initialHiddenIds={['player-2']} rows={rows} />);

    expect(screen.queryByText(/private watchlist/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/global field/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /my leaderboard/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /silver player/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /silver player/i }),
    ).toBeInTheDocument();
  });

  it('hides and restores players from the personal leaderboard', () => {
    render(<EloLeaderboard initialHiddenIds={[]} rows={rows} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /hide gold player from my leaderboard/i,
      }),
    );

    expect(actionMocks.toggleHiddenLeaderboardPlayer).toHaveBeenCalledWith(
      'player-1',
      true,
    );
    expect(
      screen.queryByRole('heading', { name: /gold player/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /gold player/i }));

    expect(actionMocks.toggleHiddenLeaderboardPlayer).toHaveBeenCalledWith(
      'player-1',
      false,
    );
    expect(
      screen.getByRole('heading', { name: /gold player/i }),
    ).toBeInTheDocument();
  });
});
