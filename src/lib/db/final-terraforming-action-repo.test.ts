import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicPlayerNames } from './public-player-name-repo';
import { getFinalTerraformingActionStats } from './final-terraforming-action-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./public-player-name-repo', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('./public-player-name-repo')
  >();

  return {
    ...actual,
    getPublicPlayerNames: vi.fn(),
  };
});

const PRIVATE_FULL_NAME = 'Known Private Example';

describe('final terraforming action public names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('overrides RPC name evidence with the centralized registered username', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            final_action_games: 1,
            final_action_rate: 1,
            final_action_win_rate: 1,
            final_action_wins: 1,
            imported_games: 1,
            most_common_action_count: 1,
            most_common_action_type: 'oxygen',
            overall_win_rate: 1,
            overall_wins: 1,
            player_id: '11111111-1111-4111-8111-111111111111',
            player_name: PRIVATE_FULL_NAME,
            win_rate_delta: 0,
          },
        ],
        error: null,
      }),
    } as never);
    vi.mocked(getPublicPlayerNames).mockResolvedValue([
      {
        isLinked: true,
        playerId: '11111111-1111-4111-8111-111111111111',
        publicName: 'public-handle',
      },
    ]);

    const result = await getFinalTerraformingActionStats({ scope: 'personal' });

    expect(result[0]?.player_name).toBe('public-handle');
    expect(JSON.stringify(result)).not.toContain(PRIVATE_FULL_NAME);
  });

  it('uses the neutral fallback when no public username can be resolved', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            final_action_games: 1,
            final_action_rate: 1,
            final_action_win_rate: null,
            final_action_wins: 0,
            imported_games: 1,
            most_common_action_count: null,
            most_common_action_type: null,
            overall_win_rate: null,
            overall_wins: 0,
            player_id: '11111111-1111-4111-8111-111111111111',
            player_name: PRIVATE_FULL_NAME,
            win_rate_delta: null,
          },
        ],
        error: null,
      }),
    } as never);
    vi.mocked(getPublicPlayerNames).mockResolvedValue([]);

    const result = await getFinalTerraformingActionStats({ scope: 'global' });

    expect(result[0]?.player_name).toBe('Player');
    expect(JSON.stringify(result)).not.toContain(PRIVATE_FULL_NAME);
  });
});
