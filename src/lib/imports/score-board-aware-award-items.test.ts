import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';
import { scoreBoardAwareAwardItems } from './score-board-aware-award-items';

describe('scoreBoardAwareAwardItems', () => {
  it('proves Cultivator from shared board evidence and preserves shared zero-count second place', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'hellas',
        spaces: {
          '18': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '19': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
        },
      },
    });

    expect(
      scoreBoardAwareAwardItems({
        boardEvidenceContext,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Friday funded Cultivator award',
          },
        ],
        mapId: 'hellas',
        participantNames: ['Colette', 'Corey', 'Friday'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Cultivator',
        firstPlacePlayerNames: ['Colette'],
        secondPlacePlayerNames: ['Corey', 'Friday'],
        status: 'proved',
      }),
    );
  });

  it('skips board-aware award output when the log already includes explicit award results', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: { mapId: 'hellas', spaces: {} },
    });

    expect(
      scoreBoardAwareAwardItems({
        boardEvidenceContext,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Friday funded Cultivator award',
          },
          {
            actor: 'Corey',
            award: 'Cultivator',
            eventType: 'award_result',
            lineNumber: 2,
            placement: 'first',
            rawLine: 'Corey won first place on Cultivator award',
          },
        ],
        mapId: 'hellas',
        participantNames: ['Corey', 'Friday'],
      }),
    ).toEqual([]);
  });
});
