'use server';

import { redirect } from 'next/navigation';
import { isUnauthenticatedAuthError } from '@/lib/supabase/auth-errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error && !isUnauthenticatedAuthError(error)) {
    throw error;
  }

  redirect('/login');
}
