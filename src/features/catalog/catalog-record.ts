export type NormalizedCardRecord = {
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  image_url: string;
};

export function normalizeCardRecord(input: {
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  imageUrl: string;
}): NormalizedCardRecord {
  return {
    card_number: input.cardNumber,
    card_name: input.name,
    card_type: input.type,
    expansion_code: input.expansion,
    image_url: input.imageUrl,
  };
}
