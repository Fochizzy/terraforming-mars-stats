import {
  EVENT_CARD_TYPE,
  TAG_COUNTING_CARD_TYPES,
} from '@/lib/cards/card-type-vocabulary';

export { EVENT_CARD_TYPE };

/**
 * Every canonical card type whose printed tags are known to count toward a
 * tag total: `TAG_COUNTING_CARD_TYPES` (`PLAYABLE_CARD_TYPES` minus `Event`)
 * from the shared, dependency-free vocabulary module — importing it here
 * cannot drift from `reference-repo.ts`, since both read the same constant.
 */
const KNOWN_TAG_COUNTING_CARD_TYPES = new Set(TAG_COUNTING_CARD_TYPES);

/**
 * A played Event is turned face down, so none of its printed tags — including
 * the synthetic event tag itself — ever count toward a tag total. Detection
 * must use the card's canonical type, not tag-code presence, since a card can
 * carry an `event` gameplay tag without being an Event-type card.
 *
 * Fails closed: only a card type on the known, explicitly-safe list keeps its
 * tags. An Event, and any card type this list doesn't recognize, contributes
 * zero tags — an unrecognized type is never silently assumed to be a safe
 * non-Event card.
 */
export function countableCardTags<TagCode extends string>(
  sourceTags: TagCode[],
  cardType: string,
): TagCode[] {
  return KNOWN_TAG_COUNTING_CARD_TYPES.has(cardType) ? sourceTags : [];
}
