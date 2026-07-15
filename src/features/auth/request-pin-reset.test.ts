import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPinReset } from './request-pin-reset';

const authMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  select: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
    from: authMocks.from,
  };
}

describe('requestPinReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });
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
  });

  it('looks up the normalized username before sending the recovery email', async () => {
    const result = await requestPinReset({
      client: createClient(),
      username: ' Friday Mars ',
      emailRedirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
    });

    expect(authMocks.from).toHaveBeenCalledWith('user_profiles');
    expect(authMocks.select).toHaveBeenCalledWith('email');
    expect(authMocks.eq).toHaveBeenCalledWith('username', 'friday-mars');
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'friday.mars@example.com',
      {
        redirectTo:
          'https://tm-stats.com/auth/callback?next=%2Fprofile',
      },
    );
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('requires a username before sending a reset request', async () => {
    const result = await requestPinReset({
      client: createClient(),
      username: '   ',
    });

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      status: {
        message: 'Enter your username first.',
        state: 'error',
      },
    });
  });

  it('keeps the response generic when the username is not found', async () => {
    authMocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await requestPinReset({
      client: createClient(),
      username: 'unknown',
    });

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('keeps the response generic when Supabase rejects the recovery request', async () => {
    authMocks.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: {
        message: 'User not found',
      },
    });

    const result = await requestPinReset({
      client: createClient(),
      username: 'friday-mars',
    });

    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });
});
