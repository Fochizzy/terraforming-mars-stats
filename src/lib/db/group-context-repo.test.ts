import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentGroupContext, listCurrentUserGroups } from './group-context-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getCurrentGroupContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the user profile last active group when it matches a membership', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { last_active_group_id: 'group-2' },
        error: null,
      }),
    };
    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: undefined,
    };
    membershipQuery.order.mockResolvedValue({
      data: [
        {
          group_id: 'group-1',
          groups: { name: 'First Group' },
          role: 'viewer',
        },
        {
          group_id: 'group-2',
          groups: { name: 'Second Group' },
          role: 'editor',
        },
      ],
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return profileQuery;
        }

        if (table === 'group_members') {
          return membershipQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await expect(getCurrentGroupContext()).resolves.toEqual({
      groupId: 'group-2',
      groupName: 'Second Group',
      role: 'editor',
      userId: 'user-1',
    });
  });

  it('falls back to the earliest membership when no active group is saved', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: undefined,
    };
    membershipQuery.order.mockResolvedValue({
      data: [
        {
          group_id: 'group-1',
          groups: { name: 'First Group' },
          role: 'owner',
        },
        {
          group_id: 'group-2',
          groups: { name: 'Second Group' },
          role: 'editor',
        },
      ],
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return profileQuery;
        }

        if (table === 'group_members') {
          return membershipQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await expect(getCurrentGroupContext()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'First Group',
      role: 'owner',
      userId: 'user-1',
    });
  });

  it('treats a missing auth session as signed out instead of throwing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError' },
        }),
      },
    } as never);

    await expect(getCurrentGroupContext()).resolves.toBeNull();
  });

  it('returns no groups when the session is missing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError' },
        }),
      },
    } as never);

    await expect(listCurrentUserGroups()).resolves.toEqual([]);
  });
});
