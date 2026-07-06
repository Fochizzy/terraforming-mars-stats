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

const SYNTHETIC_AUTH_EMAIL_DOMAIN = 'users.tmstats.local';

function getUsernameFromSyntheticAuthEmail(email: string | null | undefined) {
  if (!email) {
    return '';
  }

  const [localPart, domain] = email.split('@');

  if (!localPart || domain !== SYNTHETIC_AUTH_EMAIL_DOMAIN) {
    return '';
  }

  return normalizeUsername(localPart);
}

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

  const username = getUsernameFromSyntheticAuthEmail(user.email);
  const parsedFullName = signupFullNameSchema.safeParse(
    user.user_metadata?.full_name,
  );

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  if (!existingProfile && parsedFullName.success && username) {
    const { error: profileInsertError } = await supabase.from('user_profiles').insert({
      full_name: parsedFullName.data,
      user_id: user.id,
      username,
    });

    if (profileInsertError) {
      throw profileInsertError;
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
