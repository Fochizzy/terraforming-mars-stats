import { describe, expect, it } from 'vitest';
import {
  assertImportCandidateNamesWithinBounds,
  collectDistinctCandidateNames,
  MAX_IMPORT_CANDIDATE_NAME_LENGTH,
  MAX_IMPORT_CANDIDATE_NAMES,
  MAX_IMPORT_PLAYERS,
} from './import-candidate-name-bounds';

describe('import candidate name bounds', () => {
  it('pins the game maximum to what the draft schema and the games table allow', () => {
    // `games.player_count check (player_count between 1 and 5)` and
    // `logGameDraftSchema.playerCount.max(5)`. A looser bound here would let the
    // matcher answer questions about a game that could never be saved.
    expect(MAX_IMPORT_PLAYERS).toBe(5);
    expect(MAX_IMPORT_CANDIDATE_NAMES).toBe(10);
    expect(MAX_IMPORT_CANDIDATE_NAME_LENGTH).toBe(128);
  });

  it('counts the distinct question, not the repeated line', () => {
    expect(
      collectDistinctCandidateNames(['Izzy', ' Izzy ', '', '   ', 'Jam']),
    ).toEqual(['Izzy', 'Jam']);
  });

  it.each([
    ['participants', MAX_IMPORT_PLAYERS],
    ['game_log', MAX_IMPORT_PLAYERS],
    ['screenshot_score_table', MAX_IMPORT_PLAYERS],
    ['screenshot_score_details', MAX_IMPORT_PLAYERS],
    ['matcher', MAX_IMPORT_CANDIDATE_NAMES],
  ] as const)('accepts a full %s list at its bound', (channel, limit) => {
    const names = Array.from({ length: limit }, (_, index) => `Player ${index}`);

    expect(assertImportCandidateNamesWithinBounds(names, channel)).toHaveLength(
      limit,
    );
  });

  it.each([
    ['participants', MAX_IMPORT_PLAYERS],
    ['game_log', MAX_IMPORT_PLAYERS],
    ['screenshot_score_table', MAX_IMPORT_PLAYERS],
    ['screenshot_score_details', MAX_IMPORT_PLAYERS],
    ['matcher', MAX_IMPORT_CANDIDATE_NAMES],
  ] as const)('rejects one name over the %s bound', (channel, limit) => {
    const names = Array.from(
      { length: limit + 1 },
      (_, index) => `Player ${index}`,
    );

    expect(() => assertImportCandidateNamesWithinBounds(names, channel)).toThrow(
      /at most 5/,
    );
  });

  it('rejects rather than truncates, so an evidence problem stays visible', () => {
    const names = Array.from({ length: 64 }, (_, index) => `Probe ${index}`);

    // The old behaviour sliced to 64 and carried on. Silently dropping the tail
    // would save a game with the wrong players.
    expect(() =>
      assertImportCandidateNamesWithinBounds(names, 'matcher'),
    ).toThrow(/64 players/);
  });

  it('rejects an overlong name instead of dropping it', () => {
    expect(() =>
      assertImportCandidateNamesWithinBounds(
        ['Izzy', 'y'.repeat(MAX_IMPORT_CANDIDATE_NAME_LENGTH + 1)],
        'participants',
      ),
    ).toThrow(/longer than 128 characters/);
  });

  it('accepts a name exactly at the length bound', () => {
    const name = 'y'.repeat(MAX_IMPORT_CANDIDATE_NAME_LENGTH);

    expect(
      assertImportCandidateNamesWithinBounds([name], 'participants'),
    ).toEqual([name]);
  });

  it('names the channel so the importer knows which evidence to fix', () => {
    expect(() =>
      assertImportCandidateNamesWithinBounds(
        ['a', 'b', 'c', 'd', 'e', 'f'],
        'screenshot_score_table',
      ),
    ).toThrow(/The uploaded game result/);
    expect(() =>
      assertImportCandidateNamesWithinBounds(
        ['a', 'b', 'c', 'd', 'e', 'f'],
        'game_log',
      ),
    ).toThrow(/The exported game log/);
  });
});
