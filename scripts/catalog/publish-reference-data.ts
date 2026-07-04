import { createClient } from '@supabase/supabase-js';
import type { NormalizedCardRecord } from '../../src/features/catalog/catalog-record';
import { referenceDimensions } from './reference-data';

type PromoSetSeed = {
  display_name: string;
  display_order: number;
  edition_label: string;
  promo_year: number | null;
  slug: string;
  source_attribution: string;
};

type CorporationSeed = {
  code: string;
  expansion_code: string;
  name: string;
  promo_set_id?: string | null;
};

type PreludeSeed = {
  code: string;
  expansion_code: string;
  name: string;
};

type MinimalSupabaseClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    };
    upsert: (
      values: Record<string, unknown>[] | Record<string, unknown>,
      options?: {
        onConflict?: string;
      },
    ) => Promise<{ error: Error | null }>;
  };
};

export async function publishReferenceData(input: {
  cards?: NormalizedCardRecord[];
  corporations?: CorporationSeed[];
  preludes?: PreludeSeed[];
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
    sourceName = 'tm-hadronikle-reference-publish',
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
  ];

  if (promoSets.length > 0) {
    upserts.push(
      supabase.from('promo_sets').upsert(promoSets, { onConflict: 'slug' }),
    );
  }

  if (corporations.length > 0) {
    upserts.push(
      supabase.from('corporations').upsert(corporations, { onConflict: 'code' }),
    );
  }

  if (preludes.length > 0) {
    upserts.push(supabase.from('preludes').upsert(preludes, { onConflict: 'code' }));
  }

  if (cards.length > 0) {
    upserts.push(
      supabase.from('cards').upsert(cards, { onConflict: 'source_card_id' }),
    );
  }

  const results = await Promise.all(upserts);
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    throw firstError;
  }

  return {
    cards: cards.length,
    corporations: corporations.length,
    expansions: referenceDimensions.expansions.length,
    maps: referenceDimensions.maps.length,
    preludes: preludes.length,
    promoSets: promoSets.length,
    snapshotId: snapshotRow?.id ?? null,
    styles: referenceDimensions.styles.length,
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running catalog:publish.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const summary = await publishReferenceData({
    supabase: supabase as unknown as MinimalSupabaseClient,
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.endsWith('publish-reference-data.ts')) {
  void main();
}
