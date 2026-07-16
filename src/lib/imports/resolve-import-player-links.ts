import { compactPlayerAlias, normalizePlayerAlias } from './normalize-player-alias';

type ImportGroupPlayer = {
  alternateIds?: string[];
  canonicalKey?: string;
  displayName: string;
  gamesPlayed?: number;
  id: string;
  linkedFullName?: string | null;
  linkedUsername?: string | null;
};

type ImportPlayerAlias = {
  aliasText: string;
  normalizedAlias: string;
  playerId: string;
  sourceType: string;
};

export type ImportPlayerLinkCandidate = {
  displayName: string;
  gamesPlayed: number;
  id: string;
  linkedFullName: string | null;
  linkedUsername: string | null;
  matchReason:
    | 'alias_exact'
    | 'display_name_exact'
    | 'display_name_partial'
    | 'fallback'
    | 'full_name_exact'
    | 'full_name_partial'
    | 'username_exact'
    | 'username_partial';
  matchScore: number;
};

export type ImportPlayerLinkMatch = {
  candidates: ImportPlayerLinkCandidate[];
  importedName: string;
  requiresConfirmation: boolean;
  selectedPlayerId: string | null;
  status: 'alias' | 'ambiguous' | 'exact' | 'suggested' | 'unmatched';
};

type CandidateScore = Pick<
  ImportPlayerLinkCandidate,
  'matchReason' | 'matchScore'
>;

const exactReasonOrder = new Map<
  ImportPlayerLinkCandidate['matchReason'],
  CandidateScore
>([
  ['display_name_exact', { matchReason: 'display_name_exact', matchScore: 400 }],
  ['full_name_exact', { matchReason: 'full_name_exact', matchScore: 350 }],
  ['username_exact', { matchReason: 'username_exact', matchScore: 300 }],
  ['alias_exact', { matchReason: 'alias_exact', matchScore: 250 }],
]);

const partialReasonOrder = new Map<
  ImportPlayerLinkCandidate['matchReason'],
  CandidateScore
>([
  ['display_name_partial', { matchReason: 'display_name_partial', matchScore: 200 }],
  ['full_name_partial', { matchReason: 'full_name_partial', matchScore: 180 }],
  ['username_partial', { matchReason: 'username_partial', matchScore: 160 }],
]);

function tokenizeNormalizedName(value: string) {
  return value.split(' ').filter(Boolean);
}

function isTokenPrefixMatch(importedName: string, candidateName: string) {
  const importedTokens = tokenizeNormalizedName(importedName);
  const candidateTokens = tokenizeNormalizedName(candidateName);

  if (
    importedTokens.length === 0 ||
    importedTokens.length > candidateTokens.length
  ) {
    return false;
  }

  return importedTokens.every((token, index) =>
    candidateTokens[index]?.startsWith(token),
  );
}

function compareCandidates(
  left: ImportPlayerLinkCandidate,
  right: ImportPlayerLinkCandidate,
) {
  return (
    right.matchScore - left.matchScore ||
    right.gamesPlayed - left.gamesPlayed ||
    left.displayName.localeCompare(right.displayName)
  );
}

function comparePlayerRepresentatives(
  left: ImportGroupPlayer,
  right: ImportGroupPlayer,
) {
  return (
    (right.gamesPlayed ?? 0) - (left.gamesPlayed ?? 0) ||
    left.id.localeCompare(right.id)
  );
}

function firstNonEmptyValue(
  players: ImportGroupPlayer[],
  getValue: (player: ImportGroupPlayer) => string | null | undefined,
) {
  return (
    players
      .map(getValue)
      .find((value): value is string => Boolean(value?.trim())) ?? null
  );
}

/**
 * A registered person may have one players row in every group they belong to.
 * Collapse those rows into one review option, but retain every concrete id so
 * aliases tied to any group row still match. The confirmation route receives
 * the uncollapsed pool and can therefore continue recognizing an older
 * selected id even if a different row becomes the current representative.
 */
function collapsePlayersByCanonicalIdentity(players: ImportGroupPlayer[]) {
  const groupedPlayers = new Map<string, ImportGroupPlayer[]>();

  for (const player of players) {
    const canonicalKey = player.canonicalKey?.trim() || `player:${player.id}`;
    groupedPlayers.set(canonicalKey, [
      ...(groupedPlayers.get(canonicalKey) ?? []),
      player,
    ]);
  }

  return [...groupedPlayers.values()].map((matchingPlayers) => {
    const representative = [...matchingPlayers].sort(
      comparePlayerRepresentatives,
    )[0]!;
    const alternateIds = [
      ...new Set(
        matchingPlayers.flatMap((player) => [
          player.id,
          ...(player.alternateIds ?? []),
        ]),
      ),
    ];

    return {
      ...representative,
      alternateIds,
      gamesPlayed: matchingPlayers.reduce(
        (total, player) => total + (player.gamesPlayed ?? 0),
        0,
      ),
      linkedFullName:
        representative.linkedFullName ??
        firstNonEmptyValue(matchingPlayers, (player) => player.linkedFullName),
      linkedUsername:
        representative.linkedUsername ??
        firstNonEmptyValue(matchingPlayers, (player) => player.linkedUsername),
    } satisfies ImportGroupPlayer;
  });
}

function buildFallbackCandidate(
  player: ImportGroupPlayer,
): ImportPlayerLinkCandidate {
  return {
    displayName: player.displayName,
    gamesPlayed: player.gamesPlayed ?? 0,
    id: player.id,
    linkedFullName: player.linkedFullName ?? null,
    linkedUsername: player.linkedUsername ?? null,
    matchReason: 'fallback',
    matchScore: 0,
  };
}

function chooseHigherScore(
  current: ImportPlayerLinkCandidate,
  next: ImportPlayerLinkCandidate,
) {
  return compareCandidates(current, next) <= 0 ? current : next;
}

function buildPlayerCandidate(input: {
  aliases: ImportPlayerAlias[];
  importedName: string;
  normalizedImportedName: string;
  player: ImportGroupPlayer;
}): ImportPlayerLinkCandidate {
  const fallbackCandidate = buildFallbackCandidate(input.player);
  const displayName = normalizePlayerAlias(input.player.displayName);
  const fullName = normalizePlayerAlias(input.player.linkedFullName ?? '');
  const username = normalizePlayerAlias(input.player.linkedUsername ?? '');
  const compactImportedName = compactPlayerAlias(input.importedName);
  const playerIds = new Set([
    input.player.id,
    ...(input.player.alternateIds ?? []),
  ]);

  // A name is an exact match when its space-preserving form is identical, or —
  // to bridge a spaced handle against the concatenated username it came from —
  // when its separator-free form is identical.
  const isExactMatchFor = (rawFieldValue: string) => {
    const normalizedField = normalizePlayerAlias(rawFieldValue);

    if (!normalizedField) {
      return false;
    }

    if (normalizedField === input.normalizedImportedName) {
      return true;
    }

    return (
      Boolean(compactImportedName) &&
      compactPlayerAlias(rawFieldValue) === compactImportedName
    );
  };

  let candidate = fallbackCandidate;

  if (isExactMatchFor(input.player.displayName)) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('display_name_exact')!,
    });
  }

  if (isExactMatchFor(input.player.linkedFullName ?? '')) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('full_name_exact')!,
    });
  }

  if (isExactMatchFor(input.player.linkedUsername ?? '')) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('username_exact')!,
    });
  }

  if (
    input.aliases.some(
      (alias) =>
        playerIds.has(alias.playerId) &&
        alias.normalizedAlias === input.normalizedImportedName,
    )
  ) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('alias_exact')!,
    });
  }

  if (
    displayName &&
    displayName !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, displayName)
  ) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...partialReasonOrder.get('display_name_partial')!,
    });
  }

  if (
    fullName &&
    fullName !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, fullName)
  ) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...partialReasonOrder.get('full_name_partial')!,
    });
  }

  if (
    username &&
    username !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, username)
  ) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...partialReasonOrder.get('username_partial')!,
    });
  }

  return candidate;
}

export function resolveImportPlayerLinks(
  importedNames: string[],
  players: ImportGroupPlayer[],
  aliases: ImportPlayerAlias[],
) {
  const resolutionPlayers = collapsePlayersByCanonicalIdentity(players);
  const matches: ImportPlayerLinkMatch[] = importedNames.map((importedName) => {
    const normalizedImportedName = normalizePlayerAlias(importedName);

    if (!normalizedImportedName) {
      return {
        candidates: resolutionPlayers
          .map((player) => buildFallbackCandidate(player))
          .sort(compareCandidates),
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: null,
        status: 'unmatched',
      };
    }

    const candidates = resolutionPlayers
      .map((player) =>
        buildPlayerCandidate({
          aliases,
          importedName,
          normalizedImportedName,
          player,
        }),
      )
      .sort(compareCandidates);

    const topCandidate = candidates[0];

    if (!topCandidate || topCandidate.matchScore === 0) {
      return {
        candidates,
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: null,
        status: 'unmatched',
      };
    }

    const topScoreMatches = candidates.filter(
      (candidate) => candidate.matchScore === topCandidate.matchScore,
    );
    const topGamesPlayedMatches = topScoreMatches.filter(
      (candidate) => candidate.gamesPlayed === topCandidate.gamesPlayed,
    );
    const hasExactTie = topScoreMatches.length > 1;
    const hasUnbrokenTie = topGamesPlayedMatches.length > 1;
    const isExactMatch =
      topCandidate.matchReason === 'display_name_exact' ||
      topCandidate.matchReason === 'full_name_exact' ||
      topCandidate.matchReason === 'username_exact';
    const isAliasMatch = topCandidate.matchReason === 'alias_exact';

    if ((isExactMatch || isAliasMatch) && !hasExactTie) {
      return {
        candidates,
        importedName,
        requiresConfirmation: false,
        selectedPlayerId: topCandidate.id,
        status: isAliasMatch ? 'alias' : 'exact',
      };
    }

    if (hasUnbrokenTie) {
      return {
        candidates,
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: topCandidate.id,
        status: 'ambiguous',
      };
    }

    return {
      candidates,
      importedName,
      requiresConfirmation: true,
      selectedPlayerId: topCandidate.id,
      status: 'suggested',
    };
  });

  return {
    matches,
    unresolvedCount: matches.filter((match) => match.requiresConfirmation)
      .length,
  };
}
