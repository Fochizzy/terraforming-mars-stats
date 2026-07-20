import { describe, expect, it } from 'vitest';
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

  it('keeps tags for an unfamiliar, unrecognized card type since it is not Event', () => {
    expect(countableCardTags(['space'], 'SomeFutureCardType')).toEqual([
      'space',
    ]);
  });
});
