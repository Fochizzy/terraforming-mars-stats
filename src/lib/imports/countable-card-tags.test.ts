import { describe, expect, it } from 'vitest';
import {
  PLAYABLE_CARD_TYPES,
  TAG_COUNTING_CARD_TYPES,
} from '@/lib/cards/card-type-vocabulary';
import { countableCardTags } from './countable-card-tags';

describe('countableCardTags', () => {
  it('keeps every tag on an Automated card', () => {
    expect(countableCardTags(['building', 'science'], 'Automated')).toEqual([
      'building',
      'science',
    ]);
  });

  it('keeps a single tag on an Active card', () => {
    expect(countableCardTags(['space'], 'Active')).toEqual(['space']);
  });

  it('keeps tags on a legacy Project card', () => {
    expect(countableCardTags(['science'], 'Project')).toEqual(['science']);
  });

  it('keeps tags on a Corporation card', () => {
    expect(countableCardTags(['building'], 'Corporation')).toEqual([
      'building',
    ]);
  });

  it('keeps tags on a Prelude card', () => {
    expect(countableCardTags(['plant'], 'Prelude')).toEqual(['plant']);
  });

  it('keeps every tag on a non-event card', () => {
    expect(countableCardTags(['science', 'space'], 'Automated')).toEqual([
      'science',
      'space',
    ]);
  });

  it('keeps repeated tags on a non-event card', () => {
    expect(countableCardTags(['moon', 'moon', 'space'], 'Active')).toEqual([
      'moon',
      'moon',
      'space',
    ]);
  });

  it('drops every tag on an Event card whose only printed tag is event', () => {
    expect(countableCardTags(['event'], 'Event')).toEqual([]);
  });

  it('drops every tag on an Event card with event and earth', () => {
    expect(countableCardTags(['event', 'earth'], 'Event')).toEqual([]);
  });

  it('drops every tag on an Event card with no literal event tag present', () => {
    expect(countableCardTags(['space', 'jovian'], 'Event')).toEqual([]);
  });

  it('drops the other tags regardless of where the event tag sits', () => {
    expect(countableCardTags(['space', 'event'], 'Event')).toEqual([]);
  });

  it('returns an empty list for an Event card with no tags', () => {
    expect(countableCardTags([], 'Event')).toEqual([]);
  });

  it('decides on canonical card type rather than tag-code presence', () => {
    // A non-Event card carrying a stray `event` tag must not be treated as an Event.
    expect(countableCardTags(['event', 'space'], 'Automated')).toEqual([
      'event',
      'space',
    ]);
  });

  it('fails closed on an unrecognized card type instead of assuming it is safe', () => {
    expect(countableCardTags(['space'], 'SomeFutureCardType')).toEqual([]);
  });

  it('fails closed on an empty-string card type', () => {
    expect(countableCardTags(['space'], '')).toEqual([]);
  });

  it('fails closed on a card type that only differs from Event by case', () => {
    // Not an alias for Event — this asserts the fail-closed default, not a
    // case-insensitive match against EVENT_CARD_TYPE.
    expect(countableCardTags(['space'], 'event')).toEqual([]);
  });

  it('tracks the canonical vocabulary rather than a hand-copied list', () => {
    // Drives countableCardTags off the actual shared constants rather than
    // literal strings, so a future edit to the canonical vocabulary that
    // isn't also reflected in countableCardTags's behavior fails this test
    // instead of silently drifting.
    for (const cardType of TAG_COUNTING_CARD_TYPES) {
      expect(countableCardTags(['space'], cardType)).toEqual(['space']);
    }

    const nonTagCountingPlayableTypes = PLAYABLE_CARD_TYPES.filter(
      (cardType) => !TAG_COUNTING_CARD_TYPES.includes(cardType),
    );

    expect(nonTagCountingPlayableTypes).toEqual(['Event']);

    for (const cardType of nonTagCountingPlayableTypes) {
      expect(countableCardTags(['space'], cardType)).toEqual([]);
    }
  });
});
