import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id')
    .eq('group_id', groupId)
    .order('display_name');

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertPlayer(input: {
  id?: string;
  group_id: string;
  display_name: string;
  linked_user_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .upsert(input)
    .select('id, display_name')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
