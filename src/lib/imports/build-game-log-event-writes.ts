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

function buildCardPointBreakdownWrite(
  breakdown: ParsedCardPointBreakdown,
): SaveGameLogEventInput {
  return {
    confidenceLevel: 'high',
    eventOrder: breakdown.lineNumber,
    eventType: breakdown.eventType,
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

function buildParsedEventWrite(input: {
  cardIdByName: Map<string, string>;
  event: ParsedActionGameLogEvent;
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
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          cardName: input.event.card,
        },
        rawLine: input.event.rawLine,
      };
    case 'tile_placed':
      return {
        boardSpace: input.event.space,
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
        },
        rawLine: input.event.rawLine,
        tileType: input.event.tile,
      };
    case 'global_parameter_changed':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          parameterType: input.event.parameter,
        },
        rawLine: input.event.rawLine,
        resourceType: input.event.parameter,
      };
    case 'resource_changed':
      return {
        cardId:
          input.cardIdByName.get(normalizePlayerAlias(input.event.card)) ?? null,
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
        lineClassification: 'event',
        payload: {
          actor: input.event.actor,
          cardName: input.event.card,
          operation: input.event.operation,
        },
        rawLine: input.event.rawLine,
        resourceAmount: input.event.resourceAmount,
        resourceType: input.event.resourceType,
      };
    case 'milestone_claimed':
      return {
        confidenceLevel: 'high',
        eventOrder: input.event.lineNumber,
        eventType: input.event.eventType,
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

  return [
    ...input.parsedGameLog.events.map((event) =>
      buildParsedEventWrite({
        cardIdByName,
        event,
      }),
    ),
    ...(input.parsedGameLog.cardPointBreakdowns ?? []).map((breakdown) =>
      buildCardPointBreakdownWrite(breakdown),
    ),
  ].sort((left, right) => left.eventOrder - right.eventOrder);
}
