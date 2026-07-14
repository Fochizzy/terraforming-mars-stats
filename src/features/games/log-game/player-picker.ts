import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { personLabel } from '@/lib/people/person-label';

export type LogGamePlayerOption = {
  display_name: string;
  id: string;
  linked_username?: string | null;
};

export type MatchedPlayerOption = {
  player: LogGamePlayerOption;
  score: number;
};

type MatchReason =
  | 'display_name_exact'
  | 'display_name_partial'
  | 'username_exact'
  | 'username_partial';

const matchScores: Record<MatchReason, number> = {
  display_name_exact: 500,
  username_exact: 450,
  display_name_partial: 250,
  username_partial: 200,
};

function tokenizeNormalizedName(value: string) {
  return value.split(' ').filter(Boolean);
}

function isTokenPrefixMatch(input: string, candidate: string) {
  const inputTokens = tokenizeNormalizedName(input);
  const candidateTokens = tokenizeNormalizedName(candidate);

  if (inputTokens.length === 0 || inputTokens.length > candidateTokens.length) {
    return false;
  }

  return inputTokens.every((token, index) =>
    candidateTokens[index]?.startsWith(token),
  );
}

function compareMatchedPlayers(left: MatchedPlayerOption, right: MatchedPlayerOption) {
  return (
    right.score - left.score ||
    left.player.display_name.localeCompare(right.player.display_name)
  );
}

function buildPlayerScore(player: LogGamePlayerOption, normalizedEntry: string) {
  const displayName = normalizePlayerAlias(player.display_name);
  const username = normalizePlayerAlias(player.linked_username ?? '');

  let score = 0;

  if (displayName && displayName === normalizedEntry) {
    score = Math.max(score, matchScores.display_name_exact);
  } else if (displayName && isTokenPrefixMatch(normalizedEntry, displayName)) {
    score = Math.max(score, matchScores.display_name_partial);
  }

  if (username && username === normalizedEntry) {
    score = Math.max(score, matchScores.username_exact);
  } else if (username && isTokenPrefixMatch(normalizedEntry, username)) {
    score = Math.max(score, matchScores.username_partial);
  }

  return score;
}

export function formatSelectedPlayerLabel(player: LogGamePlayerOption) {
  return personLabel({
    username: player.linked_username,
    displayName: player.display_name,
  });
}

export function findMatchingPlayerOptions(input: {
  playerEntry: string;
  playerOptions: LogGamePlayerOption[];
}) {
  const normalizedEntry = normalizePlayerAlias(input.playerEntry);

  if (!normalizedEntry) {
    return [] as MatchedPlayerOption[];
  }

  return input.playerOptions
    .map((player) => ({
      player,
      score: buildPlayerScore(player, normalizedEntry),
    }))
    .filter((match) => match.score > 0)
    .sort(compareMatchedPlayers);
}
