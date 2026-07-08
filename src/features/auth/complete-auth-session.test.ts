import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthCompletePath } from './build-auth-callback-url';
import { completeAuthSession } from './complete-auth-session';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { resolveSavedPlayerAutoClaim } from '@/lib/db/player-claim-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/player-claim-repo', () => ({
  resolveSavedPlayerAutoClaim: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('completeAuthSession', () => {
  const profileQuery = {
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    profileQuery.insert.mockResolvedValue({ error: null });
    profileQuery.maybeSingle.mockResolvedValue({
      data: { user_id: 'user-1' },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: 'friday@example.com',
              id: 'user-1',
              user_metadata: {
                full_name: 'Friday Mars',
                username: 'friday-mars',
              },
            },
          },
          error: null,
        }),
      },
      from: vi.fn(() => profileQuery),
    } as never);
  });

  it('builds a safe auth-complete path from the requested next path', () => {
    expect(buildAuthCompletePath('/profile')).toBe('/auth/complete?next=%2Fprofile');
  });

  it('sends existing group members straight to the requested next path', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });

    await expect(
      completeAuthSession({ nextPath: '/log-game/import' }),
    ).resolves.toEqual({
      redirectPath: '/log-game/import',
    });
  });

  it('creates a missing profile row from auth metadata and the real account email', async () => {
    profileQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });

    await expect(completeAuthSession({ nextPath: '/profile' })).resolves.toEqual({
      redirectPath: '/profile',
    });

    expect(profileQuery.insert).toHaveBeenCalledWith({
      email: 'friday@example.com',
      full_name: 'Friday Mars',
      user_id: 'user-1',
      username: 'friday-mars',
    });
  });

  it('falls back to creating the profile without email when the live column is not available yet', async () => {
    profileQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    profileQuery.insert
      .mockResolvedValueOnce({
        error: {
          code: 'PGRST204',
          message: "Could not find the 'email' column of 'user_profiles' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        error: null,
      });
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });

    await expect(completeAuthSession({ nextPath: '/profile' })).resolves.toEqual({
      redirectPath: '/profile',
    });

    expect(profileQuery.insert).toHaveBeenNthCalledWith(1, {
      email: 'friday@example.com',
      full_name: 'Friday Mars',
      user_id: 'user-1',
      username: 'friday-mars',
    });
    expect(profileQuery.insert).toHaveBeenNthCalledWith(2, {
      full_name: 'Friday Mars',
      user_id: 'user-1',
      username: 'friday-mars',
    });
  });

  it('routes no-group users to the claim page when auto-claim is not available', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(resolveSavedPlayerAutoClaim).mockResolvedValue({
      candidates: [],
      status: 'needs-manual-claim',
    });

    await expect(completeAuthSession({ nextPath: '/profile' })).resolves.toEqual({
      redirectPath: '/claim-player?next=%2Fprofile',
    });
  });

  it('sends recovery sessions straight to auth reset-pin before claim routing', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(resolveSavedPlayerAutoClaim).mockResolvedValue({
      candidates: [],
      status: 'needs-manual-claim',
    });

    await expect(
      completeAuthSession({ nextPath: '/auth/reset-pin?next=%2Flog-game%2Fimport' }),
    ).resolves.toEqual({
      redirectPath: '/auth/reset-pin?next=%2Flog-game%2Fimport',
    });
  });
});
