import {
  buildAuthCompleteClaimPath,
  normalizeNextPath,
} from './build-auth-callback-url';
import {
  signupFullNameSchema,
} from './username-auth';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { resolveSavedPlayerAutoClaim } from '@/lib/db/player-claim-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function completeAuthSession(input: { nextPath: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      redirectPath: '/login?error=auth_callback',
    };
  }

  const parsedFullName = signupFullNameSchema.safeParse(
    user.user_metadata?.full_name,
  );
  const username =
    typeof user.user_metadata?.username === 'string'
      ? user.user_metadata.username.trim()
      : '';

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  if (!existingProfile && parsedFullName.success && username) {
    const baseProfile = {
      full_name: parsedFullName.data,
      user_id: user.id,
      username,
    };
    const { error: profileInsertError } = await supabase.from('user_profiles').insert({
      ...baseProfile,
      email: user.email?.trim().toLowerCase() ?? null,
    });

    if (
      profileInsertError &&
      !(
        profileInsertError.code === 'PGRST204' &&
        profileInsertError.message?.includes("'email' column")
      )
    ) {
      throw profileInsertError;
    }

    if (profileInsertError) {
      const { error: fallbackProfileInsertError } = await supabase
        .from('user_profiles')
        .insert(baseProfile);

      if (fallbackProfileInsertError) {
        throw fallbackProfileInsertError;
      }
    }
  }

  const existingContext = await getCurrentGroupContext();

  if (existingContext) {
    return {
      redirectPath: normalizeNextPath(input.nextPath),
    };
  }

  const claimResult = await resolveSavedPlayerAutoClaim();

  if (claimResult.status === 'claimed-and-joined') {
    return {
      redirectPath: normalizeNextPath(input.nextPath),
    };
  }

  return {
    redirectPath: buildAuthCompleteClaimPath(input.nextPath),
  };
}
