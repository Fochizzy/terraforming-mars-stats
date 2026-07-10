import type { CardScoringReference } from '@/lib/db/reference-repo';
import { countableCardTags } from './countable-card-tags';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedGameLog } from './parse-game-log';

export const PLAYER_TAG_CODES = [
  'building',
  'space',
  'power',
  'science',
  'jovian',
  'earth',
  'venus',
  'plant',
  'microbe',
  'animal',
  'city',
  'wild',
  'moon',
  'event',
] as const;

export type PlayerTagCode = (typeof PLAYER_TAG_CODES)[number];
export type PlayerTagCounts = Record<PlayerTagCode, number>;

export type ImportPlayerTagMatchedCard = {
  cardId: string;
  cardName: string;
  lineNumber: number;
  rawLine: string;
  sourceTags: PlayerTagCode[];
};

export type ImportPlayerTagCandidateCard = {
  cardId: string;
  cardName: string;
  imageUrl: string;
};

export type ImportPlayerTagUnresolvedCard = {
  candidateCardIds?: string[];
  candidateCards?: ImportPlayerTagCandidateCard[];
  cardName: string;
  lineNumber: number;
  rawLine: string;
  reason: 'ambiguous_match' | 'not_found';
};

export type ImportPlayerTagSummary = {
  matchedCardCount: number;
  matchedCards: ImportPlayerTagMatchedCard[];
  playedCardCount: number;
  playerName: string;
  tagCounts: PlayerTagCounts;
  totalTags: number;
  unresolvedCardCount: number;
  unresolvedCards: ImportPlayerTagUnresolvedCard[];
};

type TagSummaryCardReference = Pick<
  CardScoringReference,
  'cardName' | 'id' | 'sourceTags'
> &
  Partial<Pick<CardScoringReference, 'fullImageUrl'>>;

type MutablePlayerTagSummary = {
  matchedCards: ImportPlayerTagMatchedCard[];
  playedCardCount: number;
  playerName: string;
  tagCounts: PlayerTagCounts;
  totalTags: number;
  unresolvedCards: ImportPlayerTagUnresolvedCard[];
};

function createEmptyTagCounts(): PlayerTagCounts {
  return Object.fromEntries(
    PLAYER_TAG_CODES.map((tagCode) => [tagCode, 0]),
  ) as PlayerTagCounts;
}

function normalizeCardToken(input: string) {
  return normalizePlayerAlias(input.replace(/:\s*[a-z0-9-]+$/i, ''));
}

export function normalizePlayerTagCode(input: string): PlayerTagCode | null {
  const normalizedTag = normalizePlayerAlias(input).replace(/\s+/g, '_');

  return PLAYER_TAG_CODES.find((tagCode) => tagCode === normalizedTag) ?? null;
}

function buildCardReferencesByName(cardReferences: TagSummaryCardReference[]) {
  const cardReferencesByName = new Map<string, TagSummaryCardReference[]>();

  for (const cardReference of cardReferences) {
    const normalizedName = normalizeCardToken(cardReference.cardName);

    if (!normalizedName) {
      continue;
    }

    cardReferencesByName.set(normalizedName, [
      ...(cardReferencesByName.get(normalizedName) ?? []),
      cardReference,
    ]);
  }

  return cardReferencesByName;
}

function getPlayerSummary(
  playerSummaries: Map<string, MutablePlayerTagSummary>,
  playerName: string,
) {
  const normalizedPlayerName = normalizePlayerAlias(playerName);
  const existing = playerSummaries.get(normalizedPlayerName);

  if (existing) {
    return existing;
  }

  const created: MutablePlayerTagSummary = {
    matchedCards: [],
    playedCardCount: 0,
    playerName,
    tagCounts: createEmptyTagCounts(),
    totalTags: 0,
    unresolvedCards: [],
  };
  playerSummaries.set(normalizedPlayerName, created);
  return created;
}

function normalizeSourceTags(sourceTags: string[]) {
  return sourceTags.flatMap((sourceTag) => {
    const normalizedTag = normalizePlayerTagCode(sourceTag);

    return normalizedTag ? [normalizedTag] : [];
  });
}

export function derivePlayerTagSummaries(input: {
  cardReferences: TagSummaryCardReference[];
  events: ParsedGameLog['events'];
}): ImportPlayerTagSummary[] {
  const cardReferencesByName = buildCardReferencesByName(input.cardReferences);
  const playerSummaries = new Map<string, MutablePlayerTagSummary>();

  for (const event of input.events) {
    if (event.eventType !== 'card_played') {
      continue;
    }

    const playerSummary = getPlayerSummary(playerSummaries, event.actor);
    const candidateCards =
      cardReferencesByName.get(normalizeCardToken(event.card)) ?? [];

    playerSummary.playedCardCount += 1;

    if (candidateCards.length === 0) {
      playerSummary.unresolvedCards.push({
        cardName: event.card,
        lineNumber: event.lineNumber,
        rawLine: event.rawLine,
        reason: 'not_found',
      });
      continue;
    }

    const distinctTagSignatures = new Set(
      candidateCards.map((card) =>
        [...normalizeSourceTags(card.sourceTags)].sort().join('|'),
      ),
    );

    if (candidateCards.length > 1 && distinctTagSignatures.size > 1) {
      playerSummary.unresolvedCards.push({
        candidateCardIds: candidateCards.map((card) => card.id),
        candidateCards: candidateCards.flatMap((card) =>
          card.fullImageUrl
            ? [
                {
                  cardId: card.id,
                  cardName: card.cardName,
                  imageUrl: card.fullImageUrl,
                },
              ]
            : [],
        ),
        cardName: event.card,
        lineNumber: event.lineNumber,
        rawLine: event.rawLine,
        reason: 'ambiguous_match',
      });
      continue;
    }

    const card = candidateCards[0]!;
    const sourceTags = normalizeSourceTags(card.sourceTags);

    for (const sourceTag of countableCardTags(sourceTags)) {
      playerSummary.tagCounts[sourceTag] += 1;
      playerSummary.totalTags += 1;
    }

    playerSummary.matchedCards.push({
      cardId: card.id,
      cardName: card.cardName,
      lineNumber: event.lineNumber,
      rawLine: event.rawLine,
      sourceTags,
    });
  }

  return [...playerSummaries.values()]
    .map<ImportPlayerTagSummary>((summary) => ({
      matchedCardCount: summary.matchedCards.length,
      matchedCards: summary.matchedCards,
      playedCardCount: summary.playedCardCount,
      playerName: summary.playerName,
      tagCounts: summary.tagCounts,
      totalTags: summary.totalTags,
      unresolvedCardCount: summary.unresolvedCards.length,
      unresolvedCards: summary.unresolvedCards,
    }))
    .sort((left, right) => left.playerName.localeCompare(right.playerName));
}
