import { describe, expect, it } from 'vitest';
import { applyServerPlayerMatches } from './apply-server-player-matches';

function candidate(id: string, displayName: string) {
  return {
    displayName,
    gamesPlayed: 0,
    id,
    linkedFullName: null,
    linkedUsername: null,
    matchReason: 'fallback' as const,
    matchScore: 0,
  };
}

function link(importedName: string, candidates: ReturnType<typeof candidate>[]) {
  return {
    candidates,
    importedName,
    requiresConfirmation: true,
    selectedPlayerId: null,
    status: 'unmatched' as const,
  };
}

describe('applyServerPlayerMatches', () => {
  it('selects the server match and stops asking for confirmation', () => {
    const result = applyServerPlayerMatches(
      [link('Corey', [candidate('player-1', 'lurker')])],
      [
        {
          importedName: 'Corey',
          matchReason: 'exact',
          playerId: 'player-1',
          publicName: 'lurker',
        },
      ],
    );

    expect(result[0]).toMatchObject({
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact',
    });
  });

  /**
   * The same person in two groups collapses to one option, so the row the
   * server matched may not be the one the dropdown offers. Both carry the same
   * public label, and only a selectable id is any use to the reviewer.
   */
  it('falls back to the representative row carrying the same public label', () => {
    const result = applyServerPlayerMatches(
      [link('Izzy', [candidate('representative', 'fochizzy')])],
      [
        {
          importedName: 'Izzy',
          matchReason: 'exact',
          playerId: 'other-group-row',
          publicName: 'fochizzy',
        },
      ],
    );

    expect(result[0].selectedPlayerId).toBe('representative');
  });

  it('treats a partial match as a suggestion needing confirmation', () => {
    const result = applyServerPlayerMatches(
      [link('Jam', [candidate('player-2', 'revloki')])],
      [
        {
          importedName: 'Jam',
          matchReason: 'partial',
          playerId: 'player-2',
          publicName: 'revloki',
        },
      ],
    );

    expect(result[0]).toMatchObject({
      requiresConfirmation: true,
      selectedPlayerId: 'player-2',
      status: 'suggested',
    });
  });

  it('leaves a link untouched when the server matched nothing selectable', () => {
    const unmatched = link('Jenna', [candidate('player-3', 'lurker')]);

    expect(
      applyServerPlayerMatches([unmatched], []),
    ).toEqual([unmatched]);
    expect(
      applyServerPlayerMatches(
        [unmatched],
        [
          {
            importedName: 'Jenna',
            matchReason: 'exact',
            playerId: 'not-in-candidates',
            publicName: 'someone-else',
          },
        ],
      ),
    ).toEqual([unmatched]);
  });
});
