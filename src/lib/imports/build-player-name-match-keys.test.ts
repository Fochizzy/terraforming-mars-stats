import { describe, expect, it } from 'vitest';
import { buildPlayerNameMatchKeys } from './build-player-name-match-keys';

describe('buildPlayerNameMatchKeys', () => {
  it('adds the leading name token so an in-game name matches a full participant name', () => {
    expect(buildPlayerNameMatchKeys(['Izzy Hodnett', 'Colette LeRox'])).toEqual([
      { keys: ['izzy hodnett', 'izzy'], playerName: 'Izzy Hodnett' },
      { keys: ['colette lerox', 'colette'], playerName: 'Colette LeRox' },
    ]);
  });

  it('leaves a single-token name with just its own key', () => {
    expect(buildPlayerNameMatchKeys(['Izzy'])).toEqual([
      { keys: ['izzy'], playerName: 'Izzy' },
    ]);
  });

  it('drops a leading token two players share, which could not identify either', () => {
    expect(
      buildPlayerNameMatchKeys(['James Hodnett', 'James Cole']),
    ).toEqual([
      { keys: ['james hodnett'], playerName: 'James Hodnett' },
      { keys: ['james cole'], playerName: 'James Cole' },
    ]);
  });

  it('drops a leading token that is another player’s whole name', () => {
    expect(buildPlayerNameMatchKeys(['Izzy Hodnett', 'Izzy'])).toEqual([
      { keys: ['izzy hodnett'], playerName: 'Izzy Hodnett' },
      { keys: ['izzy'], playerName: 'Izzy' },
    ]);
  });
});
