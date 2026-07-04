import { readFile, writeFile } from 'node:fs/promises';
import {
  normalizeCardRecord,
  type NormalizedCardRecord,
} from '../../src/features/catalog/catalog-record';
import { resolveFandomPromoSet } from './promo-fandom-data';

export const HADRONIKLE_SOURCE_ATTRIBUTION = 'https://tm.hadronikle.com/';
export const HADRONIKLE_SOURCE_CACHE_PATH =
  'scripts/catalog/source/hadronikle-home.html';

const EXPANSION_NAME_TO_CODE: Record<string, string> = {
  Base: 'base',
  'Corporate Era': 'corporate_era',
  Prelude: 'prelude',
  'Prelude 2': 'prelude_2',
  'Venus Next': 'venus_next',
  Colonies: 'colonies',
  Turmoil: 'turmoil',
  Promo: 'promo',
  Automa: 'automa',
};

export type HadronikleCardRecord = {
  cat: string;
  exp: string;
  img: string;
  name: string;
  num: string;
  primary: string;
  tags: string[];
  thumb: string;
};

export type CatalogCorporationSeed = {
  code: string;
  expansion_code: string;
  name: string;
  promo_set_slug: string | null;
  required_expansion_codes: string[];
};

export type CatalogPreludeSeed = {
  code: string;
  expansion_code: string;
  name: string;
  promo_set_slug: string | null;
  required_expansion_codes: string[];
};

export type CatalogImportPayload = {
  cards: NormalizedCardRecord[];
  corporations: CatalogCorporationSeed[];
  preludes: CatalogPreludeSeed[];
};

function normalizeExpansionCode(expansionName: string) {
  const normalized = EXPANSION_NAME_TO_CODE[expansionName];

  if (!normalized) {
    throw new Error(`Unsupported Hadronikle expansion: ${expansionName}`);
  }

  return normalized;
}

function slugifyName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isFakeCorporationBack(card: HadronikleCardRecord) {
  return (
    card.cat === 'Corporation' &&
    (card.primary === 'Corp Back' || card.primary === 'Corp Back Back')
  );
}

function resolvePromoSetSlug(card: HadronikleCardRecord) {
  const hasPromoTag = card.tags.includes('Promo') || card.primary === 'Promo';

  if (!hasPromoTag) {
    return null;
  }

  const promoSet = resolveFandomPromoSet({
    cardName: card.name,
    cardNumber: card.num,
  });

  if (!promoSet) {
    throw new Error(
      `Missing fandom promo mapping for ${card.cat} ${card.num || card.name}`,
    );
  }

  return promoSet.slug;
}

function resolveRequiredExpansionCodes(card: HadronikleCardRecord) {
  return uniqueStrings(
    card.tags
      .map((tag) => EXPANSION_NAME_TO_CODE[tag] ?? null)
      .filter((code): code is string => Boolean(code))
      .filter((code) => code !== 'promo' && code !== 'automa'),
  );
}

function buildSourceCardId(card: HadronikleCardRecord) {
  const expansionCode = normalizeExpansionCode(card.primary);
  const suffix = card.num.trim() || slugifyName(card.name);
  return `${card.cat.toLowerCase()}:${expansionCode}:${suffix}`;
}

function buildCardRecord(card: HadronikleCardRecord): NormalizedCardRecord {
  const promoSet = resolveFandomPromoSet({
    cardName: card.name,
    cardNumber: card.num,
  });
  const promoSetSlug =
    card.tags.includes('Promo') || card.primary === 'Promo'
      ? resolvePromoSetSlug(card)
      : null;
  const requiredExpansionCodes = resolveRequiredExpansionCodes(card);

  return normalizeCardRecord({
    cardNumber: card.num,
    expansion: normalizeExpansionCode(card.primary),
    expansionName: card.primary,
    fullImagePath: card.img,
    imageUrl: card.img,
    name: card.name,
    promoSetId: null,
    sourceAttribution: HADRONIKLE_SOURCE_ATTRIBUTION,
    sourceCardId: buildSourceCardId(card),
    syncMetadata: {
      category: card.cat,
      promoSetSlug,
      promoReleaseSource: promoSet?.editionLabel ?? null,
      promoReleaseYear: promoSet?.promoYear ?? null,
      requiredExpansionCodes,
      sourceExpansion: card.exp,
      sourcePrimary: card.primary,
      sourceTags: [...card.tags],
    },
    thumbnailPath: card.thumb,
    type: card.cat,
  });
}

function buildCorporationSeed(card: HadronikleCardRecord): CatalogCorporationSeed {
  const expansionCode = normalizeExpansionCode(card.primary);

  return {
    code: `${expansionCode}:${slugifyName(card.name)}`,
    expansion_code: expansionCode,
    name: card.name,
    promo_set_slug: resolvePromoSetSlug(card),
    required_expansion_codes: resolveRequiredExpansionCodes(card),
  };
}

function buildPreludeSeed(card: HadronikleCardRecord): CatalogPreludeSeed {
  return {
    code: card.num.trim() || `${normalizeExpansionCode(card.primary)}:${slugifyName(card.name)}`,
    expansion_code: normalizeExpansionCode(card.primary),
    name: card.name,
    promo_set_slug: resolvePromoSetSlug(card),
    required_expansion_codes: resolveRequiredExpansionCodes(card),
  };
}

export function extractHadronikleCardsFromHtml(
  html: string,
): HadronikleCardRecord[] {
  const match = html.match(
    /const CARDS = (\[[\s\S]*?\]);\s*(?:const ALL_EXPS|let slowMode)/,
  );

  if (!match?.[1]) {
    throw new Error('Could not find the embedded Hadronikle CARDS payload.');
  }

  return JSON.parse(match[1]) as HadronikleCardRecord[];
}

export function buildCatalogImportPayload(
  rawCards: HadronikleCardRecord[],
): CatalogImportPayload {
  const usableCards = rawCards.filter((card) => !isFakeCorporationBack(card));

  return {
    cards: usableCards.map(buildCardRecord),
    corporations: usableCards
      .filter((card) => card.cat === 'Corporation')
      .map(buildCorporationSeed),
    preludes: usableCards
      .filter((card) => card.cat === 'Prelude')
      .map(buildPreludeSeed),
  };
}

export async function loadHadronikleSourceHtml(options?: {
  preferCached?: boolean;
}) {
  const preferCached = options?.preferCached ?? true;

  if (preferCached) {
    try {
      return await readFile(HADRONIKLE_SOURCE_CACHE_PATH, 'utf8');
    } catch {
      // Fall through to the live fetch when the cache does not exist yet.
    }
  }

  const response = await fetch(HADRONIKLE_SOURCE_ATTRIBUTION);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Hadronikle source: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  await writeFile(HADRONIKLE_SOURCE_CACHE_PATH, html, 'utf8');
  return html;
}
