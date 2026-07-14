import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getHiddenGroupInsightPlayerIds(input: { groupId: string; userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('user_hidden_group_insight_players')
    .select('canonical_player_id').eq('user_id', input.userId).eq('group_id', input.groupId);
  if (error) throw error;
  return (data ?? []).map((row) => String(row.canonical_player_id));
}

export async function setHiddenGroupInsightPlayer(input: { canonicalPlayerId: string; groupId: string; hidden: boolean; userId: string }) {
  const supabase = await createSupabaseServerClient();
  const query = input.hidden
    ? supabase.from('user_hidden_group_insight_players').upsert({ canonical_player_id: input.canonicalPlayerId, group_id: input.groupId, user_id: input.userId }, { onConflict: 'user_id,group_id,canonical_player_id' })
    : supabase.from('user_hidden_group_insight_players').delete().eq('user_id', input.userId).eq('group_id', input.groupId).eq('canonical_player_id', input.canonicalPlayerId);
  const { error } = await query;
  if (error) throw error;
}
