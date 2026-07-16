import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';

export type LogGamePlayerOption = {
  display_name: string;
  id: string;
  linked_full_name?: string | null;
  linked_username?: string | null;
};

export type MatchedPlayerOption = {
  player: LogGamePlayerOption;
  score: number;
};

type MatchReason =
  | 'display_name_exact'
  | 'display_name_partial'
  | 'full_name_exact'
  | 'full_name_partial'
  | 'last_initial_exact'
  | 'username_exact'
  | 'username_partial';

const matchScores: Record<MatchReason, number> = {
  display_name_exact: 500,
  full_name_exact: 475,
  username_exact: 450,
  last_initial_exact: 425,
  display_name_partial: 250,
  full_name_partial: 225,
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

function buildFirstNameLastInitial(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);

  if (tokens.length < 2) {
    return '';
  }

  const firstName = tokens[0] ?? '';
  const lastName = tokens[tokens.length - 1] ?? '';

  if (!firstName || !lastName) {
    return '';
  }

  return `${firstName} ${lastName.charAt(0)}`;
}

function getPrimaryName(player: LogGamePlayerOption) {
  const preferredName = player.linked_full_name?.trim() || player.display_name.trim();
  return preferredName.split(/\s+/).filter(Boolean)[0] ?? player.display_name.trim();
}

function compareMatchedPlayers(left: MatchedPlayerOption, right: MatchedPlayerOption) {
  return (
    right.score - left.score ||
    left.player.display_name.localeCompare(right.player.display_name)
  );
}

function buildPlayerScore(player: LogGamePlayerOption, normalizedEntry: string) {
  const displayName = normalizePlayerAlias(player.display_name);
  const fullName = normalizePlayerAlias(player.linked_full_name ?? '');
  const username = normalizePlayerAlias(player.linked_username ?? '');
  const shortName = normalizePlayerAlias(
    buildFirstNameLastInitial(player.linked_full_name ?? player.display_name),
  );

  let score = 0;

  if (displayName && displayName === normalizedEntry) {
    score = Math.max(score, matchScores.display_name_exact);
  } else if (displayName && isTokenPrefixMatch(normalizedEntry, displayName)) {
    score = Math.max(score, matchScores.display_name_partial);
  }

  if (fullName && fullName === normalizedEntry) {
    score = Math.max(score, matchScores.full_name_exact);
  } else if (fullName && isTokenPrefixMatch(normalizedEntry, fullName)) {
    score = Math.max(score, matchScores.full_name_partial);
  }

  if (username && username === normalizedEntry) {
    score = Math.max(score, matchScores.username_exact);
  } else if (username && isTokenPrefixMatch(normalizedEntry, username)) {
    score = Math.max(score, matchScores.username_partial);
  }

  if (shortName && shortName === normalizedEntry) {
    score = Math.max(score, matchScores.last_initial_exact);
  }

  return score;
}

export function formatSelectedPlayerLabel(player: LogGamePlayerOption) {
  const username = player.linked_username?.trim();

  if (!username) {
    return player.display_name;
  }

  return `${getPrimaryName(player)} (@${username})`;
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
