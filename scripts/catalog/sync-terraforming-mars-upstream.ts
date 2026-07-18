import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TERRAFORMING_MARS_TILE_TYPES } from '../../src/lib/imports/terraforming-mars-tile-types';
import {
  fetchTerraformingMarsCardManifest,
  normalizeUpstreamCard,
  TERRAFORMING_MARS_SOURCE_ATTRIBUTION,
  type UpstreamCardManifestRecord,
} from './terraforming-mars-upstream';

const TILE_SOURCE_COMMIT = '7a6f98f09ac2a558969c092d317c313806af7b73';
const TILE_SOURCE_URL =
  `https://github.com/terraforming-mars/terraforming-mars/tree/${TILE_SOURCE_COMMIT}`;

type ExistingCardMetadata = {
  card_name: string;
  source_card_id: string;
  sync_metadata: Record<string, unknown> | null;
};

function chunks<T>(values: T[], size: number) {
  return Array.from(
    { length: Math.ceil(values.length / size) },
    (_, index) => values.slice(index * size, (index + 1) * size),
  );
}

function normalizeCardName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildUpstreamCardRows(input: {
  existingCards?: ExistingCardMetadata[];
  fetchedAt: string;
  manifest: UpstreamCardManifestRecord[];
}) {
  const existingCards = input.existingCards ?? [];
  const existingBySourceId = new Map(
    existingCards.map((card) => [card.source_card_id, card]),
  );
  const existingByName = new Map<string, ExistingCardMetadata[]>();
  for (const card of existingCards) {
    const key = normalizeCardName(card.card_name);
    existingByName.set(key, [...(existingByName.get(key) ?? []), card]);
  }

  return input.manifest.map((card) => {
    const normalized = normalizeUpstreamCard(card);
    const nameMatches = existingByName.get(normalizeCardName(normalized.card_name)) ?? [];
    const existing =
      existingBySourceId.get(normalized.source_card_id) ??
      (nameMatches.length === 1 ? nameMatches[0] : undefined);
    return {
      ...normalized,
      last_synced_at: input.fetchedAt,
      source_card_id: existing?.source_card_id ?? normalized.source_card_id,
      sync_metadata: {
        ...(existing?.sync_metadata ?? {}),
        upstream: {
          ...(normalized.sync_metadata.upstream as Record<string, unknown>),
          canonicalSourceCardId: normalized.source_card_id,
          fetchedAt: input.fetchedAt,
        },
      },
    };
  });
}

export function buildUpstreamTileRows(fetchedAt: string) {
  return TERRAFORMING_MARS_TILE_TYPES.map((tile, sourceTileId) => ({
    source_tile_id: sourceTileId,
    board: tile.board,
    canonical_code: tile.canonicalCode,
    canonical_name: tile.canonicalName,
    counts_as_city: tile.countsAsCity,
    counts_as_greenery: tile.countsAsGreenery,
    counts_as_ocean: tile.countsAsOcean,
    is_hazard: tile.isHazard,
    kind: tile.kind,
    last_synced_at: fetchedAt,
    source_attribution: TILE_SOURCE_URL,
    source_version: TILE_SOURCE_COMMIT,
    sync_metadata: { upstreamDefinition: tile },
  }));
}

async function listExistingCardMetadata(supabase: SupabaseClient) {
  const rows: ExistingCardMetadata[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('cards')
      .select('card_name, source_card_id, sync_metadata')
      .eq('is_catalog_visible', true)
      .range(start, start + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as ExistingCardMetadata[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function upsertBatches(
  supabase: SupabaseClient,
  table: string,
  values: Array<Record<string, unknown>>,
  onConflict: string,
) {
  for (const batch of chunks(values, 200)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
  }
}

export async function syncTerraformingMarsUpstream(input: {
  publish: boolean;
  supabase?: SupabaseClient;
}) {
  const fetchedAt = new Date().toISOString();
  const manifest = await fetchTerraformingMarsCardManifest();
  const tileRows = buildUpstreamTileRows(fetchedAt);

  if (!input.publish) {
    return {
      cardsDiscovered: manifest.length,
      mode: 'dry-run' as const,
      tilesDiscovered: tileRows.length,
    };
  }
  if (!input.supabase) throw new Error('A Supabase client is required to publish.');

  const existingCards = await listExistingCardMetadata(input.supabase);
  const cardRows = buildUpstreamCardRows({ existingCards, fetchedAt, manifest });
  await upsertBatches(
    input.supabase,
    'cards',
    cardRows as Array<Record<string, unknown>>,
    'source_card_id',
  );
  await upsertBatches(
    input.supabase,
    'terraforming_mars_tile_types',
    tileRows,
    'canonical_code',
  );

  const { data: snapshot, error: snapshotError } = await input.supabase
    .from('catalog_snapshots')
    .insert({
      notes: `Automatic upstream sync stored ${cardRows.length} card records and ${tileRows.length} tile definitions. Existing records absent upstream were retained for review.`,
      source_name: 'terraforming-mars.herokuapp.com',
      source_version: fetchedAt,
    })
    .select('id')
    .single();
  if (snapshotError) throw snapshotError;

  return {
    cardsDiscovered: cardRows.length,
    existingCardsExamined: existingCards.length,
    mode: 'published' as const,
    snapshotId: snapshot?.id ?? null,
    tilesDiscovered: tileRows.length,
  };
}

async function main() {
  const publish = process.argv.includes('--publish');
  let supabase: SupabaseClient | undefined;
  if (publish) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Publishing requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  const result = await syncTerraformingMarsUpstream({ publish, supabase });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.endsWith('sync-terraforming-mars-upstream.ts')) {
  void main();
}

export { TERRAFORMING_MARS_SOURCE_ATTRIBUTION, TILE_SOURCE_COMMIT, TILE_SOURCE_URL };
