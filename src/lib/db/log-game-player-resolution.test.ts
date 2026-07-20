import { describe, expect, it, vi } from 'vitest';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import {
  resolveLogGamePlayerReferences,
  splitValidatedFullName,
} from './log-game-player-resolution';

function buildDraft(overrides: Partial<LogGameDraftInput> = {}): LogGameDraftInput {
  return {
    awardClaims: {},
    gameId: undefined,
    generationCount: 10,
    guaranteedMergerOffer: true,
    groupId: '11111111-1111-4111-8111-111111111111',
    mapId: 'tharsis',
    mergerOfferRuleSource: 'group_default',
    milestoneClaims: {},
    notes: '',
    objectiveConfiguration: 'board_defined',
    playedOn: '2026-07-04',
    playerCount: 2,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    promoSetSlugs: [],
    selectedPlayerIds: [],
    ...overrides,
  };
}

describe('splitValidatedFullName', () => {
  it('splits on the first whitespace token deterministically', () => {
    expect(splitValidatedFullName('Friday Mars')).toEqual({
      firstName: 'Friday',
      lastName: 'Mars',
    });
    expect(splitValidatedFullName('Mary Jane Watson')).toEqual({
      firstName: 'Mary',
      lastName: 'Jane Watson',
    });
  });
});

describe('resolveLogGamePlayerReferences', () => {
  it('reuses existing players when a typed name matches the roster', async () => {
    const createGuestPlayerByPersonalName = vi.fn();
    const listPlayers = vi.fn().mockResolvedValue([
      { display_name: 'Friday Mars', id: 'player-friday', linked_user_id: null },
      { display_name: 'Second Seat', id: 'player-second', linked_user_id: null },
    ]);

    await expect(
      resolveLogGamePlayerReferences(buildDraft({
        playerSelections: {
          'Friday Mars': {
            corporationId: 'corp-1',
            preludeIds: ['prelude-1'],
          },
        },
        selectedPlayerIds: ['player-second', 'Friday Mars'],
      }), {
        createGuestPlayerByPersonalName,
        listPlayers,
      }),
    ).resolves.toMatchObject({
      playerSelections: {
        'player-friday': {
          corporationId: 'corp-1',
          preludeIds: ['prelude-1'],
        },
      },
      selectedPlayerIds: ['player-second', 'player-friday'],
    });

    expect(createGuestPlayerByPersonalName).not.toHaveBeenCalled();
  });

  it('creates a new unlinked guest through the guarded RPC path when a typed name is not in the roster', async () => {
    const createGuestPlayerByPersonalName = vi.fn().mockResolvedValue({
      id: 'player-new',
      publicName: 'Guest 9F3A21BC',
      resolutionState: 'newly_created_unlinked_guest',
    });
    const listPlayers = vi.fn().mockResolvedValue([
      { display_name: 'Friday Mars', id: 'player-friday', linked_user_id: null },
    ]);

    const resolved = await resolveLogGamePlayerReferences(buildDraft({
      playerScores: {
        'New Player Name': {
          awardPoints: 5,
          cardPointsAnimals: undefined,
          cardPointsJovian: undefined,
          cardPointsMicrobes: undefined,
          cardPointsTotal: 18,
          citiesPoints: 5,
          finalMegacredits: 8,
          greeneryPoints: 6,
          milestonePoints: 5,
          totalPoints: 55,
          trPoints: 21,
        },
      },
      selectedPlayerIds: ['New Player Name'],
    }), {
      createGuestPlayerByPersonalName,
      listPlayers,
    });

    expect(resolved).toMatchObject({
      playerScores: {
        'player-new': {
          awardPoints: 5,
          cardPointsTotal: 18,
          citiesPoints: 5,
          finalMegacredits: 8,
          greeneryPoints: 6,
          milestonePoints: 5,
          totalPoints: 55,
          trPoints: 21,
        },
      },
      selectedPlayerIds: ['player-new'],
    });

    // The typed full name is split into explicit first/last components for
    // the guest RPC; it is never written to a display-name column.
    expect(createGuestPlayerByPersonalName).toHaveBeenCalledWith({
      firstName: 'New',
      groupId: '11111111-1111-4111-8111-111111111111',
      lastName: 'Player Name',
    });
    expect(JSON.stringify(createGuestPlayerByPersonalName.mock.calls)).not.toContain(
      'displayName',
    );
  });

  it('converges on the existing guest when the RPC reuses a matching private identity', async () => {
    const createGuestPlayerByPersonalName = vi.fn().mockResolvedValue({
      id: 'player-existing-guest',
      publicName: 'Guest 5D4C3B2A',
      resolutionState: 'existing_unlinked_guest',
    });
    // The roster shows only the neutral label, so the typed personal name
    // cannot match by display name; the RPC's private-identity search is
    // what converges repeated entries onto one stable player ID.
    const listPlayers = vi.fn().mockResolvedValue([
      {
        display_name: 'Guest 5D4C3B2A',
        id: 'player-existing-guest',
        linked_user_id: null,
      },
    ]);

    const resolved = await resolveLogGamePlayerReferences(buildDraft({
      selectedPlayerIds: ['Returning Guest'],
    }), {
      createGuestPlayerByPersonalName,
      listPlayers,
    });

    expect(resolved.selectedPlayerIds).toEqual(['player-existing-guest']);
    expect(createGuestPlayerByPersonalName).toHaveBeenCalledWith({
      firstName: 'Returning',
      groupId: '11111111-1111-4111-8111-111111111111',
      lastName: 'Guest',
    });
  });

  it('rejects two references resolving to one player ID', async () => {
    const createGuestPlayerByPersonalName = vi.fn().mockResolvedValue({
      id: 'player-existing-guest',
      publicName: 'Guest 5D4C3B2A',
      resolutionState: 'existing_unlinked_guest',
    });
    const listPlayers = vi.fn().mockResolvedValue([
      {
        display_name: 'Guest 5D4C3B2A',
        id: 'player-existing-guest',
        linked_user_id: null,
      },
    ]);

    await expect(
      resolveLogGamePlayerReferences(buildDraft({
        selectedPlayerIds: ['player-existing-guest', 'Returning Guest'],
      }), {
        createGuestPlayerByPersonalName,
        listPlayers,
      }),
    ).rejects.toThrow('Selected players must be unique within a game.');
  });
});
