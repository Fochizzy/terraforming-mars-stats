import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  CATALOG_NAME_ALIASES,
  TFM_CARDS_PAGE_URL,
  TFM_CARDS_SOURCE_URL,
  TFM_CARD_TAGS_SNAPSHOT_PATH,
  extractTfmCardTags,
  normalizeCardName,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';
import {
  buildMissingSelectionReferenceRows,
  disambiguateDuplicateSourceCardIds,
  mapTfmRecordToCatalogSource,
  type TfmCatalogSource,
} from './tfm-reference-data';

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

export function tagsEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    [...left].sort().join('|') === [...right].sort().join('|')
  );
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
  const rawSources: TfmCatalogSource[] = [];

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

    rawSources.push(source);
  }

  const bundleSources = disambiguateDuplicateSourceCardIds(rawSources);

  for (const source of bundleSources) {
    sourceByKey.set(source.sourceKey, source);
    const sourceName = normalizeCardName(source.cardName);
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

  const [
    { data: corporationNameRows, error: corporationNamesError },
    { data: preludeNameRows, error: preludeNamesError },
  ] = await Promise.all([
    supabase.from('corporations').select('name'),
    supabase.from('preludes').select('name'),
  ]);

  if (corporationNamesError) {
    throw corporationNamesError;
  }

  if (preludeNamesError) {
    throw preludeNamesError;
  }

  const corporationReferenceInserts = buildMissingSelectionReferenceRows({
    existingNames: ((corporationNameRows ?? []) as Array<{ name: string }>).map(
      (row) => row.name,
    ),
    kind: 'Corporation',
    sources: bundleSources,
  });
  const preludeReferenceInserts = buildMissingSelectionReferenceRows({
    existingNames: ((preludeNameRows ?? []) as Array<{ name: string }>).map(
      (row) => row.name,
    ),
    kind: 'Prelude',
    sources: bundleSources,
  });

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
      image_url: source.fullImagePath,
      printed_victory_points: source.printedVictoryPoints,
      source_attribution: TFM_CARDS_PAGE_URL,
      source_card_id: source.sourceCardId,
      sync_metadata: {
        promoSetSlug: source.promoSetSlug,
        requiredExpansionCodes: source.requiredExpansionCodes,
        tfmCategory: source.record.category,
        tfmModule: source.record.module,
        tfmNameKey: source.record.nameKey,
        tfmVictoryPointsKind: source.victoryPointsKind,
      },
      thumbnail_path: source.thumbnailPath,
      full_image_path: source.fullImagePath,
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

    if (corporationReferenceInserts.length > 0) {
      const { error: corporationInsertError } = await supabase
        .from('corporations')
        .upsert(
          corporationReferenceInserts.map(
            ({ promo_set_slug: _promoSetSlug, ...row }) => row,
          ),
          { onConflict: 'code' },
        );

      if (corporationInsertError) {
        throw corporationInsertError;
      }
    }

    if (preludeReferenceInserts.length > 0) {
      const { error: preludeInsertError } = await supabase
        .from('preludes')
        .upsert(
          preludeReferenceInserts.map(
            ({ promo_set_slug: _promoSetSlug, ...row }) => row,
          ),
          { onConflict: 'code' },
        );

      if (preludeInsertError) {
        throw preludeInsertError;
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
        newCorporationOptionsInserted: corporationReferenceInserts.length,
        insertedCorporationOptions: corporationReferenceInserts.map(
          (insert) => insert.name,
        ),
        newPreludeOptionsInserted: preludeReferenceInserts.length,
        insertedPreludeOptions: preludeReferenceInserts.map(
          (insert) => insert.name,
        ),
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
