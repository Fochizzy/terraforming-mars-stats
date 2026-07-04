import { createClient } from '@supabase/supabase-js';
import { getPublicEnv, getServerEnv } from '@/lib/env';

export function createSupabaseAdminClient() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for web import group matching.',
    );
  }

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
