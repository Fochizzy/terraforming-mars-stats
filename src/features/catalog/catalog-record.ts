export type NormalizedCardRecord = {
  source_card_id: string;
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  expansion_name: string;
  image_url: string;
  thumbnail_path: string | null;
  full_image_path: string | null;
  promo_set_id: string | null;
  source_attribution: string;
  sync_metadata: Record<string, unknown>;
};

export function normalizeCardRecord(input: {
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  expansionName?: string;
  imageUrl: string;
  thumbnailPath?: string | null;
  fullImagePath?: string | null;
  promoSetId?: string | null;
  syncMetadata?: Record<string, unknown>;
  sourceAttribution?: string;
  sourceCardId?: string;
}): NormalizedCardRecord {
  return {
    source_card_id: input.sourceCardId ?? `${input.expansion}:${input.cardNumber}`,
    card_number: input.cardNumber,
    card_name: input.name,
    card_type: input.type,
    expansion_code: input.expansion,
    expansion_name: input.expansionName ?? input.expansion,
    image_url: input.imageUrl,
    thumbnail_path: input.thumbnailPath ?? null,
    full_image_path: input.fullImagePath ?? input.imageUrl,
    promo_set_id: input.promoSetId ?? null,
    source_attribution:
      input.sourceAttribution ?? 'https://tm.hadronikle.com/',
    sync_metadata: {
      expansion: input.expansion,
      name: input.name,
      number: input.cardNumber,
      type: input.type,
      ...(input.syncMetadata ?? {}),
    },
  };
}
