import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://qjtwgrjjwnqafbvkkfex.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = 'izzy.hodnett@gmail.com';
const TARGET_USERNAME = 'fochizzy';

function isMissingEmailColumnError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';

  return (
    ('code' in error && error.code === 'PGRST204') ||
    (message.includes('email') && message.includes('column'))
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    'Set SUPABASE_SERVICE_ROLE_KEY before running backfill:fochizzy-email.',
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: profile, error: profileError } = await supabase
  .from('user_profiles')
  .select('full_name, user_id, username')
  .ilike('username', TARGET_USERNAME)
  .maybeSingle();

if (profileError) {
  throw profileError;
}

if (!profile) {
  throw new Error(`Could not find user_profiles row for ${TARGET_USERNAME}.`);
}

const { data: authUserResult, error: authUserError } =
  await supabase.auth.admin.getUserById(profile.user_id);

if (authUserError) {
  throw authUserError;
}

const mergedMetadata = {
  ...(authUserResult.user?.user_metadata ?? {}),
  full_name: profile.full_name,
  username: profile.username,
};

const { error: profileUpdateError } = await supabase
  .from('user_profiles')
  .update({
    email: TARGET_EMAIL,
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', profile.user_id);

if (profileUpdateError && !isMissingEmailColumnError(profileUpdateError)) {
  throw profileUpdateError;
}

if (profileUpdateError) {
  console.warn(
    'Skipped user_profiles.email backfill because the live column is not available yet.',
  );
}

const { data: updatedUserResult, error: updateUserError } =
  await supabase.auth.admin.updateUserById(profile.user_id, {
    email: TARGET_EMAIL,
    email_confirm: true,
    user_metadata: mergedMetadata,
  });

if (updateUserError) {
  throw updateUserError;
}

console.log(
  JSON.stringify(
    {
      email: updatedUserResult.user?.email ?? TARGET_EMAIL,
      userId: profile.user_id,
      username: profile.username,
    },
    null,
    2,
  ),
);
