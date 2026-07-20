import { describe, expect, it } from 'vitest';
import { resolveImportPlayerLinks } from './resolve-import-player-links';

describe('resolveImportPlayerLinks', () => {
  const groupPlayers = [
    {
      displayName: 'Izzy',
      gamesPlayed: 9,
      id: 'player-1',
      linkedFullName: 'Izzy Howard',
      linkedUsername: 'izzy-h',
    },
    {
      displayName: 'Corey',
      gamesPlayed: 5,
      id: 'player-2',
      linkedFullName: 'Corey Lane',
      linkedUsername: 'corey-l',
    },
    {
      displayName: 'Colette',
      gamesPlayed: 3,
      id: 'player-3',
      linkedFullName: 'Colette Ray',
      linkedUsername: 'colette-r',
    },
  ];

  it('auto-links exact normalized matches', () => {
    const result = resolveImportPlayerLinks([' izzy ', 'COREY'], groupPlayers, []);

    expect(result.unresolvedCount).toBe(0);
    expect(result.matches[0]).toMatchObject({
      importedName: ' izzy ',
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact',
    });
    expect(result.matches[0]?.candidates[0]).toMatchObject({
      displayName: 'Izzy',
      id: 'player-1',
      matchReason: 'exact',
    });
    expect(result.matches[1]).toMatchObject({
      importedName: 'COREY',
      requiresConfirmation: false,
      selectedPlayerId: 'player-2',
      status: 'exact',
    });
    expect(result.matches[1]?.candidates[0]).toMatchObject({
      displayName: 'Corey',
      id: 'player-2',
      matchReason: 'exact',
    });
  });

  it('matches a linked real name before asking for confirmation', () => {
    const result = resolveImportPlayerLinks(['Izzy Howard'], groupPlayers, []);

    expect(result.unresolvedCount).toBe(0);
    expect(result.matches[0]).toMatchObject({
      importedName: 'Izzy Howard',
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact',
    });
    expect(result.matches[0]?.candidates[0]).toMatchObject({
      displayName: 'Izzy',
      id: 'player-1',
      matchReason: 'exact',
    });
  });

  it('matches a linked username before asking for confirmation', () => {
    expect(resolveImportPlayerLinks(['izzy-h'], groupPlayers, [])).toMatchObject({
      matches: [
        {
          importedName: 'izzy-h',
          requiresConfirmation: false,
          selectedPlayerId: 'player-1',
          status: 'exact',
        },
      ],
      unresolvedCount: 0,
    });
  });

  it('matches a spaced handle against its concatenated username', () => {
    const result = resolveImportPlayerLinks(
      ['Suzy the Gnat'],
      [
        {
          displayName: 'Colette LeRoux',
          gamesPlayed: 4,
          id: 'player-colette',
          linkedFullName: 'Colette LeRoux',
          linkedUsername: 'Suzythegnat',
        },
      ],
      [],
    );

    expect(result.unresolvedCount).toBe(0);
    expect(result.matches[0]).toMatchObject({
      importedName: 'Suzy the Gnat',
      requiresConfirmation: false,
      selectedPlayerId: 'player-colette',
      status: 'exact',
    });
    expect(result.matches[0]?.candidates[0]).toMatchObject({
      id: 'player-colette',
      matchReason: 'exact',
    });
  });

  it('suggests alias-backed matches without requiring exact display names', () => {
    const result = resolveImportPlayerLinks(
      ['Izzy H.'],
      groupPlayers,
      [
        {
          aliasText: 'Izzy H.',
          normalizedAlias: 'izzy h',
          playerId: 'player-1',
          sourceType: 'screenshot_ocr',
        },
      ],
    );

    expect(result.unresolvedCount).toBe(0);
    expect(result.matches[0]).toMatchObject({
      importedName: 'Izzy H.',
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact',
    });
    expect(result.matches[0]?.candidates[0]).toMatchObject({
      displayName: 'Izzy',
      id: 'player-1',
      matchReason: 'exact',
    });
  });

  it('collapses duplicate cross-group rows while retaining aliases for every row id', () => {
    const result = resolveImportPlayerLinks(
      ['Iz'],
      [
        {
          canonicalKey: 'user:user-izzy',
          displayName: 'fochizzy',
          gamesPlayed: 3,
          id: 'izzy-group-a',
          linkedFullName: 'Izzy Hodnett',
          linkedUsername: 'fochizzy',
        },
        {
          canonicalKey: 'user:user-izzy',
          displayName: 'fochizzy',
          gamesPlayed: 12,
          id: 'izzy-group-b',
          linkedFullName: 'Izzy Hodnett',
          linkedUsername: 'fochizzy',
        },
      ],
      [
        {
          aliasText: 'Iz',
          normalizedAlias: 'iz',
          playerId: 'izzy-group-a',
          sourceType: 'game_log',
        },
      ],
    );

    expect(result).toMatchObject({
      matches: [
        {
          candidates: [
            {
              gamesPlayed: 15,
              id: 'izzy-group-b',
              matchReason: 'exact',
            },
          ],
          requiresConfirmation: false,
          selectedPlayerId: 'izzy-group-b',
          status: 'exact',
        },
      ],
      unresolvedCount: 0,
    });
  });

  it('suggests a single token-prefix partial match and keeps it reviewable', () => {
    const result = resolveImportPlayerLinks(
      ['James H'],
      [
        {
          displayName: 'James Hodnett',
          gamesPlayed: 6,
          id: 'player-jh',
          linkedFullName: 'James Hodnett',
          linkedUsername: 'jhodnett',
        },
        {
          displayName: 'James Seckler',
          gamesPlayed: 8,
          id: 'player-js',
          linkedFullName: 'James Seckler',
          linkedUsername: 'jseckler',
        },
      ],
      [],
    );

    expect(result).toMatchObject({
      matches: [
        {
          importedName: 'James H',
          requiresConfirmation: true,
          selectedPlayerId: 'player-jh',
          status: 'suggested',
        },
      ],
      unresolvedCount: 1,
    });
    expect(result.matches[0]?.candidates[0]).toMatchObject({
      displayName: 'James Hodnett',
      id: 'player-jh',
      matchReason: 'partial',
    });
  });

  it('breaks equally strong partial matches by most played group player', () => {
    const result = resolveImportPlayerLinks(
      ['James'],
      [
        {
          displayName: 'James Hodnett',
          gamesPlayed: 12,
          id: 'player-jh',
          linkedFullName: 'James Hodnett',
          linkedUsername: 'jhodnett',
        },
        {
          displayName: 'James Seckler',
          gamesPlayed: 4,
          id: 'player-js',
          linkedFullName: 'James Seckler',
          linkedUsername: 'jseckler',
        },
      ],
      [],
    );

    expect(result.matches[0]).toMatchObject({
      importedName: 'James',
      requiresConfirmation: true,
      selectedPlayerId: 'player-jh',
      status: 'suggested',
    });
    expect(result.matches[0]?.candidates.slice(0, 2)).toMatchObject([
      { displayName: 'James Hodnett', id: 'player-jh' },
      { displayName: 'James Seckler', id: 'player-js' },
    ]);
  });

  it('keeps a true partial-match tie reviewable when play counts are also tied', () => {
    expect(
      resolveImportPlayerLinks(
        ['James'],
        [
          {
            displayName: 'James Hodnett',
            gamesPlayed: 7,
            id: 'player-jh',
            linkedFullName: 'James Hodnett',
            linkedUsername: 'jhodnett',
          },
          {
            displayName: 'James Seckler',
            gamesPlayed: 7,
            id: 'player-js',
            linkedFullName: 'James Seckler',
            linkedUsername: 'jseckler',
          },
        ],
        [],
      ).matches[0],
    ).toMatchObject({
      importedName: 'James',
      requiresConfirmation: true,
      selectedPlayerId: 'player-jh',
      status: 'ambiguous',
    });
  });

  it('leaves unmatched players unresolved while still listing the roster as fallback choices', () => {
    expect(resolveImportPlayerLinks(['Morgan'], groupPlayers, [])).toMatchObject({
      matches: [
        {
          candidates: [
            { displayName: 'Izzy', id: 'player-1', matchReason: 'fallback' },
            { displayName: 'Corey', id: 'player-2', matchReason: 'fallback' },
            { displayName: 'Colette', id: 'player-3', matchReason: 'fallback' },
          ],
          importedName: 'Morgan',
          requiresConfirmation: true,
          selectedPlayerId: null,
          status: 'unmatched',
        },
      ],
      unresolvedCount: 1,
    });
  });

  it('treats blank imported names as unmatched', () => {
    expect(resolveImportPlayerLinks(['   '], groupPlayers, [])).toMatchObject({
      matches: [
        {
          importedName: '   ',
          requiresConfirmation: true,
          selectedPlayerId: null,
          status: 'unmatched',
        },
      ],
      unresolvedCount: 1,
    });
  });

  describe('candidate privacy boundary', () => {
    /**
     * The internal ranking score is unique per matching axis (alias vs.
     * display name vs. username, exact vs. partial). If it ever leaked, an
     * inspecting client could tell which private field produced a match even
     * though matchReason only ever says 'exact' or 'partial'.
     */
    it('never exposes the internal match score, on any candidate in any match state', () => {
      const aliasMatched = resolveImportPlayerLinks(
        ['Iz'],
        groupPlayers,
        [
          {
            aliasText: 'Iz',
            normalizedAlias: 'iz',
            playerId: 'player-1',
            sourceType: 'game_log',
          },
        ],
      );
      const nameMatched = resolveImportPlayerLinks([' izzy '], groupPlayers, []);
      const partialMatched = resolveImportPlayerLinks(['James H'], [
        {
          displayName: 'James Hodnett',
          gamesPlayed: 6,
          id: 'player-jh',
          linkedFullName: 'James Hodnett',
          linkedUsername: 'jhodnett',
        },
      ], []);
      const unmatched = resolveImportPlayerLinks(['Morgan'], groupPlayers, []);

      for (const result of [aliasMatched, nameMatched, partialMatched, unmatched]) {
        for (const match of result.matches) {
          for (const candidate of match.candidates) {
            expect(candidate).not.toHaveProperty('matchScore');
            expect(Object.keys(candidate).sort()).toEqual([
              'displayName',
              'gamesPlayed',
              'id',
              'linkedFullName',
              'linkedUsername',
              'matchReason',
            ]);
          }
        }

        expect(JSON.stringify(result)).not.toContain('matchScore');
      }
    });

    /**
     * An alias-backed match and a display-name-exact match are different
     * private axes internally, but must be indistinguishable in the public
     * payload: same shape, same coarse reason, no numeric tell.
     */
    it('makes an alias match and a display-name match indistinguishable on the wire', () => {
      const aliasResult = resolveImportPlayerLinks(
        ['Iz'],
        [groupPlayers[0]!],
        [
          {
            aliasText: 'Iz',
            normalizedAlias: 'iz',
            playerId: 'player-1',
            sourceType: 'game_log',
          },
        ],
      );
      const nameResult = resolveImportPlayerLinks([' izzy '], [groupPlayers[0]!], []);

      const aliasCandidate = aliasResult.matches[0]?.candidates[0];
      const nameCandidate = nameResult.matches[0]?.candidates[0];

      expect(aliasCandidate?.matchReason).toBe('exact');
      expect(nameCandidate?.matchReason).toBe('exact');
      expect(Object.keys(aliasCandidate!).sort()).toEqual(
        Object.keys(nameCandidate!).sort(),
      );
    });

    /**
     * Ordering must still be driven by the (now-internal) match score: an
     * exact match still outranks a mere partial match, and a plain fallback
     * still sorts last — proving the refactor that hid matchScore from
     * callers did not change selection behavior.
     */
    it('keeps deterministic score-driven ordering after matchScore is hidden from callers', () => {
      const result = resolveImportPlayerLinks(
        ['James'],
        [
          {
            displayName: 'James',
            gamesPlayed: 1,
            id: 'player-exact',
            linkedFullName: null,
            linkedUsername: null,
          },
          {
            displayName: 'James Hodnett',
            gamesPlayed: 99,
            id: 'player-partial',
            linkedFullName: null,
            linkedUsername: null,
          },
          {
            displayName: 'Unrelated Player',
            gamesPlayed: 50,
            id: 'player-fallback',
            linkedFullName: null,
            linkedUsername: null,
          },
        ],
        [],
      );
      const candidateIds = result.matches[0]?.candidates.map((c) => c.id);

      // Exact beats partial beats fallback regardless of games played, so a
      // higher games-played count on the partial/fallback rows must not
      // reorder them ahead of the exact match.
      expect(candidateIds).toEqual([
        'player-exact',
        'player-partial',
        'player-fallback',
      ]);
    });
  });
});
