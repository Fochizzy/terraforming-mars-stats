import { normalizeUsername } from './username-auth';
import { lookupAuthEmailForUsername } from './username-email-lookup';

export type RequestPinResetStatus = {
  message: string;
  state: 'error' | 'success';
};

export type RequestPinResetResult =
  | {
      ok: true;
      status: RequestPinResetStatus;
    }
  | {
      ok: false;
      status: RequestPinResetStatus;
    };

type Awaitable<T> = PromiseLike<T> | T;

export type RequestPinResetClient = {
  auth: {
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string },
    ): Awaitable<{ error: { message?: string | null } | null }>;
  };
  from(table: 'user_profiles'): {
    select(columns: 'email'): {
      eq(
        column: 'username',
        value: string,
      ): {
        maybeSingle(): Awaitable<{
          data: { email?: string | null } | null;
          error: { message?: string | null } | null;
        }>;
      };
    };
  };
};

const GENERIC_SUCCESS_MESSAGE =
  'If that username is registered, a recovery link has been sent.';

export async function requestPinReset(input: {
  client: RequestPinResetClient;
  emailRedirectTo?: string;
  username: string;
}): Promise<RequestPinResetResult> {
  if (!input.username.trim()) {
    return {
      ok: false,
      status: {
        message: 'Enter your username first.',
        state: 'error',
      },
    };
  }

  if (!normalizeUsername(input.username)) {
    return {
      ok: false,
      status: {
        message: 'Enter a username using letters or numbers.',
        state: 'error',
      },
    };
  }

  try {
    const authEmail = await lookupAuthEmailForUsername({
      client: input.client,
      username: input.username,
    });

    if (authEmail) {
      const { error } = await input.client.auth.resetPasswordForEmail(authEmail, {
        ...(input.emailRedirectTo
          ? { redirectTo: input.emailRedirectTo }
          : {}),
      });

      if (error) {
        console.error('Supabase PIN reset request failed', error);
      }
    }

    return {
      ok: true,
      status: {
        message: GENERIC_SUCCESS_MESSAGE,
        state: 'success',
      },
    };
  } catch (error) {
    console.error('Supabase PIN reset request failed', error);

    return {
      ok: true,
      status: {
        message: GENERIC_SUCCESS_MESSAGE,
        state: 'success',
      },
    };
  }
}
