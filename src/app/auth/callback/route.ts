import { NextResponse } from 'next/server';
import {
  buildAuthCompletePath,
  normalizeNextPath,
} from '@/features/auth/build-auth-callback-url';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(
          new URL(buildAuthCompletePath(nextPath), requestUrl.origin),
        );
      }
    } catch (error) {
      console.error('Supabase auth callback failed', error);
    }
  }

  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'auth_callback');
  return NextResponse.redirect(loginUrl);
}
