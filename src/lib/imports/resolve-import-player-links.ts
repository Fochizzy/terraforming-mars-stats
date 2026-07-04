import { normalizePlayerAlias } from './normalize-player-alias';

type ImportGroupPlayer = {
  displayName: string;
  id: string;
};

type ImportPlayerAlias = {
  aliasText: string;
  normalizedAlias: string;
  playerId: string;
  sourceType: string;
};

export type ImportPlayerLinkMatch =
  | {
      importedName: string;
      playerId: string;
      status: 'exact' | 'alias';
    }
  | {
      importedName: string;
      options: ImportGroupPlayer[];
      status: 'ambiguous' | 'suggested';
    }
  | {
      importedName: string;
      status: 'unmatched';
    };

export function resolveImportPlayerLinks(
  importedNames: string[],
  players: ImportGroupPlayer[],
  aliases: ImportPlayerAlias[],
) {
  const normalizedPlayerEntries = players.map((player) => ({
    normalizedName: normalizePlayerAlias(player.displayName),
    player,
  }));

  const matches: ImportPlayerLinkMatch[] = importedNames.map((importedName) => {
    const normalizedImportedName = normalizePlayerAlias(importedName);
    if (!normalizedImportedName) {
      return {
        importedName,
        status: 'unmatched',
      };
    }

    const exactMatches = normalizedPlayerEntries
      .filter((entry) => entry.normalizedName === normalizedImportedName)
      .map((entry) => entry.player);

    if (exactMatches.length === 1 && exactMatches[0]) {
      return {
        importedName,
        playerId: exactMatches[0].id,
        status: 'exact',
      };
    }

    if (exactMatches.length > 1) {
      return {
        importedName,
        options: exactMatches,
        status: 'ambiguous',
      };
    }

    const aliasMatches = aliases.filter(
      (alias) => alias.normalizedAlias === normalizedImportedName,
    );
    const aliasPlayerOptions = aliasMatches.flatMap((alias) => {
      const player = players.find((candidate) => candidate.id === alias.playerId);
      return player ? [player] : [];
    });

    if (aliasMatches.length === 1 && aliasMatches[0]) {
      return {
        importedName,
        playerId: aliasMatches[0].playerId,
        status: 'alias',
      };
    }

    if (aliasMatches.length > 1) {
      return {
        importedName,
        options: aliasPlayerOptions,
        status: 'ambiguous',
      };
    }

    const partialMatches = normalizedPlayerEntries
      .filter((entry) => entry.normalizedName.includes(normalizedImportedName))
      .map((entry) => entry.player);

    if (partialMatches.length > 1) {
      return {
        importedName,
        options: partialMatches,
        status: 'ambiguous',
      };
    }

    if (partialMatches.length === 1 && partialMatches[0]) {
      return {
        importedName,
        options: partialMatches,
        status: 'suggested',
      };
    }

    return {
      importedName,
      status: 'unmatched',
    };
  });

  return {
    matches,
    unresolvedCount: matches.filter(
      (match) =>
        match.status === 'ambiguous' ||
        match.status === 'suggested' ||
        match.status === 'unmatched',
    ).length,
  };
}
