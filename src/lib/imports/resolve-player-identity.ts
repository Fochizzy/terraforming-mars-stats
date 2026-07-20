import type { ImportPlayerLinkCandidate } from './resolve-import-player-links';

export type PlayerIdentity = {
  fullName: string;
  username: string;
};

/**
 * The username + full name shown by default for an imported player, before the
 * reviewer edits anything. The username defaults to the matched candidate's
 * public display name, falling back to the name the import used. The public
 * candidate DTO carries no private full name, so full name has no
 * candidate-derived default — a reviewer types one, or (for a freshly created
 * player) it's already tracked separately in the identity/form state.
 */
export function resolvePlayerIdentityDefault(input: {
  candidate: ImportPlayerLinkCandidate | null | undefined;
  importedName: string;
}): PlayerIdentity {
  return {
    fullName: '',
    username: input.candidate?.displayName ?? input.importedName,
  };
}

/**
 * The identity that should actually be saved: the reviewer's typed override
 * when present, otherwise the default derived from the selected candidate.
 */
export function resolveEffectivePlayerIdentity(input: {
  candidate: ImportPlayerLinkCandidate | null | undefined;
  importedName: string;
  override?: Partial<PlayerIdentity> | null;
}): PlayerIdentity {
  const fallback = resolvePlayerIdentityDefault(input);

  return {
    fullName: input.override?.fullName ?? fallback.fullName,
    username: input.override?.username ?? fallback.username,
  };
}
