import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function refreshGameMetricSnapshots(gameId: string) {
  const normalizedGameId = gameId.trim();

  if (!normalizedGameId) {
    throw new Error('Game id is required to refresh metric snapshots.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('refresh_game_metric_snapshots', {
    p_game_id: normalizedGameId,
  });

  if (error) {
    throw error;
  }
}
