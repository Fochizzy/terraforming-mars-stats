import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPinReset } from './request-pin-reset';

const authMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  generateLink: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  sendPinResetEmail: vi.fn(),
}));

function createClient() {
  return {
    auth: {
      admin: {
        generateLink: authMocks.generateLink,
      },
    },
    from: authMocks.from,
  };
}

function createEmailSender() {
  return {
    sendPinResetEmail: authMocks.sendPinResetEmail,
  };
}

describe('requestPinReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.generateLink.mockResolvedValue({
      data: {
        properties: {
          action_link:
            'https://supabase.example.com/auth/v1/verify?type=recovery&token=abc',
        },
      },
      error: null,
    });
    authMocks.sendPinResetEmail.mockResolvedValue(undefined);
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

  it('looks up the normalized username, generates a Supabase recovery link, and sends it by email', async () => {
    const result = await requestPinReset({
      client: createClient(),
      emailRedirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
      emailSender: createEmailSender(),
      username: ' Friday Mars ',
    });

    expect(authMocks.from).toHaveBeenCalledWith('user_profiles');
    expect(authMocks.select).toHaveBeenCalledWith('email');
    expect(authMocks.eq).toHaveBeenCalledWith('username', 'friday-mars');
    expect(authMocks.generateLink).toHaveBeenCalledWith({
      email: 'friday.mars@example.com',
      options: {
        redirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
      },
      type: 'recovery',
    });
    expect(authMocks.sendPinResetEmail).toHaveBeenCalledWith({
      recoveryUrl:
        'https://supabase.example.com/auth/v1/verify?type=recovery&token=abc',
      to: 'friday.mars@example.com',
    });
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username or email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('uses a direct email address without looking up a username first', async () => {
    const result = await requestPinReset({
      client: createClient(),
      emailRedirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
      emailSender: createEmailSender(),
      username: ' Friday.Mars@Example.com ',
    });

    expect(authMocks.from).not.toHaveBeenCalled();
    expect(authMocks.generateLink).toHaveBeenCalledWith({
      email: 'friday.mars@example.com',
      options: {
        redirectTo: 'https://tm-stats.com/auth/callback?next=%2Fprofile',
      },
      type: 'recovery',
    });
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username or email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('requires a username before sending a reset request', async () => {
    const result = await requestPinReset({
      client: createClient(),
      emailSender: createEmailSender(),
      username: '   ',
    });

    expect(authMocks.generateLink).not.toHaveBeenCalled();
    expect(authMocks.sendPinResetEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      status: {
        message: 'Enter your username or email first.',
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
      emailSender: createEmailSender(),
      username: 'unknown',
    });

    expect(authMocks.generateLink).not.toHaveBeenCalled();
    expect(authMocks.sendPinResetEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username or email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('keeps the response generic when Supabase rejects the recovery link request', async () => {
    authMocks.generateLink.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'User not found',
      },
    });

    const result = await requestPinReset({
      client: createClient(),
      emailSender: createEmailSender(),
      username: 'friday-mars',
    });

    expect(authMocks.sendPinResetEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username or email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });

  it('keeps the response generic when Resend rejects the email request', async () => {
    authMocks.sendPinResetEmail.mockRejectedValueOnce(
      new Error('Resend rejected the email'),
    );

    const result = await requestPinReset({
      client: createClient(),
      emailSender: createEmailSender(),
      username: 'friday-mars',
    });

    expect(result).toEqual({
      ok: true,
      status: {
        message: 'If that username or email is registered, a recovery link has been sent.',
        state: 'success',
      },
    });
  });
});
