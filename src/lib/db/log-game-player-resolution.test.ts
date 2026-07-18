import { describe, expect, it, vi } from 'vitest';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { resolveLogGamePlayerReferences } from './log-game-player-resolution';

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

describe('resolveLogGamePlayerReferences', () => {
  it('reuses existing players when a typed name matches the roster', async () => {
    const createPlayerIfMissing = vi.fn();
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
        createPlayerIfMissing,
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

    expect(createPlayerIfMissing).not.toHaveBeenCalled();
  });

  it('creates a new group player when a typed name is not in the roster', async () => {
    const createPlayerIfMissing = vi.fn().mockResolvedValue({
      display_name: 'New Player Name',
      id: 'player-new',
      linked_user_id: null,
    });
    const listPlayers = vi.fn().mockResolvedValue([
      { display_name: 'Friday Mars', id: 'player-friday', linked_user_id: null },
    ]);

    await expect(
      resolveLogGamePlayerReferences(buildDraft({
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
        createPlayerIfMissing,
        listPlayers,
      }),
    ).resolves.toMatchObject({
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

    expect(createPlayerIfMissing).toHaveBeenCalledWith({
      displayName: 'New Player Name',
      groupId: '11111111-1111-4111-8111-111111111111',
      linkedUserId: null,
    });
  });
});
