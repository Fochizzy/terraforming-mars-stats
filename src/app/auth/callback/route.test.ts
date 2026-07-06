import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const authMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: authMocks.exchangeCodeForSession,
    },
  })),
}));

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('exchanges the code and redirects into auth completion', async () => {
    const response = await GET(
      new Request(
        'https://terraforming-mars-stats.workers.dev/auth/callback?code=abc123&next=%2Flog-game%2Fimport',
      ),
    );

    expect(authMocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://terraforming-mars-stats.workers.dev/auth/complete?next=%2Flog-game%2Fimport',
    );
  });

  it('redirects back to login when the callback is missing a code', async () => {
    const response = await GET(
      new Request('https://terraforming-mars-stats.workers.dev/auth/callback'),
    );

    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://terraforming-mars-stats.workers.dev/login?error=auth_callback',
    );
  });
});
