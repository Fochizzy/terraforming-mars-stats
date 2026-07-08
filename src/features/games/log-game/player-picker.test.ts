import { describe, expect, it } from 'vitest';
import {
  findMatchingPlayerOptions,
  formatSelectedPlayerLabel,
} from './player-picker';

const playerOptions = [
  {
    id: 'player-1',
    display_name: 'Friday Mars',
    linked_full_name: 'Friday Mars',
    linked_username: 'friday-mars',
  },
  {
    id: 'player-2',
    display_name: 'James Howard',
    linked_full_name: 'James Howard',
    linked_username: 'jhoward',
  },
  {
    id: 'player-3',
    display_name: 'James Hodnett',
    linked_full_name: 'James Hodnett',
    linked_username: 'jhodnett',
  },
] as const;

describe('player picker helpers', () => {
  it('matches a roster player by username, full name, and first name plus last initial', () => {
    expect(
      findMatchingPlayerOptions({
        playerEntry: 'friday-mars',
        playerOptions: [...playerOptions],
      })[0]?.player.id,
    ).toBe('player-1');

    expect(
      findMatchingPlayerOptions({
        playerEntry: 'Friday Mars',
        playerOptions: [...playerOptions],
      })[0]?.player.id,
    ).toBe('player-1');

    expect(
      findMatchingPlayerOptions({
        playerEntry: 'Friday M',
        playerOptions: [...playerOptions],
      })[0]?.player.id,
    ).toBe('player-1');
  });

  it('formats saved-player confirmations with first name and username instead of the last name', () => {
    expect(formatSelectedPlayerLabel(playerOptions[0])).toBe('Friday (@friday-mars)');
    expect(formatSelectedPlayerLabel(playerOptions[1])).toBe('James (@jhoward)');
  });

  it('keeps ambiguous first name plus last initial matches reviewable in the list order', () => {
    const matches = findMatchingPlayerOptions({
      playerEntry: 'James H',
      playerOptions: [...playerOptions],
    });

    expect(matches.map((match) => match.player.id)).toEqual([
      'player-3',
      'player-2',
    ]);
    expect(matches[0]?.score).toBe(matches[1]?.score);
  });
});
