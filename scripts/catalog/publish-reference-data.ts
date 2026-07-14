import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { NormalizedCardRecord } from '../../src/features/catalog/catalog-record';
import { getPublicEnv } from '../../src/lib/env';
import {
  type CatalogCorporationSeed,
  type CatalogPreludeSeed,
  buildTfmCatalogImportPayload,
  loadTfmCardRecords,
} from './tfm-reference-data';
import { referenceDimensions, type PromoSetSeed } from './reference-data';

type MinimalSupabaseClient = {
  from: (table: string) => any;
};

type ExistingCardImageRow = Pick<
  NormalizedCardRecord,
  'full_image_path' | 'source_card_id' | 'thumbnail_path'
>;

const SUPABASE_PAGE_SIZE = 1000;

for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Env files are optional; shell env can still provide the secret key.
    }
  }
}

function readPromoSetSlug(card: NormalizedCardRecord) {
  const maybeSlug = card.sync_metadata?.promoSetSlug;
  return typeof maybeSlug === 'string' && maybeSlug.length > 0 ? maybeSlug : null;
}

function readRequiredExpansionCodes(card: NormalizedCardRecord) {
  const maybeCodes = card.sync_metadata?.requiredExpansionCodes;
  return Array.isArray(maybeCodes)
    ? maybeCodes.filter((code): code is string => typeof code === 'string')
    : [];
}

async function fetchIdMap(
  supabase: MinimalSupabaseClient,
  table: string,
  keyColumn: string,
) {
  const { data, error } = await supabase.from(table).select(`id, ${keyColumn}`);

  if (error) {
    throw error;
  }

  return new Map(
    (data as Array<Record<string, string>>).map((row) => [row[keyColumn], row.id]),
  );
}

function isRenderableStoredImage(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  if (url.includes('herokuapp.com')) {
    return false;
  }
  return !url.endsWith('/file.svg');
}

async function fetchExistingCardImageMap(supabase: MinimalSupabaseClient) {
  const rows: ExistingCardImageRow[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('cards')
      .select('source_card_id, full_image_path, thumbnail_path')
      .order('source_card_id', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...(((data ?? []) as ExistingCardImageRow[])));
    if (!data || data.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return new Map(rows.map((row) => [row.source_card_id, row]));
}

function mapCorporations(
  corporations: CatalogCorporationSeed[],
  promoSetIdsBySlug: Map<string, string>,
) {
  return corporations.map((corporation) => ({
    code: corporation.code,
    expansion_code: corporation.expansion_code,
    name: corporation.name,
    promo_set_id: corporation.promo_set_slug
      ? promoSetIdsBySlug.get(corporation.promo_set_slug) ?? null
      : null,
    required_expansion_codes: corporation.required_expansion_codes,
  }));
}

function mapPreludes(
  preludes: CatalogPreludeSeed[],
  promoSetIdsBySlug: Map<string, string>,
) {
  return preludes.map((prelude) => ({
    code: prelude.code,
    expansion_code: prelude.expansion_code,
    name: prelude.name,
    promo_set_id: prelude.promo_set_slug
      ? promoSetIdsBySlug.get(prelude.promo_set_slug) ?? null
      : null,
    required_expansion_codes: prelude.required_expansion_codes,
  }));
}

function mapCards(
  cards: NormalizedCardRecord[],
  promoSetIdsBySlug: Map<string, string>,
  existingCardImagesBySourceId: Map<string, ExistingCardImageRow>,
) {
  return cards.map((card) => ({
    ...card,
    full_image_path: isRenderableStoredImage(
      existingCardImagesBySourceId.get(card.source_card_id)?.full_image_path,
    )
      ? (existingCardImagesBySourceId.get(card.source_card_id)
          ?.full_image_path ?? card.full_image_path)
      : card.full_image_path,
    promo_set_id: readPromoSetSlug(card)
      ? promoSetIdsBySlug.get(readPromoSetSlug(card) as string) ?? null
      : null,
    required_expansion_codes: readRequiredExpansionCodes(card),
    thumbnail_path: isRenderableStoredImage(
      existingCardImagesBySourceId.get(card.source_card_id)?.thumbnail_path,
    )
      ? (existingCardImagesBySourceId.get(card.source_card_id)
          ?.thumbnail_path ?? card.thumbnail_path)
      : card.thumbnail_path,
  }));
}

function mapMapMilestones(
  mapIdsByCode: Map<string, string>,
  milestoneIdsByCode: Map<string, string>,
) {
  return referenceDimensions.mapMilestones
    .map((entry) => ({
      map_id: mapIdsByCode.get(entry.mapCode) ?? null,
      milestone_id: milestoneIdsByCode.get(entry.milestoneCode) ?? null,
    }))
    .filter(
      (entry): entry is { map_id: string; milestone_id: string } =>
        Boolean(entry.map_id && entry.milestone_id),
    );
}

function mapMapAwards(
  mapIdsByCode: Map<string, string>,
  awardIdsByCode: Map<string, string>,
) {
  return referenceDimensions.mapAwards
    .map((entry) => ({
      award_id: awardIdsByCode.get(entry.awardCode) ?? null,
      map_id: mapIdsByCode.get(entry.mapCode) ?? null,
    }))
    .filter(
      (entry): entry is { award_id: string; map_id: string } =>
        Boolean(entry.award_id && entry.map_id),
    );
}

export async function publishReferenceData(input: {
  cards?: NormalizedCardRecord[];
  corporations?: CatalogCorporationSeed[];
  preludes?: CatalogPreludeSeed[];
  promoSets?: PromoSetSeed[];
  sourceName?: string;
  sourceVersion?: string;
  supabase: MinimalSupabaseClient;
}) {
  const {
    cards = [],
    corporations = [],
    preludes = [],
    promoSets = [],
    sourceName = 'terraforming-mars-card-browser-publish',
    sourceVersion = new Date().toISOString().slice(0, 10),
    supabase,
  } = input;

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from('catalog_snapshots')
    .insert({
      notes: `Reference publish with ${cards.length} cards, ${corporations.length} corporations, ${preludes.length} preludes, and ${promoSets.length} promo sets.`,
      source_name: sourceName,
      source_version: sourceVersion,
    })
    .select('id')
    .single();

  if (snapshotError) {
    throw snapshotError;
  }

  const upserts: Array<Promise<{ error: Error | null }>> = [
    supabase
      .from('expansions')
      .upsert(referenceDimensions.expansions, { onConflict: 'code' }),
    supabase.from('maps').upsert(referenceDimensions.maps, { onConflict: 'code' }),
    supabase
      .from('style_definitions')
      .upsert(referenceDimensions.styles, { onConflict: 'code' }),
    supabase
      .from('milestones')
      .upsert(referenceDimensions.milestones, { onConflict: 'code' }),
    supabase.from('awards').upsert(referenceDimensions.awards, { onConflict: 'code' }),
  ];

  if (promoSets.length > 0) {
    upserts.push(
      supabase.from('promo_sets').upsert(promoSets, { onConflict: 'slug' }),
    );
  }

  const results = await Promise.all(upserts);
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    throw firstError;
  }

  const [
    promoSetIdsBySlug,
    mapIdsByCode,
    milestoneIdsByCode,
    awardIdsByCode,
    existingCardImagesBySourceId,
  ] = await Promise.all([
    fetchIdMap(supabase, 'promo_sets', 'slug'),
    fetchIdMap(supabase, 'maps', 'code'),
    fetchIdMap(supabase, 'milestones', 'code'),
    fetchIdMap(supabase, 'awards', 'code'),
    cards.length > 0
      ? fetchExistingCardImageMap(supabase)
      : Promise.resolve(new Map<string, ExistingCardImageRow>()),
  ]);

  const relationUpserts: Array<Promise<{ error: Error | null }>> = [];

  if (corporations.length > 0) {
    relationUpserts.push(
      supabase.from('corporations').upsert(mapCorporations(corporations, promoSetIdsBySlug), {
        onConflict: 'code',
      }),
    );
  }

  if (preludes.length > 0) {
    relationUpserts.push(
      supabase.from('preludes').upsert(mapPreludes(preludes, promoSetIdsBySlug), {
        onConflict: 'code',
      }),
    );
  }

  if (cards.length > 0) {
    relationUpserts.push(
      supabase
        .from('cards')
        .upsert(
          mapCards(cards, promoSetIdsBySlug, existingCardImagesBySourceId),
          {
            onConflict: 'source_card_id',
          },
        ),
    );
  }

  relationUpserts.push(
    supabase
      .from('map_milestones')
      .upsert(mapMapMilestones(mapIdsByCode, milestoneIdsByCode), {
        onConflict: 'map_id,milestone_id',
      }),
  );
  relationUpserts.push(
    supabase.from('map_awards').upsert(mapMapAwards(mapIdsByCode, awardIdsByCode), {
      onConflict: 'map_id,award_id',
    }),
  );

  const relationResults = await Promise.all(relationUpserts);
  const relationError = relationResults.find((result) => result.error)?.error;

  if (relationError) {
    throw relationError;
  }

  return {
    cards: cards.length,
    corporations: corporations.length,
    expansions: referenceDimensions.expansions.length,
    maps: referenceDimensions.maps.length,
    milestones: referenceDimensions.milestones.length,
    awards: referenceDimensions.awards.length,
    preludes: preludes.length,
    promoSets: promoSets.length,
    snapshotId: snapshotRow?.id ?? null,
    styles: referenceDimensions.styles.length,
  };
}

async function main() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running catalog:publish.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const importPayload = buildTfmCatalogImportPayload(await loadTfmCardRecords());
  const summary = await publishReferenceData({
    cards: importPayload.cards,
    corporations: importPayload.corporations,
    preludes: importPayload.preludes,
    promoSets: referenceDimensions.promoSets,
    supabase: supabase as unknown as MinimalSupabaseClient,
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.endsWith('publish-reference-data.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
