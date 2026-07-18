import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicPlayerNames } from './public-player-name-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const PRIVATE_FULL_NAME = 'Known Private Example';

describe('public player name repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only the stable ID, link state, and approved public name', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          full_name: PRIVATE_FULL_NAME,
          is_linked: true,
          player_id: '11111111-1111-4111-8111-111111111111',
          public_name: 'public-handle',
        },
      ],
      error: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    const rows = await getPublicPlayerNames([
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
    ]);

    expect(rows).toEqual([
      {
        isLinked: true,
        playerId: '11111111-1111-4111-8111-111111111111',
        publicName: 'public-handle',
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain(PRIVATE_FULL_NAME);
    expect(rpc).toHaveBeenCalledWith('get_public_player_names', {
      p_player_ids: ['11111111-1111-4111-8111-111111111111'],
    });
  });
});
