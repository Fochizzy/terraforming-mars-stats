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
