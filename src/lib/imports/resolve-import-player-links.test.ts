import { describe, expect, it } from 'vitest';
import { resolveImportPlayerLinks } from './resolve-import-player-links';

describe('resolveImportPlayerLinks', () => {
  const groupPlayers = [
    { displayName: 'Izzy', id: 'player-1' },
    { displayName: 'Corey', id: 'player-2' },
    { displayName: 'Colette', id: 'player-3' },
  ];

  it('auto-links exact normalized matches', () => {
    expect(
      resolveImportPlayerLinks([' izzy ', 'COREY'], groupPlayers, []),
    ).toMatchObject({
      matches: [
        { importedName: ' izzy ', playerId: 'player-1', status: 'exact' },
        { importedName: 'COREY', playerId: 'player-2', status: 'exact' },
      ],
      unresolvedCount: 0,
    });
  });

  it('does not auto-link duplicate exact normalized display names', () => {
    expect(
      resolveImportPlayerLinks(
        ['Chris'],
        [
          { displayName: 'Chris', id: 'player-a' },
          { displayName: ' chris ', id: 'player-b' },
        ],
        [],
      ).matches[0],
    ).toEqual({
      importedName: 'Chris',
      options: [
        { displayName: 'Chris', id: 'player-a' },
        { displayName: ' chris ', id: 'player-b' },
      ],
      status: 'ambiguous',
    });
  });

  it('suggests alias-backed matches without requiring exact display names', () => {
    expect(
      resolveImportPlayerLinks(
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
      ).matches[0],
    ).toMatchObject({
      importedName: 'Izzy H.',
      playerId: 'player-1',
      status: 'alias',
    });
  });

  it('does not auto-link duplicate alias matches', () => {
    expect(
      resolveImportPlayerLinks(
        ['Izz'],
        groupPlayers,
        [
          {
            aliasText: 'Izz',
            normalizedAlias: 'izz',
            playerId: 'player-1',
            sourceType: 'game_log',
          },
          {
            aliasText: 'Izz',
            normalizedAlias: 'izz',
            playerId: 'player-2',
            sourceType: 'screenshot_ocr',
          },
        ],
      ).matches[0],
    ).toEqual({
      importedName: 'Izz',
      options: [
        { displayName: 'Izzy', id: 'player-1' },
        { displayName: 'Corey', id: 'player-2' },
      ],
      status: 'ambiguous',
    });
  });

  it('surfaces ambiguous partial matches instead of choosing a profile', () => {
    expect(
      resolveImportPlayerLinks(
        ['Chris'],
        [
          { displayName: 'Chris A', id: 'player-a' },
          { displayName: 'Chris B', id: 'player-b' },
        ],
        [],
      ).matches[0],
    ).toEqual({
      importedName: 'Chris',
      options: [
        { displayName: 'Chris A', id: 'player-a' },
        { displayName: 'Chris B', id: 'player-b' },
      ],
      status: 'ambiguous',
    });
  });

  it('suggests a single partial match without treating it as resolved', () => {
    expect(
      resolveImportPlayerLinks(['Core'], groupPlayers, []),
    ).toMatchObject({
      matches: [
        {
          importedName: 'Core',
          options: [{ displayName: 'Corey', id: 'player-2' }],
          status: 'suggested',
        },
      ],
      unresolvedCount: 1,
    });
  });

  it('leaves unmatched players unresolved', () => {
    expect(
      resolveImportPlayerLinks(['Morgan'], groupPlayers, []),
    ).toMatchObject({
      matches: [{ importedName: 'Morgan', status: 'unmatched' }],
      unresolvedCount: 1,
    });
  });

  it('treats blank imported names as unmatched', () => {
    expect(resolveImportPlayerLinks(['   '], groupPlayers, [])).toEqual({
      matches: [{ importedName: '   ', status: 'unmatched' }],
      unresolvedCount: 1,
    });
  });
});
