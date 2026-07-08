import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { signOut } from './sign-out';

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs out the current session and redirects to login', async () => {
    const signOutSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signOut: signOutSpy,
      },
    } as never);

    await signOut();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/login');
  });

  it('still redirects to login when the auth session is already missing', async () => {
    const signOutSpy = vi.fn().mockResolvedValue({
      error: { name: 'AuthSessionMissingError' },
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signOut: signOutSpy,
      },
    } as never);

    await signOut();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/login');
  });
});
