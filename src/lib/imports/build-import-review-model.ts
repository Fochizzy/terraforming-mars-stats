import type { ImportPlayerLinkMatch } from './resolve-import-player-links';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type { ParsedGameLog } from './parse-game-log';
import { extractGameLogParticipantNames } from './extract-game-log-participant-names';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import type {
  ParsedScreenshotAwardPlacement,
  ParsedScreenshotEfficiency,
  ParsedScreenshotMilestoneClaim,
} from './parse-score-details-screenshot';
import type { CuratedBoardImportItem } from './score-curated-board-import-items';
import type { ImportPlayerTagSummary } from './derive-player-tag-summaries';

export type ImportScreenshotScoreDetails = {
  awardPlacements: ParsedScreenshotAwardPlacement[];
  efficiencies: ParsedScreenshotEfficiency[];
  milestoneClaims: ParsedScreenshotMilestoneClaim[];
};

export type ImportScoreCrossCheck = {
  conflictingFields: string[];
  matchingFields: string[];
  playerName: string;
  status: 'conflict' | 'log_only' | 'matched' | 'screenshot_only';
};

/**
 * The subset of score-summary fields a calculated card-scoring breakdown can
 * actually justify. Unlike ImportScoreCrossCheck (log row vs. screenshot row
 * — two parsed readings of the same printed numbers), this compares the
 * screenshot's printed card points against an independently *derived* value
 * built from game-log events and board-state evidence.
 */
export type ImportCardScoringField =
  | 'cardPointsAnimals'
  | 'cardPointsJovian'
  | 'cardPointsMicrobes'
  | 'cardPointsTotal';

export type ImportCardScoringFieldComparison = {
  calculatedValue: number;
  field: ImportCardScoringField;
  referenceValue: number;
};

export type ImportCardScoringCrossCheck = {
  conflictingFields: ImportCardScoringFieldComparison[];
  /** False when no explicit log score row exists for this player at all. */
  hasExplicitLogScoreRow: boolean;
  matchingFields: ImportCardScoringFieldComparison[];
  /** Only meaningful when status is 'incomplete'. */
  pendingCardCount: number;
  playerName: string;
  status: 'conflict' | 'incomplete' | 'matched';
};

export type ImportReviewModel = {
  boardReviewItems?: CuratedBoardImportItem[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  cardScoringCrossChecks?: ImportCardScoringCrossCheck[];
  detectedParticipantNames: string[];
  drawInfoLineCount: number;
  /** Why the uploaded game result could not be read, when it could not be. */
  evidenceReadError?: string | null;
  ignoredLineCount: number;
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  parsedEventCount: number;
  playerLinks: ImportPlayerLinkMatch[];
  requiresPlayerConfirmation: boolean;
  scoreCrossChecks?: ImportScoreCrossCheck[];
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
  screenshotScoreDetails?: ImportScreenshotScoreDetails;
  tagSummaries?: ImportPlayerTagSummary[];
};

const scoreCrossCheckFields = [
  'awardPoints',
  'cardPointsAnimals',
  'cardPointsJovian',
  'cardPointsMicrobes',
  'cardPointsTotal',
  'citiesPoints',
  'finalMegacredits',
  'greeneryPoints',
  'milestonePoints',
  'totalPoints',
  'trPoints',
] as const;

function hasScoreValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function buildScoreCrossChecks(input: {
  logScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
  screenshotScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
}): ImportScoreCrossCheck[] {
  const logRowsByName = new Map(
    input.logScoreCandidates.map((candidate) => [
      normalizePlayerAlias(candidate.playerName),
      candidate,
    ] as const),
  );
  const screenshotRowsByName = new Map(
    input.screenshotScoreCandidates.map((candidate) => [
      normalizePlayerAlias(candidate.playerName),
      candidate,
    ] as const),
  );
  const allNames = new Set([
    ...logRowsByName.keys(),
    ...screenshotRowsByName.keys(),
  ]);

  return [...allNames].flatMap<ImportScoreCrossCheck>((normalizedName) => {
    const logCandidate = logRowsByName.get(normalizedName);
    const screenshotCandidate = screenshotRowsByName.get(normalizedName);

    if (logCandidate && !screenshotCandidate) {
      return [{
        conflictingFields: [],
        matchingFields: [],
        playerName: logCandidate.playerName,
        status: 'log_only',
      }];
    }

    if (screenshotCandidate && !logCandidate) {
      return [{
        conflictingFields: [],
        matchingFields: [],
        playerName: screenshotCandidate.playerName,
        status: 'screenshot_only',
      }];
    }

    if (!logCandidate || !screenshotCandidate) {
      return [];
    }

    const conflictingFields: string[] = [];
    const matchingFields: string[] = [];

    for (const field of scoreCrossCheckFields) {
      const logValue = logCandidate[field];
      const screenshotValue = screenshotCandidate[field];

      if (!hasScoreValue(logValue) || !hasScoreValue(screenshotValue)) {
        continue;
      }

      if (logValue === screenshotValue) {
        matchingFields.push(field);
      } else {
        conflictingFields.push(field);
      }
    }

    if (matchingFields.length === 0 && conflictingFields.length === 0) {
      return [];
    }

    return [{
        conflictingFields,
        matchingFields,
        playerName: logCandidate.playerName,
        status: conflictingFields.length > 0 ? 'conflict' : 'matched',
      },
    ];
  });
}

const CARD_SCORING_CROSS_CHECK_FIELDS: Array<{
  field: ImportCardScoringField;
  totalsKey: 'animals' | 'jovian' | 'microbes' | 'total';
}> = [
  { field: 'cardPointsTotal', totalsKey: 'total' },
  { field: 'cardPointsAnimals', totalsKey: 'animals' },
  { field: 'cardPointsMicrobes', totalsKey: 'microbes' },
  { field: 'cardPointsJovian', totalsKey: 'jovian' },
];

/**
 * Compares calculated card scoring (derived from game-log card/resource/tile
 * events plus board-state evidence — never from the screenshot's printed
 * numbers) against the screenshot's summary card-point fields. This is
 * genuinely independent evidence, so it participates in the cross-check even
 * when no explicit log score row exists to compare the screenshot against.
 */
function buildCardScoringCrossChecks(input: {
  cardScoring: ImportPlayerCardScoringSummary[];
  logScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
  screenshotScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
}): ImportCardScoringCrossCheck[] {
  const logRowsByName = new Map(
    input.logScoreCandidates.map((candidate) => [
      normalizePlayerAlias(candidate.playerName),
      candidate,
    ] as const),
  );
  const screenshotRowsByName = new Map(
    input.screenshotScoreCandidates.map((candidate) => [
      normalizePlayerAlias(candidate.playerName),
      candidate,
    ] as const),
  );

  return input.cardScoring.flatMap<ImportCardScoringCrossCheck>((summary) => {
    const screenshotRow = screenshotRowsByName.get(
      normalizePlayerAlias(summary.playerName),
    );

    if (!screenshotRow) {
      // No false match or conflict when there is nothing to compare against.
      return [];
    }

    const hasExplicitLogScoreRow = logRowsByName.has(
      normalizePlayerAlias(summary.playerName),
    );

    if (!summary.totals.complete) {
      // Pending cards could land in any category (including the total), so
      // a partial total must never be compared as if it were final.
      if (!hasScoreValue(screenshotRow.cardPointsTotal)) {
        return [];
      }

      return [{
        conflictingFields: [],
        hasExplicitLogScoreRow,
        matchingFields: [],
        pendingCardCount: summary.pendingCards.length,
        playerName: summary.playerName,
        status: 'incomplete',
      }];
    }

    const conflictingFields: ImportCardScoringFieldComparison[] = [];
    const matchingFields: ImportCardScoringFieldComparison[] = [];

    for (const { field, totalsKey } of CARD_SCORING_CROSS_CHECK_FIELDS) {
      const referenceValue = screenshotRow[field];

      if (!hasScoreValue(referenceValue)) {
        continue;
      }

      const calculatedValue = summary.totals[totalsKey];
      const comparison: ImportCardScoringFieldComparison = {
        calculatedValue,
        field,
        referenceValue,
      };

      if (calculatedValue === referenceValue) {
        matchingFields.push(comparison);
      } else {
        conflictingFields.push(comparison);
      }
    }

    if (matchingFields.length === 0 && conflictingFields.length === 0) {
      return [];
    }

    return [{
      conflictingFields,
      hasExplicitLogScoreRow,
      matchingFields,
      pendingCardCount: 0,
      playerName: summary.playerName,
      status: conflictingFields.length > 0 ? 'conflict' : 'matched',
    }];
  });
}

export function buildImportReviewModel(input: {
  boardReviewItems?: CuratedBoardImportItem[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  evidenceReadError?: string | null;
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  logParse: Pick<
    ParsedGameLog,
    'cardPointBreakdowns' | 'drawInfoLineCount' | 'events' | 'ignoredLineCount'
  >;
  playerLinks: {
    matches: ImportPlayerLinkMatch[];
    unresolvedCount: number;
  };
  screenshotParse: ParsedEndgameScoreScreenshot;
  screenshotScoreDetails?: ImportScreenshotScoreDetails;
  tagSummaries?: ImportPlayerTagSummary[];
}): ImportReviewModel {
  const logScoreCandidates = input.logScoreCandidates ?? [];
  const cardScoring = input.cardScoring ?? [];

  return {
    boardReviewItems: input.boardReviewItems ?? [],
    cardScoring,
    cardScoringCrossChecks: buildCardScoringCrossChecks({
      cardScoring,
      logScoreCandidates,
      screenshotScoreCandidates: input.screenshotParse.playerRows,
    }),
    detectedParticipantNames: extractGameLogParticipantNames(input.logParse),
    drawInfoLineCount: input.logParse.drawInfoLineCount,
    evidenceReadError: input.evidenceReadError ?? null,
    ignoredLineCount: input.logParse.ignoredLineCount,
    logScoreCandidates,
    parsedEventCount: input.logParse.events.length,
    playerLinks: input.playerLinks.matches,
    requiresPlayerConfirmation: input.playerLinks.unresolvedCount > 0,
    scoreCrossChecks: buildScoreCrossChecks({
      logScoreCandidates,
      screenshotScoreCandidates: input.screenshotParse.playerRows,
    }),
    scoreCandidates: input.screenshotParse.playerRows,
    screenshotScoreDetails: input.screenshotScoreDetails ?? {
      awardPlacements: [],
      efficiencies: [],
      milestoneClaims: [],
    },
    tagSummaries: input.tagSummaries ?? [],
  };
}
