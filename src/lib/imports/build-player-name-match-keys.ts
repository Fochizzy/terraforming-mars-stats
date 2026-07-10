import { normalizePlayerAlias } from './normalize-player-alias';

/**
 * The screenshot and the exported log print a player's in-game name ("Izzy"),
 * while the participants list may name the person ("Izzy Hodnett"). Matching
 * screenshot rows against the leading name token as well as the full name lets
 * both spellings resolve to the same player.
 */
export type PlayerNameMatchKeys = {
  keys: string[];
  playerName: string;
};

export function buildPlayerNameMatchKeys(
  playerNames: string[],
): PlayerNameMatchKeys[] {
  const normalizedNames = playerNames.map((playerName) => ({
    normalized: normalizePlayerAlias(playerName),
    playerName,
  }));
  const leadingTokenCounts = new Map<string, number>();

  for (const { normalized } of normalizedNames) {
    const leadingToken = normalized.split(' ')[0] ?? '';

    if (leadingToken) {
      leadingTokenCounts.set(
        leadingToken,
        (leadingTokenCounts.get(leadingToken) ?? 0) + 1,
      );
    }
  }

  return normalizedNames.map(({ normalized, playerName }) => {
    const leadingToken = normalized.split(' ')[0] ?? '';
    // A shared first name ("James Hodnett" and "James Cole") would make the
    // token ambiguous, so it is only a key when exactly one player claims it.
    const canUseLeadingToken =
      Boolean(leadingToken) &&
      leadingToken !== normalized &&
      leadingTokenCounts.get(leadingToken) === 1 &&
      !normalizedNames.some((other) => other.normalized === leadingToken);

    return {
      keys: canUseLeadingToken ? [normalized, leadingToken] : [normalized],
      playerName,
    };
  });
}
