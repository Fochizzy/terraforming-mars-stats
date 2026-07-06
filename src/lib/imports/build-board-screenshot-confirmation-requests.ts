import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import type { BoardAwareAwardImportItem } from './score-board-aware-award-items';

export function buildBoardScreenshotConfirmationRequests(input: {
  awardItems: BoardAwareAwardImportItem[];
  cardScoring: ImportPlayerCardScoringSummary[];
}) {
  const requestedSpaceIds = new Set<string>();

  for (const summary of input.cardScoring) {
    for (const pendingCard of summary.pendingCards) {
      if (pendingCard.reviewKind !== 'board_evidence') {
        continue;
      }

      for (const spaceId of pendingCard.requestedSpaceIds ?? []) {
        if (requestedSpaceIds.has(spaceId)) {
          continue;
        }

        requestedSpaceIds.add(spaceId);
      }
    }
  }

  for (const awardItem of input.awardItems) {
    for (const spaceId of awardItem.requestedSpaceIds ?? []) {
      if (requestedSpaceIds.has(spaceId)) {
        continue;
      }

      requestedSpaceIds.add(spaceId);
    }
  }

  return [...requestedSpaceIds]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((spaceId) => ({ spaceId }));
}
