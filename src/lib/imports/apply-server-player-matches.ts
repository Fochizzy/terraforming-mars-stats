import type { ImportNameMatchReason } from '@/lib/db/import-player-resolution-repo';
import type { ImportPlayerLinkMatch } from './resolve-import-player-links';

export type ServerPlayerMatch = {
  importedName: string;
  matchReason: ImportNameMatchReason;
  playerId: string;
  publicName: string;
};

/**
 * Overlay the server matcher's verdict onto the client-resolved links.
 *
 * The client can no longer see full names, usernames, or saved aliases, so its
 * own scoring only ever matches on the public label. The server sees all of it,
 * and its answer wins wherever it produced one. The client resolver still owns
 * the candidate list the reviewer chooses from.
 *
 * Only the coarse exact/partial classification is consumed here. Which private
 * field produced the match is the server's business; depending on it would
 * re-open the disclosure the matcher is being coarsened to close, and would
 * break the moment the coarse RPC replaces the fine-grained one.
 */
export function applyServerPlayerMatches(
  links: ImportPlayerLinkMatch[],
  serverMatches: ServerPlayerMatch[],
): ImportPlayerLinkMatch[] {
  const matchByImportedName = new Map(
    serverMatches.map((match) => [match.importedName, match]),
  );

  return links.map((link) => {
    const match = matchByImportedName.get(link.importedName);

    if (!match) {
      return link;
    }

    // Rows for one person across several groups collapse into a single option,
    // so the server's row may not be the representative one. Both render under
    // the same public label, which is what the reviewer actually picks.
    const candidate =
      link.candidates.find((entry) => entry.id === match.playerId) ??
      link.candidates.find((entry) => entry.displayName === match.publicName);

    if (!candidate) {
      return link;
    }

    const isExact = match.matchReason === 'exact';

    return {
      ...link,
      requiresConfirmation: !isExact,
      selectedPlayerId: candidate.id,
      status: isExact ? 'exact' : 'suggested',
    } satisfies ImportPlayerLinkMatch;
  });
}
