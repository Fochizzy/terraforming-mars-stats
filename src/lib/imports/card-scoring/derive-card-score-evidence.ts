import { countableCardTags } from '@/lib/imports/countable-card-tags';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import type { ParsedGameLog } from '@/lib/imports/parse-game-log';
import type {
  CardScoreEvidence,
  CardScoringReference,
} from './card-scoring-types';

type PlayerCardState = {
  cards: Map<string, CardScoringReference>;
  resourceCountsByCardId: Map<string, Record<string, number>>;
  tileCounts: Record<string, number>;
};

function normalizeCardToken(input: string) {
  return normalizePlayerAlias(input.replace(/:\s*[a-z0-9-]+$/i, ''));
}

function normalizeTagToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, '_');
}

function buildCardReferenceByName(cardReferences: CardScoringReference[]) {
  const grouped = new Map<string, CardScoringReference[]>();

  for (const card of cardReferences) {
    const normalizedName = normalizeCardToken(card.cardName);

    if (!normalizedName) {
      continue;
    }

    grouped.set(normalizedName, [...(grouped.get(normalizedName) ?? []), card]);
  }

  return new Map(
    [...grouped.entries()].flatMap(([normalizedName, cards]) =>
      cards.length === 1 ? [[normalizedName, cards[0]!]] : [],
    ),
  );
}

function getPlayerState(
  states: Map<string, PlayerCardState>,
  playerName: string,
) {
  const key = normalizePlayerAlias(playerName);
  const existing = states.get(key);

  if (existing) {
    return existing;
  }

  const created: PlayerCardState = {
    cards: new Map<string, CardScoringReference>(),
    resourceCountsByCardId: new Map<string, Record<string, number>>(),
    tileCounts: {},
  };
  states.set(key, created);
  return created;
}

function getTagCounts(cards: Iterable<CardScoringReference>) {
  const tagCounts: Record<string, number> = {};

  for (const card of cards) {
    const normalizedTags = card.sourceTags
      .map(normalizeTagToken)
      .filter((normalizedTag) => normalizedTag.length > 0);

    for (const normalizedTag of countableCardTags(normalizedTags)) {
      tagCounts[normalizedTag] = (tagCounts[normalizedTag] ?? 0) + 1;
    }
  }

  return tagCounts;
}

export function deriveCardScoreEvidence(input: {
  boardStateTextLines?: string[];
  cardReferences: CardScoringReference[];
  events: ParsedGameLog['events'];
}) {
  const cardReferenceByName = buildCardReferenceByName(input.cardReferences);
  const playerStates = new Map<string, PlayerCardState>();

  for (const event of input.events) {
    if (
      (event.eventType === 'card_played' || event.eventType === 'resource_changed') &&
      typeof event.actor === 'string'
    ) {
      const cardReference = cardReferenceByName.get(normalizeCardToken(event.card));

      if (!cardReference) {
        continue;
      }

      const playerState = getPlayerState(playerStates, event.actor);
      playerState.cards.set(cardReference.id, cardReference);

      if (event.eventType === 'resource_changed') {
        const resourceType = normalizePlayerAlias(event.resourceType);
        const currentCounts =
          playerState.resourceCountsByCardId.get(cardReference.id) ?? {};
        const direction = event.operation === 'removed' ? -1 : 1;

        currentCounts[resourceType] = Math.max(
          0,
          (currentCounts[resourceType] ?? 0) + direction * event.resourceAmount,
        );
        playerState.resourceCountsByCardId.set(cardReference.id, currentCounts);
      }

      continue;
    }

    if (event.eventType === 'tile_placed' && typeof event.actor === 'string') {
      const playerState = getPlayerState(playerStates, event.actor);
      const tileType = normalizePlayerAlias(event.tile);

      playerState.tileCounts[tileType] = (playerState.tileCounts[tileType] ?? 0) + 1;
    }
  }

  return [...playerStates.entries()].flatMap(([normalizedPlayerName, state]) => {
    const matchedPlayerEvent = [...input.events].find((event) => {
      if (event.eventType === 'generation_started') {
        return false;
      }

      return normalizePlayerAlias(event.actor) === normalizedPlayerName;
    });
    const playerName =
      matchedPlayerEvent && matchedPlayerEvent.eventType !== 'generation_started'
        ? matchedPlayerEvent.actor
        : normalizedPlayerName;
    const selfTagCounts = getTagCounts(state.cards.values());

    return [...state.cards.values()].map<CardScoreEvidence>((card) => ({
      boardStateTextLines: input.boardStateTextLines ?? [],
      cardId: card.id,
      cardName: card.cardName,
      playerName,
      resourceCountsByType: state.resourceCountsByCardId.get(card.id) ?? {},
      selfTagCounts,
      selfTileCounts: state.tileCounts,
      sourceTags: card.sourceTags.map(normalizeTagToken),
    }));
  });
}
