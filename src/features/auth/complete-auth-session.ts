import {
  buildAuthCompleteClaimPath,
  normalizeNextPath,
} from './build-auth-callback-url';
import {
  normalizeUsername,
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
      ? normalizeUsername(user.user_metadata.username)
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

  const resolvedNextPath = normalizeNextPath(input.nextPath);

  if (resolvedNextPath.startsWith('/auth/reset-pin')) {
    return {
      redirectPath: resolvedNextPath,
    };
  }

  const existingContext = await getCurrentGroupContext();

  if (existingContext) {
    return {
      redirectPath: resolvedNextPath,
    };
  }

  let claimResult: Awaited<ReturnType<typeof resolveSavedPlayerAutoClaim>>;

  try {
    claimResult = await resolveSavedPlayerAutoClaim();
  } catch (error) {
    // The claim RPCs can fail for reasons outside the signed-in user's
    // control (e.g. a missing grant, a transient outage). That must not
    // block sign-in completion itself -- fall through to the same manual
    // claim page a genuine "no candidates" result already sends new
    // no-group users to, and log the real cause server-side so an
    // unavailable RPC stays distinguishable from an honest empty result.
    console.error(
      'resolveSavedPlayerAutoClaim failed during auth completion; routing to manual claim instead of crashing.',
      error,
    );

    return {
      redirectPath: buildAuthCompleteClaimPath(resolvedNextPath),
    };
  }

  if (claimResult.status === 'claimed-and-joined') {
    return {
      redirectPath: resolvedNextPath,
    };
  }

  return {
    redirectPath: buildAuthCompleteClaimPath(resolvedNextPath),
  };
}
