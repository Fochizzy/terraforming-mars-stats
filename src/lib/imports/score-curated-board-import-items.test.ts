import { describe, expect, it } from 'vitest';
import { buildImportBoardSnapshot } from './build-import-board-snapshot';
import { scoreCuratedBoardImportItems } from './score-curated-board-import-items';

describe('scoreCuratedBoardImportItems', () => {
  it('scores Commercial District from adjacent cities when its placement is provable', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 11,
          rawLine: 'Izzy placed city tile at 20',
          space: '20',
          tile: 'city',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 12,
          rawLine: 'Corey placed city tile at 22',
          space: '22',
          tile: 'city',
        },
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 13,
          rawLine: 'Izzy played Commercial District',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 14,
          rawLine: 'Izzy placed city tile at 21',
          space: '21',
          tile: 'city',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 15,
          rawLine: 'Friday placed greenery tile at 29',
          space: '29',
          tile: 'greenery',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 16,
          rawLine: 'Friday placed ocean tile at 30',
          space: '30',
          tile: 'ocean',
        },
      ],
      mapId: 'tharsis',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 11,
            rawLine: 'Izzy placed city tile at 20',
            space: '20',
            tile: 'city',
          },
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 12,
            rawLine: 'Corey placed city tile at 22',
            space: '22',
            tile: 'city',
          },
          {
            actor: 'Izzy',
            card: 'Commercial District',
            eventType: 'card_played',
            lineNumber: 13,
            rawLine: 'Izzy played Commercial District',
          },
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 14,
            rawLine: 'Izzy placed city tile at 21',
            space: '21',
            tile: 'city',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 15,
            rawLine: 'Friday placed greenery tile at 29',
            space: '29',
            tile: 'greenery',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 16,
            rawLine: 'Friday placed ocean tile at 30',
            space: '30',
            tile: 'ocean',
          },
        ],
        mapId: 'tharsis',
      }),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        playerName: 'Izzy',
        points: 2,
        status: 'proved',
      }),
    );
  });

  it('counts named city tiles as cities for Commercial District adjacency', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 11,
          rawLine: 'Corey placed Capital tile at 20',
          space: '20',
          tile: 'Capital',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 12,
          rawLine: 'Friday placed Noctis City tile at 22',
          space: '22',
          tile: 'Noctis City',
        },
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 13,
          rawLine: 'Izzy played Commercial District',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 14,
          rawLine: 'Izzy placed city tile at 21',
          space: '21',
          tile: 'city',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 15,
          rawLine: 'Friday placed greenery tile at 29',
          space: '29',
          tile: 'greenery',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 16,
          rawLine: 'Friday placed ocean tile at 30',
          space: '30',
          tile: 'ocean',
        },
      ],
      mapId: 'tharsis',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 11,
            rawLine: 'Corey placed Capital tile at 20',
            space: '20',
            tile: 'Capital',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 12,
            rawLine: 'Friday placed Noctis City tile at 22',
            space: '22',
            tile: 'Noctis City',
          },
          {
            actor: 'Izzy',
            card: 'Commercial District',
            eventType: 'card_played',
            lineNumber: 13,
            rawLine: 'Izzy played Commercial District',
          },
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 14,
            rawLine: 'Izzy placed city tile at 21',
            space: '21',
            tile: 'city',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 15,
            rawLine: 'Friday placed greenery tile at 29',
            space: '29',
            tile: 'greenery',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 16,
            rawLine: 'Friday placed ocean tile at 30',
            space: '30',
            tile: 'ocean',
          },
        ],
        mapId: 'tharsis',
      }),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        playerName: 'Izzy',
        points: 2,
        status: 'proved',
      }),
    );
  });

  it('returns review_needed when Commercial District was played but placement is not provable', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 13,
          rawLine: 'Izzy played Commercial District',
        },
        {
          actor: 'Friday',
          card: 'Mining Area',
          eventType: 'card_played',
          lineNumber: 14,
          rawLine: 'Friday played Mining Area',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 15,
          rawLine: 'Izzy placed city tile at 21',
          space: '21',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Izzy',
            card: 'Commercial District',
            eventType: 'card_played',
            lineNumber: 13,
            rawLine: 'Izzy played Commercial District',
          },
          {
            actor: 'Friday',
            card: 'Mining Area',
            eventType: 'card_played',
            lineNumber: 14,
            rawLine: 'Friday played Mining Area',
          },
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 15,
            rawLine: 'Izzy placed city tile at 21',
            space: '21',
            tile: 'city',
          },
        ],
        mapId: 'tharsis',
      }),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        playerName: 'Izzy',
        status: 'review_needed',
      }),
    );
  });

  it('uses screenshot confirmations to prove Commercial District adjacency when the log-first snapshot leaves curated neighbors unresolved', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 11,
          rawLine: 'Corey placed city tile at 20',
          space: '20',
          tile: 'city',
        },
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 13,
          rawLine: 'Izzy played Commercial District',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 14,
          rawLine: 'Izzy placed city tile at 21',
          space: '21',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 11,
            rawLine: 'Corey placed city tile at 20',
            space: '20',
            tile: 'city',
          },
          {
            actor: 'Izzy',
            card: 'Commercial District',
            eventType: 'card_played',
            lineNumber: 13,
            rawLine: 'Izzy played Commercial District',
          },
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 14,
            rawLine: 'Izzy placed city tile at 21',
            space: '21',
            tile: 'city',
          },
        ],
        mapId: 'tharsis',
        screenshotConfirmations: {
          '22': {
            status: 'confirmed',
            tileKind: 'city',
          },
          '29': {
            status: 'confirmed',
            tileKind: 'greenery',
          },
          '30': {
            status: 'confirmed',
            tileKind: 'occupied_other',
          },
        },
      } as any),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        notes: expect.arrayContaining([
          'Commercial District at space 21 had 2 adjacent city tiles in curated board coverage.',
        ]),
        playerName: 'Izzy',
        points: 2,
        requestedSpaceIds: [],
        status: 'proved',
      }),
    );
  });

  it('keeps Commercial District review-only and lists the remaining spaces when screenshot confirmation stays inconclusive', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 11,
          rawLine: 'Corey placed city tile at 20',
          space: '20',
          tile: 'city',
        },
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 13,
          rawLine: 'Izzy played Commercial District',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 14,
          rawLine: 'Izzy placed city tile at 21',
          space: '21',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 11,
            rawLine: 'Corey placed city tile at 20',
            space: '20',
            tile: 'city',
          },
          {
            actor: 'Izzy',
            card: 'Commercial District',
            eventType: 'card_played',
            lineNumber: 13,
            rawLine: 'Izzy played Commercial District',
          },
          {
            actor: 'Izzy',
            eventType: 'tile_placed',
            lineNumber: 14,
            rawLine: 'Izzy placed city tile at 21',
            space: '21',
            tile: 'city',
          },
        ],
        mapId: 'tharsis',
        screenshotConfirmations: {
          '22': {
            status: 'inconclusive',
            tileKind: 'unknown',
          },
          '29': {
            status: 'confirmed',
            tileKind: 'greenery',
          },
          '30': {
            status: 'confirmed',
            tileKind: 'empty',
          },
        },
      } as any),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        notes: expect.arrayContaining([
          'Commercial District at space 21 still needs confirmation for adjacent spaces 22.',
        ]),
        playerName: 'Izzy',
        requestedSpaceIds: ['22'],
        status: 'review_needed',
      }),
    );
  });

  it('uses map-aware award names instead of hard-coding Tharsis objectives', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Colette',
          eventType: 'tile_placed',
          lineNumber: 21,
          rawLine: 'Colette placed greenery tile at 18',
          space: '18',
          tile: 'greenery',
        },
        {
          actor: 'Colette',
          eventType: 'tile_placed',
          lineNumber: 22,
          rawLine: 'Colette placed greenery tile at 19',
          space: '19',
          tile: 'greenery',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 23,
          rawLine: 'Corey placed greenery tile at 20',
          space: '20',
          tile: 'greenery',
        },
      ],
      mapId: 'hellas',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 20,
            rawLine: 'Friday funded Cultivator award',
          },
          {
            actor: 'Colette',
            eventType: 'tile_placed',
            lineNumber: 21,
            rawLine: 'Colette placed greenery tile at 18',
            space: '18',
            tile: 'greenery',
          },
          {
            actor: 'Colette',
            eventType: 'tile_placed',
            lineNumber: 22,
            rawLine: 'Colette placed greenery tile at 19',
            space: '19',
            tile: 'greenery',
          },
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 23,
            rawLine: 'Corey placed greenery tile at 20',
            space: '20',
            tile: 'greenery',
          },
        ],
        mapId: 'hellas',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          awardName: 'Cultivator',
          firstPlacePlayerNames: ['Colette'],
          fundedByPlayerName: 'Friday',
          itemType: 'award',
          secondPlacePlayerNames: ['Corey'],
          status: 'proved',
        }),
      ]),
    );
  });

  it('keeps zero-placement participants eligible for shared second place on Cultivator', () => {
    const boardSnapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Colette',
          eventType: 'tile_placed',
          lineNumber: 21,
          rawLine: 'Colette placed greenery tile at 18',
          space: '18',
          tile: 'greenery',
        },
      ],
      mapId: 'hellas',
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 20,
            rawLine: 'Friday funded Cultivator award',
          },
          {
            actor: 'Colette',
            eventType: 'tile_placed',
            lineNumber: 21,
            rawLine: 'Colette placed greenery tile at 18',
            space: '18',
            tile: 'greenery',
          },
        ],
        mapId: 'hellas',
        participantNames: ['Colette', 'Corey', 'Izzy'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Cultivator',
        firstPlacePlayerNames: ['Colette'],
        fundedByPlayerName: 'Friday',
        itemType: 'award',
        secondPlacePlayerNames: ['Corey', 'Izzy'],
        status: 'proved',
      }),
    );
  });
});
