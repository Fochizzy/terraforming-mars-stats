import { normalizePlayerAlias } from './normalize-player-alias';

type ImportGroupPlayer = {
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

export type ImportPlayerLinkMatch =
  {
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

  if (importedTokens.length === 0 || importedTokens.length > candidateTokens.length) {
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

function buildFallbackCandidate(player: ImportGroupPlayer): ImportPlayerLinkCandidate {
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

  let candidate = fallbackCandidate;

  if (displayName === input.normalizedImportedName && displayName) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('display_name_exact')!,
    });
  }

  if (fullName === input.normalizedImportedName && fullName) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('full_name_exact')!,
    });
  }

  if (username === input.normalizedImportedName && username) {
    candidate = chooseHigherScore(candidate, {
      ...fallbackCandidate,
      ...exactReasonOrder.get('username_exact')!,
    });
  }

  if (
    input.aliases.some(
      (alias) =>
        alias.playerId === input.player.id &&
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
  const matches: ImportPlayerLinkMatch[] = importedNames.map((importedName) => {
    const normalizedImportedName = normalizePlayerAlias(importedName);
    if (!normalizedImportedName) {
      return {
        candidates: players
          .map((player) => buildFallbackCandidate(player))
          .sort(compareCandidates),
        importedName,
        requiresConfirmation: true,
        selectedPlayerId: null,
        status: 'unmatched',
      };
    }

    const candidates = players
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
    unresolvedCount: matches.filter((match) => match.requiresConfirmation).length,
  };
}
