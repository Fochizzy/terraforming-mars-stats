import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitUsernameAuth } from './submit-username-auth';

const authMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
    from: vi.fn(() => ({
      insert: authMocks.insert,
    })),
  };
}

describe('submitUsernameAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({
      data: {
        session: { access_token: 'session-token' },
        user: { id: 'user-1' },
      },
      error: null,
    });
    authMocks.insert.mockResolvedValue({ error: null });
  });

  it('signs in with the normalized synthetic email and 6-digit pin', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      mode: 'sign-in',
      pin: '123456',
      username: ' Friday Mars ',
    });

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'friday-mars@users.tmstats.local',
      password: '123456',
    });
    expect(result).toEqual({
      action: 'signed-in',
      ok: true,
    });
  });

  it('creates an account, inserts the profile row, and succeeds without a redirect url', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'Friday Mars',
    });

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'friday-mars@users.tmstats.local',
      options: {
        data: {
          full_name: 'Friday Mars',
        },
      },
      password: '123456',
    });
    expect(authMocks.insert).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: 'signed-in',
      ok: true,
    });
  });

  it('returns the email-confirmation status when sign up creates no session yet', async () => {
    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: { id: 'user-1' },
      },
      error: null,
    });

    const result = await submitUsernameAuth({
      client: createClient(),
      emailRedirectTo: 'https://terraforming-mars-stats.workers.dev/auth/callback?next=%2Fprofile',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'friday-mars',
    });

    expect(result).toEqual({
      action: 'awaiting-email',
      ok: true,
      status: {
        message:
          'Check your email for the Supabase sign-in link to finish creating this account.',
        state: 'success',
      },
    });
    expect(authMocks.insert).not.toHaveBeenCalled();
  });

  it('guides duplicate usernames back to sign in', async () => {
    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: 'User already registered',
      },
    });

    const result = await submitUsernameAuth({
      client: createClient(),
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'friday-mars',
    });

    expect(result).toEqual({
      nextMode: 'sign-in',
      ok: false,
      status: {
        message:
          'That username already has an account. Sign in with the existing 6-digit PIN.',
        state: 'error',
      },
    });
  });

  it('surfaces the Supabase signup error when account creation is rejected', async () => {
    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: 'Password should be at least 6 characters.',
      },
    });

    const result = await submitUsernameAuth({
      client: createClient(),
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'friday-mars',
    });

    expect(result).toEqual({
      ok: false,
      status: {
        message: 'Password should be at least 6 characters.',
        state: 'error',
      },
    });
  });
});
