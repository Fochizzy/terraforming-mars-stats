import { describe, expect, it } from 'vitest';
import { classifyGameLogLine } from './classify-game-log-line';

describe('classifyGameLogLine', () => {
  it('classifies chatty filler greetings', () => {
    expect(classifyGameLogLine('Good luck Corey!')).toEqual({
      kind: 'chatty_filler',
    });
  });

  it('classifies perspective draw lines', () => {
    expect(classifyGameLogLine('You drew Micro-Mills')).toEqual({
      kind: 'draw_info',
      card: 'Micro-Mills',
    });
  });

  it('classifies generation started events', () => {
    expect(classifyGameLogLine('Generation 4')).toEqual({
      event: {
        eventType: 'generation_started',
        generation: 4,
      },
      kind: 'event',
    });
  });

  it('classifies played-card events with actor and card names', () => {
    expect(classifyGameLogLine('Izzy played Earth Catapult')).toEqual({
      event: {
        actor: 'Izzy',
        card: 'Earth Catapult',
        eventType: 'card_played',
      },
      kind: 'event',
    });
  });

  it('classifies tile placement events with actor, tile, and space details', () => {
    expect(classifyGameLogLine('Izzy placed greenery tile at 29')).toEqual({
      event: {
        actor: 'Izzy',
        eventType: 'tile_placed',
        space: '29',
        tile: 'greenery',
      },
      kind: 'event',
    });
  });

  it('classifies tracked resource changes on cards', () => {
    expect(
      classifyGameLogLine('Izzy added 2 microbes to Tardigrades'),
    ).toEqual({
      event: {
        actor: 'Izzy',
        card: 'Tardigrades',
        eventType: 'resource_changed',
        operation: 'added',
        resourceAmount: 2,
        resourceType: 'microbe',
      },
      kind: 'event',
    });
  });

  it('classifies claimed milestone rows', () => {
    expect(classifyGameLogLine('Izzy claimed Builder milestone')).toEqual({
      event: {
        actor: 'Izzy',
        eventType: 'milestone_claimed',
        milestone: 'Builder',
      },
      kind: 'event',
    });
  });

  it('classifies funded award rows', () => {
    expect(classifyGameLogLine('Second Seat funded Landlord award')).toEqual({
      event: {
        actor: 'Second Seat',
        award: 'Landlord',
        eventType: 'award_funded',
      },
      kind: 'event',
    });
  });

  it('classifies first-place award result rows', () => {
    expect(
      classifyGameLogLine('Friday Mars won first place on Landlord award'),
    ).toEqual({
      event: {
        actor: 'Friday Mars',
        award: 'Landlord',
        eventType: 'award_result',
        placement: 'first',
      },
      kind: 'event',
    });
  });

  it('classifies second-place award result rows', () => {
    expect(
      classifyGameLogLine('Second Seat won second place on Landlord award'),
    ).toEqual({
      event: {
        actor: 'Second Seat',
        award: 'Landlord',
        eventType: 'award_result',
        placement: 'second',
      },
      kind: 'event',
    });
  });

  it('classifies explicit endgame card-point breakdown rows', () => {
    expect(
      classifyGameLogLine('Izzy Microbes 4 Animals 2 Jovian 6'),
    ).toEqual({
      event: {
        cardPointsAnimals: 2,
        cardPointsJovian: 6,
        cardPointsMicrobes: 4,
        eventType: 'card_points_breakdown',
        playerName: 'Izzy',
      },
      kind: 'event',
    });
  });

  it('classifies blank lines as ignored noise', () => {
    expect(classifyGameLogLine('   ')).toEqual({
      kind: 'ignored_noise',
    });
  });

  it('classifies unknown non-empty lines as context', () => {
    expect(classifyGameLogLine('Board state looked strange here')).toEqual({
      kind: 'context',
      text: 'Board state looked strange here',
    });
  });
});
