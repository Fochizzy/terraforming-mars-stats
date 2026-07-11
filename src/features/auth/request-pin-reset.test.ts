import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPinReset } from './request-pin-reset';

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
  };
}

describe('requestPinReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });
  });

  it('calls Supabase with the normalized email and redirect target', async () => {
    const result = await requestPinReset({
      client: createClient(),
      email: ' Friday.Mars@Example.com ',
      emailRedirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
    });

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
        message: 'If that email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('requires an email before sending a reset request', async () => {
    const result = await requestPinReset({
      client: createClient(),
      email: '   ',
    });

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      status: {
        message: 'Enter your email first.',
        state: 'error',
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
      email: 'friday@example.com',
    });

    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });
});
