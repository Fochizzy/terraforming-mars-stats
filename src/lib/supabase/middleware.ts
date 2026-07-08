import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getPublicEnv } from '@/lib/env';
import { isUnauthenticatedAuthError } from './auth-errors';

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const publicEnv = getPublicEnv();

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    const { error } = await supabase.auth.getUser();

    if (error && !isUnauthenticatedAuthError(error)) {
      throw error;
    }
  } catch (error) {
    if (!isUnauthenticatedAuthError(error)) {
      throw error;
    }
  }

  return response;
}
