import { describe, expect, it } from 'vitest';
import { buildImportReviewModel } from './build-import-review-model';

describe('buildImportReviewModel', () => {
  it('surfaces ignored filler, OCR scores, and unresolved players together', () => {
    expect(
      buildImportReviewModel({
        logParse: {
          drawInfoLineCount: 1,
          events: [
            {
              actor: 'Izzy',
              card: 'Earth Catapult',
              eventType: 'card_played',
              lineNumber: 3,
              rawLine: 'Izzy played Earth Catapult',
            },
          ],
          ignoredLineCount: 2,
        },
        playerLinks: {
          matches: [{ importedName: 'Izzy H.', status: 'unmatched' }],
          unresolvedCount: 1,
        },
        screenshotParse: {
          playerRows: [{ playerName: 'Izzy H.', totalPoints: 62, trPoints: 18 }],
        },
      }),
    ).toMatchObject({
      drawInfoLineCount: 1,
      ignoredLineCount: 2,
      parsedEventCount: 1,
      playerLinks: [{ importedName: 'Izzy H.', status: 'unmatched' }],
      requiresPlayerConfirmation: true,
      scoreCandidates: [{ playerName: 'Izzy H.', totalPoints: 62 }],
    });
  });
});
