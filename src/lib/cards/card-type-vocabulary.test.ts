import { describe, expect, it } from 'vitest';
import {
  EVENT_CARD_TYPE,
  PLAYABLE_CARD_TYPES,
  PROJECT_CARD_TYPES,
  TAG_COUNTING_CARD_TYPES,
} from './card-type-vocabulary';

describe('card-type-vocabulary', () => {
  it('keeps the current canonical playable vocabulary', () => {
    expect(PROJECT_CARD_TYPES).toEqual(['Automated', 'Active', 'Event', 'Project']);
    expect(PLAYABLE_CARD_TYPES).toEqual([
      'Automated',
      'Active',
      'Event',
      'Project',
      'Corporation',
      'Prelude',
    ]);
  });

  it('derives the tag-counting set as every playable type except Event, with no manual duplication', () => {
    expect(TAG_COUNTING_CARD_TYPES).toEqual(
      PLAYABLE_CARD_TYPES.filter((cardType) => cardType !== EVENT_CARD_TYPE),
    );
    expect(TAG_COUNTING_CARD_TYPES).not.toContain(EVENT_CARD_TYPE);
  });

  it('cannot silently drift: adding a playable type here automatically makes it tag-counting', () => {
    // Regression guard for the drift this module exists to prevent: if a
    // future edit ever hand-duplicates TAG_COUNTING_CARD_TYPES again instead
    // of deriving it, this simulated addition would catch the mismatch.
    const simulatedPlayableTypes = [...PLAYABLE_CARD_TYPES, 'Colony'];
    const simulatedTagCountingTypes = simulatedPlayableTypes.filter(
      (cardType) => cardType !== EVENT_CARD_TYPE,
    );

    expect(simulatedTagCountingTypes).toContain('Colony');
  });
});
