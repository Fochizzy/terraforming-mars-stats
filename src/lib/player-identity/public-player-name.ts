export const PUBLIC_PLAYER_FALLBACK = 'Player';

export type PublicPlayerNameSource =
  | {
      kind: 'linked_claimed_player';
      registeredUsername: string | null;
    }
  | {
      guestDisplayLabel: string | null;
      kind: 'unlinked_guest';
    }
  | {
      kind:
        | 'deleted_account'
        | 'inaccessible_player'
        | 'unavailable_registered_profile'
        | 'unresolved_player';
    };

export type PublicPlayerIdentity = {
  displayName: string;
  playerId: string;
};

export function resolvePublicPlayerName(source: PublicPlayerNameSource) {
  if (source.kind === 'linked_claimed_player') {
    return source.registeredUsername?.trim() || PUBLIC_PLAYER_FALLBACK;
  }

  if (source.kind === 'unlinked_guest') {
    return source.guestDisplayLabel?.trim() || PUBLIC_PLAYER_FALLBACK;
  }

  return PUBLIC_PLAYER_FALLBACK;
}

export function serializePublicPlayerIdentity(input: {
  playerId: string;
  source: PublicPlayerNameSource;
}): PublicPlayerIdentity {
  return {
    displayName: resolvePublicPlayerName(input.source),
    playerId: input.playerId,
  };
}
