import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';
import { scoreBoardAwareAwardItems } from './score-board-aware-award-items';

describe('scoreBoardAwareAwardItems', () => {
  it('collects real requested ocean-adjacency spaces for Landlord from shared board evidence', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'city',
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
            award: 'Landlord',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Friday funded Landlord award',
          },
          {
            actor: 'Friday',
            eventType: 'tile_placed',
            lineNumber: 2,
            rawLine: 'Friday placed city tile at 21',
            space: '21',
            tile: 'city',
          },
        ],
        mapId: 'tharsis',
        participantNames: ['Friday'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Landlord',
        notes: expect.arrayContaining([
          'Landlord still needs targeted ocean-adjacency confirmation before importing winners.',
        ]),
        requestedSpaceIds: ['20', '22', '29', '30'],
        status: 'review_needed',
      }),
    );
  });

  it('collects real requested ocean-adjacency spaces for Estate Dealer from shared board evidence', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'elysium',
        spaces: {
          '31': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
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
            actor: 'Corey',
            award: 'Estate Dealer',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Corey funded Estate Dealer award',
          },
          {
            actor: 'Corey',
            eventType: 'tile_placed',
            lineNumber: 2,
            rawLine: 'Corey placed greenery tile at 31',
            space: '31',
            tile: 'greenery',
          },
        ],
        mapId: 'elysium',
        participantNames: ['Corey'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Estate Dealer',
        requestedSpaceIds: [],
        status: 'review_needed',
      }),
    );
  });

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

  it('keeps Cultivator reviewable when the imported evidence did not prove any greenery ownership', () => {
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
        ],
        mapId: 'hellas',
        participantNames: ['Colette', 'Corey', 'Friday'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Cultivator',
        notes: [
          'Cultivator was funded, but the imported log did not prove any greenery ownership from board evidence.',
        ],
        status: 'review_needed',
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
