import { describe, expect, it } from 'vitest';
import {
  buildGroupRosterSignature,
  findExactGroupRosterMatch,
  selectCurrentGroupPlayerIds,
  resolveImportParticipantIdentities,
} from './import-group-repo';

describe('resolveImportParticipantIdentities', () => {
  it('reuses a linked user identity for an exact normalized name match', () => {
    const resolved = resolveImportParticipantIdentities(
      ['Friday Mars', 'New Challenger'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
      ],
    );

    expect(resolved).toEqual([
      {
        displayName: 'Friday Mars',
        linkedUserId: 'user-1',
        normalizedName: 'friday mars',
        token: 'user:user-1',
      },
      {
        displayName: 'New Challenger',
        linkedUserId: null,
        normalizedName: 'new challenger',
        token: 'name:new challenger',
      },
    ]);
  });

  it('falls back to an exact normalized name token when no linked account exists', () => {
    const resolved = resolveImportParticipantIdentities(
      ['Friday-Mars!!'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: null,
        },
        {
          display_name: 'Friday   Mars',
          group_id: 'group-2',
          id: 'player-2',
          linked_user_id: null,
        },
      ],
    );

    expect(resolved).toEqual([
      {
        displayName: 'Friday-Mars!!',
        linkedUserId: null,
        normalizedName: 'friday mars',
        token: 'name:friday mars',
      },
    ]);
  });

  it('throws when one exact imported name maps to multiple linked users', () => {
    expect(() =>
      resolveImportParticipantIdentities(
        ['Friday Mars'],
        [
          {
            display_name: 'Friday Mars',
            group_id: 'group-1',
            id: 'player-1',
            linked_user_id: 'user-1',
          },
          {
            display_name: 'Friday Mars',
            group_id: 'group-2',
            id: 'player-2',
            linked_user_id: 'user-2',
          },
        ],
      ),
    ).toThrow(/multiple existing users/i);
  });

  it('throws with the duplicate exact token when imported participants collapse together', () => {
    expect(() =>
      resolveImportParticipantIdentities(['Friday Mars', 'Friday-Mars'], []),
    ).toThrow(/name:friday mars/i);
  });
});

describe('findExactGroupRosterMatch', () => {
  it('matches an existing group by the exact player set regardless of turn order', () => {
    const importedParticipants = resolveImportParticipantIdentities(
      ['Second Seat', 'Friday Mars'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
        {
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: 'user-2',
        },
      ],
    );

    const groupId = findExactGroupRosterMatch(importedParticipants, [
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Friday Mars',
        group_id: 'group-1',
        id: 'player-1',
        linked_user_id: 'user-1',
      },
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Second Seat',
        group_id: 'group-1',
        id: 'player-2',
        linked_user_id: 'user-2',
      },
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Third Seat',
        group_id: 'group-2',
        id: 'player-3',
        linked_user_id: 'user-3',
      },
    ]);

    expect(groupId).toBe('group-1');
    expect(
      buildGroupRosterSignature(importedParticipants.map((participant) => participant.token)),
    ).toBe('user:user-1|user:user-2');
  });

  it('throws with the exact roster signature when two groups already share it', () => {
    const importedParticipants = resolveImportParticipantIdentities(
      ['Second Seat', 'Friday Mars'],
      [],
    );

    expect(() =>
      findExactGroupRosterMatch(importedParticipants, [
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday-Mars',
          group_id: 'group-2',
          id: 'player-3',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second  Seat',
          group_id: 'group-2',
          id: 'player-4',
          linked_user_id: null,
        },
      ]),
    ).toThrow(/name:friday mars\|name:second seat/i);
  });
});

describe('selectCurrentGroupPlayerIds', () => {
  it('selects exact current-group player matches regardless of order', () => {
    expect(
      selectCurrentGroupPlayerIds(
        ['Second Seat', 'Friday Mars'],
        [
          { display_name: 'Friday Mars', id: 'player-1' },
          { display_name: 'Second Seat', id: 'player-2' },
        ],
      ),
    ).toEqual(['player-2', 'player-1']);
  });

  it('throws when a participant does not exactly match one player in the current group', () => {
    expect(() =>
      selectCurrentGroupPlayerIds(
        ['Friday Mars', 'New Challenger'],
        [{ display_name: 'Friday Mars', id: 'player-1' }],
      ),
    ).toThrow(/current group/i);
  });
});
