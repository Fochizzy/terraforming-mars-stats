import { ZodError } from 'zod';
import { authEmailSchema } from './username-auth';

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

type RequestPinResetClient = {
  auth: {
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string },
    ): Awaitable<{ error: { message?: string | null } | null }>;
  };
};

const GENERIC_SUCCESS_MESSAGE =
  'If that email is registered, a recovery link has been sent.';

function getValidationErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Enter a valid email address.';
  }

  return 'Enter a valid email address.';
}

export async function requestPinReset(input: {
  client: RequestPinResetClient;
  email: string;
  emailRedirectTo?: string;
}): Promise<RequestPinResetResult> {
  if (!input.email.trim()) {
    return {
      ok: false,
      status: {
        message: 'Enter your email first.',
        state: 'error',
      },
    };
  }

  try {
    const parsedEmail = authEmailSchema.parse(input.email);
    const { error } = await input.client.auth.resetPasswordForEmail(parsedEmail, {
      ...(input.emailRedirectTo
        ? { redirectTo: input.emailRedirectTo }
        : {}),
    });

    if (error) {
      console.error('Supabase PIN reset request failed', error);
    }

    return {
      ok: true,
      status: {
        message: GENERIC_SUCCESS_MESSAGE,
        state: 'success',
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        status: {
          message: getValidationErrorMessage(error),
          state: 'error',
        },
      };
    }

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
