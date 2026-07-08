import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('refreshGameMetricSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the persisted Supabase metric refresh RPC for a finalized game', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await refreshGameMetricSnapshots('game-1');

    expect(rpc).toHaveBeenCalledWith('refresh_game_metric_snapshots', {
      p_game_id: 'game-1',
    });
  });

  it('throws the RPC error so callers do not silently skip metrics', async () => {
    const error = new Error('permission denied');
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await expect(refreshGameMetricSnapshots('game-1')).rejects.toThrow(error);
  });
});
