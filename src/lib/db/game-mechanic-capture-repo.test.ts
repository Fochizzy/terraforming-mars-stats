import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { captureGameMechanicsFromRawLog } from './game-mechanic-capture-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('captureGameMechanicsFromRawLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists explicit absence with empty event arrays rather than synthetic rows', async () => {
    const gamePlayerEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const rpc = vi.fn().mockResolvedValue({ data: { venus_event_count: 0 }, error: null });

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: gamePlayerEq })),
        })),
      } as never)
      .mockResolvedValueOnce({ rpc } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: '[1/0]: Generation 1\n[1/1]: Alice played Mining Area.',
    });

    expect(rpc).toHaveBeenCalledWith('replace_game_mechanic_capture',
      expect.objectContaining({
        p_colonies_state: 'confirmed_absent',
        p_colony_events: [],
        p_venus_events: [],
        p_venus_next_state: 'confirmed_absent',
      }),
    );
  });

  it('uses a stable player ID only when the parsed source name exactly resolves to a game participant', async () => {
    const gamePlayerEq = vi.fn().mockResolvedValue({
      data: [{ player_id: 'player-alice', players: { display_name: 'Alice' } }],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: gamePlayerEq })),
        })),
      } as never)
      .mockResolvedValueOnce({ rpc } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: '[1/0]: Alice increased Venus scale 2 step(s)',
    });

    expect(rpc).toHaveBeenCalledWith('replace_game_mechanic_capture',
      expect.objectContaining({
        p_venus_events: [
          expect.objectContaining({
            attribution_status: 'explicit_stable',
            player_id: 'player-alice',
            source_player_name: 'Alice',
          }),
        ],
      }),
    );
  });
});
