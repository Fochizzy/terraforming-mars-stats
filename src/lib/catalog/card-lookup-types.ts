export type CardLookupEntry = {
  id: string;
  cardNumber: string;
  cardName: string;
  cardType: string;
  expansionCode: string;
  promoSetSlug: string | null;
  printedVictoryPoints: number | null;
  requiredExpansionCodes: readonly string[];
  thumbnailUrl: string | null;
  fullImageUrl: string | null;
  sourceTags: readonly string[];
  victoryPointsKind: 'none' | 'static' | 'dynamic';
};
