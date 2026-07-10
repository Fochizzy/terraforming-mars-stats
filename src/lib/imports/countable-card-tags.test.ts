import { describe, expect, it } from 'vitest';
import { countableCardTags } from './countable-card-tags';

describe('countableCardTags', () => {
  it('keeps every tag on a non-event card', () => {
    expect(countableCardTags(['science', 'space'])).toEqual(['science', 'space']);
  });

  it('keeps repeated tags on a non-event card', () => {
    expect(countableCardTags(['moon', 'moon', 'space'])).toEqual([
      'moon',
      'moon',
      'space',
    ]);
  });

  it('drops the other tags of an event card', () => {
    expect(countableCardTags(['event', 'space', 'earth'])).toEqual(['event']);
  });

  it('drops the other tags regardless of where the event tag sits', () => {
    expect(countableCardTags(['space', 'event'])).toEqual(['event']);
  });

  it('returns an empty list for a card with no tags', () => {
    expect(countableCardTags([])).toEqual([]);
  });
});
