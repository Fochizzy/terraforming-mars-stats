export const EVENT_CARD_TYPE = 'Event';

/**
 * Every canonical card type whose printed tags are known to count toward a
 * tag total. Must track `PROJECT_CARD_TYPES`/`PLAYABLE_CARD_TYPES` in
 * `src/lib/db/reference-repo.ts` minus `Event` — kept as a separate, local
 * constant (rather than importing that module) so this file stays
 * dependency-free and safe to use from scripts and tests.
 */
const KNOWN_TAG_COUNTING_CARD_TYPES = new Set([
  'Automated',
  'Active',
  'Project',
  'Corporation',
  'Prelude',
]);

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
