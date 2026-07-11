import { describe, expect, it } from 'vitest';
import { buildImportBoardSnapshot } from './build-import-board-snapshot';
import { scoreCuratedBoardImportItems } from './score-curated-board-import-items';
import type { ParsedActionGameLogEvent } from './parse-game-log';

// Space "21" borders "14", "22", "29", and "30" on the shared Mars geometry.
function commercialDistrictEvents(input: {
  neighbor14?: { actor: string; tile: string };
  neighbor22?: { actor: string; tile: string };
  neighbor29?: { actor: string; tile: string };
  neighbor30?: { actor: string; tile: string };
}): ParsedActionGameLogEvent[] {
  const events: ParsedActionGameLogEvent[] = [];
  let lineNumber = 10;

  const placeNeighbor = (
    space: string,
    detail: { actor: string; tile: string } | undefined,
  ) => {
    if (!detail) {
      return;
    }
    lineNumber += 1;
    events.push({
      actor: detail.actor,
      eventType: 'tile_placed',
      lineNumber,
      rawLine: `${detail.actor} placed ${detail.tile} tile at ${space}`,
      space,
      tile: detail.tile,
    });
  };

  placeNeighbor('14', input.neighbor14);
  placeNeighbor('22', input.neighbor22);
  placeNeighbor('29', input.neighbor29);
  placeNeighbor('30', input.neighbor30);

  events.push({
    actor: 'Izzy',
    card: 'Commercial District',
    eventType: 'card_played',
    lineNumber: (lineNumber += 1),
    rawLine: 'Izzy played Commercial District',
  });
  events.push({
    actor: 'Izzy',
    eventType: 'tile_placed',
    lineNumber: (lineNumber += 1),
    rawLine: 'Izzy placed city tile at 21',
    space: '21',
    tile: 'city',
  });

  return events;
}

describe('scoreCuratedBoardImportItems', () => {
  it('scores Commercial District from adjacent cities when its placement is provable', () => {
    const events = commercialDistrictEvents({
      neighbor14: { actor: 'Izzy', tile: 'city' },
      neighbor22: { actor: 'Corey', tile: 'city' },
      neighbor29: { actor: 'Friday', tile: 'greenery' },
      neighbor30: { actor: 'Friday', tile: 'ocean' },
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
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
    const events = commercialDistrictEvents({
      neighbor14: { actor: 'Corey', tile: 'Capital' },
      neighbor22: { actor: 'Friday', tile: 'Noctis City' },
      neighbor29: { actor: 'Friday', tile: 'greenery' },
      neighbor30: { actor: 'Friday', tile: 'ocean' },
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
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
    const events: ParsedActionGameLogEvent[] = [
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
    ];

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
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

  it('requests confirmation for every neighbour the log does not resolve', () => {
    const events = commercialDistrictEvents({});

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
        mapId: 'tharsis',
      }),
    ).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        notes: expect.arrayContaining([
          'Commercial District at space 21 still needs confirmation for adjacent spaces 14, 22, 29, 30.',
        ]),
        playerName: 'Izzy',
        requestedSpaceIds: ['14', '22', '29', '30'],
        status: 'review_needed',
      }),
    );
  });

  it('uses screenshot confirmations to prove Commercial District adjacency when the log-first snapshot leaves curated neighbors unresolved', () => {
    const events = commercialDistrictEvents({
      neighbor14: { actor: 'Corey', tile: 'city' },
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
        mapId: 'tharsis',
        screenshotConfirmations: {
          '22': { status: 'confirmed', tileKind: 'city' },
          '29': { status: 'confirmed', tileKind: 'greenery' },
          '30': { status: 'confirmed', tileKind: 'occupied_other' },
        },
      } satisfies Parameters<typeof scoreCuratedBoardImportItems>[0]),
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
    const events = commercialDistrictEvents({
      neighbor14: { actor: 'Corey', tile: 'city' },
    });

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'tharsis' }),
        events,
        mapId: 'tharsis',
        screenshotConfirmations: {
          '22': { status: 'inconclusive', tileKind: 'unknown' },
          '29': { status: 'confirmed', tileKind: 'greenery' },
          '30': { status: 'confirmed', tileKind: 'empty' },
        },
      } satisfies Parameters<typeof scoreCuratedBoardImportItems>[0]),
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

  it('does not emit runtime award items because the shared award scorer owns board-aware awards', () => {
    const events: ParsedActionGameLogEvent[] = [
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
    ];

    expect(
      scoreCuratedBoardImportItems({
        boardSnapshot: buildImportBoardSnapshot({ events, mapId: 'hellas' }),
        events,
        mapId: 'hellas',
      }),
    ).toEqual([]);
  });
});
