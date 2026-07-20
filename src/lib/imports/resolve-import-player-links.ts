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
  /**
   * Coarse classification only. Which field produced a match is never
   * disclosed — not by the server matcher, and not by this client resolver —
   * so review payloads carry no field-specific matching evidence.
   */
  matchReason: 'exact' | 'fallback' | 'partial';
};

/**
 * Ranking-only candidate shape used while this module is choosing and
 * ordering matches. `matchScore` is unique per matching axis (alias vs.
 * username vs. display name, exact vs. partial — see
 * `INTERNAL_MATCH_SCORES`), so it never leaves this module: serializing it
 * would hand an inspecting client the exact private field that produced the
 * match, defeating the coarsening `matchReason` exists to provide.
 */
type ScoredCandidate = ImportPlayerLinkCandidate & { matchScore: number };

function toPublicCandidate(
  candidate: ScoredCandidate,
): ImportPlayerLinkCandidate {
  return {
    displayName: candidate.displayName,
    gamesPlayed: candidate.gamesPlayed,
    id: candidate.id,
    linkedFullName: candidate.linkedFullName,
    linkedUsername: candidate.linkedUsername,
    matchReason: candidate.matchReason,
  };
}

export type ImportPlayerLinkMatch = {
  candidates: ImportPlayerLinkCandidate[];
  importedName: string;
  requiresConfirmation: boolean;
  selectedPlayerId: string | null;
  status: 'ambiguous' | 'exact' | 'suggested' | 'unmatched';
};

/**
 * Internal precedence between match axes, kept so the SAME candidate keeps
 * winning that always did. The axis stays private: every score maps onto the
 * coarse exact/partial/fallback classification before anything leaves this
 * module.
 */
const INTERNAL_MATCH_SCORES = {
  aliasExact: 250,
  displayNameExact: 400,
  displayNamePartial: 200,
  fullNameExact: 350,
  fullNamePartial: 180,
  usernameExact: 300,
  usernamePartial: 160,
} as const;

const EXACT_SCORE_FLOOR = INTERNAL_MATCH_SCORES.aliasExact;

function coarseReasonForScore(
  matchScore: number,
): ImportPlayerLinkCandidate['matchReason'] {
  if (matchScore >= EXACT_SCORE_FLOOR) {
    return 'exact';
  }

  return matchScore > 0 ? 'partial' : 'fallback';
}

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

function compareCandidates(left: ScoredCandidate, right: ScoredCandidate) {
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

function buildFallbackCandidate(player: ImportGroupPlayer): ScoredCandidate {
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

function chooseHigherScore(current: ScoredCandidate, next: ScoredCandidate) {
  return compareCandidates(current, next) <= 0 ? current : next;
}

function buildPlayerCandidate(input: {
  aliases: ImportPlayerAlias[];
  importedName: string;
  normalizedImportedName: string;
  player: ImportGroupPlayer;
}): ScoredCandidate {
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

  const scoredCandidate = (matchScore: number): ScoredCandidate => ({
    ...fallbackCandidate,
    matchReason: coarseReasonForScore(matchScore),
    matchScore,
  });

  let candidate = fallbackCandidate;

  if (isExactMatchFor(input.player.displayName)) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.displayNameExact),
    );
  }

  if (isExactMatchFor(input.player.linkedFullName ?? '')) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.fullNameExact),
    );
  }

  if (isExactMatchFor(input.player.linkedUsername ?? '')) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.usernameExact),
    );
  }

  if (
    input.aliases.some(
      (alias) =>
        playerIds.has(alias.playerId) &&
        alias.normalizedAlias === input.normalizedImportedName,
    )
  ) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.aliasExact),
    );
  }

  if (
    displayName &&
    displayName !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, displayName)
  ) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.displayNamePartial),
    );
  }

  if (
    fullName &&
    fullName !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, fullName)
  ) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.fullNamePartial),
    );
  }

  if (
    username &&
    username !== input.normalizedImportedName &&
    isTokenPrefixMatch(input.normalizedImportedName, username)
  ) {
    candidate = chooseHigherScore(
      candidate,
      scoredCandidate(INTERNAL_MATCH_SCORES.usernamePartial),
    );
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
          .sort(compareCandidates)
          .map(toPublicCandidate),
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: null,
        status: 'unmatched',
      };
    }

    const scoredCandidates = resolutionPlayers
      .map((player) =>
        buildPlayerCandidate({
          aliases,
          importedName,
          normalizedImportedName,
          player,
        }),
      )
      .sort(compareCandidates);
    // The public candidate list handed to callers and, eventually, the
    // browser — ranking evidence (matchScore) never crosses this boundary.
    const candidates = scoredCandidates.map(toPublicCandidate);

    const topCandidate = scoredCandidates[0];

    if (!topCandidate || topCandidate.matchScore === 0) {
      return {
        candidates,
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: null,
        status: 'unmatched',
      };
    }

    const topScoreMatches = scoredCandidates.filter(
      (candidate) => candidate.matchScore === topCandidate.matchScore,
    );
    const topGamesPlayedMatches = topScoreMatches.filter(
      (candidate) => candidate.gamesPlayed === topCandidate.gamesPlayed,
    );
    const hasExactTie = topScoreMatches.length > 1;
    const hasUnbrokenTie = topGamesPlayedMatches.length > 1;

    if (topCandidate.matchReason === 'exact' && !hasExactTie) {
      return {
        candidates,
        importedName,
        requiresConfirmation: false,
        selectedPlayerId: topCandidate.id,
        status: 'exact',
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
