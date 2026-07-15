import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitUsernameAuth } from './submit-username-auth';

const authMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
    from: authMocks.from,
    rpc: authMocks.rpc,
  };
}

describe('submitUsernameAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.rpc.mockResolvedValue({ data: true, error: null });
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.from.mockReturnValue({
      eq: authMocks.eq,
      maybeSingle: authMocks.maybeSingle,
      select: authMocks.select,
    });
    authMocks.select.mockReturnValue({
      eq: authMocks.eq,
      maybeSingle: authMocks.maybeSingle,
    });
    authMocks.eq.mockReturnValue({
      maybeSingle: authMocks.maybeSingle,
    });
    authMocks.maybeSingle.mockResolvedValue({
      data: { email: 'friday.mars@example.com' },
      error: null,
    });
    authMocks.signUp.mockResolvedValue({
      data: {
        session: { access_token: 'session-token' },
        user: { id: 'user-1' },
      },
      error: null,
    });
  });

  it('signs in by looking up the normalized username and using the stored email', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      mode: 'sign-in',
      pin: '123456',
      username: ' Friday Mars ',
    });

    expect(authMocks.from).toHaveBeenCalledWith('user_profiles');
    expect(authMocks.select).toHaveBeenCalledWith('email');
    expect(authMocks.eq).toHaveBeenCalledWith('username', 'friday-mars');
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

    expect(authMocks.rpc).toHaveBeenCalledWith('is_username_available', {
      p_username: 'friday-mars',
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

  it('blocks sign up when the chosen username is already taken', async () => {
    authMocks.rpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday@example.com',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'RevLoki',
    });

    expect(authMocks.rpc).toHaveBeenCalledWith('is_username_available', {
      p_username: 'revloki',
    });
    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(result).toEqual({
      focusField: 'username',
      ok: false,
      status: {
        message: 'That username is already taken. Choose a different one.',
        state: 'error',
      },
    });
  });

  it('proceeds with sign up when the availability check itself errors', async () => {
    authMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'network down' },
    });

    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday@example.com',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'friday-mars',
    });

    expect(authMocks.signUp).toHaveBeenCalled();
    expect(result).toEqual({
      action: 'signed-in',
      ok: true,
    });
  });

  it('rejects a username with no letters or numbers before checking availability', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday@example.com',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: '!!!',
    });

    expect(authMocks.rpc).not.toHaveBeenCalled();
    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(result).toEqual({
      focusField: 'username',
      ok: false,
      status: {
        message: 'Enter a username using letters or numbers.',
        state: 'error',
      },
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
      emailRedirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
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
      mode: 'sign-in',
      pin: '12345',
      username: 'friday-mars',
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

  it('returns a clean validation message for an invalid signup email', async () => {
    const result = await submitUsernameAuth({
      client: createClient(),
      email: 'friday-mars',
      fullName: 'Friday Mars',
      mode: 'sign-up',
      pin: '123456',
      username: 'friday-mars',
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
