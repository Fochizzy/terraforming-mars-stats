import { describe, expect, it } from 'vitest';
import { rankPlayers } from './tie-utils';

describe('rankPlayers', () => {
  it('breaks ties with final megacredits and preserves true ties', () => {
    const ranked = rankPlayers([
      { playerId: 'a', totalPoints: 82, finalMegacredits: 14 },
      { playerId: 'b', totalPoints: 82, finalMegacredits: 10 },
      { playerId: 'c', totalPoints: 82, finalMegacredits: 10 },
    ]);

    expect(ranked[0]).toMatchObject({
      playerId: 'a',
      placement: 1,
      isWinner: true,
    });
    expect(ranked[1]).toMatchObject({
      playerId: 'b',
      placement: 2,
      isWinner: false,
    });
    expect(ranked[2]).toMatchObject({
      playerId: 'c',
      placement: 2,
      isWinner: false,
    });
  });
});
