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
    admin: {
      generateLink(params: {
        email: string;
        options?: { redirectTo?: string };
        type: 'recovery';
      }): Awaitable<{
        data: {
          properties?: {
            action_link?: string | null;
          } | null;
        } | null;
        error: { message?: string | null } | null;
      }>;
    };
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

export type PinResetEmailSender = {
  sendPinResetEmail(input: {
    recoveryUrl: string;
    to: string;
  }): Awaitable<void>;
};

const GENERIC_SUCCESS_MESSAGE =
  'If that username or email is registered, a recovery link has been sent.';

export async function requestPinReset(input: {
  client: RequestPinResetClient;
  emailRedirectTo?: string;
  emailSender: PinResetEmailSender;
  username: string;
}): Promise<RequestPinResetResult> {
  if (!input.username.trim()) {
    return {
      ok: false,
      status: {
        message: 'Enter your username or email first.',
        state: 'error',
      },
    };
  }

  if (!normalizeUsername(input.username)) {
    return {
      ok: false,
      status: {
        message: 'Enter a username or email using letters or numbers.',
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
      const { data, error } = await input.client.auth.admin.generateLink({
        email: authEmail,
        options: {
          ...(input.emailRedirectTo
            ? { redirectTo: input.emailRedirectTo }
            : {}),
        },
        type: 'recovery',
      });

      if (error) {
        console.error('Supabase PIN reset request failed', error);
      } else if (data?.properties?.action_link) {
        await input.emailSender.sendPinResetEmail({
          recoveryUrl: data.properties.action_link,
          to: authEmail,
        });
      } else {
        console.error('Supabase PIN reset request did not return a recovery link');
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
    console.error('PIN reset request failed', error);

    return {
      ok: true,
      status: {
        message: GENERIC_SUCCESS_MESSAGE,
        state: 'success',
      },
    };
  }
}
