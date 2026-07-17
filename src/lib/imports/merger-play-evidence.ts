import { normalizePlayerAlias } from './normalize-player-alias';

/**
 * Source identities are catalog identities, never final matching by display
 * name. `promo:P39` is the current canonical catalog identity; the legacy
 * `promo:merger` alias remains accepted until the production catalog audit can
 * confirm every stored card UUID.
 */
export const ACCEPTED_MERGER_CARD_SOURCE_IDENTITIES = [
  'promo:p39',
  'promo:merger',
] as const;

export type MergerPlayConfidence = 'high' | 'medium' | 'low';

export type ImportedMergerEvent = {
  actorText: string | null;
  cardSourceId: string | null;
  confidence: MergerPlayConfidence;
  eventOrder: number;
  rawLine: string;
};

export type ImportPlayerIdentity = {
  gamePlayerId: string;
  playerId: string;
  displayName: string;
};

export type PlayerImportAlias = {
  normalizedAlias: string;
  playerId: string;
};

export type MergerPlayEvidence = {
  actorText: string | null;
  cardSourceId: string;
  confidence: MergerPlayConfidence;
  eventOrder: number;
  gamePlayerId: string | null;
  identityResolution: 'exact' | 'alias' | 'ambiguous' | 'unresolved';
  rawLine: string;
};

export function normalizeCatalogSourceIdentity(value: string) {
  return value.trim().toLowerCase();
}

export function isAcceptedMergerCardSourceIdentity(value: string | null): value is string {
  return (
    value !== null &&
    (ACCEPTED_MERGER_CARD_SOURCE_IDENTITIES as readonly string[]).includes(
      normalizeCatalogSourceIdentity(value),
    )
  );
}

function resolveActor(input: {
  actorText: string | null;
  aliases: readonly PlayerImportAlias[];
  players: readonly ImportPlayerIdentity[];
}): Pick<MergerPlayEvidence, 'gamePlayerId' | 'identityResolution'> {
  if (!input.actorText?.trim()) {
    return { gamePlayerId: null, identityResolution: 'unresolved' };
  }

  const normalizedActor = normalizePlayerAlias(input.actorText);
  const exactMatches = input.players.filter(
    (player) => normalizePlayerAlias(player.displayName) === normalizedActor,
  );

  if (exactMatches.length === 1) {
    return {
      gamePlayerId: exactMatches[0].gamePlayerId,
      identityResolution: 'exact',
    };
  }

  if (exactMatches.length > 1) {
    return { gamePlayerId: null, identityResolution: 'ambiguous' };
  }

  const aliasPlayerIds = [
    ...new Set(
      input.aliases
        .filter((alias) => alias.normalizedAlias === normalizedActor)
        .map((alias) => alias.playerId),
    ),
  ];
  const aliasMatches = input.players.filter((player) =>
    aliasPlayerIds.includes(player.playerId),
  );

  if (aliasMatches.length === 1) {
    return {
      gamePlayerId: aliasMatches[0].gamePlayerId,
      identityResolution: 'alias',
    };
  }

  return {
    gamePlayerId: null,
    identityResolution: aliasMatches.length > 1 ? 'ambiguous' : 'unresolved',
  };
}

/**
 * Returns only resolved catalog identities. It never guesses player identity
 * from player order, corporation, score, or a partial display-name match.
 */
export function extractMergerPlayEvidence(input: {
  aliases: readonly PlayerImportAlias[];
  events: readonly ImportedMergerEvent[];
  players: readonly ImportPlayerIdentity[];
}): readonly MergerPlayEvidence[] {
  return input.events
    .flatMap((event) => {
      if (!isAcceptedMergerCardSourceIdentity(event.cardSourceId)) return [];

      return [{
        actorText: event.actorText,
        cardSourceId: normalizeCatalogSourceIdentity(event.cardSourceId),
        confidence: event.confidence,
        eventOrder: event.eventOrder,
        rawLine: event.rawLine,
        ...resolveActor({
          actorText: event.actorText,
          aliases: input.aliases,
          players: input.players,
        }),
      } satisfies MergerPlayEvidence];
    })
    .sort((left, right) => left.eventOrder - right.eventOrder);
}
