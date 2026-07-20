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
     * The public array's ordering is driven by the COARSE matchReason tier
     * (exact > partial > fallback), not by the private matchScore that
     * decided which tier a candidate landed in: an exact match still sorts
     * ahead of a mere partial match, and a plain fallback still sorts last,
     * even though none of this is decided by score any more. See
     * `comparePublicCandidates` — the internal `compareCandidates`/
     * `matchScore` ordering only ever drives `selectedPlayerId`/`status`.
     */
    it('keeps exact-before-partial-before-fallback tiering in the public candidate order', () => {
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

    /**
     * The scenario the ordering-side-channel review flagged: three players
     * all coarsen to the SAME 'exact' matchReason for one imported name, but
     * internally they got there through three different private axes —
     * public display name (highest internal score), a private linked
     * username, and a private saved alias (lowest internal score). gamesPlayed
     * is tied for all three, and the public displayName labels are chosen so
     * alphabetical order and the private score order disagree, isolating
     * which one actually governs the public array.
     */
    it('never lets private matching-axis precedence leak through same-array candidate order', () => {
      const importedName = 'Zulu';
      const players = [
        {
          // Matches via PUBLIC display name exact — highest internal score.
          displayName: 'Zulu',
          gamesPlayed: 5,
          id: 'player-by-displayname',
          linkedFullName: null,
          linkedUsername: null,
        },
        {
          // Matches via PRIVATE linkedUsername exact — middle internal score.
          displayName: 'Alpha',
          gamesPlayed: 5,
          id: 'player-by-username',
          linkedFullName: null,
          linkedUsername: 'Zulu',
        },
        {
          // Matches via PRIVATE saved alias exact — lowest internal score.
          displayName: 'Mike',
          gamesPlayed: 5,
          id: 'player-by-alias',
          linkedFullName: null,
          linkedUsername: null,
        },
      ];
      const aliases = [
        {
          aliasText: 'Zulu',
          normalizedAlias: 'zulu',
          playerId: 'player-by-alias',
          sourceType: 'game_log',
        },
      ];

      const result = resolveImportPlayerLinks([importedName], players, aliases);
      const match = result.matches[0]!;
      const serialized = JSON.stringify(match);

      // All three land in the same coarse bucket.
      expect(match.candidates.map((c) => c.matchReason)).toEqual([
        'exact',
        'exact',
        'exact',
      ]);
      // No numeric score or equivalent rank/priority/confidence field exists
      // anywhere in the serialized match.
      expect(serialized).not.toMatch(/matchScore|"rank"|"priority"|"confidence"/);
      expect(match.candidates.every((c) => Object.keys(c).sort().join(',') ===
        'displayName,gamesPlayed,id,matchReason')).toBe(true);

      // Public order is alphabetical by displayName (gamesPlayed is tied) —
      // NOT the private 400/300/250 axis-priority order, which would have
      // been [by-displayname, by-username, by-alias].
      expect(match.candidates.map((c) => c.id)).toEqual([
        'player-by-username', // "Alpha"
        'player-by-alias', // "Mike"
        'player-by-displayname', // "Zulu"
      ]);

      // The internal decision — which candidate is auto-selected — is
      // unaffected by the public array's order and still reflects the
      // highest-scoring private axis (display-name exact), even though that
      // candidate is listed LAST in the public array.
      expect(match.selectedPlayerId).toBe('player-by-displayname');
      expect(match.status).toBe('exact');
      expect(match.requiresConfirmation).toBe(false);

      // Re-run with the axes that produced "Alpha" and "Mike" swapped: same
      // public sort fields (displayName, gamesPlayed), different private
      // axis backing each. Public order must not move.
      const swappedPlayers = [
        players[0]!,
        {
          ...players[1]!,
          linkedUsername: null,
        },
        {
          ...players[2]!,
          linkedUsername: 'Zulu',
        },
      ];
      const swappedAliases = [
        {
          aliasText: 'Zulu',
          normalizedAlias: 'zulu',
          playerId: 'player-by-username',
          sourceType: 'game_log',
        },
      ];
      const swappedResult = resolveImportPlayerLinks(
        [importedName],
        swappedPlayers,
        swappedAliases,
      );

      expect(swappedResult.matches[0]?.candidates.map((c) => c.id)).toEqual([
        'player-by-username',
        'player-by-alias',
        'player-by-displayname',
      ]);
    });
  });
});
