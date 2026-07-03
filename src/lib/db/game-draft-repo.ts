import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createDraftGame(payload: {
  group_id: string;
  played_on: string;
  map_id: string;
  player_count: number;
  generation_count: number;
  created_by_user_id: string;
  updated_by_user_id: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('games')
    .insert({ ...payload, status: 'draft' })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveDraftSnapshot(
  gameId: string,
  payload: Record<string, unknown>,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('game_revisions').insert({
    game_id: gameId,
    revision_note: 'Draft autosave',
    snapshot: payload,
  });

  if (error) {
    throw error;
  }
}
