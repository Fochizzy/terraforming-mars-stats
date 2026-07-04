import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createUserProfile(input: {
  fullName: string;
  userId: string;
  username: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('user_profiles').insert({
    full_name: input.fullName,
    user_id: input.userId,
    username: input.username,
  });

  if (error) {
    throw error;
  }
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('full_name, last_active_group_id, username')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function setCurrentUserLastActiveGroup(input: {
  groupId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({
      last_active_group_id: input.groupId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId);

  if (error) {
    throw error;
  }
}
