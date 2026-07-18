import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildPublicPlayerNameMap,
  getPublicPlayerNames,
  PRIVACY_SAFE_PLAYER_FALLBACK,
} from './public-player-name-repo';

export type FinalTerraformingActionScope = 'global' | 'group' | 'personal';

export type FinalTerraformingActionStat = {
  final_action_games: number;
  final_action_rate: number;
  final_action_win_rate: number | null;
  final_action_wins: number;
  imported_games: number;
  most_common_action_count: number | null;
  most_common_action_type: string | null;
  overall_win_rate: number | null;
  overall_wins: number;
  player_id: string;
  player_name: string;
  win_rate_delta: number | null;
};

export async function getFinalTerraformingActionStats(input: {
  groupId?: string;
  scope: FinalTerraformingActionScope;
}): Promise<FinalTerraformingActionStat[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'get_final_terraforming_action_stats',
    {
      scope: input.scope,
      target_group_id: input.groupId ?? null,
    },
  );

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? (data as FinalTerraformingActionStat[]) : [];
  const publicNameByPlayerId = buildPublicPlayerNameMap(
    await getPublicPlayerNames(rows.map((row) => row.player_id)),
  );

  return rows.map((row) => ({
    ...row,
    player_name:
      publicNameByPlayerId.get(row.player_id) ??
      PRIVACY_SAFE_PLAYER_FALLBACK,
  }));
}
