import { describe, expect, it } from 'vitest';
import { buildGameLogEventWrites } from './build-game-log-event-writes';

describe('buildGameLogEventWrites', () => {
  it('maps parsed played-card and tracked-resource lines into saved import events', () => {
    expect(
      buildGameLogEventWrites({
        cards: [
          { cardName: 'Earth Catapult', id: 'card-1' },
          { cardName: 'Tardigrades', id: 'card-2' },
        ],
        parsedGameLog: {
          events: [
            {
              actor: 'Izzy',
              card: 'Earth Catapult',
              eventType: 'card_played',
              lineNumber: 4,
              rawLine: 'Izzy played Earth Catapult',
            },
            {
              actor: 'Izzy',
              card: 'Tardigrades',
              eventType: 'resource_changed',
              lineNumber: 5,
              operation: 'added',
              rawLine: 'Izzy added 2 microbes to Tardigrades',
              resourceAmount: 2,
              resourceType: 'microbe',
            },
            {
              actor: 'Izzy',
              eventType: 'milestone_claimed',
              lineNumber: 6,
              milestone: 'Builder',
              rawLine: 'Izzy claimed Builder milestone',
            },
            {
              actor: 'Corey',
              award: 'Landlord',
              eventType: 'award_funded',
              lineNumber: 7,
              rawLine: 'Corey funded Landlord award',
            },
            {
              actor: 'Izzy',
              award: 'Landlord',
              eventType: 'award_result',
              lineNumber: 8,
              placement: 'first',
              rawLine: 'Izzy won first place on Landlord award',
            },
            {
              actor: 'Corey',
              eventType: 'global_parameter_changed',
              lineNumber: 9,
              parameter: 'temperature',
              rawLine: 'Corey raised temperature to 8 C',
            },
          ],
        },
      }),
    ).toEqual([
      {
        cardId: 'card-1',
        confidenceLevel: 'high',
        eventOrder: 4,
        eventType: 'card_played',
        lineClassification: 'event',
        payload: {
          actor: 'Izzy',
          cardName: 'Earth Catapult',
        },
        rawLine: 'Izzy played Earth Catapult',
      },
      {
        cardId: 'card-2',
        confidenceLevel: 'high',
        eventOrder: 5,
        eventType: 'resource_changed',
        lineClassification: 'event',
        payload: {
          actor: 'Izzy',
          cardName: 'Tardigrades',
          operation: 'added',
        },
        rawLine: 'Izzy added 2 microbes to Tardigrades',
        resourceAmount: 2,
        resourceType: 'microbe',
      },
      {
        confidenceLevel: 'high',
        eventOrder: 6,
        eventType: 'milestone_claimed',
        lineClassification: 'event',
        payload: {
          actor: 'Izzy',
          milestoneName: 'Builder',
        },
        rawLine: 'Izzy claimed Builder milestone',
      },
      {
        confidenceLevel: 'high',
        eventOrder: 7,
        eventType: 'award_funded',
        lineClassification: 'event',
        payload: {
          actor: 'Corey',
          awardName: 'Landlord',
        },
        rawLine: 'Corey funded Landlord award',
      },
      {
        confidenceLevel: 'high',
        eventOrder: 8,
        eventType: 'award_result',
        lineClassification: 'event',
        payload: {
          actor: 'Izzy',
          awardName: 'Landlord',
          placement: 'first',
        },
        rawLine: 'Izzy won first place on Landlord award',
      },
      {
        confidenceLevel: 'high',
        eventOrder: 9,
        eventType: 'global_parameter_changed',
        lineClassification: 'event',
        payload: {
          actor: 'Corey',
          parameterType: 'temperature',
        },
        rawLine: 'Corey raised temperature to 8 C',
        resourceType: 'temperature',
      },
    ]);
  });
});
