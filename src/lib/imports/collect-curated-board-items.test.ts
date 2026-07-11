import { describe, expect, it } from 'vitest';
import { collectCuratedBoardImportItems } from './collect-curated-board-items';
import type { ParsedActionGameLogEvent } from './parse-game-log';

describe('collectCuratedBoardImportItems', () => {
  it('returns no items for an unknown or missing map', () => {
    const events: ParsedActionGameLogEvent[] = [
      {
        actor: 'Izzy',
        card: 'Commercial District',
        eventType: 'card_played',
        lineNumber: 1,
        rawLine: 'Izzy played Commercial District',
      },
    ];

    expect(collectCuratedBoardImportItems({ events, mapId: null })).toEqual([]);
    expect(
      collectCuratedBoardImportItems({ events, mapId: 'not-a-map' }),
    ).toEqual([]);
  });

  it('proves Commercial District city-adjacency from the log on any supported map', () => {
    const events: ParsedActionGameLogEvent[] = [
      {
        actor: 'Corey',
        eventType: 'tile_placed',
        lineNumber: 1,
        rawLine: 'Corey placed city tile at 14',
        space: '14',
        tile: 'city',
      },
      {
        actor: 'Friday',
        eventType: 'tile_placed',
        lineNumber: 2,
        rawLine: 'Friday placed city tile at 22',
        space: '22',
        tile: 'city',
      },
      {
        actor: 'Izzy',
        card: 'Commercial District',
        eventType: 'card_played',
        lineNumber: 3,
        rawLine: 'Izzy played Commercial District',
      },
      {
        actor: 'Izzy',
        eventType: 'tile_placed',
        lineNumber: 4,
        rawLine: 'Izzy placed city tile at 21',
        space: '21',
        tile: 'city',
      },
      {
        actor: 'Izzy',
        eventType: 'tile_placed',
        lineNumber: 5,
        rawLine: 'Izzy placed greenery tile at 29',
        space: '29',
        tile: 'greenery',
      },
      {
        actor: 'Izzy',
        eventType: 'tile_placed',
        lineNumber: 6,
        rawLine: 'Izzy placed ocean tile at 30',
        space: '30',
        tile: 'ocean',
      },
    ];

    const items = collectCuratedBoardImportItems({
      events,
      mapId: 'vastitas_borealis',
      participantNames: ['Izzy', 'Corey', 'Friday'],
    });

    expect(items).toContainEqual(
      expect.objectContaining({
        cardName: 'Commercial District',
        itemType: 'card',
        playerName: 'Izzy',
        points: 2,
        status: 'proved',
      }),
    );
  });

  it('includes board-aware award items alongside card items', () => {
    const events: ParsedActionGameLogEvent[] = [
      {
        actor: 'Colette',
        award: 'Cultivator',
        eventType: 'award_funded',
        lineNumber: 1,
        rawLine: 'Colette funded Cultivator award',
      },
      {
        actor: 'Colette',
        eventType: 'tile_placed',
        lineNumber: 2,
        rawLine: 'Colette placed greenery tile at 18',
        space: '18',
        tile: 'greenery',
      },
      {
        actor: 'Corey',
        eventType: 'tile_placed',
        lineNumber: 3,
        rawLine: 'Corey placed greenery tile at 19',
        space: '19',
        tile: 'greenery',
      },
    ];

    const items = collectCuratedBoardImportItems({
      events,
      mapId: 'hellas',
      participantNames: ['Colette', 'Corey'],
    });

    expect(items).toContainEqual(
      expect.objectContaining({
        awardName: 'Cultivator',
        itemType: 'award',
        status: 'proved',
      }),
    );
  });
});
