import type { LogGameDraftInput } from '@/lib/validation/log-game';

type PreviousGameSetup = {
  mapId: string;
  playerCount: number;
  expansionCodes: string[];
  promoSetSlugs: string[];
  selectedPlayerIds: string[];
  totalPoints?: number[];
};

export function cloneGameSetup(previous: PreviousGameSetup) {
  return {
    mapId: previous.mapId,
    playerCount: previous.playerCount,
    expansionCodes: previous.expansionCodes,
    promoSetSlugs: previous.promoSetSlugs,
    selectedPlayerIds: previous.selectedPlayerIds,
  };
}

export function mergeDraftIntoInitialValues(
  initialValues: LogGameDraftInput,
  draftValues: Partial<LogGameDraftInput> | null | undefined,
): LogGameDraftInput {
  if (!draftValues) {
    return initialValues;
  }

  return {
    ...initialValues,
    ...draftValues,
    awardClaims: draftValues.awardClaims
      ? { ...draftValues.awardClaims }
      : { ...initialValues.awardClaims },
    expansionCodes: draftValues.expansionCodes
      ? [...draftValues.expansionCodes]
      : [...initialValues.expansionCodes],
    milestoneClaims: draftValues.milestoneClaims
      ? { ...draftValues.milestoneClaims }
      : { ...initialValues.milestoneClaims },
    playerScores: draftValues.playerScores
      ? { ...draftValues.playerScores }
      : { ...initialValues.playerScores },
    playerSelections: draftValues.playerSelections
      ? { ...draftValues.playerSelections }
      : { ...initialValues.playerSelections },
    playerStyles: draftValues.playerStyles
      ? { ...draftValues.playerStyles }
      : { ...initialValues.playerStyles },
    promoSetSlugs: draftValues.promoSetSlugs
      ? [...draftValues.promoSetSlugs]
      : [...initialValues.promoSetSlugs],
    selectedPlayerIds: draftValues.selectedPlayerIds
      ? [...draftValues.selectedPlayerIds]
      : [...initialValues.selectedPlayerIds],
  };
}
