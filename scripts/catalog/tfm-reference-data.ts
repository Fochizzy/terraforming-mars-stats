import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  normalizeCardRecord,
  type NormalizedCardRecord,
} from '../../src/features/catalog/catalog-record';
import {
  CATALOG_NAME_ALIASES,
  extractTfmCardTags,
  normalizeCardName,
  TFM_CARDS_PAGE_URL,
  TFM_CARDS_SOURCE_URL,
  TFM_CARD_TAGS_SNAPSHOT_PATH,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';
import { resolveFandomPromoSet } from './promo-fandom-data';

export const TFM_CARD_IMAGE_PLACEHOLDER_PATH = '/file.svg';

export const CATEGORY_TO_CARD_TYPE: Record<string, string> = {
  corporationCards: 'Corporation',
  preludeCards: 'Prelude',
  projectCards: 'Project',
};

export const MODULE_TO_EXPANSION: Record<string, { code: string; name: string }> = {
  ares: { code: 'ares', name: 'Ares' },
  automa: { code: 'automa', name: 'Automa' },
  base: { code: 'base', name: 'Base Game' },
  colonies: { code: 'colonies', name: 'Colonies' },
  community: { code: 'community', name: 'Community' },
  'corp era': { code: 'corporate_era', name: 'Corporate Era' },
  moon: { code: 'moon', name: 'Moon' },
  prelude: { code: 'prelude', name: 'Prelude' },
  'prelude 2': { code: 'prelude_2', name: 'Prelude 2' },
  promo: { code: 'promo', name: 'Promo Cards' },
  turmoil: { code: 'turmoil', name: 'Turmoil' },
  venus: { code: 'venus_next', name: 'Venus Next' },
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

export type TfmCatalogSource = {
  cardName: string;
  cardNumber: string;
  cardType: string;
  expansionCode: string;
  expansionName: string;
  fullImagePath: string;
  gameplayTags: string[];
  printedVictoryPoints: number | null;
  promoSetSlug: string | null;
  record: TfmCardTagRecord;
  requiredExpansionCodes: string[];
  sourceCardId: string;
  sourceKey: string;
  thumbnailPath: string;
  victoryPointsKind: 'none' | 'static' | 'dynamic';
};

export function slugifyCardName(name: string) {
  return normalizeCardName(name).replace(/\s+/g, '-');
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function resolveCardType(record: TfmCardTagRecord) {
  return record.category
    ? CATEGORY_TO_CARD_TYPE[record.category]
    : record.category === null && record.cardType === 'corporation'
      ? 'Corporation'
      : null;
}

function resolveExpansion(record: TfmCardTagRecord) {
  return record.module
    ? MODULE_TO_EXPANSION[record.module.toLowerCase()]
    : undefined;
}

function readPrintedVictoryPoints(record: TfmCardTagRecord) {
  return record.victoryPoints.kind === 'static'
    ? record.victoryPoints.points
    : null;
}

function resolveVictoryPointsKind(record: TfmCardTagRecord) {
  return record.victoryPoints.kind;
}

function resolvePromoSetSlug(source: {
  cardName: string;
  cardNumber?: string | null;
  expansionCode: string;
}) {
  if (source.expansionCode !== 'promo') {
    return null;
  }

  return (
    resolveFandomPromoSet({
      cardName: source.cardName,
      cardNumber: source.cardNumber,
    })?.slug ?? null
  );
}

function resolveRequiredExpansionCodes(source: {
  cardType: string;
  expansionCode: string;
}) {
  if (source.expansionCode === 'promo') {
    return [];
  }

  if (source.cardType === 'Project' && source.expansionCode === 'corporate_era') {
    return ['corporate_era'];
  }

  if (source.expansionCode === 'automa') {
    return [];
  }

  return source.expansionCode === 'base' ? ['base'] : [source.expansionCode];
}

export function buildTfmCardBrowserUrl(record: Pick<TfmCardTagRecord, 'name'>) {
  return `${TFM_CARDS_PAGE_URL}&search=${encodeURIComponent(record.name)}`;
}

export function mapTfmRecordToCatalogSource(
  record: TfmCardTagRecord,
): TfmCatalogSource | null {
  const cardType = resolveCardType(record);
  const expansion = resolveExpansion(record);

  if (!cardType || !expansion) {
    return null;
  }

  const cardNumber = record.cardNumber ?? '';
  const sourceCardId = `${cardType.toLowerCase()}:${expansion.code}:${
    cardNumber.trim() || slugifyCardName(record.name)
  }`;
  const requiredExpansionCodes = resolveRequiredExpansionCodes({
    cardType,
    expansionCode: expansion.code,
  });

  return {
    cardName: record.name,
    cardNumber,
    cardType,
    expansionCode: expansion.code,
    expansionName: expansion.name,
    fullImagePath: buildTfmCardBrowserUrl(record),
    gameplayTags: record.tags,
    printedVictoryPoints: readPrintedVictoryPoints(record),
    promoSetSlug: resolvePromoSetSlug({
      cardName: record.name,
      cardNumber,
      expansionCode: expansion.code,
    }),
    record,
    requiredExpansionCodes,
    sourceCardId,
    sourceKey: `${normalizeCardName(record.name)}|${cardType}`,
    thumbnailPath: TFM_CARD_IMAGE_PLACEHOLDER_PATH,
    victoryPointsKind: resolveVictoryPointsKind(record),
  };
}

function buildCardRecord(source: TfmCatalogSource): NormalizedCardRecord {
  return normalizeCardRecord({
    cardNumber: source.cardNumber,
    expansion: source.expansionCode,
    expansionName: source.expansionName,
    fullImagePath: source.fullImagePath,
    imageUrl: source.fullImagePath,
    name: source.cardName,
    sourceAttribution: TFM_CARDS_PAGE_URL,
    sourceCardId: source.sourceCardId,
    syncMetadata: {
      gameplayTags: source.gameplayTags,
      promoSetSlug: source.promoSetSlug,
      requiredExpansionCodes: source.requiredExpansionCodes,
      sourceCategory: source.record.category,
      sourceModule: source.record.module,
      sourceNameKey: source.record.nameKey,
      sourceUrl: TFM_CARDS_SOURCE_URL,
      sourceVictoryPointsKind: source.victoryPointsKind,
    },
    thumbnailPath: source.thumbnailPath,
    type: source.cardType,
  });
}

function buildCorporationSeed(source: TfmCatalogSource): CatalogCorporationSeed {
  return {
    code: `${source.expansionCode}:${slugifyCardName(source.cardName)}`,
    expansion_code: source.expansionCode,
    name: source.cardName,
    promo_set_slug: source.promoSetSlug,
    required_expansion_codes: source.requiredExpansionCodes,
  };
}

function buildPreludeSeed(source: TfmCatalogSource): CatalogPreludeSeed {
  return {
    code:
      source.cardNumber.trim() ||
      `${source.expansionCode}:${slugifyCardName(source.cardName)}`,
    expansion_code: source.expansionCode,
    name: source.cardName,
    promo_set_slug: source.promoSetSlug,
    required_expansion_codes: source.requiredExpansionCodes,
  };
}

function attachCatalogSourceFields(
  card: NormalizedCardRecord,
  source: TfmCatalogSource,
): NormalizedCardRecord {
  return {
    ...card,
    gameplay_tags: source.gameplayTags,
    printed_victory_points: source.printedVictoryPoints,
    victory_points_kind: source.victoryPointsKind,
  };
}

export function buildTfmCatalogImportPayload(
  records: TfmCardTagRecord[],
): CatalogImportPayload {
  const sources = records
    .map(mapTfmRecordToCatalogSource)
    .filter((source): source is TfmCatalogSource => Boolean(source))
    .filter((source) => source.expansionCode !== 'automa');

  return {
    cards: sources.map((source) =>
      attachCatalogSourceFields(buildCardRecord(source), source),
    ),
    corporations: sources
      .filter((source) => source.cardType === 'Corporation')
      .map(buildCorporationSeed),
    preludes: sources
      .filter((source) => source.cardType === 'Prelude')
      .map(buildPreludeSeed),
  };
}

export function buildMissingSelectionReferenceRows(input: {
  existingNames: string[];
  kind: 'Corporation' | 'Prelude';
  sources: TfmCatalogSource[];
}): Array<CatalogCorporationSeed | CatalogPreludeSeed> {
  const existingNames = new Set(
    input.existingNames.map((name) => {
      const normalizedName = normalizeCardName(name);
      return CATALOG_NAME_ALIASES[normalizedName] ?? normalizedName;
    }),
  );

  return input.sources
    .filter(
      (source) =>
        source.cardType === input.kind &&
        source.expansionCode !== 'automa' &&
        !existingNames.has(normalizeCardName(source.cardName)),
    )
    .map((source) =>
      input.kind === 'Corporation'
        ? buildCorporationSeed(source)
        : buildPreludeSeed(source),
    );
}

export async function loadTfmCardRecords(options?: {
  preferCached?: boolean;
}) {
  const preferCached = options?.preferCached ?? true;
  const snapshotPath = path.resolve(TFM_CARD_TAGS_SNAPSHOT_PATH);

  if (preferCached) {
    try {
      const snapshot = await readFile(snapshotPath, 'utf8');
      return JSON.parse(snapshot) as TfmCardTagRecord[];
    } catch {
      // Fall through to the live fetch when the cache does not exist yet.
    }
  }

  const response = await fetch(TFM_CARDS_SOURCE_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Terraforming Mars card source: ${response.status} ${response.statusText}`,
    );
  }

  const records = extractTfmCardTags(await response.text());
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(records, null, 1)}\n`, 'utf8');
  return records;
}
