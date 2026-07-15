import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RecoveryHashRedirect,
  shouldHandleGlobalRecoveryRedirect,
} from './recovery-hash-redirect';

const authMocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: authMocks.createSupabaseBrowserClient,
}));

function stubLocation(input: {
  hash: string;
  origin?: string;
  pathname: string;
  search?: string;
}) {
  const replace = vi.fn();
  const replaceState = vi.fn();

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      hash: input.hash,
      origin: input.origin ?? 'https://tm-stats.com',
      pathname: input.pathname,
      replace,
      search: input.search ?? '',
    },
  });

  Object.defineProperty(window, 'history', {
    configurable: true,
    value: {
      replaceState,
    },
  });

  return { replace, replaceState };
}

describe('shouldHandleGlobalRecoveryRedirect', () => {
  it('leaves reset PIN routes to the reset form', () => {
    expect(shouldHandleGlobalRecoveryRedirect('/auth/reset-pin')).toBe(false);
    expect(shouldHandleGlobalRecoveryRedirect('/auth/reset-pin/')).toBe(false);
    expect(shouldHandleGlobalRecoveryRedirect('/reset-pin')).toBe(false);
    expect(shouldHandleGlobalRecoveryRedirect('/login')).toBe(true);
  });
});

describe('RecoveryHashRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSupabaseBrowserClient.mockReturnValue({
      auth: {
        setSession: authMocks.setSession,
      },
    });
    authMocks.setSession.mockResolvedValue({ error: null });
  });

  it('does not consume the recovery hash on the reset PIN page', async () => {
    const { replace, replaceState } = stubLocation({
      hash:
        '#access_token=recovery-access-token&refresh_token=recovery-refresh-token&type=recovery',
      pathname: '/auth/reset-pin',
      search: '?next=%2Fprofile',
    });

    render(<RecoveryHashRedirect />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(authMocks.setSession).not.toHaveBeenCalled();
    expect(authMocks.createSupabaseBrowserClient).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('still bridges recovery hashes that land on another page', async () => {
    const { replace, replaceState } = stubLocation({
      hash:
        '#access_token=recovery-access-token&refresh_token=recovery-refresh-token&type=recovery',
      pathname: '/login',
    });

    render(<RecoveryHashRedirect />);

    await waitFor(() =>
      expect(authMocks.setSession).toHaveBeenCalledWith({
        access_token: 'recovery-access-token',
        refresh_token: 'recovery-refresh-token',
      }),
    );

    expect(authMocks.createSupabaseBrowserClient).toHaveBeenCalledWith({
      detectSessionInUrl: false,
    });
    expect(replaceState).toHaveBeenCalledWith({}, '', '/login');
    expect(replace).toHaveBeenCalledWith('/auth/reset-pin');
  });
});
