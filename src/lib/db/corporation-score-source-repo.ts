import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CorporationScoreSourceRow = {
  averageAnimalPoints: number;
  averageAwardPoints: number;
  averageBaseCardPoints: number;
  averageCitiesPoints: number;
  averageGreeneryPoints: number;
  averageJovianPoints: number;
  averageMicrobePoints: number;
  averageMilestonePoints: number;
  averageOtherCardPoints: number;
  averageTotalPoints: number;
  averageTrPoints: number;
  corporationId: string;
  corporationName: string;
  gamesPlayed: number;
  logoPath: string | null;
  winRate: number;
  wins: number;
};

type RawCorporationScoreSourceRow = {
  average_animal_points: number | string;
  average_award_points: number | string;
  average_base_card_points: number | string;
  average_cities_points: number | string;
  average_greenery_points: number | string;
  average_jovian_points: number | string;
  average_microbe_points: number | string;
  average_milestone_points: number | string;
  average_other_card_points: number | string;
  average_total_points: number | string;
  average_tr_points: number | string;
  corporation_id: string;
  corporation_name: string;
  games_played: number;
  logo_path: string | null;
  win_rate: number | string;
  wins: number;
};

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value) || 0;
}

function mapRow(row: RawCorporationScoreSourceRow): CorporationScoreSourceRow {
  return {
    averageAnimalPoints: toNumber(row.average_animal_points),
    averageAwardPoints: toNumber(row.average_award_points),
    averageBaseCardPoints: toNumber(row.average_base_card_points),
    averageCitiesPoints: toNumber(row.average_cities_points),
    averageGreeneryPoints: toNumber(row.average_greenery_points),
    averageJovianPoints: toNumber(row.average_jovian_points),
    averageMicrobePoints: toNumber(row.average_microbe_points),
    averageMilestonePoints: toNumber(row.average_milestone_points),
    averageOtherCardPoints: toNumber(row.average_other_card_points),
    averageTotalPoints: toNumber(row.average_total_points),
    averageTrPoints: toNumber(row.average_tr_points),
    corporationId: row.corporation_id,
    corporationName: row.corporation_name,
    gamesPlayed: row.games_played,
    logoPath: row.logo_path,
    winRate: toNumber(row.win_rate),
    wins: row.wins,
  };
}

export async function listCorporationScoreSources(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema('analytics')
    .from('corporation_score_source_averages')
    .select('*')
    .eq('group_id', groupId)
    .order('games_played', { ascending: false })
    .order('average_total_points', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as RawCorporationScoreSourceRow[] | null) ?? []).map(mapRow);
}
