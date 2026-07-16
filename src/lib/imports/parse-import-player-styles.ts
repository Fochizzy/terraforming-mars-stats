import type { CardOption, StyleOption } from '@/lib/db/reference-repo';
import type { ParsedGameLog } from './parse-game-log';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportParticipant = {
  importedName: string;
  playerId: string;
};

type ParsedPlayerStyle = {
  keyCardIds: string[];
  modifierStyleCodes: string[];
  primaryStyleCode: string;
};

type CardSignal = {
  lastLineNumber: number;
  resourceReferenced: boolean;
};

const DEFAULT_STYLE_CODES = ['milestone_aggression', 'award_pressure'] as const;

function normalizeImportToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, ' ');
}

function normalizeCatalogCardToken(input: string) {
  return normalizeImportToken(input.replace(/:\s*[a-z0-9-]+$/i, ''));
}

function buildPlayerIdByImportedName(participants: ImportParticipant[]) {
  const playerIdByImportedName = new Map<string, string>();

  for (const participant of participants) {
    const normalizedName = normalizeImportToken(participant.importedName);

    if (!normalizedName) {
      continue;
    }

    playerIdByImportedName.set(normalizedName, participant.playerId);
  }

  return playerIdByImportedName;
}

function buildCardIdByNormalizedName(cardOptions: CardOption[]) {
  const groupedIds = new Map<string, Set<string>>();

  for (const card of cardOptions) {
    const normalizedName = normalizeCatalogCardToken(card.cardName);

    if (!normalizedName) {
      continue;
    }

    const cardIds = groupedIds.get(normalizedName) ?? new Set<string>();
    cardIds.add(card.id);
    groupedIds.set(normalizedName, cardIds);
  }

  return new Map(
    [...groupedIds.entries()].flatMap(([normalizedName, cardIds]) =>
      cardIds.size === 1 ? [[normalizedName, [...cardIds][0]!]] : [],
    ),
  );
}

function buildAvailableStyleCodeSet(styleOptions?: Pick<StyleOption, 'code'>[]) {
  return new Set(
    styleOptions && styleOptions.length > 0
      ? styleOptions.map((style) => style.code)
      : DEFAULT_STYLE_CODES,
  );
}

function observeKeyCard(
  signals: Map<string, CardSignal>,
  cardId: string,
  lineNumber: number,
  resourceReferenced: boolean,
) {
  const existingSignal = signals.get(cardId);

  if (!existingSignal) {
    signals.set(cardId, {
      lastLineNumber: lineNumber,
      resourceReferenced,
    });
    return;
  }

  signals.set(cardId, {
    lastLineNumber: Math.max(existingSignal.lastLineNumber, lineNumber),
    resourceReferenced:
      existingSignal.resourceReferenced || resourceReferenced,
  });
}

export function parseImportPlayerStyles(input: {
  cardOptions: CardOption[];
  events?: ParsedGameLog['events'];
  participants: ImportParticipant[];
  styleOptions?: Pick<StyleOption, 'code'>[];
}): Record<string, ParsedPlayerStyle> {
  const playerIdByImportedName = buildPlayerIdByImportedName(input.participants);
  const cardIdByNormalizedName = buildCardIdByNormalizedName(input.cardOptions);
  const availableStyleCodes = buildAvailableStyleCodeSet(input.styleOptions);
  const styleSignals = new Map<
    string,
    { keyCardSignals: Map<string, CardSignal>; modifierStyleCodes: Set<string> }
  >();

  for (const participant of input.participants) {
    styleSignals.set(participant.playerId, {
      keyCardSignals: new Map<string, CardSignal>(),
      modifierStyleCodes: new Set<string>(),
    });
  }

  for (const event of input.events ?? []) {
    if (!('actor' in event) || typeof event.actor !== 'string') {
      continue;
    }

    const playerId = playerIdByImportedName.get(normalizeImportToken(event.actor));

    if (!playerId) {
      continue;
    }

    const signal = styleSignals.get(playerId);

    if (!signal) {
      continue;
    }

    if (
      event.eventType === 'milestone_claimed' &&
      availableStyleCodes.has('milestone_aggression')
    ) {
      signal.modifierStyleCodes.add('milestone_aggression');
    }

    if (
      event.eventType === 'award_funded' &&
      availableStyleCodes.has('award_pressure')
    ) {
      signal.modifierStyleCodes.add('award_pressure');
    }

    const cardName =
      event.eventType === 'card_played' || event.eventType === 'resource_changed'
        ? event.card
        : null;

    if (!cardName) {
      continue;
    }

    const cardId = cardIdByNormalizedName.get(normalizeCatalogCardToken(cardName));

    if (!cardId) {
      continue;
    }

    observeKeyCard(
      signal.keyCardSignals,
      cardId,
      event.lineNumber,
      event.eventType === 'resource_changed',
    );
  }

  return Object.fromEntries(
    [...styleSignals.entries()].flatMap(([playerId, signal]) => {
      const keyCardIds = [...signal.keyCardSignals.entries()]
        .sort((left, right) => {
          const leftSignal = left[1];
          const rightSignal = right[1];

          if (leftSignal.resourceReferenced !== rightSignal.resourceReferenced) {
            return Number(rightSignal.resourceReferenced) - Number(leftSignal.resourceReferenced);
          }

          return rightSignal.lastLineNumber - leftSignal.lastLineNumber;
        })
        .slice(0, 3)
        .map(([cardId]) => cardId);
      const modifierStyleCodes = [...signal.modifierStyleCodes];

      if (keyCardIds.length === 0 && modifierStyleCodes.length === 0) {
        return [];
      }

      return [
        [
          playerId,
          {
            keyCardIds,
            modifierStyleCodes,
            primaryStyleCode: '',
          } satisfies ParsedPlayerStyle,
        ] as const,
      ];
    }),
  );
}
