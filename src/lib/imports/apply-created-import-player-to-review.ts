import type { ImportReviewModel } from './build-import-review-model';

export function applyCreatedImportPlayerToReview(
  review: ImportReviewModel,
  input: {
    createdPlayerId: string;
    displayName: string;
    importedName: string;
  },
): ImportReviewModel {
  let didUpdate = false;

  const playerLinks = review.playerLinks.map((link) => {
    if (link.importedName !== input.importedName) {
      return link;
    }

    didUpdate = true;

    return {
      ...link,
      candidates: [
        {
          displayName: input.displayName,
          gamesPlayed: 0,
          id: input.createdPlayerId,
          matchReason: 'exact' as const,
        },
        ...link.candidates.filter((candidate) => candidate.id !== input.createdPlayerId),
      ],
      requiresConfirmation: false,
      selectedPlayerId: input.createdPlayerId,
      status: 'exact' as const,
    };
  });

  if (!didUpdate) {
    return review;
  }

  return {
    ...review,
    playerLinks,
    requiresPlayerConfirmation: playerLinks.some(
      (link) => link.requiresConfirmation,
    ),
  };
}
