import {
  buildSyntheticAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from './username-auth';

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

type UsernameAuthClient = {
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
        };
        emailRedirectTo?: string;
      };
      password: string;
    }): Awaitable<SignupResponse>;
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

export async function submitUsernameAuth(input: {
  client: UsernameAuthClient;
  emailRedirectTo?: string;
  fullName?: string;
  mode: UsernameAuthMode;
  pin: string;
  username: string;
}): Promise<UsernameAuthResult> {
  try {
    const normalizedUsername = normalizeUsername(input.username);
    const parsedPin = pinSchema.parse(input.pin);

    if (input.mode === 'sign-in') {
      const { error } = await input.client.auth.signInWithPassword({
        email: buildSyntheticAuthEmail(normalizedUsername),
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

    const parsedFullName = signupFullNameSchema.parse(input.fullName ?? '');
    const signupResult = await input.client.auth.signUp({
      email: buildSyntheticAuthEmail(normalizedUsername),
      options: {
        data: {
          full_name: parsedFullName,
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
          message:
            'That username already has an account. Sign in with the existing 6-digit PIN.',
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
          message:
            'Check your email for the Supabase sign-in link to finish creating this account.',
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
        message:
          error instanceof Error
            ? error.message
            : 'Could not complete authentication right now.',
        state: 'error',
      },
    };
  }
}
