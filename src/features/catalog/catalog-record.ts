export type NormalizedCardRecord = {
  source_card_id: string;
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  expansion_name: string;
  image_url: string;
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
    source_attribution:
      input.sourceAttribution ?? 'https://tm.hadronikle.com/',
    sync_metadata: {
      expansion: input.expansion,
      name: input.name,
      number: input.cardNumber,
      type: input.type,
    },
  };
}
