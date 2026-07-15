import { NextResponse } from 'next/server';
import { buildAuthCompletePath, normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import {
  submitUsernameAuth,
  type UsernameAuthClient,
} from '@/features/auth/submit-username-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function readAuthBody(request: Request) {
  try {
    const body = (await request.json()) as {
      nextPath?: unknown;
      pin?: unknown;
      username?: unknown;
    };

    return {
      nextPath: typeof body.nextPath === 'string' ? body.nextPath : '',
      pin: typeof body.pin === 'string' ? body.pin : '',
      username: typeof body.username === 'string' ? body.username : '',
    };
  } catch {
    return {
      nextPath: '',
      pin: '',
      username: '',
    };
  }
}

export async function POST(request: Request) {
  const body = await readAuthBody(request);
  const nextPath = normalizeNextPath(body.nextPath);

  try {
    const supabase = (
      await createSupabaseServerClient()
    ) as unknown as UsernameAuthClient;
    const adminSupabase =
      createSupabaseAdminClient() as unknown as UsernameAuthClient;
    const result = await submitUsernameAuth({
      client: supabase,
      lookupClient: adminSupabase,
      mode: 'sign-in',
      pin: body.pin,
      username: body.username,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      redirectPath: buildAuthCompletePath(nextPath),
    });
  } catch (error) {
    console.error('Username login failed', error);

    return NextResponse.json(
      {
        ok: false,
        status: {
          message: 'Could not complete authentication right now.',
          state: 'error',
        },
      },
      { status: 500 },
    );
  }
}

