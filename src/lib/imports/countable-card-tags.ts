export const EVENT_CARD_TYPE = 'Event';

/**
 * A played Event is turned face down, so none of its printed tags — including
 * the synthetic event tag itself — ever count toward a tag total. Every other
 * canonical card type keeps its printed tags. Detection must use the card's
 * canonical type, not tag-code presence, since a card can carry an `event`
 * gameplay tag without being an Event-type card.
 */
export function countableCardTags<TagCode extends string>(
  sourceTags: TagCode[],
  cardType: string,
): TagCode[] {
  return cardType === EVENT_CARD_TYPE ? [] : sourceTags;
}
