import { describe, expect, it, vi } from 'vitest';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { resolveLogGamePlayerReferences } from './log-game-player-resolution';

function buildDraft(overrides: Partial<LogGameDraftInput> = {}): LogGameDraftInput {
  return {
    awardClaims: {},
    gameId: undefined,
    generationCount: 10,
    groupId: '11111111-1111-4111-8111-111111111111',
    mapId: 'tharsis',
    milestoneClaims: {},
    notes: '',
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
            corporationIds: ['corp-1'],
            midgamePreludeIds: [],
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
          corporationIds: ['corp-1'],
          midgamePreludeIds: [],
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
        matchImportPlayerNames: vi.fn().mockResolvedValue([]),
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

  it('creates a single guest for a username reference with no last name', async () => {
    const createPlayerIfMissing = vi.fn().mockResolvedValue({
      display_name: 'Revloki',
      id: 'player-revloki',
      linked_user_id: null,
    });
    const listPlayers = vi.fn().mockResolvedValue([]);

    await expect(
      resolveLogGamePlayerReferences(
        buildDraft({ selectedPlayerIds: ['Revloki'] }),
        {
          createPlayerIfMissing,
          listPlayers,
          matchImportPlayerNames: vi.fn().mockResolvedValue([]),
        },
      ),
    ).resolves.toMatchObject({
      selectedPlayerIds: ['player-revloki'],
    });

    expect(createPlayerIfMissing).toHaveBeenCalledTimes(1);
    expect(createPlayerIfMissing).toHaveBeenCalledWith({
      displayName: 'Revloki',
      groupId: '11111111-1111-4111-8111-111111111111',
      linkedUserId: null,
    });
  });

  it('reuses an already-saved guest instead of generating a duplicate', async () => {
    const createPlayerIfMissing = vi.fn();
    const listPlayers = vi.fn().mockResolvedValue([
      { display_name: 'Revloki', id: 'player-revloki', linked_user_id: null },
    ]);

    await expect(
      resolveLogGamePlayerReferences(
        buildDraft({ selectedPlayerIds: ['revloki'] }),
        { createPlayerIfMissing, listPlayers },
      ),
    ).resolves.toMatchObject({
      selectedPlayerIds: ['player-revloki'],
    });

    expect(createPlayerIfMissing).not.toHaveBeenCalled();
  });

  it('resolves a typed roster name through the server matcher when labels hide it', async () => {
    // The roster shows a neutral guest label, so the typed real name cannot be
    // matched against what the client sees. The security-definer matcher still
    // recognizes it and points at the existing roster row.
    const createPlayerIfMissing = vi.fn();
    const listPlayers = vi.fn().mockResolvedValue([
      { display_name: 'Guest 5F2A', id: 'player-guest', linked_user_id: null },
    ]);
    const matchImportPlayerNames = vi.fn().mockResolvedValue([
      {
        importedName: 'Jenna Kass',
        matchReason: 'exact',
        playerId: 'player-guest',
        publicName: 'Guest 5F2A',
      },
    ]);

    await expect(
      resolveLogGamePlayerReferences(
        buildDraft({ selectedPlayerIds: ['Jenna Kass'] }),
        { createPlayerIfMissing, listPlayers, matchImportPlayerNames },
      ),
    ).resolves.toMatchObject({
      selectedPlayerIds: ['player-guest'],
    });

    expect(matchImportPlayerNames).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      ['Jenna Kass'],
    );
    expect(createPlayerIfMissing).not.toHaveBeenCalled();
  });

  it('ignores a cross-group server match and creates the roster player instead', async () => {
    const createPlayerIfMissing = vi.fn().mockResolvedValue({
      display_name: 'Jenna Kass',
      id: 'player-created',
      linked_user_id: null,
    });
    const listPlayers = vi.fn().mockResolvedValue([]);
    const matchImportPlayerNames = vi.fn().mockResolvedValue([
      {
        importedName: 'Jenna Kass',
        // Exact, but for a player outside this group's roster.
        matchReason: 'exact',
        playerId: 'player-in-another-group',
        publicName: 'Guest 77AA',
      },
    ]);

    await expect(
      resolveLogGamePlayerReferences(
        buildDraft({ selectedPlayerIds: ['Jenna Kass'] }),
        { createPlayerIfMissing, listPlayers, matchImportPlayerNames },
      ),
    ).resolves.toMatchObject({
      selectedPlayerIds: ['player-created'],
    });

    expect(createPlayerIfMissing).toHaveBeenCalledTimes(1);
  });
});
