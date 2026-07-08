import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedLayout from './layout';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const headerMocks = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: headerMocks.cookies,
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('ProtectedLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headerMocks.cookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([
        {
          name: 'sb-qjtwgrjjwnqafbvkkfex-auth-token',
          value: 'not-json',
        },
      ]),
    });
  });

  it('redirects stale Supabase cookies instead of rendering protected pages', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError' },
        }),
      },
    } as never);

    await ProtectedLayout({ children: <div>Protected content</div> });

    expect(navigationMocks.redirect).toHaveBeenCalledWith('/login');
  });
});
