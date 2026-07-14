import { resolvePlayerLabelsInRows } from '@/lib/db/player-label-resolution';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SelectionStatRow = {
  avg_placement: number;
  first_place_finishes: number;
  second_place_finishes: number;
  third_plus_finishes: number;
  avg_animal_points: number;
  avg_award_points: number;
  avg_awards_won: number;
  avg_card_points: number;
  avg_cities_points: number;
  avg_greenery_points: number;
  avg_jovian_points: number;
  avg_microbe_points: number;
  avg_milestone_points: number;
  avg_milestones_won: number;
  avg_points: number;
  avg_tr_points: number;
  plays: number;
  win_rate: number;
};

export type CorporationSelectionStat = SelectionStatRow & {
  corporation_name: string;
};

export type PreludeSelectionStat = SelectionStatRow & {
  prelude_name: string;
};

export type SelectionPairStat = {
  avg_points: number;
  corporation_name: string;
  plays: number;
  prelude_name: string;
  win_rate: number;
};

export type CorporationTagStat = {
  avg_tag_count: number;
  corporation_name: string;
  tag_code: string;
};

export type AwardFundingStat = {
  award_name: string;
  funded_count: number;
  funder_won_count: number;
};

export type CardWinStat = {
  card_name: string;
  plays: number;
  win_rate_when_played: number;
};

export type CardImageMeta = {
  fullImageUrl: string | null;
  id: string;
  thumbnailUrl: string | null;
};

export type TagWinStat = {
  avg_tags_in_losses: number | null;
  avg_tags_in_wins: number | null;
  samples: number;
  tag_code: string;
};

export type SelectionStats = {
  awardFunding: AwardFundingStat[];
  baselineWinRate: number;
  cards: CardWinStat[];
  corporations: CorporationSelectionStat[];
  corporationTags: CorporationTagStat[];
  pairs: SelectionPairStat[];
  preludes: PreludeSelectionStat[];
  tagWins: TagWinStat[];
  /** Distinct finalized games in this scope; the denominator for playrate. */
  totalGames: number;
};

export type HeadToHeadPair = {
  avg_margin: number;
  games: number;
  player_a: string;
  player_a_id: string;
  player_a_wins: number;
  player_b: string;
  player_b_id: string;
  player_b_wins: number;
};

export type CorporationMatchup = {
  corporation_a: string;
  corporation_a_wins: number;
  corporation_b: string;
  corporation_b_wins: number;
  games: number;
};

export type HeadToHeadStats = {
  corporationMatchups: CorporationMatchup[];
  pairs: HeadToHeadPair[];
};

export type MergerImpactStat = {
  imported_games: number;
  merger_games: number;
  merger_play_rate: number;
  merger_win_rate: number | null;
  merger_wins: number;
  non_merger_games: number;
  non_merger_win_rate: number | null;
  non_merger_wins: number;
  player_id: string;
  player_name: string;
  win_rate_delta: number | null;
};

export type SelectionStatsScope = 'global' | 'personal';

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function getSelectionStats(
  scope: SelectionStatsScope,
): Promise<SelectionStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_selection_stats', {
    scope,
  });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    awardFunding: readArray(payload.awardFunding),
    baselineWinRate:
      typeof payload.baselineWinRate === 'number' ? payload.baselineWinRate : 0,
    cards: readArray(payload.cards),
    corporations: readArray(payload.corporations),
    corporationTags: readArray(payload.corporationTags),
    pairs: readArray(payload.pairs),
    preludes: readArray(payload.preludes),
    tagWins: readArray(payload.tagWins),
    totalGames:
      typeof payload.totalGames === 'number' ? payload.totalGames : 0,
  };
}

// The global card win stats carry only names, so the Global Statistics page
// looks up catalog id + art by name to let each loss-correlated card open its
// stats dialog. Image URLs mirror the analytics views' coalesce order. First
// row wins per name; a couple of cards sharing a name resolve to one entry.
export async function getCardImageMetaByNames(
  cardNames: string[],
): Promise<Map<string, CardImageMeta>> {
  const uniqueNames = [...new Set(cardNames)];

  if (uniqueNames.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id, card_name, full_image_path, thumbnail_path, image_url')
    .in('card_name', uniqueNames);

  if (error) {
    throw error;
  }

  const meta = new Map<string, CardImageMeta>();

  for (const row of (data ?? []) as Array<{
    card_name: string;
    full_image_path: string | null;
    id: string;
    image_url: string | null;
    thumbnail_path: string | null;
  }>) {
    if (meta.has(row.card_name)) {
      continue;
    }

    meta.set(row.card_name, {
      fullImageUrl: row.full_image_path ?? row.image_url ?? null,
      id: row.id,
      thumbnailUrl:
        row.thumbnail_path ?? row.full_image_path ?? row.image_url ?? null,
    });
  }

  return meta;
}

export type SelectionWinScope = {
  plays: number;
  winRate: number;
};

export type SelectionDialogEntry = {
  global: SelectionWinScope | null;
  personal: SelectionWinScope | null;
};

export type SelectionDialogData = {
  cardMetaByName: Map<string, CardImageMeta>;
  corporationWinRates: Map<string, SelectionDialogEntry>;
  preludeWinRates: Map<string, SelectionDialogEntry>;
};

function indexWinScope(
  personalRows: Array<{ name: string; plays: number; win_rate: number }>,
  globalRows: Array<{ name: string; plays: number; win_rate: number }>,
): Map<string, SelectionDialogEntry> {
  const entries = new Map<string, SelectionDialogEntry>();
  const ensure = (name: string) =>
    entries.get(name) ?? { global: null, personal: null };

  for (const row of globalRows) {
    const entry = ensure(row.name);
    entry.global = { plays: row.plays, winRate: row.win_rate };
    entries.set(row.name, entry);
  }

  for (const row of personalRows) {
    const entry = ensure(row.name);
    entry.personal = { plays: row.plays, winRate: row.win_rate };
    entries.set(row.name, entry);
  }

  return entries;
}

/**
 * Assemble everything a corporation/prelude click-through needs: the catalog art
 * (corps and preludes live in the `cards` table alongside project cards) plus
 * each one's personal and global win rate, drawn from the already-loaded
 * selection stats so no extra RPC is needed.
 */
export async function getSelectionDialogData(
  personal: SelectionStats,
  global: SelectionStats,
): Promise<SelectionDialogData> {
  const names = [
    ...new Set([
      ...global.corporations.map((row) => row.corporation_name),
      ...personal.corporations.map((row) => row.corporation_name),
      ...global.preludes.map((row) => row.prelude_name),
      ...personal.preludes.map((row) => row.prelude_name),
    ]),
  ];

  const cardMetaByName = await getCardImageMetaByNames(names);

  return {
    cardMetaByName,
    corporationWinRates: indexWinScope(
      personal.corporations.map((row) => ({
        name: row.corporation_name,
        plays: row.plays,
        win_rate: row.win_rate,
      })),
      global.corporations.map((row) => ({
        name: row.corporation_name,
        plays: row.plays,
        win_rate: row.win_rate,
      })),
    ),
    preludeWinRates: indexWinScope(
      personal.preludes.map((row) => ({
        name: row.prelude_name,
        plays: row.plays,
        win_rate: row.win_rate,
      })),
      global.preludes.map((row) => ({
        name: row.prelude_name,
        plays: row.plays,
        win_rate: row.win_rate,
      })),
    ),
  };
}

export async function getHeadToHeadStats(
  groupId: string,
): Promise<HeadToHeadStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_head_to_head_stats', {
    target_group_id: groupId,
  });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  const pairs = await resolvePlayerLabelsInRows(
    supabase,
    readArray<HeadToHeadPair>(payload.pairs),
    [
      ['player_a_id', 'player_a'],
      ['player_b_id', 'player_b'],
    ],
  );

  return {
    corporationMatchups: readArray(payload.corporationMatchups),
    pairs,
  };
}

export async function getMergerImpactStats(
  groupId: string,
): Promise<MergerImpactStat[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_merger_impact_stats', {
    target_group_id: groupId,
  });

  if (error) {
    throw error;
  }

  return resolvePlayerLabelsInRows(supabase, readArray<MergerImpactStat>(data));
}
