import { buildImportBoardSnapshot } from './build-import-board-snapshot';
import { buildBoardEvidenceContext } from './build-board-evidence-context';
import {
  scoreCuratedBoardImportItems,
  type CuratedBoardImportItem,
} from './score-curated-board-import-items';
import { scoreBoardAwareAwardItems } from './score-board-aware-award-items';
import { isSupportedBoardMapId } from './board-space-maps';
import type { ParsedActionGameLogEvent } from './parse-game-log';
import type { BoardSpaceConfirmation } from './read-board-screenshot-space-confirmations';

// Single entry point for the import flow: builds the log-derived board snapshot
// and returns every curated board item (Commercial District city-adjacency card
// scoring plus board-aware award winners) as one array, which both the review
// model (`boardReviewItems`) and the draft builder (`curatedBoardItems`) consume.
export function collectCuratedBoardImportItems(input: {
  events: ParsedActionGameLogEvent[];
  mapId: string | null;
  participantNames?: string[];
  screenshotConfirmations?: Record<string, BoardSpaceConfirmation>;
}): CuratedBoardImportItem[] {
  if (!input.mapId || !isSupportedBoardMapId(input.mapId)) {
    return [];
  }

  const boardSnapshot = buildImportBoardSnapshot({
    events: input.events,
    mapId: input.mapId,
  });
  const boardEvidenceContext = buildBoardEvidenceContext({
    boardSnapshot,
    screenshotConfirmations: input.screenshotConfirmations,
  });

  const cardItems = scoreCuratedBoardImportItems({
    boardSnapshot,
    events: input.events,
    mapId: input.mapId,
    participantNames: input.participantNames,
    screenshotConfirmations: input.screenshotConfirmations,
  });
  const awardItems = scoreBoardAwareAwardItems({
    boardEvidenceContext,
    events: input.events,
    mapId: input.mapId,
    participantNames: input.participantNames,
  });

  return [...cardItems, ...awardItems];
}
