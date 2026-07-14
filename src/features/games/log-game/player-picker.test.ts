import { describe, expect, it } from 'vitest';
import {
  findMatchingPlayerOptions,
  formatSelectedPlayerLabel,
} from './player-picker';

const playerOptions = [
  {
    id: 'player-1',
    display_name: 'friday-mars',
    linked_username: 'friday-mars',
  },
  {
    id: 'player-2',
    display_name: 'jhoward',
    linked_username: 'jhoward',
  },
  {
    id: 'player-3',
    display_name: 'jhodnett',
    linked_username: 'jhodnett',
  },
] as const;

describe('player picker helpers', () => {
  it('matches roster players by username without using a full name', () => {
    expect(
      findMatchingPlayerOptions({
        playerEntry: 'friday-mars',
        playerOptions: [...playerOptions],
      })[0]?.player.id,
    ).toBe('player-1');

    expect(
      findMatchingPlayerOptions({
        playerEntry: 'friday',
        playerOptions: [...playerOptions],
      })[0]?.player.id,
    ).toBe('player-1');

    expect(
      findMatchingPlayerOptions({
        playerEntry: 'Friday Hodnett',
        playerOptions: [...playerOptions],
      }),
    ).toEqual([]);
  });

  it('formats saved-player confirmations with usernames only', () => {
    expect(formatSelectedPlayerLabel(playerOptions[0])).toBe('friday-mars');
    expect(formatSelectedPlayerLabel(playerOptions[1])).toBe('jhoward');
  });

  it('keeps ambiguous username prefixes reviewable in list order', () => {
    const matches = findMatchingPlayerOptions({
      playerEntry: 'jho',
      playerOptions: [...playerOptions],
    });

    expect(matches.map((match) => match.player.id)).toEqual([
      'player-3',
      'player-2',
    ]);
    expect(matches[0]?.score).toBe(matches[1]?.score);
  });
});
