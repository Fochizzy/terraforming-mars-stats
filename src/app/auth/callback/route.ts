import { NextResponse } from 'next/server';
import {
  buildAuthCompletePath,
  buildAuthResetPinPath,
  normalizeNextPath,
} from '@/features/auth/build-auth-callback-url';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  function buildSuccessPath() {
    if (type === 'recovery') {
      return buildAuthResetPinPath(nextPath);
    }

    return buildAuthCompletePath(nextPath);
  }

  if (code || (tokenHash && type === 'recovery')) {
    try {
      const supabase = await createSupabaseServerClient();
      const authResult = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({
            token_hash: tokenHash!,
            type: 'recovery',
          });

      if (!authResult.error) {
        return NextResponse.redirect(
          new URL(buildSuccessPath(), requestUrl.origin),
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
