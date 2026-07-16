import { getCurrentGroupContext, type CurrentGroupContext } from './group-context-repo';
import { getUserProfile, setCurrentUserLastActiveGroup } from './user-profile-repo';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const LOG_GAME_PLACEHOLDER_GROUP_ID =
  '00000000-0000-4000-8000-000000000000';

function pickPersonalDisplayName(input: {
  email?: string | null;
  profile:
    | {
        full_name?: string | null;
        username?: string | null;
      }
    | null;
}) {
  const fullName = input.profile?.full_name?.trim();

  if (fullName) {
    return fullName;
  }

  const username = input.profile?.username?.trim();

  if (username) {
    return username;
  }

  const emailName = input.email?.split('@')[0]?.trim();

  if (emailName) {
    return emailName;
  }

  return 'My';
}

export async function ensureLogGameGroupContext(): Promise<CurrentGroupContext> {
  const existingContext = await getCurrentGroupContext();

  if (existingContext) {
    return existingContext;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No signed-in user found for game logging.');
  }

  const profile = await getUserProfile(user.id);
  const displayName = pickPersonalDisplayName({
    email: user.email,
    profile,
  });
  const admin = createSupabaseAdminClient();
  const { data: group, error: groupError } = await admin
    .from('groups')
    .insert({
      name: `${displayName} Group`,
    })
    .select('id, name')
    .single();

  if (groupError) {
    throw groupError;
  }

  const { error: membershipError } = await admin.from('group_members').upsert(
    [
      {
        group_id: group.id,
        role: 'owner' as const,
        user_id: user.id,
      },
    ],
    {
      ignoreDuplicates: false,
      onConflict: 'group_id,user_id',
    },
  );

  if (membershipError) {
    throw membershipError;
  }

  const { error: settingsError } = await admin.from('group_settings').upsert({
    default_map_id: null,
    global_analytics_enabled: false,
    group_id: group.id,
  });

  if (settingsError) {
    throw settingsError;
  }

  const { error: playerError } = await admin.from('players').insert({
    display_name: displayName,
    group_id: group.id,
    linked_user_id: user.id,
  });

  if (playerError) {
    throw playerError;
  }

  await setCurrentUserLastActiveGroup({
    groupId: group.id,
    userId: user.id,
  });

  return {
    groupId: group.id,
    groupName: group.name,
    role: 'owner',
    userId: user.id,
  };
}
