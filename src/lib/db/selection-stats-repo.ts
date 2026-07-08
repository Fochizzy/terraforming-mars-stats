import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SelectionStatRow = {
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

export type SelectionStats = {
  corporations: CorporationSelectionStat[];
  corporationTags: CorporationTagStat[];
  pairs: SelectionPairStat[];
  preludes: PreludeSelectionStat[];
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
    corporations: readArray(payload.corporations),
    corporationTags: readArray(payload.corporationTags),
    pairs: readArray(payload.pairs),
    preludes: readArray(payload.preludes),
  };
}
