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
      matchReason: 'display_name_exact',
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
      matchReason: 'display_name_exact',
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
      matchReason: 'full_name_exact',
    });
  });

  it('matches a linked username before asking for confirmation', () => {
    expect(
      resolveImportPlayerLinks(
        ['izzy-h'],
        groupPlayers,
        [],
      ),
    ).toMatchObject({
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
      matchReason: 'username_exact',
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
      matchReason: 'username_exact',
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
      matchReason: 'display_name_partial',
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
    expect(
      resolveImportPlayerLinks(['Morgan'], groupPlayers, []),
    ).toMatchObject({
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
});
