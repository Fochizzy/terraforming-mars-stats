import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createResendEmailSender } from './resend';

describe('createResendEmailSender', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM_EMAIL', 'no-reply@mail.tm-stats.com');
    vi.stubEnv('RESEND_FROM_NAME', 'Terraforming Mars Stats');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-1' }), {
          status: 200,
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends PIN reset links through the Resend email API', async () => {
    await createResendEmailSender().sendPinResetEmail({
      recoveryUrl:
        'https://supabase.example.com/auth/v1/verify?type=recovery&token=abc',
      to: 'friday.mars@example.com',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      from: string;
      html: string;
      subject: string;
      text: string;
      to: string[];
    };

    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.any(String),
        headers: {
          authorization: 'Bearer re_test',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    );
    expect(body).toMatchObject({
      from: 'Terraforming Mars Stats <no-reply@mail.tm-stats.com>',
      subject: 'Mission Control: Reset your PIN',
      to: ['friday.mars@example.com'],
    });
    expect(body.html).toContain('Mission Control');
    expect(body.html).toContain('Terraforming Mars Stats | tm-stats.com');
    expect(body.html).toContain('Open Reset Window');
    expect(body.html).toContain(
      'https://supabase.example.com/auth/v1/verify?type=recovery&amp;token=abc',
    );
    expect(body.text).toContain(
      'https://supabase.example.com/auth/v1/verify?type=recovery&token=abc',
    );
  });

  it('throws when Resend rejects the send request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('bad sender', {
          status: 422,
        }),
      ),
    );

    await expect(
      createResendEmailSender().sendPinResetEmail({
        recoveryUrl: 'https://supabase.example.com/recovery',
        to: 'friday.mars@example.com',
      }),
    ).rejects.toThrow('Resend PIN reset email failed with 422: bad sender');
  });
});
