import { describe, expect, it } from 'vitest';
import { applyCreatedImportPlayerToReview } from './apply-created-import-player-to-review';

describe('applyCreatedImportPlayerToReview', () => {
  it('turns an unmatched import row into an exact selected match after player creation', () => {
    const review = {
      detectedParticipantNames: ['Friday Mars', 'Unknown Friend'],
      drawInfoLineCount: 1,
      ignoredLineCount: 2,
      parsedEventCount: 3,
      playerLinks: [
        {
          candidates: [
            {
              displayName: 'Friday Mars',
              gamesPlayed: 11,
              id: 'player-1',
              linkedFullName: 'Friday Mars',
              linkedUsername: 'friday-mars',
              matchReason: 'exact' as const,
              matchScore: 400,
            },
          ],
          importedName: 'Friday Mars',
          requiresConfirmation: false,
          selectedPlayerId: 'player-1',
          status: 'exact' as const,
        },
        {
          candidates: [
            {
              displayName: 'Second Seat',
              gamesPlayed: 4,
              id: 'player-2',
              linkedFullName: null,
              linkedUsername: null,
              matchReason: 'fallback' as const,
              matchScore: 0,
            },
          ],
          importedName: 'Unknown Friend',
          requiresConfirmation: true,
          selectedPlayerId: null,
          status: 'unmatched' as const,
        },
      ],
      requiresPlayerConfirmation: true,
      scoreCandidates: [],
    };

    const result = applyCreatedImportPlayerToReview(review, {
      createdPlayerId: 'player-new',
      displayName: 'Unknown Friend',
      importedName: 'Unknown Friend',
    });

    expect(result.requiresPlayerConfirmation).toBe(false);
    expect(result.playerLinks[0]).toMatchObject({
      importedName: 'Friday Mars',
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact',
    });
    expect(result.playerLinks[1]).toMatchObject({
      importedName: 'Unknown Friend',
      requiresConfirmation: false,
      selectedPlayerId: 'player-new',
      status: 'exact',
    });
    expect(result.playerLinks[1]?.candidates[0]).toMatchObject({
      displayName: 'Unknown Friend',
      gamesPlayed: 0,
      id: 'player-new',
      linkedFullName: null,
      linkedUsername: null,
      matchReason: 'exact',
    });
    expect(result.playerLinks[1]?.candidates[0]).not.toHaveProperty(
      'matchScore',
    );
  });

  it('returns the original review when no matching import row exists', () => {
    const review = {
      detectedParticipantNames: [],
      drawInfoLineCount: 0,
      ignoredLineCount: 0,
      parsedEventCount: 0,
      playerLinks: [],
      requiresPlayerConfirmation: false,
      scoreCandidates: [],
    };

    expect(
      applyCreatedImportPlayerToReview(review, {
        createdPlayerId: 'player-new',
        displayName: 'Unknown Friend',
        importedName: 'Unknown Friend',
      }),
    ).toEqual(review);
  });
});
