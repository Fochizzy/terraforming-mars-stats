import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import {
  reviewContractForCanonicalResolution,
  reviewContractForResolution,
  type GameLogEventConfidenceLevel,
  type GameLogEventReviewState,
} from './game-log-event-contract';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedExpansionMechanicEvent } from './parse-terraforming-mars-expansion-mechanics';
import type { ImportPlayedEntityEvidence } from './parse-terraforming-mars-played-entities';
import type { ImportTileAction } from './parse-terraforming-mars-tile-actions';
import type { OffReserveOceanEvidence } from './resolve-off-reserve-ocean-evidence';

/**
 * Repository placement-action vocabulary (past-tense naming). The adapter
 * maps these onto the shared canonical vocabulary as pure renames
 * (placed→place, removed→remove, replaced→replace, converted→convert,
 * ownership_changed→ownership_change, unresolved→unresolved). The exported-log
 * parser currently produces evidence only for 'placed' and 'removed'; the
 * remaining values are persistable so evidence-bearing sources never have to
 * force their meaning into the wrong action.
 */
export type GameLogPlacementAction =
  | 'placed'
  | 'removed'
  | 'replaced'
  | 'converted'
  | 'ownership_changed'
  | 'unresolved';

export type GameLogOwnershipState =
  | 'explicit_owner'
  | 'neutral'
  | 'unowned'
  | 'unknown'
  | 'not_applicable'
  | 'unresolved';

export type GameLogTileTypeClass =
  | 'ocean'
  | 'city'
  | 'greenery'
  | 'special'
  | 'neutral'
  | 'unresolved';

export type ParsedGameLogEvent = {
  board_position?: number | null;
  board_row?: number | null;
  board_space?: string | null;
  card_id: string | null;
  colony_id?: string | null;
  confidence_level: GameLogEventConfidenceLevel;
  event_identity?: string | null;
  event_order: number;
  event_provenance?: string | null;
  event_type: string;
  game_player_id?: string | null;
  generation_number: number | null;
  line_classification: string;
  map_id?: string | null;
  owner_game_player_id?: string | null;
  owner_player_id?: string | null;
  ownership_state?: GameLogOwnershipState | null;
  parameter_after?: number | null;
  parameter_before?: number | null;
  parameter_steps?: number | null;
  placement_action?: GameLogPlacementAction | null;
  placement_board?: 'mars' | 'moon' | null;
  placement_format?: 'flat-id' | 'grid' | null;
  parser_version?: string | null;
  payload: Record<string, unknown>;
  player_id?: string | null;
  raw_actor_text?: string | null;
  raw_line: string;
  resource_amount?: number | null;
  resource_type?: string | null;
  review_state: GameLogEventReviewState;
  source_line_number?: number | null;
  source_space_id?: string | null;
  source_entity?: string | null;
  tile_type?: string | null;
  tile_type_class?: GameLogTileTypeClass | null;
};

/**
 * Coarse canonical tile class for a parsed tile action. A resolved catalog
 * tile maps to its rulebook class; an unknown or future label is explicitly
 * 'unresolved' rather than guessed. 'neutral' is reserved for sources that
 * actually state neutrality — the exported log never does, so this function
 * never emits it.
 */
export function derivePlacementTileClass(
  tileAction: Pick<ImportTileAction, 'isKnownTileType' | 'tileKind'>,
): GameLogTileTypeClass {
  return tileAction.isKnownTileType ? tileAction.tileKind : 'unresolved';
}

/**
 * Evidence-based placement ownership. The exported game log records who
 * ACTED (the actor text, resolved separately to player_id) but never states
 * tile ownership, so ownership is 'unknown' with no owner identifiers — the
 * actor is never converted into an owner, and unknown is never upgraded.
 * Sources that carry explicit ownership evidence must supply it through this
 * seam instead of editing call sites.
 */
export function derivePlacementOwnership(_tileAction: ImportTileAction): {
  ownerGamePlayerId: string | null;
  ownerPlayerId: string | null;
  ownershipState: GameLogOwnershipState;
} {
  return {
    ownerGamePlayerId: null,
    ownerPlayerId: null,
    ownershipState: 'unknown',
  };
}

export type ParsedGameLogEventSet = {
  events: ParsedGameLogEvent[];
  lineCount: number;
  parsedLineCount: number;
  unparsedLineCount: number;
};

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

function buildPlayerResolutionIndex(
  resolutions: Array<{ selectedPlayerId: string; sourcePlayerText: string }>,
) {
  return new Map(
    resolutions.map((resolution) => [
      normalizePlayerAlias(resolution.sourcePlayerText),
      resolution.selectedPlayerId,
    ]),
  );
}

function placementEventIdentity(action: ImportTileAction) {
  const tileIdentity = (action.canonicalTileCode ?? action.rawTileType)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return [
    'tile',
    action.lineNumber,
    action.action,
    action.board,
    action.spaceId.toLowerCase(),
    tileIdentity || 'unknown',
  ].join(':');
}

export function buildTerraformingMarsLogEvents(input: {
  expansionMechanicEvents?: ParsedExpansionMechanicEvent[];
  exportedLogText: string;
  /**
   * Exact game-participant evidence: resolved stable player id → the game's
   * game_players row id. Supplied only when the caller actually has the
   * participant rows (drafts usually do not yet); absence never fabricates
   * an attribution.
   */
  gamePlayerIdByPlayerId?: ReadonlyMap<string, string>;
  mapId: string;
  objectiveEvidence: ImportObjectiveEvidence[];
  /**
   * Verified off-reserve-ocean exception evidence: links each qualifying
   * exception-card play to its ocean placement line so the placement records
   * its explicit source card.
   */
  offReserveOceanEvidence?: OffReserveOceanEvidence;
  playerResolutions?: Array<{
    selectedPlayerId: string;
    sourcePlayerText: string;
  }>;
  playedEntityEvidence: ImportPlayedEntityEvidence[];
  tileActions?: ImportTileAction[];
}): ParsedGameLogEventSet {
  const lines = input.exportedLogText.trim()
    ? input.exportedLogText.trim().split(/\r?\n/)
    : [];
  const objectiveByLine = new Map(
    input.objectiveEvidence.map((evidence) => [evidence.lineNumber, evidence]),
  );
  const playedEntityByLine = new Map(
    input.playedEntityEvidence.map((evidence) => [evidence.lineNumber, evidence]),
  );
  const tileActionByLine = new Map(
    (input.tileActions ?? []).map((action) => [action.lineNumber, action]),
  );
  const expansionMechanicByLine = new Map(
    (input.expansionMechanicEvents ?? []).map((event) => [event.lineNumber, event]),
  );
  const exceptionSourceCardByOceanLine = new Map(
    (input.offReserveOceanEvidence?.exceptions ?? []).map((exception) => [
      exception.oceanLineNumber,
      exception.cardId,
    ]),
  );
  const events: ParsedGameLogEvent[] = [];
  const playerResolutionIndex = buildPlayerResolutionIndex(
    input.playerResolutions ?? [],
  );
  let currentGeneration: number | null = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripExporterPrefix(rawLine);
    const generationMatch = /^Generation\s+(\d+)\s*$/i.exec(line);
    if (generationMatch) {
      currentGeneration = Number(generationMatch[1]);
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'generation_started',
        generation_number: currentGeneration,
        line_classification: 'generation_marker',
        payload: { generation: currentGeneration },
        raw_line: rawLine,
        review_state: 'not_required',
      });
      return;
    }

    const playerMatch = /^Good luck\s+(.+?)!\s*$/i.exec(line);
    if (playerMatch) {
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'player_identified',
        generation_number: currentGeneration,
        line_classification: 'player_identity',
        payload: { actor: playerMatch[1].trim() },
        raw_line: rawLine,
        review_state: 'not_required',
      });
      return;
    }

    const firstPlayerMatch = /^First player this generation is\s+(.+?)\s*$/i.exec(
      line,
    );
    if (firstPlayerMatch) {
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'first_player_selected',
        generation_number: currentGeneration,
        line_classification: 'first_player',
        payload: { actor: firstPlayerMatch[1].trim() },
        raw_line: rawLine,
        review_state: 'not_required',
      });
      return;
    }

    const tileAction = tileActionByLine.get(lineNumber);
    if (tileAction) {
      const playerId =
        playerResolutionIndex.get(normalizePlayerAlias(tileAction.actor)) ?? null;
      const gamePlayerId =
        playerId === null
          ? null
          : input.gamePlayerIdByPlayerId?.get(playerId) ?? null;
      // An unknown or future tile label stays visible and reviewable rather
      // than being dropped: low-confidence evidence that needs review, never a
      // review status smuggled into the confidence value.
      const tileReview = reviewContractForCanonicalResolution(
        tileAction.isKnownTileType,
      );
      const ownership = derivePlacementOwnership(tileAction);
      events.push({
        board_position: tileAction.boardPosition,
        board_row: tileAction.boardRow,
        board_space: tileAction.spaceId,
        card_id: null,
        confidence_level: tileReview.confidenceLevel,
        event_identity: placementEventIdentity(tileAction),
        event_order: lineNumber,
        event_provenance: 'exported_log',
        event_type:
          tileAction.action === 'placed' ? 'tile_placed' : 'tile_removed',
        game_player_id: gamePlayerId,
        generation_number: currentGeneration,
        line_classification: `tile_${tileAction.action}`,
        map_id: input.mapId,
        owner_game_player_id: ownership.ownerGamePlayerId,
        owner_player_id: ownership.ownerPlayerId,
        ownership_state: ownership.ownershipState,
        parser_version: 'terraforming-mars-tile-actions-v2',
        placement_action: tileAction.action,
        placement_board: tileAction.board,
        placement_format: tileAction.format,
        payload: {
          actor: tileAction.actor,
          board: tileAction.board,
          canonical_tile_name: tileAction.canonicalTileName,
          format: tileAction.format,
          is_known_tile_type: tileAction.isKnownTileType,
          raw_tile_type: tileAction.rawTileType,
        },
        player_id: playerId,
        raw_actor_text: tileAction.actor,
        raw_line: rawLine,
        review_state: tileReview.reviewState,
        source_line_number: tileAction.lineNumber,
        // The explicit source card is recorded only from verified exception
        // evidence (an upstream-supported card allowing an off-reserve
        // ocean); ordinary placements carry no source-entity claim.
        source_entity:
          exceptionSourceCardByOceanLine.get(lineNumber) ?? null,
        source_space_id:
          tileAction.format === 'grid'
            ? `${tileAction.boardRow}:${tileAction.boardPosition}`
            : tileAction.spaceId,
        tile_type: tileAction.canonicalTileCode ?? tileAction.rawTileType,
        tile_type_class: derivePlacementTileClass(tileAction),
      });
      return;
    }

    const expansionMechanic = expansionMechanicByLine.get(lineNumber);
    if (expansionMechanic) {
      const resourceAmount =
        expansionMechanic.paymentAmount ?? expansionMechanic.trEffect;
      const resourceType = expansionMechanic.paymentResource ??
        (expansionMechanic.trEffect === null ? null : 'terraform_rating');
      events.push({
        card_id: null,
        colony_id: expansionMechanic.colonyId,
        confidence_level: expansionMechanic.confidenceLevel,
        event_identity: expansionMechanic.eventIdentity,
        event_order: lineNumber,
        event_provenance: expansionMechanic.sourceProvenance,
        event_type: expansionMechanic.eventType,
        generation_number: expansionMechanic.generationNumber,
        line_classification: 'expansion_mechanic',
        parameter_after: expansionMechanic.parameterAfter,
        parameter_before: expansionMechanic.parameterBefore,
        parameter_steps: expansionMechanic.parameterSteps,
        parser_version: 'terraforming-mars-venus-colonies-v1',
        payload: {
          actor: expansionMechanic.actor,
          attribution: expansionMechanic.attribution,
          canonical_colony_name: expansionMechanic.colonyName,
          event_identity: expansionMechanic.eventIdentity,
          payment_amount: expansionMechanic.paymentAmount,
          payment_resource: expansionMechanic.paymentResource,
          tr_effect: expansionMechanic.trEffect,
        },
        player_id: expansionMechanic.playerId,
        raw_line: rawLine,
        resource_amount: resourceAmount,
        resource_type: resourceType,
        review_state: expansionMechanic.reviewState,
        source_entity: expansionMechanic.sourceEntity,
      });
      return;
    }

    const objective = objectiveByLine.get(lineNumber);
    if (objective?.canonicalId) {
      const objectiveReview = reviewContractForResolution(objective.resolution);
      events.push({
        card_id: null,
        confidence_level: objectiveReview.confidenceLevel,
        event_order: lineNumber,
        event_provenance: 'exported_log',
        event_type:
          objective.type === 'milestone'
            ? 'milestone_claimed'
            : 'award_funded',
        generation_number: currentGeneration,
        line_classification: objective.type,
        payload: {
          actor: objective.originalPlayerValue,
          canonical_id: objective.canonicalId,
          canonical_name: objective.canonicalName,
          normalized_actor: objective.normalizedPlayerValue,
          original_value: objective.originalValue,
          resolution: objective.resolution,
        },
        raw_line: rawLine,
        review_state: objectiveReview.reviewState,
      });
      return;
    }

    const playedEntity = playedEntityByLine.get(lineNumber);
    if (playedEntity?.canonicalId && playedEntity.entityType) {
      const playedEntityReview = reviewContractForResolution(
        playedEntity.resolution,
      );
      events.push({
        card_id:
          playedEntity.entityType === 'card'
            ? playedEntity.canonicalId
            : null,
        confidence_level: playedEntityReview.confidenceLevel,
        event_order: lineNumber,
        event_type:
          playedEntity.entityType === 'card'
            ? 'card_played'
            : playedEntity.entityType === 'prelude'
              ? 'prelude_played'
              : 'corporation_selected',
        generation_number: currentGeneration,
        line_classification: `played_${playedEntity.entityType}`,
        payload: {
          actor: playedEntity.originalPlayerValue,
          canonical_id: playedEntity.canonicalId,
          canonical_name: playedEntity.canonicalName,
          normalized_actor: playedEntity.normalizedPlayerValue,
          original_value: playedEntity.originalValue,
          resolution: playedEntity.resolution,
        },
        raw_line: rawLine,
        review_state: playedEntityReview.reviewState,
      });
    }
  });

  return {
    events,
    lineCount: lines.length,
    parsedLineCount: events.length,
    unparsedLineCount: Math.max(lines.length - events.length, 0),
  };
}
