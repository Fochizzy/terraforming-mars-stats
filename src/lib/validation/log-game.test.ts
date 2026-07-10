import { describe, expect, it } from 'vitest';
import { logGameDraftSchema } from './log-game';

const baseDraft = {
  awardClaims: {},
  expansionCodes: ['base'],
  gameId: undefined,
  generationCount: 10,
  groupId: '11111111-1111-4111-8111-111111111111',
  mapId: 'tharsis',
  milestoneClaims: {},
  notes: '',
  playedOn: '2026-07-08',
  playerCount: 1,
  playerScores: {},
  playerStyles: {},
  promoSetSlugs: [],
  selectedPlayerIds: ['player-1'],
};

describe('logGameDraftSchema', () => {
  it('hydrates legacy single-corporation selections into a corporation list', () => {
    const parsed = logGameDraftSchema.parse({
      ...baseDraft,
      playerSelections: {
        'player-1': {
          corporationId: 'corp-1',
          preludeIds: [],
        },
      },
    });

    expect(parsed.playerSelections['player-1']).toEqual({
      corporationId: 'corp-1',
      corporationIds: ['corp-1'],
      preludeIds: [],
    });
  });

  it('compacts duplicate and blank corporation selections', () => {
    const parsed = logGameDraftSchema.parse({
      ...baseDraft,
      playerSelections: {
        'player-1': {
          corporationId: '',
          corporationIds: ['corp-1', '', 'corp-2', 'corp-1'],
          preludeIds: [],
        },
      },
    });

    expect(parsed.playerSelections['player-1']).toEqual({
      corporationId: 'corp-1',
      corporationIds: ['corp-1', 'corp-2'],
      preludeIds: [],
    });
  });
});
