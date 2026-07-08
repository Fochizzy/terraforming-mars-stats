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

const CATEGORY_TO_CARD_TYPE: Record<string, string> = {
  corporationCards: 'Corporation',
  preludeCards: 'Prelude',
  projectCards: 'Project',
};

const MODULE_TO_EXPANSION: Record<string, { code: string; name: string }> = {
  base: { code: 'base', name: 'Base' },
  'corp era': { code: 'corporate_era', name: 'Corporate Era' },
  colonies: { code: 'colonies', name: 'Colonies' },
  prelude: { code: 'prelude', name: 'Prelude' },
  'prelude 2': { code: 'prelude_2', name: 'Prelude 2' },
  promo: { code: 'promo', name: 'Promo' },
  turmoil: { code: 'turmoil', name: 'Turmoil' },
  venus: { code: 'venus_next', name: 'Venus Next' },
};

type CatalogCardRow = {
  card_name: string;
  card_type: string;
  gameplay_tags: string[] | null;
  id: string;
};

function slugifyName(name: string) {
  return normalizeCardName(name).replace(/\s+/g, '-');
}

function tagsEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    [...left].sort().join('|') === [...right].sort().join('|')
  );
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

  const sourceByKey = new Map<string, TfmCardTagRecord>();
  for (const record of records) {
    const cardType = record.category
      ? CATEGORY_TO_CARD_TYPE[record.category]
      : record.category === null && record.cardType === 'corporation'
        ? 'Corporation'
        : null;
    if (!cardType) {
      continue;
    }
    sourceByKey.set(`${normalizeCardName(record.name)}|${cardType}`, record);
  }

  const { data, error } = await supabase
    .from('cards')
    .select('id, card_name, card_type, gameplay_tags')
    .in('card_type', ['Project', 'Corporation', 'Prelude']);

  if (error) {
    throw error;
  }

  const catalogRows = (data ?? []) as CatalogCardRow[];
  const matchedSourceKeys = new Set<string>();
  const updates: Array<{ id: string; cardName: string; tags: string[] }> = [];
  const unmatchedCatalogCards: string[] = [];

  for (const row of catalogRows) {
    const normalizedName = normalizeCardName(row.card_name);
    const sourceName = CATALOG_NAME_ALIASES[normalizedName] ?? normalizedName;
    const source = sourceByKey.get(`${sourceName}|${row.card_type}`);

    if (!source) {
      unmatchedCatalogCards.push(`${row.card_name} (${row.card_type})`);
      continue;
    }

    matchedSourceKeys.add(`${sourceName}|${row.card_type}`);

    if (!tagsEqual(row.gameplay_tags ?? [], source.tags)) {
      updates.push({ id: row.id, cardName: row.card_name, tags: source.tags });
    }
  }

  const inserts: Array<Record<string, unknown>> = [];
  const skippedNewCards: string[] = [];

  for (const [key, record] of sourceByKey) {
    if (matchedSourceKeys.has(key)) {
      continue;
    }

    const cardType = key.split('|')[1]!;
    const expansion = record.module
      ? MODULE_TO_EXPANSION[record.module.toLowerCase()]
      : undefined;

    if (!expansion) {
      skippedNewCards.push(`${record.name} (${record.module ?? 'unknown module'})`);
      continue;
    }

    inserts.push({
      card_name: record.name,
      card_number: '',
      card_type: cardType,
      expansion_code: expansion.code,
      expansion_name: expansion.name,
      gameplay_tags: record.tags,
      image_url: '',
      source_attribution: TFM_CARDS_SOURCE_URL,
      source_card_id: `tfm:${cardType.toLowerCase()}:${slugifyName(record.name)}`,
      sync_metadata: {
        tfmCategory: record.category,
        tfmModule: record.module,
        tfmNameKey: record.nameKey,
      },
    });
  }

  if (!dryRun) {
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('cards')
        .update({ gameplay_tags: update.tags })
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
        tagUpdates: updates.length,
        updatedCards: updates.map((update) => update.cardName),
        newCardsInserted: inserts.length,
        insertedCards: inserts.map((insert) => insert.card_name),
        newCardsSkipped: skippedNewCards,
        catalogCardsWithoutSourceMatch: unmatchedCatalogCards,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : JSON.stringify(error, null, 2),
  );
  process.exit(1);
});
