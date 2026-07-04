import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { buildImportDraftNotes } from './build-import-draft-notes';

export type ImportDraftValues = {
  endgameScreenshotName?: string | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  playedOn: string;
  playerCount: number;
};

export type CreateImportDraftInput = ImportDraftValues & {
  endgameScreenshot: File | null;
};

export function buildImportDraft(input: {
  defaultExpansionCodes: string[];
  defaultPromoSetSlugs: string[];
  groupId: string;
  importValues: ImportDraftValues;
}): LogGameDraftInput {
  return {
    awardClaims: {},
    expansionCodes: [...input.defaultExpansionCodes],
    gameId: undefined,
    generationCount: input.importValues.generationCount,
    groupId: input.groupId,
    mapId: input.importValues.mapId,
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
