import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CurrentGroupContext = {
  userId: string;
  groupId: string;
  groupName: string;
  role: 'owner' | 'editor' | 'viewer';
};

export async function getCurrentGroupContext(): Promise<CurrentGroupContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  // Until multi-group switching exists, use the earliest group membership.
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return null;
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('name')
    .eq('id', membership.group_id)
    .single();

  if (groupError) {
    throw groupError;
  }

  return {
    userId: user.id,
    groupId: membership.group_id,
    groupName: group.name,
    role: membership.role,
  };
}

export async function requireCurrentGroupContext() {
  const context = await getCurrentGroupContext();

  if (!context) {
    throw new Error('No group membership found for the signed-in user.');
  }

  return context;
}
