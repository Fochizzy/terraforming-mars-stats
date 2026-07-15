import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

export function createSupabaseBrowserClient(options?: {
  detectSessionInUrl?: boolean;
}) {
  const publicEnv = getPublicEnv();

  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        detectSessionInUrl: options?.detectSessionInUrl ?? true,
      },
    },
  );
}
