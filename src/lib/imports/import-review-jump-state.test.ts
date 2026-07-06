import {
  consumeImportReviewJumpState,
  readImportReviewJumpState,
  saveImportReviewJumpState,
} from './import-review-jump-state';
import { beforeEach, describe, expect, it } from 'vitest';

describe('importReviewJumpState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('round-trips a stored jump target through sessionStorage for the matching game', () => {
    saveImportReviewJumpState({
      gameId: 'game-1',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });

    expect(readImportReviewJumpState('game-1')).toEqual({
      gameId: 'game-1',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });
    expect(readImportReviewJumpState('game-2')).toBeNull();

    expect(consumeImportReviewJumpState('game-1')).toEqual({
      gameId: 'game-1',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });
    expect(readImportReviewJumpState('game-1')).toBeNull();
  });
});
