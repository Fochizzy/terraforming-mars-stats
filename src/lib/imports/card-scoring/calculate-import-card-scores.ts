import type { BoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import type { ParsedGameLog } from '@/lib/imports/parse-game-log';
import { deriveCardScoreEvidence } from './derive-card-score-evidence';
import { resolveCardScoringRule } from './resolve-card-scoring-rule';
import { scoreCardFromEvidence } from './score-card-from-evidence';
import type {
  CardScoringReference,
  ImportPlayerCardScoringSummary,
} from './card-scoring-types';

function sortCardNames(left: { cardName: string }, right: { cardName: string }) {
  return left.cardName.localeCompare(right.cardName);
}

export async function calculateImportCardScores(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  boardStateTextLines?: string[];
  cardReferences: CardScoringReference[];
  events: ParsedGameLog['events'];
  ocrTextLinesByCardId?: Record<string, string[]>;
}) {
  const cardReferenceById = new Map(
    input.cardReferences.map((card) => [card.id, card] as const),
  );
  const evidenceRows = deriveCardScoreEvidence({
    boardStateTextLines: input.boardStateTextLines,
    cardReferences: input.cardReferences,
    events: input.events,
  });
  const summariesByPlayerName = new Map<string, ImportPlayerCardScoringSummary>();

  for (const evidence of evidenceRows) {
    const card = cardReferenceById.get(evidence.cardId);

    if (!card) {
      continue;
    }

    const existingSummary = summariesByPlayerName.get(evidence.playerName);
    const playerSummary =
      existingSummary ??
      {
        autoScoredCards: [],
        pendingCards: [],
        playerName: evidence.playerName,
        totals: {
          animals: 0,
          complete: true,
          jovian: 0,
          microbes: 0,
          other: 0,
          total: 0,
        },
      };

    const resolution = await resolveCardScoringRule({
      card,
      ocrTextLines: input.ocrTextLinesByCardId?.[card.id],
    });

    if (resolution.status === 'review') {
      playerSummary.pendingCards.push({
        cardId: card.id,
        cardName: card.cardName,
        fullImageUrl: card.fullImageUrl,
        imageUrl: card.fullImageUrl,
        reason: resolution.reason,
        thumbnailUrl: card.thumbnailUrl,
      });
      playerSummary.totals.complete = false;
      summariesByPlayerName.set(evidence.playerName, playerSummary);
      continue;
    }

    if (resolution.status === 'no_scoring') {
      if (existingSummary) {
        summariesByPlayerName.set(evidence.playerName, playerSummary);
      }
      continue;
    }

    const scoredCard = scoreCardFromEvidence({
      boardEvidenceContext: input.boardEvidenceContext,
      evidence,
      rule: resolution.rule,
    });

    if (scoredCard.status === 'review') {
      playerSummary.pendingCards.push({
        cardId: card.id,
        cardName: card.cardName,
        fullImageUrl: card.fullImageUrl,
        imageUrl: card.fullImageUrl,
        reason: scoredCard.reason,
        requestedSpaceIds: scoredCard.requestedSpaceIds,
        reviewKind: scoredCard.reviewKind,
        thumbnailUrl: card.thumbnailUrl,
      });
      playerSummary.totals.complete = false;
      summariesByPlayerName.set(evidence.playerName, playerSummary);
      continue;
    }

    playerSummary.autoScoredCards.push({
      cardId: card.id,
      cardName: card.cardName,
      category: scoredCard.category,
      evidenceSummary: scoredCard.evidenceSummary,
      fullImageUrl: card.fullImageUrl,
      humanSummary: resolution.rule.humanSummary,
      thumbnailUrl: card.thumbnailUrl,
      points: scoredCard.points,
      sourceType: resolution.rule.sourceType,
    });
    playerSummary.totals[scoredCard.category] += scoredCard.points;
    playerSummary.totals.total += scoredCard.points;
    summariesByPlayerName.set(evidence.playerName, playerSummary);
  }

  return [...summariesByPlayerName.values()]
    .map((summary) => ({
      ...summary,
      autoScoredCards: [...summary.autoScoredCards].sort(sortCardNames),
      pendingCards: [...summary.pendingCards].sort(sortCardNames),
    }))
    .sort((left, right) => left.playerName.localeCompare(right.playerName));
}
