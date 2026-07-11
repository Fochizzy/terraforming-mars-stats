import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SavedGamesPicker } from './saved-games-picker';

describe('SavedGamesPicker', () => {
  it('renders draft and finalized rows with the right action labels', () => {
    render(
      <SavedGamesPicker
        deleteGameAction={async () => {}}
        reopenGameAction={async () => {}}
        games={[
          {
            gameId: 'game-draft',
            groupId: 'group-1',
            playedOn: '2026-07-07',
            playerCount: 2,
            playerNames: ['Friday Mars', 'Izzy Hodnett'],
            status: 'draft',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
          {
            gameId: 'game-final',
            groupId: 'group-2',
            playedOn: '2026-07-06',
            playerCount: 4,
            playerNames: ['Friday Mars', 'Sam Terraformer'],
            status: 'finalized',
            updatedAt: '2026-07-08T08:00:00.000Z',
          },
        ]}
        groups={[
          { groupId: 'group-1', groupName: 'Mars Club' },
          { groupId: 'group-2', groupName: 'Second Table' },
        ]}
        showGroupNames
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
      '/log-game/review?gameId=game-draft&groupId=group-1',
    );
    expect(screen.getByRole('link', { name: /correct players/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-final&groupId=group-2',
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
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(screen.getByText(/second table/i)).toBeInTheDocument();
  });

  it('offers reopen only on finished games', () => {
    render(
      <SavedGamesPicker
        deleteGameAction={async () => {}}
        reopenGameAction={async () => {}}
        games={[
          {
            gameId: 'game-draft',
            groupId: 'group-1',
            playedOn: '2026-07-07',
            playerCount: 2,
            playerNames: ['Friday Mars'],
            status: 'draft',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
          {
            gameId: 'game-final',
            groupId: 'group-1',
            playedOn: '2026-07-06',
            playerCount: 4,
            playerNames: ['Sam Terraformer'],
            status: 'finalized',
            updatedAt: '2026-07-08T08:00:00.000Z',
          },
        ]}
      />,
    );

    const reopenButtons = screen.getAllByRole('button', { name: /reopen/i });

    expect(reopenButtons).toHaveLength(1);
    expect(reopenButtons[0]).toHaveAccessibleName(
      /reopen game sam terraformer as a draft/i,
    );
    expect(reopenButtons[0]?.closest('article')).toHaveClass(
      'tm-saved-game-card--finalized',
    );
  });

  it('keeps both saved game sections visible when they are empty', () => {
    render(
      <SavedGamesPicker
        deleteGameAction={async () => {}}
        reopenGameAction={async () => {}}
        games={[]}
      />,
    );

    expect(screen.getByRole('heading', { name: /in progress games/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /finished games/i })).toBeInTheDocument();
    expect(screen.getByText(/no in-progress games are available/i)).toBeInTheDocument();
    expect(screen.getByText(/no finished games are available/i)).toBeInTheDocument();
  });
});
