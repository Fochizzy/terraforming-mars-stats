import type { LogGameDraftInput } from '@/lib/validation/log-game';

function filterSelectedRecord<T>(
  record: Record<string, T>,
  selectedPlayerIds: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(record).filter(([playerId]) => selectedPlayerIds.has(playerId)),
  );
}

function sanitizeMilestoneClaims(
  claims: LogGameDraftInput['milestoneClaims'],
  selectedPlayerIds: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(claims).map(([milestoneId, claim]) => [
      milestoneId,
      {
        ...claim,
        winnerPlayerId: selectedPlayerIds.has(claim.winnerPlayerId)
          ? claim.winnerPlayerId
          : '',
      },
    ]),
  );
}

function sanitizeAwardClaims(
  claims: LogGameDraftInput['awardClaims'],
  selectedPlayerIds: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(claims).map(([awardId, claim]) => [
      awardId,
      {
        ...claim,
        fundedByPlayerId: selectedPlayerIds.has(claim.fundedByPlayerId)
          ? claim.fundedByPlayerId
          : '',
        firstPlaceWinnerPlayerIds: (
          claim.firstPlaceWinnerPlayerIds ?? []
        ).filter((playerId) => selectedPlayerIds.has(playerId)),
        secondPlaceWinnerPlayerIds: (
          claim.secondPlaceWinnerPlayerIds ?? []
        ).filter((playerId) => selectedPlayerIds.has(playerId)),
      },
    ]),
  );
}

export function sanitizePlayerLinkedState(
  input: LogGameDraftInput,
): LogGameDraftInput {
  const selectedPlayerIds = new Set(input.selectedPlayerIds);

  return {
    ...input,
    awardClaims: sanitizeAwardClaims(input.awardClaims, selectedPlayerIds),
    milestoneClaims: sanitizeMilestoneClaims(
      input.milestoneClaims,
      selectedPlayerIds,
    ),
    playerScores: filterSelectedRecord(input.playerScores, selectedPlayerIds),
    playerSelections: filterSelectedRecord(
      input.playerSelections,
      selectedPlayerIds,
    ),
    playerStyles: filterSelectedRecord(input.playerStyles, selectedPlayerIds),
  };
}
