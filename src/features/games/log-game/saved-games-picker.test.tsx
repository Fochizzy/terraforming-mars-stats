import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SavedGamesPicker } from './saved-games-picker';

describe('SavedGamesPicker', () => {
  it('renders draft and finalized rows with the right action labels', () => {
    render(
      <SavedGamesPicker
        deleteGameAction={async () => {}}
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
    const draftSection = screen
      .getByRole('heading', { name: /in progress games/i })
      .closest('section');
    const finalizedSection = screen
      .getByRole('heading', { name: /finished games/i })
      .closest('section');

    expect(draftSection).toHaveClass('tm-saved-game-section--draft');
    expect(finalizedSection).toHaveClass('tm-saved-game-section--finalized');
    expect(screen.getByLabelText(/in progress games count/i)).toHaveTextContent('1');
    expect(screen.getByLabelText(/finished games count/i)).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /resume draft/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-draft',
    );
    expect(screen.getByRole('link', { name: /correct players/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-final',
    );
    expect(screen.getByRole('link', { name: /resume draft/i }).closest('article')).toHaveClass(
      'tm-saved-game-card--draft',
    );
    expect(
      screen.getByRole('link', { name: /correct players/i }).closest('article'),
    ).toHaveClass('tm-saved-game-card--finalized');
    expect(screen.getByRole('button', { name: /delete draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete game/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2);
    expect(screen.getAllByText(/friday mars/i)).toHaveLength(2);
    expect(screen.getByText(/sam terraformer/i)).toBeInTheDocument();
  });

  it('keeps both saved game sections visible when they are empty', () => {
    render(<SavedGamesPicker deleteGameAction={async () => {}} games={[]} />);

    expect(screen.getByRole('heading', { name: /in progress games/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /finished games/i })).toBeInTheDocument();
    expect(screen.getByText(/no in-progress games are available/i)).toBeInTheDocument();
    expect(screen.getByText(/no finished games are available/i)).toBeInTheDocument();
  });
});
