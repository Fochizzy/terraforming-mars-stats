import { NextResponse } from 'next/server';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function buildRecoveryBridgeHtml(recoveryUrl: string, loginUrl: string) {
  const serializedRecoveryUrl = JSON.stringify(recoveryUrl);
  const serializedLoginUrl = JSON.stringify(loginUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Completing recovery</title>
  </head>
  <body>
    <p>Completing your secure PIN recovery…</p>
    <script>
      (() => {
        const hash = window.location.hash || '';
        const params = new URLSearchParams(
          hash.startsWith('#') ? hash.slice(1) : hash,
        );

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const recoveryType = params.get('type');

        if (
          recoveryType === 'recovery' &&
          accessToken &&
          refreshToken
        ) {
          window.location.replace(${serializedRecoveryUrl} + hash);
          return;
        }

        const loginUrl = new URL(${serializedLoginUrl});
        loginUrl.searchParams.set(
          'error',
          params.get('error_description') ||
            'Email link is invalid or has expired',
        );
        window.location.replace(loginUrl.toString());
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  const loginUrl = new URL('/login', requestUrl.origin);
  const recoveryUrl = new URL(nextPath, requestUrl.origin);

  return new Response(
    buildRecoveryBridgeHtml(recoveryUrl.toString(), loginUrl.toString()),
    {
      headers: {
        'cache-control': 'no-store',
        'content-security-policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
        'content-type': 'text/html; charset=utf-8',
      },
    },
  );
}
