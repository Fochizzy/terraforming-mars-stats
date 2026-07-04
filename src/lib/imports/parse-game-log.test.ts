import { describe, expect, it } from 'vitest';
import { parseGameLog } from './parse-game-log';

describe('parseGameLog', () => {
  it('returns an empty parse result for blank input', () => {
    expect(parseGameLog('')).toEqual({
      cardPointBreakdowns: [],
      chattyFillerLineCount: 0,
      contextLineCount: 0,
      drawInfoLineCount: 0,
      events: [],
      ignoredLineCount: 0,
    });
  });

  it('extracts actionable events in original line order with traceable raw lines', () => {
    expect(
      parseGameLog(
        [
          'Good luck Corey!',
          '',
          'You drew Micro-Mills',
          'Generation 4',
          'Izzy played Earth Catapult',
          'Izzy added 2 microbes to Tardigrades',
          'Izzy claimed Builder milestone',
          'Second Seat funded Landlord award',
          'Friday Mars won first place on Landlord award',
          'Second Seat won second place on Landlord award',
          'Board state looked strange here',
          'Izzy placed greenery tile at 29',
          'Izzy Microbes 4 Animals 2 Jovian 6',
        ].join('\n'),
      ),
    ).toEqual({
      cardPointBreakdowns: [
        {
          cardPointsAnimals: 2,
          cardPointsJovian: 6,
          cardPointsMicrobes: 4,
          eventType: 'card_points_breakdown',
          lineNumber: 13,
          playerName: 'Izzy',
          rawLine: 'Izzy Microbes 4 Animals 2 Jovian 6',
        },
      ],
      chattyFillerLineCount: 1,
      contextLineCount: 1,
      drawInfoLineCount: 1,
      events: [
        {
          eventType: 'generation_started',
          generation: 4,
          lineNumber: 4,
          rawLine: 'Generation 4',
        },
        {
          actor: 'Izzy',
          card: 'Earth Catapult',
          eventType: 'card_played',
          lineNumber: 5,
          rawLine: 'Izzy played Earth Catapult',
        },
        {
          actor: 'Izzy',
          card: 'Tardigrades',
          eventType: 'resource_changed',
          lineNumber: 6,
          operation: 'added',
          rawLine: 'Izzy added 2 microbes to Tardigrades',
          resourceAmount: 2,
          resourceType: 'microbe',
        },
        {
          actor: 'Izzy',
          eventType: 'milestone_claimed',
          lineNumber: 7,
          milestone: 'Builder',
          rawLine: 'Izzy claimed Builder milestone',
        },
        {
          actor: 'Second Seat',
          award: 'Landlord',
          eventType: 'award_funded',
          lineNumber: 8,
          rawLine: 'Second Seat funded Landlord award',
        },
        {
          actor: 'Friday Mars',
          award: 'Landlord',
          eventType: 'award_result',
          lineNumber: 9,
          placement: 'first',
          rawLine: 'Friday Mars won first place on Landlord award',
        },
        {
          actor: 'Second Seat',
          award: 'Landlord',
          eventType: 'award_result',
          lineNumber: 10,
          placement: 'second',
          rawLine: 'Second Seat won second place on Landlord award',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 12,
          rawLine: 'Izzy placed greenery tile at 29',
          space: '29',
          tile: 'greenery',
        },
      ],
      ignoredLineCount: 2,
    });
  });
});
