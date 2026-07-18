import { describe, expect, it } from 'vitest';
import {
  LOG_GAME_ENTRY_METHODS,
  LOG_GAME_WORKFLOW_STATE_KINDS,
  LOG_GAME_WORKFLOW_STEP_LABELS,
  manualEntryHref,
  resolveLogGameDraftRouteState,
} from './log-game-entry';

describe('Log a Game entry contract', () => {
  it('defines Manual Entry and Import Game as methods in one product area', () => {
    expect(LOG_GAME_ENTRY_METHODS).toEqual([
      expect.objectContaining({ href: '/log-game', id: 'manual', label: 'Manual Entry' }),
      expect.objectContaining({ href: '/log-game/import', id: 'import', label: 'Import Game' }),
    ]);
  });

  it('centralizes the six canonical visible workflow labels', () => {
    expect(Object.values(LOG_GAME_WORKFLOW_STEP_LABELS)).toEqual([
      'Setup',
      'Players & Corporations',
      'Milestones & Awards',
      'Final Scores',
      'Styles, Cards & Details',
      'Review',
    ]);
  });

  it('keeps failure and access states distinct in the shared vocabulary', () => {
    expect(LOG_GAME_WORKFLOW_STATE_KINDS).toEqual(
      expect.arrayContaining([
        'save_failed',
        'finalization_failed',
        'inaccessible',
        'unavailable',
        'not_found',
      ]),
    );
  });

  it('preserves a valid draft identifier and rejects invalid resume state', () => {
    const gameId = '11111111-1111-4111-8111-111111111111';

    expect(resolveLogGameDraftRouteState(undefined)).toEqual({ kind: 'new' });
    expect(resolveLogGameDraftRouteState([gameId, 'ignored'])).toEqual({
      kind: 'resume',
      gameId,
    });
    expect(resolveLogGameDraftRouteState('not-a-uuid')).toEqual({ kind: 'invalid' });
    expect(manualEntryHref(gameId)).toBe(`/log-game?gameId=${gameId}`);
  });
});
