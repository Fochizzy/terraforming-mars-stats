import { describe, expect, it } from 'vitest';
import type { CardOutcomeRow } from '@/lib/db/extended-analytics-repo';
import {
  buildMostPlayedCardData,
  summarizeMostPlayedCards,
} from './card-outcomes-section';

function buildRow(overrides: Partial<CardOutcomeRow>): CardOutcomeRow {
  return {
    cardId: 'card-tharsis',
    cardName: 'Tharsis Republic',
    gameId: 'game-1',
    groupId: 'group-1',
    isWinner: true,
    playedOn: '2026-07-09',
    playerId: 'player-1',
    playerName: 'Izzy',
    ...overrides,
  };
}

const rows: CardOutcomeRow[] = [
  // Izzy plays Tharsis twice (winning once), plays Ants once (winning).
  buildRow({ gameId: 'game-1', isWinner: true }),
  buildRow({ gameId: 'game-2', isWinner: false }),
  buildRow({ cardId: 'card-ants', cardName: 'Ants', gameId: 'game-1', isWinner: true }),
  // James plays Tharsis once and loses.
  buildRow({
    gameId: 'game-3',
    isWinner: false,
    playerId: 'player-2',
    playerName: 'James',
  }),
  // Duplicate emission of an existing (game, player, card) result must not double count.
  buildRow({ gameId: 'game-1', isWinner: true }),
];

describe('buildMostPlayedCardData', () => {
  it('ranks cards by play count and collapses duplicate results', () => {
    expect(buildMostPlayedCardData(rows, null)).toEqual([
      {
        cardId: 'card-tharsis',
        cardName: 'Tharsis Republic',
        plays: 3,
        winRate: 33,
        wins: 1,
      },
      {
        cardId: 'card-ants',
        cardName: 'Ants',
        plays: 1,
        winRate: 100,
        wins: 1,
      },
    ]);
  });

  it('scopes to a single player when focused', () => {
    expect(buildMostPlayedCardData(rows, 'player-1')).toEqual([
      {
        cardId: 'card-tharsis',
        cardName: 'Tharsis Republic',
        plays: 2,
        winRate: 50,
        wins: 1,
      },
      {
        cardId: 'card-ants',
        cardName: 'Ants',
        plays: 1,
        winRate: 100,
        wins: 1,
      },
    ]);
  });

  it('honors the limit', () => {
    expect(buildMostPlayedCardData(rows, null, 1)).toHaveLength(1);
  });
});

describe('summarizeMostPlayedCards', () => {
  it('pools every result into a combined win rate', () => {
    const data = buildMostPlayedCardData(rows, null);

    expect(summarizeMostPlayedCards(data)).toEqual({
      cards: 2,
      plays: 4,
      winRate: 50,
      wins: 2,
    });
  });

  it('returns null when there is nothing played', () => {
    expect(summarizeMostPlayedCards([])).toBeNull();
  });
});
