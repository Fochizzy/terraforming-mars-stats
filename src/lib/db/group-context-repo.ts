import { createSupabaseServerClient } from '@/lib/supabase/server';
import { setCurrentUserLastActiveGroup } from './user-profile-repo';

export type CurrentGroupContext = {
  userId: string;
  groupId: string;
  groupName: string;
  role: 'owner' | 'editor' | 'viewer';
};

export type CurrentUserGroup = {
  groupId: string;
  groupName: string;
  role: 'owner' | 'editor' | 'viewer';
};

function getJoinedGroupName(value: unknown) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  if ('name' in value && typeof value.name === 'string') {
    return value.name;
  }

  return '';
}

function isMissingAuthSessionError(error: unknown) {
  const namedError =
    error && typeof error === 'object' && 'name' in error
      ? (error as { name?: unknown })
      : null;

  return (
    namedError !== null &&
    namedError.name === 'AuthSessionMissingError'
  );
}

export async function listCurrentUserGroups(): Promise<CurrentUserGroup[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isMissingAuthSessionError(userError)) {
    throw userError;
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, groups(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    groupId: membership.group_id,
    groupName: getJoinedGroupName(membership.groups),
    role: membership.role,
  }));
}

export async function getCurrentGroupContext(): Promise<CurrentGroupContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isMissingAuthSessionError(userError)) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('last_active_group_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const memberships = await listCurrentUserGroups();

  if (memberships.length === 0) {
    return null;
  }

  const membership =
    memberships.find(
      (candidate) => candidate.groupId === profile?.last_active_group_id,
    ) ?? memberships[0];

  if (!membership) {
    return null;
  }

  if (profile && profile.last_active_group_id !== membership.groupId) {
    await setCurrentUserLastActiveGroup({
      groupId: membership.groupId,
      userId: user.id,
    });
  }

  return {
    groupId: membership.groupId,
    groupName: membership.groupName,
    role: membership.role,
    userId: user.id,
  };
}

export async function requireCurrentGroupContext() {
  const context = await getCurrentGroupContext();

  if (!context) {
    throw new Error('No group membership found for the signed-in user.');
  }

  return context;
}
