const EVENT_TAG = 'event';

/**
 * A played event is turned face down, so only its event tag is ever counted;
 * the rest of its tags stop existing for every tag total in the game.
 */
export function countableCardTags<TagCode extends string>(
  sourceTags: TagCode[],
): TagCode[] {
  return sourceTags.some((sourceTag) => sourceTag === EVENT_TAG)
    ? sourceTags.filter((sourceTag) => sourceTag === EVENT_TAG)
    : sourceTags;
}
