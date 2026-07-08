import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitUsernameAuth } from './submit-username-auth';

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
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
  });

  it('signs in with the normalized real email and 6-digit pin', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: ' Friday.Mars@Example.com ',
      mode: 'sign-in',
      pin: '123456',
    });

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'friday.mars@example.com',
      password: '123456',
    });
    expect(result).toEqual({
      action: 'signed-in',
      ok: true,
    });
  });

  it('creates an account with the real email and username metadata', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: ' Friday.Mars@Example.com ',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'Friday Mars',
    });

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'friday.mars@example.com',
      options: {
        data: {
          full_name: 'Friday Mars',
          username: 'friday-mars',
        },
      },
      password: '123456',
    });
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
      email: 'friday@example.com',
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
          'Check your email for the sign-in link to finish creating this account.',
        state: 'success',
      },
    });
  });

  it('guides duplicate email signups back to sign in', async () => {
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
      email: 'friday@example.com',
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
          'That email already has an account. Sign in or reset your PIN.',
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
      email: 'friday@example.com',
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

  it('returns a clean validation message for an invalid sign-in pin', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday@example.com',
      mode: 'sign-in',
      pin: '12345',
    });

    expect(result).toEqual({
      ok: false,
      status: {
        message: 'PIN must be exactly 6 digits.',
        state: 'error',
      },
    });
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('returns a clean validation message for an invalid auth email', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday-mars',
      mode: 'sign-in',
      pin: '123456',
    });

    expect(result).toEqual({
      ok: false,
      status: {
        message: 'Enter a valid email address.',
        state: 'error',
      },
    });
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
