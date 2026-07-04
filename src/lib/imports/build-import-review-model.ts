import type { ImportPlayerLinkMatch } from './resolve-import-player-links';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type { ParsedGameLog } from './parse-game-log';

export type ImportReviewModel = {
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
    'drawInfoLineCount' | 'events' | 'ignoredLineCount'
  >;
  playerLinks: {
    matches: ImportPlayerLinkMatch[];
    unresolvedCount: number;
  };
  screenshotParse: ParsedEndgameScoreScreenshot;
}): ImportReviewModel {
  return {
    drawInfoLineCount: input.logParse.drawInfoLineCount,
    ignoredLineCount: input.logParse.ignoredLineCount,
    parsedEventCount: input.logParse.events.length,
    playerLinks: input.playerLinks.matches,
    requiresPlayerConfirmation: input.playerLinks.unresolvedCount > 0,
    scoreCandidates: input.screenshotParse.playerRows,
  };
}
