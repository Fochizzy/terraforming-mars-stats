import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  CATALOG_NAME_ALIASES,
  TFM_CARDS_SOURCE_URL,
  TFM_CARD_TAGS_SNAPSHOT_PATH,
  extractTfmCardTags,
  normalizeCardName,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';

export const CATEGORY_TO_CARD_TYPE: Record<string, string> = {
  corporationCards: 'Corporation',
  preludeCards: 'Prelude',
  projectCards: 'Project',
};

export const MODULE_TO_EXPANSION: Record<string, { code: string; name: string }> = {
  ares: { code: 'ares', name: 'Ares' },
  automa: { code: 'automa', name: 'Automa' },
  base: { code: 'base', name: 'Base Game' },
  community: { code: 'community', name: 'Community' },
  'corp era': { code: 'corporate_era', name: 'Corporate Era' },
  colonies: { code: 'colonies', name: 'Colonies' },
  moon: { code: 'moon', name: 'Moon' },
  prelude: { code: 'prelude', name: 'Prelude' },
  'prelude 2': { code: 'prelude_2', name: 'Prelude 2' },
  promo: { code: 'promo', name: 'Promo Cards' },
  turmoil: { code: 'turmoil', name: 'Turmoil' },
  venus: { code: 'venus_next', name: 'Venus Next' },
};

export type CatalogCardRow = {
  card_name: string;
  card_number: string;
  card_type: string;
  expansion_code: string;
  expansion_name: string;
  gameplay_tags: string[] | null;
  id: string;
  printed_victory_points: number | null;
  victory_points_kind: string | null;
};

export type TfmCatalogSource = {
  cardName: string;
  cardNumber: string;
  cardType: string;
  expansionCode: string;
  expansionName: string;
  gameplayTags: string[];
  printedVictoryPoints: number | null;
  record: TfmCardTagRecord;
  sourceCardId: string;
  sourceKey: string;
  victoryPointsKind: 'none' | 'static' | 'dynamic';
};

function slugifyName(name: string) {
  return normalizeCardName(name).replace(/\s+/g, '-');
}

export function tagsEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    [...left].sort().join('|') === [...right].sort().join('|')
  );
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

export function mapTfmRecordToCatalogSource(
  record: TfmCardTagRecord,
): TfmCatalogSource | null {
  const cardType = resolveCardType(record);
  const expansion = resolveExpansion(record);

  if (!cardType || !expansion) {
    return null;
  }

  return {
    cardName: record.name,
    cardNumber: record.cardNumber ?? '',
    cardType,
    expansionCode: expansion.code,
    expansionName: expansion.name,
    gameplayTags: record.tags,
    printedVictoryPoints: readPrintedVictoryPoints(record),
    record,
    sourceCardId: `tfm:${cardType.toLowerCase()}:${slugifyName(record.name)}`,
    sourceKey: `${normalizeCardName(record.name)}|${cardType}`,
    victoryPointsKind: record.victoryPoints.kind,
  };
}

export function buildCatalogCardPatch(
  row: CatalogCardRow,
  source: TfmCatalogSource | null,
) {
  if (!source) {
    return null;
  }

  const patch: Record<string, unknown> = {};

  if (row.card_number !== source.cardNumber) {
    patch.card_number = source.cardNumber;
  }
  if (row.card_type !== source.cardType) {
    patch.card_type = source.cardType;
  }
  if (row.expansion_code !== source.expansionCode) {
    patch.expansion_code = source.expansionCode;
  }
  if (row.expansion_name !== source.expansionName) {
    patch.expansion_name = source.expansionName;
  }
  if (!tagsEqual(row.gameplay_tags ?? [], source.gameplayTags)) {
    patch.gameplay_tags = source.gameplayTags;
  }
  if (row.printed_victory_points !== source.printedVictoryPoints) {
    patch.printed_victory_points = source.printedVictoryPoints;
  }
  if ((row.victory_points_kind ?? 'none') !== source.victoryPointsKind) {
    patch.victory_points_kind = source.victoryPointsKind;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

async function loadBundleSource(useCachedSnapshot: boolean) {
  const snapshotPath = path.resolve(TFM_CARD_TAGS_SNAPSHOT_PATH);

  if (useCachedSnapshot) {
    const snapshot = await readFile(snapshotPath, 'utf8');
    return { records: JSON.parse(snapshot) as TfmCardTagRecord[], fetched: false };
  }

  const response = await fetch(process.env.TFM_CARDS_SOURCE_URL ?? TFM_CARDS_SOURCE_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch the terraforming-mars client bundle: ${response.status} ${response.statusText}`,
    );
  }

  const records = extractTfmCardTags(await response.text());
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(records, null, 1)}\n`, 'utf8');
  return { records, fetched: true };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = process.argv.includes('--dry-run');
  const useCachedSnapshot = process.argv.includes('--cached');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running catalog:sync-tags.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { records, fetched } = await loadBundleSource(useCachedSnapshot);

  const sourceByKey = new Map<string, TfmCatalogSource>();
  const sourceByName = new Map<string, TfmCatalogSource[]>();
  const skippedUnsupportedSourceCards: string[] = [];

  for (const record of records) {
    const source = mapTfmRecordToCatalogSource(record);

    if (!source) {
      if (record.category) {
        skippedUnsupportedSourceCards.push(
          `${record.name} (${record.module ?? 'unknown module'} / ${record.category})`,
        );
      }
      continue;
    }

    sourceByKey.set(source.sourceKey, source);
    const sourceName = normalizeCardName(record.name);
    sourceByName.set(sourceName, [...(sourceByName.get(sourceName) ?? []), source]);
  }

  const { data, error } = await supabase
    .from('cards')
    .select(
      [
        'id',
        'card_name',
        'card_number',
        'card_type',
        'expansion_code',
        'expansion_name',
        'gameplay_tags',
        'printed_victory_points',
        'victory_points_kind',
      ].join(', '),
    )
    .in('card_type', ['Project', 'Corporation', 'Prelude']);

  if (error) {
    throw error;
  }

  const catalogRows = (data ?? []) as unknown as CatalogCardRow[];
  const matchedSourceKeys = new Set<string>();
  const updates: Array<{
    cardName: string;
    id: string;
    patch: Record<string, unknown>;
  }> = [];
  const unmatchedCatalogCards: string[] = [];
  const ambiguousCatalogCards: string[] = [];

  for (const row of catalogRows) {
    const normalizedName = normalizeCardName(row.card_name);
    const sourceName = CATALOG_NAME_ALIASES[normalizedName] ?? normalizedName;
    const source =
      sourceByKey.get(`${sourceName}|${row.card_type}`) ??
      (sourceByName.get(sourceName)?.length === 1
        ? sourceByName.get(sourceName)?.[0]
        : null);

    if (!source) {
      if ((sourceByName.get(sourceName)?.length ?? 0) > 1) {
        ambiguousCatalogCards.push(`${row.card_name} (${row.card_type})`);
      } else {
        unmatchedCatalogCards.push(`${row.card_name} (${row.card_type})`);
      }
      continue;
    }

    matchedSourceKeys.add(source.sourceKey);
    const patch = buildCatalogCardPatch(row, source);

    if (patch) {
      updates.push({ id: row.id, cardName: row.card_name, patch });
    }
  }

  const inserts: Array<Record<string, unknown>> = [];

  for (const [key, source] of sourceByKey) {
    if (matchedSourceKeys.has(key)) {
      continue;
    }

    inserts.push({
      card_name: source.cardName,
      card_number: source.cardNumber,
      card_type: source.cardType,
      expansion_code: source.expansionCode,
      expansion_name: source.expansionName,
      gameplay_tags: source.gameplayTags,
      image_url: '/file.svg',
      printed_victory_points: source.printedVictoryPoints,
      source_attribution: TFM_CARDS_SOURCE_URL,
      source_card_id: source.sourceCardId,
      sync_metadata: {
        tfmCategory: source.record.category,
        tfmModule: source.record.module,
        tfmNameKey: source.record.nameKey,
        tfmVictoryPointsKind: source.victoryPointsKind,
      },
      thumbnail_path: '/file.svg',
      victory_points_kind: source.victoryPointsKind,
    });
  }

  if (!dryRun) {
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('cards')
        .update(update.patch)
        .eq('id', update.id);

      if (updateError) {
        throw updateError;
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('cards')
        .upsert(inserts, { onConflict: 'source_card_id' });

      if (insertError) {
        throw insertError;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        sourceRecords: records.length,
        sourceLoadedFrom: fetched ? 'network' : 'snapshot',
        catalogFieldUpdates: updates.length,
        updatedCards: updates.map((update) => ({
          cardName: update.cardName,
          fields: Object.keys(update.patch),
        })),
        newCardsInserted: inserts.length,
        insertedCards: inserts.map((insert) => insert.card_name),
        unsupportedSourceCardsSkipped: skippedUnsupportedSourceCards,
        ambiguousCatalogCards,
        catalogCardsWithoutSourceMatch: unmatchedCatalogCards,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith('sync-card-tags.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
