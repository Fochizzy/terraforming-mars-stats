/**
 * Canonical Terraforming Mars `cards.card_type` vocabulary. Dependency-free by
 * design: no Supabase client, no Next.js runtime import — safe to pull into
 * `src/lib/db`, `src/lib/imports`, catalog scripts, and tests alike, so every
 * consumer derives from one source instead of keeping its own copy in sync by
 * hand.
 */

/**
 * The project deck, as the catalog types it today.
 *
 * The upstream card sync replaced a single generic `Project` card_type with the
 * real Terraforming Mars types, leaving `Project` on a handful of legacy rows.
 * Filtering on `Project` alone therefore drops Automated, Active and Event —
 * the bulk of the deck — so both vocabularies are accepted. `Standard Project`
 * and `Standard Action` stay out: they are board actions, not cards held in
 * hand, and the log records them as their own event type.
 */
export const PROJECT_CARD_TYPES = ['Automated', 'Active', 'Event', 'Project'];

/** Everything a player can play from hand, for matching names in a game log. */
export const PLAYABLE_CARD_TYPES = [
  ...PROJECT_CARD_TYPES,
  'Corporation',
  'Prelude',
];

export const EVENT_CARD_TYPE = 'Event';

/**
 * Every canonical card type whose printed tags are known to count toward a
 * tag total: every playable type except Event. Derived from
 * `PLAYABLE_CARD_TYPES`, not duplicated, so it cannot silently drift from it —
 * a new playable type added there is automatically tag-counting here too,
 * with no second edit required.
 */
export const TAG_COUNTING_CARD_TYPES = PLAYABLE_CARD_TYPES.filter(
  (cardType) => cardType !== EVENT_CARD_TYPE,
);
