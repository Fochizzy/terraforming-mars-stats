import type { ImportPlayerLinkMatch } from './resolve-import-player-links';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type { ParsedGameLog } from './parse-game-log';
import { extractGameLogParticipantNames } from './extract-game-log-participant-names';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import type { CuratedBoardImportItem } from './score-curated-board-import-items';

export type ImportScoreCrossCheck = {
  conflictingFields: string[];
  matchingFields: string[];
  playerName: string;
  status: 'conflict' | 'log_only' | 'matched' | 'screenshot_only';
};

export type ImportGroupResolutionReview = {
  action: 'create' | 'reuse';
  groupName: string;
  participantCount: number;
  summary: string;
};

export type ImportReviewModel = {
  boardReviewItems?: CuratedBoardImportItem[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  detectedParticipantNames: string[];
  drawInfoLineCount: number;
  groupResolution: ImportGroupResolutionReview;
  ignoredLineCount: number;
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  parsedEventCount: number;
  playerLinks: ImportPlayerLinkMatch[];
  requiresPlayerConfirmation: boolean;
  scoreCrossChecks?: ImportScoreCrossCheck[];
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
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

export function buildImportReviewModel(input: {
  boardReviewItems?: CuratedBoardImportItem[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  groupResolution: ImportGroupResolutionReview;
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
}): ImportReviewModel {
  const logScoreCandidates = input.logScoreCandidates ?? [];

  return {
    boardReviewItems: input.boardReviewItems ?? [],
    cardScoring: input.cardScoring ?? [],
    detectedParticipantNames: extractGameLogParticipantNames(input.logParse),
    drawInfoLineCount: input.logParse.drawInfoLineCount,
    groupResolution: input.groupResolution,
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
  };
}
