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
              email: 'friday-mars@users.tmstats.local',
              id: 'user-1',
              user_metadata: {
                full_name: 'Friday Mars',
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
});
