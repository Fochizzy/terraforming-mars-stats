import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentGroupContext } from './group-context-repo';
import {
  ensureLogGameGroupContext,
  LOG_GAME_PLACEHOLDER_GROUP_ID,
} from './log-game-group-context';
import {
  getUserProfile,
  setCurrentUserLastActiveGroup,
} from './user-profile-repo';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('./user-profile-repo', () => ({
  getUserProfile: vi.fn(),
  setCurrentUserLastActiveGroup: vi.fn(),
}));

describe('ensureLogGameGroupContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses the existing active group when one is already selected', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });

    await expect(ensureLogGameGroupContext()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('creates a personal group, membership, settings, and linked player when the user has none', async () => {
    const groupsQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'group-1', name: 'Izzy Hodnett Group' },
        error: null,
      }),
    };
    const groupMembersQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const groupSettingsQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const playersQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: 'izzy.hodnett@gmail.com',
              id: 'user-1',
            },
          },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserProfile).mockResolvedValue({
      full_name: 'Izzy Hodnett',
      last_active_group_id: null,
      username: 'Fochizzy',
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'groups') {
          return groupsQuery;
        }

        if (table === 'group_members') {
          return groupMembersQuery;
        }

        if (table === 'group_settings') {
          return groupSettingsQuery;
        }

        if (table === 'players') {
          return playersQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await expect(ensureLogGameGroupContext()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'Izzy Hodnett Group',
      role: 'owner',
      userId: 'user-1',
    });
    expect(groupsQuery.insert).toHaveBeenCalledWith({
      name: 'Izzy Hodnett Group',
    });
    expect(groupMembersQuery.upsert).toHaveBeenCalledWith(
      [
        {
          group_id: 'group-1',
          role: 'owner',
          user_id: 'user-1',
        },
      ],
      {
        ignoreDuplicates: false,
        onConflict: 'group_id,user_id',
      },
    );
    expect(groupSettingsQuery.upsert).toHaveBeenCalledWith({
      default_map_id: null,
      global_analytics_enabled: false,
      group_id: 'group-1',
    });
    expect(playersQuery.insert).toHaveBeenCalledWith({
      display_name: 'Izzy Hodnett',
      group_id: 'group-1',
      linked_user_id: 'user-1',
    });
    expect(setCurrentUserLastActiveGroup).toHaveBeenCalledWith({
      groupId: 'group-1',
      userId: 'user-1',
    });
  });

  it('uses a stable placeholder group id while the first group does not exist yet', () => {
    expect(LOG_GAME_PLACEHOLDER_GROUP_ID).toBe(
      '00000000-0000-4000-8000-000000000000',
    );
  });
});
