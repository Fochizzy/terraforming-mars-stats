import type { GameLogPlacementAction } from './build-terraforming-mars-log-events';
import { normalizePlayerAlias } from './normalize-player-alias';

/**
 * Canonical placement actions whose events carry actor evidence and are
 * therefore eligible for finalization-time attribution. Kept as an explicit
 * list so a new action has to be considered deliberately rather than inherited
 * by a wildcard.
 */
export const ATTRIBUTABLE_PLACEMENT_ACTIONS: readonly GameLogPlacementAction[] = [
  'placed',
  'removed',
  'replaced',
  'converted',
  'ownership_changed',
  'unresolved',
];

/**
 * The shape persisted in `game_log_imports.confidence_summary
 * .player_identity_resolutions`. Only the two fields attribution depends on are
 * modelled; the rest of the stored record is irrelevant here.
 */
export type StoredPlayerIdentityResolution = {
  selected_player_id?: string | null;
  source_player_text?: string | null;
};

export type TileEventAttributionCandidate = {
  actorText: string | null;
  eventId: string;
};

export type TileEventAttribution = {
  eventId: string;
  gamePlayerId: string;
  playerId: string;
};

/**
 * `null` marks an actor key that resolved to more than one distinct player.
 * Ambiguous evidence must never be attributed, so it is recorded explicitly
 * rather than dropped — dropping it would let a later single-valued resolution
 * silently win.
 */
export type TileActorIndex = ReadonlyMap<string, string | null>;

export function buildTileActorIndex(
  resolutions: readonly StoredPlayerIdentityResolution[],
): TileActorIndex {
  const index = new Map<string, string | null>();

  for (const resolution of resolutions) {
    const sourceText = resolution.source_player_text?.trim();
    const playerId = resolution.selected_player_id?.trim();
    if (!sourceText || !playerId) {
      continue;
    }

    const key = normalizePlayerAlias(sourceText);
    if (key === '') {
      continue;
    }

    if (!index.has(key)) {
      index.set(key, playerId);
      continue;
    }

    const existing = index.get(key);
    if (existing !== playerId) {
      index.set(key, null);
    }
  }

  return index;
}

/**
 * Resolves attribution for imported placement events using only exact evidence.
 *
 * An event is attributed when, and only when, its actor text resolves through
 * the import's own recorded identity resolutions to exactly one player, and
 * that player is a participant of this same game. `gamePlayerIdByPlayerId`
 * contains only the finalized game's participants, so it is the same-game
 * enforcement: a player resolved from some other game cannot be written.
 *
 * Attribution is never inferred from neighbouring events or approximate names.
 */
export function resolveTileEventAttributions(input: {
  actorIndex: TileActorIndex;
  events: readonly TileEventAttributionCandidate[];
  gamePlayerIdByPlayerId: ReadonlyMap<string, string>;
}): TileEventAttribution[] {
  const attributions: TileEventAttribution[] = [];

  for (const event of input.events) {
    const actorText = event.actorText?.trim();
    if (!actorText) {
      continue;
    }

    const key = normalizePlayerAlias(actorText);
    if (key === '') {
      continue;
    }

    const playerId = input.actorIndex.get(key);
    // Missing key = unattributed actor. Explicit null = ambiguous actor.
    if (playerId === undefined || playerId === null) {
      continue;
    }

    const gamePlayerId = input.gamePlayerIdByPlayerId.get(playerId);
    if (gamePlayerId === undefined) {
      continue;
    }

    attributions.push({ eventId: event.eventId, gamePlayerId, playerId });
  }

  return attributions;
}
