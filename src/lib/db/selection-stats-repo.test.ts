import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getFinalTerraformingActionStats,
  getMergerImpactStats,
} from './selection-stats-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getMergerImpactStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads log-derived Merger impact rows for the selected group', async () => {
    const mergerRows = [
      {
        imported_games: 5,
        merger_games: 2,
        merger_play_rate: 0.4,
        merger_win_rate: 0.5,
        merger_wins: 1,
        non_merger_games: 3,
        non_merger_win_rate: 0.3333,
        non_merger_wins: 1,
        player_id: 'player-1',
        player_name: 'Friday Mars',
        win_rate_delta: 0.1667,
      },
    ];
    const rpc = vi.fn().mockResolvedValue({
      data: mergerRows,
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
    } as never);

    await expect(getMergerImpactStats('group-1')).resolves.toEqual(mergerRows);
    expect(rpc).toHaveBeenCalledWith('get_merger_impact_stats', {
      target_group_id: 'group-1',
    });
  });
});

describe('getFinalTerraformingActionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads final terraforming action rows for the requested scope', async () => {
    const finalActionRows = [
      {
        final_action_games: 3,
        final_action_rate: 0.6,
        final_action_win_rate: 0.6667,
        final_action_wins: 2,
        imported_games: 5,
        most_common_action_count: 2,
        most_common_action_type: 'oxygen',
        overall_win_rate: 0.4,
        overall_wins: 2,
        player_id: 'player-1',
        player_name: 'Friday Mars',
        win_rate_delta: 0.2667,
      },
    ];
    const rpc = vi.fn().mockResolvedValue({
      data: finalActionRows,
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
    } as never);

    await expect(
      getFinalTerraformingActionStats({ groupId: 'group-1', scope: 'group' }),
    ).resolves.toEqual(finalActionRows);
    expect(rpc).toHaveBeenCalledWith('get_final_terraforming_action_stats', {
      scope: 'group',
      target_group_id: 'group-1',
    });
  });
});
