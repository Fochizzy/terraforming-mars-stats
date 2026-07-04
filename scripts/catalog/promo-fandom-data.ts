export const FANDOM_PROMO_SOURCE_ATTRIBUTION =
  'https://terraformingmars.fandom.com/wiki/Category:TM/Promos';

type PromoSetSeed = {
  display_name: string;
  display_order: number;
  edition_label: string;
  promo_year: number;
  slug: string;
  source_attribution: string;
};

type PromoSetDefinition = PromoSetSeed & {
  lookupKeys: string[];
};

function normalizeLookupValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function numberLookup(number: string) {
  return `number:${number.trim().toUpperCase()}`;
}

function nameLookup(name: string) {
  return `name:${normalizeLookupValue(name)}`;
}

function buildNumberRange(prefix: string, start: number, end: number) {
  const values: string[] = [];

  for (let current = start; current <= end; current += 1) {
    values.push(`${prefix}${String(current).padStart(2, '0')}`);
  }

  return values;
}

function createPromoSetDefinition(input: {
  slug: string;
  displayName: string;
  editionLabel: string;
  promoYear: number;
  displayOrder: number;
  cardNumbers?: string[];
  cardNames?: string[];
}) {
  return {
    slug: input.slug,
    display_name: input.displayName,
    edition_label: input.editionLabel,
    promo_year: input.promoYear,
    display_order: input.displayOrder,
    source_attribution: FANDOM_PROMO_SOURCE_ATTRIBUTION,
    lookupKeys: [
      ...(input.cardNumbers ?? []).map(numberLookup),
      ...(input.cardNames ?? []).map(nameLookup),
    ],
  } satisfies PromoSetDefinition;
}

// Curated from the TM/Promos fandom category page. Sterling Vents (X79) is
// pinned to the 2026 seasonal set from the official FryxGames page the user
// provided because it is not yet listed on the category index.
const promoSetDefinitions = [
  createPromoSetDefinition({
    slug: '2016-launch-kit-promos',
    displayName: 'Launch Kit Promos',
    editionLabel: 'Launch kit promo',
    promoYear: 2016,
    displayOrder: 201600,
    cardNumbers: ['209'],
  }),
  createPromoSetDefinition({
    slug: '2017-boardgamegeek-promos',
    displayName: 'BoardGameGeek Promos',
    editionLabel: 'BoardGameGeek promo',
    promoYear: 2017,
    displayOrder: 201700,
    cardNumbers: ['210'],
  }),
  createPromoSetDefinition({
    slug: '2017-spielbox-promos',
    displayName: 'spielbox Promos',
    editionLabel: 'spielbox promo',
    promoYear: 2017,
    displayOrder: 201710,
    cardNumbers: ['211', '212'],
  }),
  createPromoSetDefinition({
    slug: '2018-boardgamegeek-promos',
    displayName: 'BoardGameGeek Promos',
    editionLabel: 'BoardGameGeek promo',
    promoYear: 2018,
    displayOrder: 201800,
    cardNames: [
      'Arcadian Communities',
      'Recyclon',
      'Splice',
      'Splice Tactical Genomics',
    ],
  }),
  createPromoSetDefinition({
    slug: '2018-dice-tower-promos',
    displayName: 'The Dice Tower Promos',
    editionLabel: 'The Dice Tower promo',
    promoYear: 2018,
    displayOrder: 201810,
    cardNumbers: ['C01', 'C02', 'C03'],
  }),
  createPromoSetDefinition({
    slug: '2019-turmoil-promos',
    displayName: 'Turmoil Promos',
    editionLabel: 'Turmoil',
    promoYear: 2019,
    displayOrder: 201900,
    cardNumbers: buildNumberRange('X', 1, 12),
    cardNames: [
      'Factorum',
      'Mons Insurance',
      'Philares',
      'Cloud Societies',
      'Corrosive Rain',
      'Jovian Tax Rights',
      'Microgravity Health Problems',
      'Venus Infrastructure',
    ],
  }),
  createPromoSetDefinition({
    slug: '2020-big-box-promos',
    displayName: 'Big Box Promos',
    editionLabel: 'Big Box',
    promoYear: 2020,
    displayOrder: 202000,
    cardNumbers: buildNumberRange('X', 13, 33),
    cardNames: ['AstroDrill', 'Astrodrill', 'Pharmacy Union'],
  }),
  createPromoSetDefinition({
    slug: '2021-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2021,
    displayOrder: 202100,
    cardNumbers: buildNumberRange('X', 35, 38),
  }),
  createPromoSetDefinition({
    slug: '2021-spielbox-promos',
    displayName: 'spielbox Promos',
    editionLabel: 'spielbox promo',
    promoYear: 2021,
    displayOrder: 202110,
    cardNumbers: ['X34'],
  }),
  createPromoSetDefinition({
    slug: '2022-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2022,
    displayOrder: 202200,
    cardNumbers: buildNumberRange('X', 39, 43),
  }),
  createPromoSetDefinition({
    slug: '2023-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2023,
    displayOrder: 202300,
    cardNumbers: buildNumberRange('X', 45, 48),
  }),
  createPromoSetDefinition({
    slug: '2023-spielbox-promos',
    displayName: 'spielbox Promos',
    editionLabel: 'spielbox promo',
    promoYear: 2023,
    displayOrder: 202310,
    cardNumbers: ['X44'],
  }),
  createPromoSetDefinition({
    slug: '2024-prelude-2-promos',
    displayName: 'Prelude 2 Promos',
    editionLabel: 'Prelude 2',
    promoYear: 2024,
    displayOrder: 202400,
    cardNumbers: buildNumberRange('X', 49, 66),
    cardNames: ['Kuiper Cooperative', 'Tycho Magnetics'],
  }),
  createPromoSetDefinition({
    slug: '2024-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2024,
    displayOrder: 202410,
    cardNumbers: buildNumberRange('X', 67, 70),
  }),
  createPromoSetDefinition({
    slug: '2024-spielbox-promos',
    displayName: 'spielbox Promos',
    editionLabel: 'spielbox promo',
    promoYear: 2024,
    displayOrder: 202420,
    cardNumbers: ['X71'],
  }),
  createPromoSetDefinition({
    slug: '2024-wsbg-promos',
    displayName: 'WSBG Promos',
    editionLabel: 'WSBG promo',
    promoYear: 2024,
    displayOrder: 202430,
    cardNumbers: ['X72'],
  }),
  createPromoSetDefinition({
    slug: '2025-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2025,
    displayOrder: 202500,
    cardNumbers: buildNumberRange('X', 73, 76),
  }),
  createPromoSetDefinition({
    slug: '2025-wsbg-promos',
    displayName: 'WSBG Promos',
    editionLabel: 'WSBG promo',
    promoYear: 2025,
    displayOrder: 202510,
    cardNumbers: ['X77'],
  }),
  createPromoSetDefinition({
    slug: '2026-seasonal-promos',
    displayName: 'Seasonal Promos',
    editionLabel: 'Seasonal promo',
    promoYear: 2026,
    displayOrder: 202600,
    cardNumbers: ['X78', 'X79'],
  }),
] as const;

const promoSetDefinitionByLookup = new Map<string, PromoSetDefinition>();

for (const definition of promoSetDefinitions) {
  for (const lookupKey of definition.lookupKeys) {
    promoSetDefinitionByLookup.set(lookupKey, definition);
  }
}

export const fandomPromoSets: PromoSetSeed[] = promoSetDefinitions.map(
  ({ lookupKeys: _lookupKeys, ...promoSet }) => promoSet,
);

export function resolveFandomPromoSet(input: {
  cardName: string;
  cardNumber?: string | null;
}) {
  const lookupCandidates = [
    input.cardNumber ? numberLookup(input.cardNumber) : null,
    nameLookup(input.cardName),
  ].filter((entry): entry is string => Boolean(entry));

  for (const lookupKey of lookupCandidates) {
    const definition = promoSetDefinitionByLookup.get(lookupKey);

    if (definition) {
      return {
        displayName: definition.display_name,
        editionLabel: definition.edition_label,
        promoYear: definition.promo_year,
        slug: definition.slug,
      };
    }
  }

  return null;
}
