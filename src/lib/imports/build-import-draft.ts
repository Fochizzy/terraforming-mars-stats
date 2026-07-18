import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { buildImportDraftNotes } from './build-import-draft-notes';

export type ImportDraftValues = {
  endgameScreenshotName?: string | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  ocrConfidence?: number | null;
  playedOn: string;
  playerCount: number;
  rawOcrText?: string;
};

export type CreateImportDraftInput = ImportDraftValues & {
  endgameScreenshot: File | null;
};

export function buildImportDraft(input: {
  defaultGuaranteedMergerOffer: boolean;
  defaultPromoSetSlugs: string[];
  groupId: string;
  importValues: ImportDraftValues;
}): LogGameDraftInput {
  return {
    awardClaims: {},
    gameId: undefined,
    generationCount: input.importValues.generationCount,
    guaranteedMergerOffer: input.defaultGuaranteedMergerOffer,
    groupId: input.groupId,
    mapId: input.importValues.mapId,
    mergerOfferRuleSource: 'group_default',
    milestoneClaims: {},
    notes: buildImportDraftNotes({
      endgameScreenshotName: input.importValues.endgameScreenshotName,
      exportedGameLog: input.importValues.exportedGameLog,
    }),
    playedOn: input.importValues.playedOn,
    playerCount: input.importValues.playerCount,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    promoSetSlugs: [...input.defaultPromoSetSlugs],
    selectedPlayerIds: [],
  };
}
