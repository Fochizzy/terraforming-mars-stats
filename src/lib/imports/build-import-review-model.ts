import type { ImportPlayerLinkMatch } from './resolve-import-player-links';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type { ParsedGameLog } from './parse-game-log';
import { extractGameLogParticipantNames } from './extract-game-log-participant-names';

export type ImportReviewModel = {
  detectedParticipantNames: string[];
  drawInfoLineCount: number;
  ignoredLineCount: number;
  parsedEventCount: number;
  playerLinks: ImportPlayerLinkMatch[];
  requiresPlayerConfirmation: boolean;
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
};

export function buildImportReviewModel(input: {
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
  return {
    detectedParticipantNames: extractGameLogParticipantNames(input.logParse),
    drawInfoLineCount: input.logParse.drawInfoLineCount,
    ignoredLineCount: input.logParse.ignoredLineCount,
    parsedEventCount: input.logParse.events.length,
    playerLinks: input.playerLinks.matches,
    requiresPlayerConfirmation: input.playerLinks.unresolvedCount > 0,
    scoreCandidates: input.screenshotParse.playerRows,
  };
}
