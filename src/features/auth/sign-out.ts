'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isMissingAuthSessionError(error: unknown) {
  const namedError =
    error && typeof error === 'object' && 'name' in error
      ? (error as { name?: unknown })
      : null;

  return namedError !== null && namedError.name === 'AuthSessionMissingError';
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error && !isMissingAuthSessionError(error)) {
    throw error;
  }

  redirect('/login');
}
