import { describe, expect, it } from 'vitest';
import { buildImportBoardSnapshot } from './build-import-board-snapshot';
import type { SupportedBoardMapId } from './board-space-maps';

function expectSupportedBoardMapId(
  mapId: SupportedBoardMapId,
): SupportedBoardMapId {
  return mapId;
}

describe('buildImportBoardSnapshot', () => {
  it('reconstructs occupied spaces from parsed tile placements and links named tiles safely', () => {
    const snapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Izzy',
          card: 'Mining Area',
          eventType: 'card_played',
          lineNumber: 64,
          rawLine: 'Izzy played Mining Area',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 66,
          rawLine: 'Izzy placed Mining Area tile at 21',
          space: '21',
          tile: 'Mining Area',
        },
        {
          actor: 'Colette',
          eventType: 'tile_placed',
          lineNumber: 730,
          rawLine: 'Colette placed city tile at 31',
          space: '31',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(expectSupportedBoardMapId(snapshot.mapId)).toBe('tharsis');
    expect(snapshot.spaces['21']).toMatchObject({
      ownerPlayerName: 'Izzy',
      sourceCardName: 'Mining Area',
      sourceType: 'log_explicit',
      tileKind: 'Mining Area',
    });
    expect(snapshot.spaces['31']).toMatchObject({
      ownerPlayerName: 'Colette',
      tileKind: 'city',
    });
  });

  it('leaves sourceCardName unresolved when a generic placement cannot be linked safely', () => {
    const snapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Corey',
          card: 'City Parks',
          eventType: 'card_played',
          lineNumber: 854,
          rawLine: 'Corey played City Parks',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 834,
          rawLine: 'Corey placed city tile at 19',
          space: '19',
          tile: 'city',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 835,
          rawLine: 'Corey placed greenery tile at 20',
          space: '20',
          tile: 'greenery',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 836,
          rawLine: 'Corey placed ocean tile at 21',
          space: '21',
          tile: 'ocean',
        },
      ],
      mapId: 'tharsis',
    });

    expect(snapshot.spaces['19']).toMatchObject({
      ownerPlayerName: 'Corey',
      sourceCardName: null,
      tileKind: 'city',
    });
    expect(snapshot.spaces['20']).toMatchObject({
      ownerPlayerName: 'Corey',
      sourceCardName: null,
      tileKind: 'greenery',
    });
    expect(snapshot.spaces['21']).toMatchObject({
      ownerPlayerName: 'Corey',
      sourceCardName: null,
      tileKind: 'ocean',
    });
  });
});
