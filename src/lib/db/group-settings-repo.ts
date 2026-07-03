import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getGroupSettings(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('group_settings')
    .select('*')
    .eq('group_id', groupId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveGroupSettings(input: {
  group_id: string;
  global_analytics_enabled: boolean;
  default_map_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('group_settings')
    .upsert(input)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
