import { describe, expect, it, vi } from 'vitest';
import {
  fetchUsernamesByPlayerId,
  resolvePlayerLabelsInRows,
} from './player-label-resolution';

function clientReturning(rows: Array<{ player_id: string; username: string | null }>) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

describe('fetchUsernamesByPlayerId', () => {
  it('calls the RPC once with de-duplicated ids and maps usernames', async () => {
    const client = clientReturning([
      { player_id: 'a', username: 'astro' },
      { player_id: 'b', username: null },
    ]);

    const map = await fetchUsernamesByPlayerId(client, ['a', 'a', 'b', '']);

    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('get_player_usernames', {
      p_player_ids: ['a', 'b'],
    });
    expect(map.get('a')).toBe('astro');
    expect(map.has('b')).toBe(false);
  });

  it('does not hit the RPC when there are no ids', async () => {
    const client = clientReturning([]);
    const map = await fetchUsernamesByPlayerId(client, []);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(map.size).toBe(0);
  });
});

describe('resolvePlayerLabelsInRows', () => {
  it('rewrites player_name to the username when registered, first name otherwise', async () => {
    const client = clientReturning([{ player_id: 'p1', username: 'Fochizzy' }]);

    const rows = await resolvePlayerLabelsInRows(client, [
      { player_id: 'p1', player_name: 'Isaac Hodnett', wins: 3 },
      { player_id: 'p2', player_name: 'Grace Hopper', wins: 1 },
    ]);

    expect(rows[0]?.player_name).toBe('Fochizzy');
    expect(rows[1]?.player_name).toBe('Grace');
    // non-name fields are untouched
    expect(rows[0]?.wins).toBe(3);
  });

  it('resolves left/right pair columns for head-to-head style rows', async () => {
    const client = clientReturning([{ player_id: 'l1', username: 'RevLoki' }]);

    const rows = await resolvePlayerLabelsInRows(
      client,
      [
        {
          left_player_id: 'l1',
          left_player_name: 'Loki Odinson',
          right_player_id: 'r1',
          right_player_name: 'Corey Smith',
        },
      ],
      [
        ['left_player_id', 'left_player_name'],
        ['right_player_id', 'right_player_name'],
      ],
    );

    expect(rows[0]?.left_player_name).toBe('RevLoki');
    expect(rows[0]?.right_player_name).toBe('Corey');
  });

  it('returns the list unchanged when empty without calling the RPC', async () => {
    const client = clientReturning([]);
    const rows = await resolvePlayerLabelsInRows(client, []);
    expect(rows).toEqual([]);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
