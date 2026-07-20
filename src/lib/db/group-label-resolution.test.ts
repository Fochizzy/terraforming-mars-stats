import { describe, expect, it, vi } from 'vitest';
import {
  buildPublicGroupLabel,
  resolvePublicGroupLabel,
  resolvePublicGroupLabels,
} from './group-label-resolution';

describe('buildPublicGroupLabel', () => {
  it('sorts and joins public labels', () => {
    expect(buildPublicGroupLabel(['suzythegnat', 'fochizzy', 'lurker'])).toBe(
      'fochizzy / lurker / suzythegnat',
    );
  });

  it('falls back to a neutral label for an empty roster', () => {
    expect(buildPublicGroupLabel([])).toBe('Empty group');
  });

  it('is stable for a single-member roster', () => {
    expect(buildPublicGroupLabel(['fochizzy'])).toBe('fochizzy');
  });
});

function mockClient(input: {
  rosterByGroupId: Record<string, string[]>;
  labelByPlayerId: Record<string, string>;
}) {
  const rosterRows = Object.entries(input.rosterByGroupId).flatMap(
    ([groupId, playerIds]) =>
      playerIds.map((playerId) => ({ group_id: groupId, id: playerId })),
  );

  const inSpy = vi.fn().mockResolvedValue({ data: rosterRows, error: null });
  const selectSpy = vi.fn().mockReturnValue({ in: inSpy });

  return {
    from: vi.fn((table: string) => {
      if (table !== 'players') {
        throw new Error(`Unexpected table ${table}`);
      }

      return { select: selectSpy };
    }),
    inSpy,
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      if (fn !== 'get_public_player_names') {
        throw new Error(`Unexpected rpc ${fn}`);
      }

      const requestedIds = args.p_player_ids as string[];
      return Promise.resolve({
        data: requestedIds.map((playerId) => ({
          is_linked: true,
          player_id: playerId,
          public_name: input.labelByPlayerId[playerId] ?? null,
        })),
        error: null,
      });
    }),
    selectSpy,
  };
}

describe('resolvePublicGroupLabels', () => {
  it('resolves a mixed linked/guest group from public labels only, never a private column', async () => {
    const client = mockClient({
      rosterByGroupId: { 'group-1': ['player-a', 'player-b'] },
      labelByPlayerId: { 'player-a': 'fochizzy', 'player-b': 'Guest 5BDB6ED1' },
    });

    const labels = await resolvePublicGroupLabels(client as never, ['group-1']);

    expect(labels.get('group-1')).toBe('fochizzy / Guest 5BDB6ED1');
    expect(client.from).toHaveBeenCalledWith('players');
    // Only id/group_id are selected — never display_name or any other
    // private column — to build the label.
    expect(client.selectSpy).toHaveBeenCalledWith('id, group_id');
  });

  it('resolves an all-guest group', async () => {
    const client = mockClient({
      rosterByGroupId: { 'group-1': ['player-a', 'player-b'] },
      labelByPlayerId: {
        'player-a': 'Guest AAAA0001',
        'player-b': 'Guest BBBB0002',
      },
    });

    const labels = await resolvePublicGroupLabels(client as never, ['group-1']);

    expect(labels.get('group-1')).toBe('Guest AAAA0001 / Guest BBBB0002');
  });

  it('resolves an all-linked group', async () => {
    const client = mockClient({
      rosterByGroupId: { 'group-1': ['player-a', 'player-b'] },
      labelByPlayerId: { 'player-a': 'fochizzy', 'player-b': 'suzythegnat' },
    });

    const labels = await resolvePublicGroupLabels(client as never, ['group-1']);

    expect(labels.get('group-1')).toBe('fochizzy / suzythegnat');
  });

  it('gives an empty roster the neutral fallback rather than throwing', async () => {
    const client = mockClient({ rosterByGroupId: {}, labelByPlayerId: {} });

    const labels = await resolvePublicGroupLabels(client as never, ['group-empty']);

    expect(labels.get('group-empty')).toBe('Empty group');
  });

  it('resolves multiple groups independently and dedupes requested ids', async () => {
    const client = mockClient({
      rosterByGroupId: {
        'group-1': ['player-a'],
        'group-2': ['player-b'],
      },
      labelByPlayerId: { 'player-a': 'fochizzy', 'player-b': 'suzythegnat' },
    });

    const labels = await resolvePublicGroupLabels(client as never, [
      'group-1',
      'group-1',
      'group-2',
    ]);

    expect(labels.get('group-1')).toBe('fochizzy');
    expect(labels.get('group-2')).toBe('suzythegnat');
    expect(client.inSpy).toHaveBeenCalledWith('group_id', ['group-1', 'group-2']);
  });

  it('returns an empty map for an empty group id list without querying', async () => {
    const client = mockClient({ rosterByGroupId: {}, labelByPlayerId: {} });

    const labels = await resolvePublicGroupLabels(client as never, []);

    expect(labels).toEqual(new Map());
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('resolvePublicGroupLabel', () => {
  it('resolves a single group label', async () => {
    const client = mockClient({
      rosterByGroupId: { 'group-1': ['player-a'] },
      labelByPlayerId: { 'player-a': 'fochizzy' },
    });

    await expect(
      resolvePublicGroupLabel(client as never, 'group-1'),
    ).resolves.toBe('fochizzy');
  });
});
