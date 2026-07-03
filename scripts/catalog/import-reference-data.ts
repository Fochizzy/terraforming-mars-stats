import { normalizeCardRecord } from '../../src/features/catalog/catalog-record';

type RawCardRecord = {
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  imageUrl: string;
};

type OverrideCardRecord = {
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  image_url: string;
};

export async function buildCatalogImportPayload(
  rawCards: RawCardRecord[],
  overrides: OverrideCardRecord[] = [],
) {
  return [...rawCards.map(normalizeCardRecord), ...overrides];
}
