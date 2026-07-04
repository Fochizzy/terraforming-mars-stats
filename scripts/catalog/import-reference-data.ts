import {
  normalizeCardRecord,
  type NormalizedCardRecord,
} from '../../src/features/catalog/catalog-record';

export const HADRONIKLE_SOURCE_ATTRIBUTION = 'https://tm.hadronikle.com/';

type RawCardRecord = {
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  expansionName?: string;
  imageUrl: string;
};

type OverrideCardRecord = NormalizedCardRecord;

export async function buildCatalogImportPayload(
  rawCards: RawCardRecord[],
  overrides: OverrideCardRecord[] = [],
): Promise<NormalizedCardRecord[]> {
  return [
    ...rawCards.map((card) =>
      normalizeCardRecord({
        cardNumber: card.cardNumber,
        expansion: card.expansion,
        expansionName: card.expansionName ?? card.expansion,
        imageUrl: card.imageUrl,
        name: card.name,
        sourceAttribution: HADRONIKLE_SOURCE_ATTRIBUTION,
        sourceCardId: `${card.expansion}:${card.cardNumber}`,
        type: card.type,
      }),
    ),
    ...overrides,
  ];
}
