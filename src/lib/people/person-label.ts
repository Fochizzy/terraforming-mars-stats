/**
 * Canonical rule for how a person is named anywhere in the authenticated app.
 *
 * - A registered account is shown by its `username`.
 * - An unregistered player (no linked account, or an account without a username)
 *   is shown by their FIRST name only — never a full/last name.
 * - Nothing is ever shown to signed-out visitors. That is enforced by not
 *   surfacing people on public routes at all, so this helper only runs behind
 *   authentication.
 */

export type PersonLabelInput = {
  /** `user_profiles.username` for the player's linked account, if any. */
  username?: string | null;
  /** The per-group roster name (`players.display_name`). */
  displayName?: string | null;
};

/** First whitespace-delimited token of a name, or '' when there is none. */
export function firstNameOf(displayName: string | null | undefined): string {
  const trimmed = (displayName ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0] ?? '';
}

/**
 * Resolve the label to render for a person: their username when registered,
 * otherwise their first name only.
 */
export function personLabel(input: PersonLabelInput): string {
  const username = input.username?.trim();
  if (username) {
    return username;
  }
  return firstNameOf(input.displayName);
}
