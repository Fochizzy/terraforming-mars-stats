import {
  authEmailSchema,
  normalizeUsername,
  pinSchema,
  signInPinSchema,
  signupFullNameSchema,
} from './username-auth';
import { ZodError } from 'zod';
import { lookupAuthEmailForUsername } from './username-email-lookup';

export type UsernameAuthMode = 'sign-in' | 'sign-up';

export type UsernameAuthStatus = {
  message: string;
  state: 'error' | 'success';
};

export type UsernameAuthResult =
  | {
      action: 'signed-in';
      ok: true;
    }
  | {
      action: 'awaiting-email';
      ok: true;
      status: UsernameAuthStatus;
    }
  | {
      focusField?: 'username';
      nextMode?: UsernameAuthMode;
      ok: false;
      status: UsernameAuthStatus;
    };

type Awaitable<T> = PromiseLike<T> | T;

type SignupResponse = {
  data: {
    session: unknown;
    user: { id: string; identities?: unknown[] | null } | null;
  };
  error: { message?: string | null } | null;
};

export type UsernameAuthClient = {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Awaitable<{ error: unknown | null }>;
    signUp(input: {
      email: string;
      options: {
        data: {
          full_name: string;
          username: string;
        };
        emailRedirectTo?: string;
      };
      password: string;
    }): Awaitable<SignupResponse>;
  };
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): Awaitable<{ data: unknown; error: unknown | null }>;
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

function getSignupErrorMessage(error: { message?: string | null } | null) {
  const message = error?.message?.trim();

  return message && message.length > 0
    ? message
    : 'Could not create that account right now.';
}

function isExistingAccountSignupAttempt(input: SignupResponse) {
  const errorMessage = input.error?.message?.toLowerCase() ?? '';

  if (
    errorMessage.includes('already registered') ||
    errorMessage.includes('already exists')
  ) {
    return true;
  }

  return (
    !input.data.session &&
    Array.isArray(input.data.user?.identities) &&
    input.data.user.identities.length === 0
  );
}

function getAuthInputErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Could not complete authentication right now.';
  }

  return error instanceof Error
    ? error.message
    : 'Could not complete authentication right now.';
}

export async function submitUsernameAuth(input: {
  client: UsernameAuthClient;
  email?: string;
  emailRedirectTo?: string;
  fullName?: string;
  lookupClient?: UsernameAuthClient;
  mode: UsernameAuthMode;
  pin: string;
  username?: string;
}): Promise<UsernameAuthResult> {
  try {
    if (input.mode === 'sign-in') {
      const parsedPin = signInPinSchema.parse(input.pin);
      const authEmail = await lookupAuthEmailForUsername({
        client: input.lookupClient ?? input.client,
        username: input.username ?? '',
      });

      if (!authEmail) {
        return {
          ok: false,
          status: {
            message: 'Unknown username or incorrect PIN.',
            state: 'error',
          },
        };
      }

      const { error } = await input.client.auth.signInWithPassword({
        email: authEmail,
        password: parsedPin,
      });

      if (error) {
        return {
          ok: false,
          status: {
            message: 'Unknown username or incorrect PIN.',
            state: 'error',
          },
        };
      }

      return {
        action: 'signed-in',
        ok: true,
      };
    }

    const parsedEmail = authEmailSchema.parse(input.email ?? '');
    const parsedPin = pinSchema.parse(input.pin);
    const parsedFullName = signupFullNameSchema.parse(input.fullName ?? '');
    const normalizedUsername = normalizeUsername(input.username ?? '');

    if (!normalizedUsername) {
      return {
        focusField: 'username',
        ok: false,
        status: {
          message: 'Enter a username using letters or numbers.',
          state: 'error',
        },
      };
    }

    const availability = await input.client.rpc('is_username_available', {
      p_username: normalizedUsername,
    });

    // Best-effort pre-check: only block on a definitive "taken". If the check
    // itself errors, fall through to signUp so the unique constraint still guards.
    if (!availability.error && availability.data === false) {
      return {
        focusField: 'username',
        ok: false,
        status: {
          message: 'That username is already taken. Choose a different one.',
          state: 'error',
        },
      };
    }

    const signupResult = await input.client.auth.signUp({
      email: parsedEmail,
      options: {
        data: {
          full_name: parsedFullName,
          username: normalizedUsername,
        },
        ...(input.emailRedirectTo
          ? { emailRedirectTo: input.emailRedirectTo }
          : {}),
      },
      password: parsedPin,
    });

    if (isExistingAccountSignupAttempt(signupResult)) {
      return {
        nextMode: 'sign-in',
        ok: false,
        status: {
          message: 'That email already has an account. Sign in or reset your PIN.',
          state: 'error',
        },
      };
    }

    if (signupResult.error || !signupResult.data.user) {
      return {
        ok: false,
        status: {
          message: getSignupErrorMessage(signupResult.error),
          state: 'error',
        },
      };
    }

    if (!signupResult.data.session) {
      return {
        action: 'awaiting-email',
        ok: true,
        status: {
          message: 'Check your email for the sign-in link to finish creating this account.',
          state: 'success',
        },
      };
    }

    return {
      action: 'signed-in',
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      status: {
        message: getAuthInputErrorMessage(error),
        state: 'error',
      },
    };
  }
}

