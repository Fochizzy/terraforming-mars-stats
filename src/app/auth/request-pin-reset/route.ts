import { NextResponse } from 'next/server';
import {
  buildAuthCallbackUrl,
  buildAuthResetPinPath,
  normalizeNextPath,
} from '@/features/auth/build-auth-callback-url';
import {
  requestPinReset,
  type RequestPinResetClient,
} from '@/features/auth/request-pin-reset';
import { createResendEmailSender } from '@/lib/email/resend';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const GENERIC_SUCCESS_STATUS = {
  message: 'If that username or email is registered, a recovery link has been sent.',
  state: 'success' as const,
};

async function readResetBody(request: Request) {
  try {
    const body = (await request.json()) as {
      nextPath?: unknown;
      username?: unknown;
    };

    return {
      nextPath: typeof body.nextPath === 'string' ? body.nextPath : '',
      username: typeof body.username === 'string' ? body.username : '',
    };
  } catch {
    return {
      nextPath: '',
      username: '',
    };
  }
}

export async function POST(request: Request) {
  const body = await readResetBody(request);
  const nextPath = normalizeNextPath(body.nextPath);

  try {
    const adminSupabase =
      createSupabaseAdminClient() as unknown as RequestPinResetClient;
    const result = await requestPinReset({
      client: adminSupabase,
      emailRedirectTo: buildAuthCallbackUrl(
        new URL(request.url).origin,
        buildAuthResetPinPath(nextPath),
      ),
      emailSender: createResendEmailSender(),
      username: body.username,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error('Username PIN reset request failed', error);

    return NextResponse.json({
      ok: true,
      status: GENERIC_SUCCESS_STATUS,
    });
  }
}
