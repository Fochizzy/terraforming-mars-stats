import type { CardOption } from '@/lib/db/reference-repo';
import type { SaveGameLogEventInput } from '@/lib/db/game-import-repo';
import type {
  ParsedActionGameLogEvent,
  ParsedCardPointBreakdown,
} from './parse-game-log';
import { normalizePlayerAlias } from './normalize-player-alias';

function buildCardIdByName(cards: Array<Pick<CardOption, 'cardName' | 'id'>>) {
  return new Map(
    cards.map((card) => [normalizePlayerAlias(card.cardName), card.id]),
  );
}

/**
 * Identity segments are constrained to `^[a-z0-9][a-z0-9:_-]{0,199}$`, so a
 * special tile named from its card ("Commercial District") has to be slugged
 * the same way the stored rows already do it: lowercase, runs of anything else
 * collapsed to an underscore.
 */
function toIdentitySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Stable identity for one tile placement, matching the shape already stored on
 * every existing tile row: `tile:<line>:<action>:<board>:<space>:<tile>`. The
 * line number makes it unique within an import, which the write RPC enforces.
 */
function buildTilePlacementIdentity(input: {
  lineNumber: number;
  placementAction: 'placed' | 'removed';
  space: string;
  tile: string;
}) {
  return [
    'tile',
    input.lineNumber,
    input.placementAction,
    'mars',
    toIdentitySegment(input.space),
    toIdentitySegment(input.tile),
  ].join(':');
}

function buildCardPointBreakdownWrite(
  breakdown: ParsedCardPointBreakdown,
  generationNumber: number | null,
): SaveGameLogEventInput {
  return {
    confidenceLevel: 'high',
    eventOrder: breakdown.lineNumber,
    eventType: breakdown.eventType,
    ...(generationNumber !== null ? { generationNumber } : {}),
    lineClassification: 'event',
    payload: {
      cardPointsAnimals: breakdown.cardPointsAnimals,
      cardPointsJovian: breakdown.cardPointsJovian,
      cardPointsMicrobes: breakdown.cardPointsMicrobes,
      playerName: breakdown.playerName,
    },
    rawLine: breakdown.rawLine,
  };
}

function getCardAttributionKeys(
  cardIdByName: Map<string, string>,
  cardName: null | string,
) {
  if (!cardName) {
    return [];
  }

  const normalizedName = normalizePlayerAlias(cardName);
  const cardId = cardIdByName.get(normalizedName);

  return [
    ...(cardId ? [`id:${cardId}`] : []),
    `name:${normalizedName}`,
  ];
}

function buildParsedEventWrite(input: {
  cardIdByName: Map<string, string>;
  currentGeneration: number | null;
  event: ParsedActionGameLogEvent;
  sourcePlayerName?: string | null;
  targetPlayerName?: string | null;
}): SaveGameLogEventInput {
  switch (input.event.eventType) {
    case 'generation_started':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        generationNumber: input.event.generation,
        lineClassification: 'event',
        payload: {},
        rawLine: input.event.rawLine,
      };
    case 'card_played':
      return {
        cardId:
          input.cardIdByName.get(normalizePlayerAlias(input.event.card)) ?? null,
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          cardName: input.event.card,
        },
        rawLine: input.event.rawLine,
      };
    case 'tile_placed':
      return {
        ...(input.event.boardPosition !== undefined
          ? { boardPosition: input.event.boardPosition }
          : {}),
        ...(input.event.boardRow !== undefined
          ? { boardRow: input.event.boardRow }
          : {}),
        boardSpace: input.event.space,
        confidenceLevel: 'high',
        // Tile rows carry a typed placement contract: the database rejects any
        // that cannot say what was placed, where it came from, and who owns it.
        // The log line never states ownership, so that stays explicitly unknown
        // rather than being guessed.
        eventIdentity: buildTilePlacementIdentity({
          lineNumber: input.event.lineNumber,
          placementAction: 'placed',
          space: input.event.space,
          tile: input.event.tile,
        }),
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        ownershipState: 'unknown',
        payload: {
          actor: input.event.actor,
        },
        placementAction: 'placed',
        placementBoard: 'mars',
        placementFormat: input.event.placementFormat ?? 'flat-id',
        rawLine: input.event.rawLine,
        sourceLineNumber: input.event.lineNumber,
        sourceSpaceId: input.event.space,
        tileType: input.event.tile,
      };
    case 'global_parameter_changed':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          parameterType: input.event.parameter,
        },
        rawLine: input.event.rawLine,
        resourceType: input.event.parameter,
      };
    case 'resource_changed': {
      const cardName = input.event.card ?? null;
      return {
        cardId: cardName
          ? input.cardIdByName.get(normalizePlayerAlias(cardName)) ?? null
          : null,
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          ...(input.event.affectedPlayer
            ? { affectedPlayer: input.event.affectedPlayer }
            : {}),
          actor: input.event.actor,
          ...(cardName ? { cardName } : {}),
          deltaKind: input.event.deltaKind ?? 'resource',
          operation: input.event.operation,
          ...(input.sourcePlayerName
            ? { sourcePlayerName: input.sourcePlayerName }
            : {}),
          ...(input.targetPlayerName
            ? { targetPlayerName: input.targetPlayerName }
            : {}),
        },
        rawLine: input.event.rawLine,
        resourceAmount: input.event.resourceAmount,
        resourceType: input.event.resourceType,
      };
    }
    case 'milestone_claimed':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          milestoneName: input.event.milestone,
        },
        rawLine: input.event.rawLine,
      };
    case 'award_funded':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          awardName: input.event.award,
        },
        rawLine: input.event.rawLine,
      };
    case 'award_result':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        ...(input.currentGeneration !== null
          ? { generationNumber: input.currentGeneration }
          : {}),
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          awardName: input.event.award,
          placement: input.event.placement,
        },
        rawLine: input.event.rawLine,
      };
    default: {
      const exhaustiveCheck: never = input.event;
      return exhaustiveCheck;
    }
  }
}

export function buildGameLogEventWrites(input: {
  cards: Array<Pick<CardOption, 'cardName' | 'id'>>;
  parsedGameLog: {
    cardPointBreakdowns?: ParsedCardPointBreakdown[];
    events: ParsedActionGameLogEvent[];
  };
}): SaveGameLogEventInput[] {
  const cardIdByName = buildCardIdByName(input.cards);
  const sourcePlayerNameByCardKey = new Map<string, string>();
  const writes: SaveGameLogEventInput[] = [];
  let currentGeneration: number | null = null;

  for (const event of [...input.parsedGameLog.events].sort(
    (left, right) => left.lineNumber - right.lineNumber,
  )) {
    if (event.eventType === 'generation_started') {
      currentGeneration = event.generation;
      writes.push(
        buildParsedEventWrite({
          cardIdByName,
          currentGeneration,
          event,
        }),
      );
      continue;
    }

    let sourcePlayerName: string | null = null;
    let targetPlayerName: string | null = null;

    if (event.eventType === 'resource_changed' && event.operation === 'removed') {
      targetPlayerName = event.affectedPlayer ?? event.actor;
      sourcePlayerName =
        event.affectedPlayer
          ? event.actor
          : getCardAttributionKeys(cardIdByName, event.card ?? null)
              .map((key) => sourcePlayerNameByCardKey.get(key))
              .find((value): value is string => Boolean(value)) ?? null;
    }

    writes.push(
      buildParsedEventWrite({
        cardIdByName,
        currentGeneration,
        event,
        sourcePlayerName,
        targetPlayerName,
      }),
    );

    if (event.eventType === 'card_played') {
      for (const key of getCardAttributionKeys(cardIdByName, event.card)) {
        sourcePlayerNameByCardKey.set(key, event.actor);
      }
    }
  }

  writes.push(
    ...(input.parsedGameLog.cardPointBreakdowns ?? []).map((breakdown) =>
      buildCardPointBreakdownWrite(breakdown, currentGeneration),
    ),
  );

  return writes.sort((left, right) => left.eventOrder - right.eventOrder);
}
