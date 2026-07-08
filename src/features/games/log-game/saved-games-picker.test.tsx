import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SavedGamesPicker } from './saved-games-picker';

describe('SavedGamesPicker', () => {
  it('renders draft and finalized rows with the right action labels', () => {
    render(
      <SavedGamesPicker
        deleteDraftAction={async () => {}}
        games={[
          {
            gameId: 'game-draft',
            playedOn: '2026-07-07',
            playerCount: 2,
            playerNames: ['Friday Mars', 'Izzy Hodnett'],
            status: 'draft',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
          {
            gameId: 'game-final',
            playedOn: '2026-07-06',
            playerCount: 4,
            playerNames: ['Friday Mars', 'Sam Terraformer'],
            status: 'finalized',
            updatedAt: '2026-07-08T08:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: /saved games/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume draft/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-draft',
    );
    expect(screen.getByRole('link', { name: /correct players/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-final',
    );
    expect(screen.getByRole('button', { name: /delete draft/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1);
    expect(screen.getAllByText(/friday mars/i)).toHaveLength(2);
    expect(screen.getByText(/sam terraformer/i)).toBeInTheDocument();
  });
});
