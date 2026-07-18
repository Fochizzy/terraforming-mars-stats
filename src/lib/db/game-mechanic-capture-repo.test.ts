import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { captureGameMechanicsFromRawLog } from './game-mechanic-capture-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listCards: vi.fn().mockResolvedValue([]),
  listMapMilestones: vi.fn().mockResolvedValue([]),
  listMapAwards: vi.fn().mockResolvedValue([]),
}));

const AUTHORITATIVE_ABSENT_LOG = [
  'Generation 1',
  'Alice played 16 Psyche',
  'Alice placed greenery tile at 12',
  'Alice passed',
  'Bob passed',
  'Generation 2',
  'Bob played 8 Research Outpost',
  'Bob passed',
  'Alice passed',
].join('\n');

describe('captureGameMechanicsFromRawLog (capture v2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies an authoritative full export with no Venus/Colonies as confirmed_absent with empty event arrays', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { event_count: 6 }, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: AUTHORITATIVE_ABSENT_LOG,
      resolveParticipantIds: false,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpc.mock.calls[0];
    expect(fnName).toBe('replace_game_capture_v2');
    expect(args.p_game_id).toBe('game-1');
    expect(args.p_game_log_import_id).toBe('import-1');
    expect(args.p_capture.venus_state).toBe('confirmed_absent');
    expect(args.p_capture.colonies_state).toBe('confirmed_absent');
    expect(
      args.p_capture.events.filter((e: { event_category: string }) => e.event_category === 'venus'),
    ).toHaveLength(0);
    expect(
      args.p_capture.events.filter((e: { event_category: string }) => e.event_category === 'colony'),
    ).toHaveLength(0);
  });

  it('treats a short fragment as incomplete_evidence rather than defaulting to absent (v2 rule)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: 'Generation 1\nAlice played 16 Psyche',
      resolveParticipantIds: false,
    });

    const args = rpc.mock.calls[0][1];
    expect(args.p_capture.venus_state).toBe('incomplete_evidence');
    expect(args.p_capture.colonies_state).toBe('incomplete_evidence');
  });

  it('retains the original untrimmed source bytes and a matching sha256', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    const original = '\n  Generation 1\nAlice passed\n\n';
    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: original,
      resolveParticipantIds: false,
    });

    const args = rpc.mock.calls[0][1];
    expect(args.p_capture.source.text).toBe(original);
    expect(args.p_capture.source.byte_length).toBe(
      new TextEncoder().encode(original).byteLength,
    );
    expect(args.p_capture.source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses a stable player id only when the parsed source name exactly resolves to a participant', async () => {
    const gamePlayerEq = vi.fn().mockResolvedValue({
      data: [{ id: 'gp-alice', player_id: 'player-alice', players: { display_name: 'Alice' } }],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: gamePlayerEq })) })),
      rpc,
    } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: 'Generation 1\nAlice increased Venus scale 2 step(s)',
      resolveParticipantIds: true,
    });

    const args = rpc.mock.calls[0][1];
    const venusEvents = args.p_capture.events.filter(
      (e: { event_category: string }) => e.event_category === 'venus',
    );
    expect(venusEvents).toHaveLength(1);
    expect(venusEvents[0]).toMatchObject({
      attribution_status: 'explicit_stable',
      player_id: 'player-alice',
      game_player_id: 'gp-alice',
    });
    expect(args.p_capture.venus_state).toBe('confirmed_present');
  });

  it('leaves an unrelated source name unattributed with a null player id', async () => {
    const gamePlayerEq = vi.fn().mockResolvedValue({
      data: [{ id: 'gp-bob', player_id: 'player-bob', players: { display_name: 'Bob' } }],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: gamePlayerEq })) })),
      rpc,
    } as never);

    await captureGameMechanicsFromRawLog({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: 'Generation 1\nAlice increased Venus scale 2 step(s)',
      resolveParticipantIds: true,
    });

    const args = rpc.mock.calls[0][1];
    const venusEvents = args.p_capture.events.filter(
      (e: { event_category: string }) => e.event_category === 'venus',
    );
    expect(venusEvents[0]).toMatchObject({
      attribution_status: 'explicit_unresolved',
      player_id: null,
    });
  });
});
